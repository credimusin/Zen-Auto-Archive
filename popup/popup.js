"use strict";

const thresholdVal = document.getElementById("threshold-val");
const tabsCount = document.getElementById("tabs-count");
const lastCleanupRow = document.getElementById("last-cleanup-row");
const lastCleanupVal = document.getElementById("last-cleanup-val");
const openSettingsBtn = document.getElementById("open-settings");

function formatHours(hours) {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${hours}h`;
}

async function render() {
  const stats = await browser.runtime.sendMessage({ type: "getStats" });
  if (!stats) {
    return;
  }

  thresholdVal.textContent = formatHours(stats.thresholdHours || 12);
  tabsCount.textContent = `${stats.total}`;

  if (stats.lastCleanup && stats.lastCleanup.count > 0) {
    const time = new Date(stats.lastCleanup.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    lastCleanupVal.textContent = `${stats.lastCleanup.count} tabs (${time})`;
    lastCleanupRow.hidden = false;
  } else {
    lastCleanupRow.hidden = true;
  }
}

openSettingsBtn.addEventListener("click", () => {
  browser.runtime.openOptionsPage();
  window.close();
});

render();
