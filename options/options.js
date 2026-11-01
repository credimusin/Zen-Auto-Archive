"use strict";

const thresholdInput = document.getElementById("threshold");
const checkPeriodInput = document.getElementById("check-period");
const domainsTextarea = document.getElementById("excluded-domains");
const savedIndicator = document.getElementById("saved-indicator");
const thresholdPresets = document.querySelectorAll("#threshold-presets button");
const periodPresets = document.querySelectorAll("#period-presets button");

let savedTimeout;
let domainSaveTimeout;
let currentThresholdHours = DEFAULTS.thresholdHours;
let currentCheckPeriodMinutes = DEFAULTS.checkPeriodMinutes;

function showSaved() {
  savedIndicator.hidden = false;
  clearTimeout(savedTimeout);
  savedTimeout = setTimeout(() => {
    savedIndicator.hidden = true;
  }, 1500);
}

function updatePresetHighlights() {
  thresholdPresets.forEach((button) => {
    button.classList.toggle(
      "active",
      Number(button.dataset.hours) === currentThresholdHours,
    );
  });
  periodPresets.forEach((button) => {
    button.classList.toggle(
      "active",
      Number(button.dataset.minutes) === currentCheckPeriodMinutes,
    );
  });
}

async function load() {
  const settings = await browser.storage.local.get(DEFAULTS);
  currentThresholdHours = Number(settings.thresholdHours) || DEFAULTS.thresholdHours;
  currentCheckPeriodMinutes =
    Number(settings.checkPeriodMinutes) || DEFAULTS.checkPeriodMinutes;
  thresholdInput.value = currentThresholdHours;
  checkPeriodInput.value = currentCheckPeriodMinutes;
  domainsTextarea.value = settings.excludedDomains.join("\n");
  updatePresetHighlights();
}

function saveThreshold(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) {
    thresholdInput.value = currentThresholdHours;
    return;
  }
  currentThresholdHours = value;
  thresholdInput.value = value;
  updatePresetHighlights();
  browser.storage.local.set({ thresholdHours: value }).then(showSaved);
}

function saveCheckPeriod(minutes) {
  const value = Math.round(Number(minutes));
  if (!Number.isFinite(value) || value < 1) {
    checkPeriodInput.value = currentCheckPeriodMinutes;
    return;
  }
  currentCheckPeriodMinutes = value;
  checkPeriodInput.value = value;
  updatePresetHighlights();
  browser.storage.local.set({ checkPeriodMinutes: value }).then(showSaved);
}

function parseExcludedDomains(rawText) {
  return Array.from(
    new Set(
      rawText
        .split("\n")
        .map(normalizeDomain)
        .filter(Boolean),
    ),
  );
}

function saveExcludedDomains(syncTextarea) {
  clearTimeout(domainSaveTimeout);
  const excludedDomains = parseExcludedDomains(domainsTextarea.value);
  if (syncTextarea) {
    domainsTextarea.value = excludedDomains.join("\n");
  }
  browser.storage.local.set({ excludedDomains }).then(showSaved);
}

thresholdInput.addEventListener("change", () => {
  saveThreshold(thresholdInput.value);
});

checkPeriodInput.addEventListener("change", () => {
  saveCheckPeriod(checkPeriodInput.value);
});

thresholdPresets.forEach((button) => {
  button.addEventListener("click", () => {
    saveThreshold(button.dataset.hours);
  });
});

periodPresets.forEach((button) => {
  button.addEventListener("click", () => {
    saveCheckPeriod(button.dataset.minutes);
  });
});

domainsTextarea.addEventListener("input", () => {
  clearTimeout(domainSaveTimeout);
  domainSaveTimeout = setTimeout(() => {
    saveExcludedDomains(false);
  }, 400);
});

domainsTextarea.addEventListener("change", () => {
  saveExcludedDomains(true);
});

load();
