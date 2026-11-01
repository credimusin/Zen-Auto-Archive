"use strict";

const DEFAULTS = {
  enabled: true,
  thresholdHours: 12,
  checkPeriodMinutes: 15,
  excludedDomains: [],
  lastCleanup: null,
};

function normalizeDomain(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  let value = raw.trim().toLowerCase();
  if (!value) {
    return "";
  }
  if (value.includes("://")) {
    try {
      value = new URL(value).hostname.toLowerCase();
    } catch {
      return "";
    }
  } else {
    value = value
      .replace(/^\*+/, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "");
  }
  return value.replace(/^\.+|\.+$/g, "");
}
