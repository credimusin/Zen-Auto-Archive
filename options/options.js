"use strict";

const thresholdInput = document.getElementById("threshold");
const checkPeriodInput = document.getElementById("check-period");
const domainsTextarea = document.getElementById("excluded-domains");
const savedIndicator = document.getElementById("saved-indicator");
const thresholdPresets = document.querySelectorAll("#threshold-presets button");
const periodPresets = document.querySelectorAll("#period-presets button");

let savedTimeout;

function showSaved() {
  savedIndicator.hidden = false;
  clearTimeout(savedTimeout);
  savedTimeout = setTimeout(() => {
    savedIndicator.hidden = true;
  }, 1500);
}

async function load() {
  const settings = await browser.storage.local.get(DEFAULTS);
  thresholdInput.value = settings.thresholdHours;
  checkPeriodInput.value = settings.checkPeriodMinutes;
  domainsTextarea.value = settings.excludedDomains.join("\n");
}

function saveThreshold(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) {
    return;
  }
  browser.storage.local.set({ thresholdHours: value }).then(showSaved);
}

function saveCheckPeriod(minutes) {
  const value = Math.round(Number(minutes));
  if (!Number.isFinite(value) || value < 1) {
    return;
  }
  checkPeriodInput.value = value;
  browser.storage.local.set({ checkPeriodMinutes: value }).then(showSaved);
}

thresholdInput.addEventListener("change", () => {
  saveThreshold(thresholdInput.value);
});

checkPeriodInput.addEventListener("change", () => {
  saveCheckPeriod(checkPeriodInput.value);
});

thresholdPresets.forEach((button) => {
  button.addEventListener("click", () => {
    thresholdInput.value = button.dataset.hours;
    saveThreshold(button.dataset.hours);
  });
});

periodPresets.forEach((button) => {
  button.addEventListener("click", () => {
    saveCheckPeriod(button.dataset.minutes);
  });
});

domainsTextarea.addEventListener("change", () => {
  const excludedDomains = domainsTextarea.value
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
  browser.storage.local.set({ excludedDomains }).then(showSaved);
});

load();
