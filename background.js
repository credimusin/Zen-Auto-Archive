"use strict";

const ALARM_NAME = "zen-auto-archive-check";
const ACTIVITY_THROTTLE_MS = 15000;

let isCleaning = false;
let lastActivityCheck = 0;

async function getSettings() {
  return browser.storage.local.get(DEFAULTS);
}

function isExcluded(url, excludedDomains) {
  if (!url || !excludedDomains || !excludedDomains.length) {
    return false;
  }
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return excludedDomains.some((domain) => {
    const d = domain.trim().toLowerCase();
    return d && (host === d || host.endsWith("." + d));
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
  return tabs.filter((tab) => !seen.has(tab.id) && seen.add(tab.id));
}

function shouldArchiveTab(tab, settings, now, thresholdMs) {
  if (tab.pinned || tab.active || tab.audible) {
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
  try {
    const settings = await getSettings();
    if (!settings.enabled) {
      return 0;
    }

    const thresholdMs = settings.thresholdHours * 3600 * 1000;
    const now = Date.now();
    const tabs = await queryAllTabs();
    const toClose = tabs.filter((tab) =>
      shouldArchiveTab(tab, settings, now, thresholdMs),
    );

    const closedTabs = [];
    for (const tab of toClose) {
      try {
        await browser.tabs.remove(tab.id);
        closedTabs.push({ url: tab.url, title: tab.title });
      } catch {
      }
    }

    if (closedTabs.length > 0) {
      await browser.storage.local.set({
        lastCleanup: {
          timestamp: now,
          count: closedTabs.length,
          tabs: closedTabs,
        },
      });
    }

    return closedTabs.length;
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
  lastActivityCheck = now;
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
browser.windows.onFocusChanged.addListener(onActivity);

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    cleanTabs();
  }
});

async function getStats() {
  const settings = await getSettings();
  const thresholdMs = settings.thresholdHours * 3600 * 1000;
  const now = Date.now();
  const tabs = await queryAllTabs();
  const overdue = tabs.filter((tab) =>
    shouldArchiveTab(tab, settings, now, thresholdMs),
  ).length;

  return {
    total: tabs.length,
    overdue,
    thresholdHours: settings.thresholdHours,
    lastCleanup: settings.lastCleanup,
  };
}

browser.runtime.onMessage.addListener(async (message) => {
  if (message?.type === "getStats") {
    return getStats();
  }
  return undefined;
});
