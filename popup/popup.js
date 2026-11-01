"use strict";

const thresholdVal = document.getElementById("threshold-val");
const tabsCount = document.getElementById("tabs-count");
const lastCleanupRow = document.getElementById("last-cleanup-row");
const lastCleanupVal = document.getElementById("last-cleanup-val");
const openSettingsBtn = document.getElementById("open-settings");
const toggleEnabledBtn = document.getElementById("toggle-enabled");
const statusText = document.getElementById("status-text");
const footerNote = document.getElementById("footer-note");

let currentEnabled = true;

function formatHours(hours) {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours >= 24 && hours % 24 === 0) {
    return `${hours / 24}d`;
  }
  return `${hours}h`;
}

function formatCleanupTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) {
    return timeStr;
  }
  const dateStr = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `${dateStr}, ${timeStr}`;
}

function applyStats(stats) {
  if (!stats) {
    return;
  }

  currentEnabled = Boolean(stats.enabled);
  toggleEnabledBtn.classList.toggle("paused", !currentEnabled);
  statusText.textContent = currentEnabled ? "Active" : "Paused";
  footerNote.textContent = currentEnabled
    ? "Running quietly in background"
    : "auto-archiving is paused";

  thresholdVal.textContent = formatHours(stats.thresholdHours || 12);
  tabsCount.textContent = `${stats.monitored}`;

  if (stats.lastCleanup && stats.lastCleanup.count > 0) {
    const count = stats.lastCleanup.count;
    const label = count === 1 ? "1 tab" : `${count} tabs`;
    const time = formatCleanupTime(stats.lastCleanup.timestamp);
    lastCleanupVal.textContent = `${label} (${time})`;
    lastCleanupRow.hidden = false;
  } else {
    lastCleanupRow.hidden = true;
  }
}

async function render() {
  const stats = await browser.runtime.sendMessage({ type: "getStats" });
  applyStats(stats);
}

toggleEnabledBtn.addEventListener("click", async () => {
  const stats = await browser.runtime.sendMessage({
    type: "setEnabled",
    enabled: !currentEnabled,
  });
  applyStats(stats);
});

openSettingsBtn.addEventListener("click", () => {
  browser.runtime.openOptionsPage();
  window.close();
});

render();
