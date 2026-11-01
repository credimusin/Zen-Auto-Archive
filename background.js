"use strict";

const ALARM_NAME = "zen-auto-archive-check";
const ACTIVITY_THROTTLE_MS = 15000;

let isCleaning = false;
let lastActivityCheck = 0;

async function getSettings() {
  return browser.storage.local.get(DEFAULTS);
}

function extractHostname(url) {
  if (!url || typeof url !== "string") {
    return "";
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "about:" && parsed.pathname === "reader") {
      const innerUrl = parsed.searchParams.get("url");
      if (innerUrl) {
        return new URL(innerUrl).hostname.toLowerCase();
      }
    }
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isExcluded(url, excludedDomains) {
  if (!excludedDomains || !excludedDomains.length) {
    return false;
  }
  const host = extractHostname(url);
  if (!host) {
    return false;
  }
  return excludedDomains.some((domain) => {
    const d = normalizeDomain(domain);
    return Boolean(d) && (host === d || host.endsWith("." + d));
  });
}

async function queryAllTabs() {
  const tabs = [];
  for (const filter of [{ hidden: false }, { hidden: true }]) {
    try {
      const result = await browser.tabs.query(filter);
      tabs.push(...result);
    } catch {
    }
  }
  if (tabs.length === 0) {
    try {
      const fallback = await browser.tabs.query({});
      tabs.push(...fallback);
    } catch {
    }
  }
  const seen = new Set();
  return tabs.filter((tab) => {
    if (
      tab.id == null ||
      tab.id === browser.tabs.TAB_ID_NONE ||
      seen.has(tab.id)
    ) {
      return false;
    }
    seen.add(tab.id);
    return true;
  });
}

function isSharingMedia(tab) {
  const state = tab.sharingState;
  return Boolean(state && (state.camera || state.microphone || state.screen));
}

function shouldArchiveTab(tab, settings, now, thresholdMs) {
  if (tab.pinned || tab.active || tab.audible || isSharingMedia(tab)) {
    return false;
  }
  if (isExcluded(tab.url, settings.excludedDomains)) {
    return false;
  }
  if (typeof tab.lastAccessed !== "number" || tab.lastAccessed <= 0) {
    return false;
  }
  return now - tab.lastAccessed > thresholdMs;
}

async function cleanTabs() {
  if (isCleaning) {
    return 0;
  }

  isCleaning = true;
  lastActivityCheck = Date.now();
  try {
    const settings = await getSettings();
    if (!settings.enabled) {
      return 0;
    }

    const thresholdHours = Number(settings.thresholdHours);
    if (!Number.isFinite(thresholdHours) || thresholdHours <= 0) {
      return 0;
    }

    const thresholdMs = thresholdHours * 3600 * 1000;
    const now = Date.now();
    const tabs = await queryAllTabs();
    const toClose = tabs.filter((tab) =>
      shouldArchiveTab(tab, settings, now, thresholdMs),
    );

    let closedCount = 0;
    for (const tab of toClose) {
      try {
        await browser.tabs.remove(tab.id);
        closedCount++;
      } catch {
      }
    }

    if (closedCount > 0) {
      await browser.storage.local.set({
        lastCleanup: {
          timestamp: now,
          count: closedCount,
        },
      });
    }

    return closedCount;
  } finally {
    isCleaning = false;
  }
}

async function ensureAlarm() {
  const settings = await getSettings();
  const period = Math.max(1, Number(settings.checkPeriodMinutes) || 15);
  await browser.alarms.clear(ALARM_NAME);
  browser.alarms.create(ALARM_NAME, { periodInMinutes: period });
}

function onActivity() {
  const now = Date.now();
  if (now - lastActivityCheck < ACTIVITY_THROTTLE_MS) {
    return;
  }
  cleanTabs();
}

browser.runtime.onInstalled.addListener(ensureAlarm);
browser.runtime.onStartup.addListener(ensureAlarm);

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.checkPeriodMinutes) {
    ensureAlarm();
  }
});

browser.tabs.onActivated.addListener(onActivity);
browser.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== browser.windows.WINDOW_ID_NONE) {
    onActivity();
  }
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    cleanTabs();
  }
});

async function getStats() {
  const settings = await getSettings();
  const tabs = await queryAllTabs();
  const monitored = tabs.filter(
    (tab) => !tab.pinned && !isExcluded(tab.url, settings.excludedDomains),
  ).length;

  return {
    enabled: Boolean(settings.enabled),
    monitored,
    thresholdHours: settings.thresholdHours,
    lastCleanup: settings.lastCleanup,
  };
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message?.type === "getStats") {
    return getStats();
  }
  if (message?.type === "setEnabled") {
    const enabled = Boolean(message.enabled);
    await browser.storage.local.set({ enabled });
    if (enabled) {
      await cleanTabs();
    }
    return getStats();
  }
  return undefined;
});
