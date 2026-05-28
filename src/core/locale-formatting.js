import {
  dateTimeFormatter as cachedDateTimeFormatter,
  formatNumber as formatLocalizedNumber,
  numberFormatter as cachedNumberFormatter,
  numberFormatterWith as cachedNumberFormatterWith,
  numberSeparators as cachedNumberSeparators
} from "./formatters.js";

export function createLocaleFormatting({
  browserTimeZone = "UTC",
  commonTimeZones = [],
  getNavigator = () => globalThis.navigator,
  getPrefs = () => ({})
} = {}) {
  function prefs() {
    return getPrefs() || {};
  }

  function resolvedNumberLocale() {
    const value = prefs().numberLocale;
    return value && value !== "auto" ? value : getNavigator()?.language || "en-US";
  }

  function resolvedTimeZone() {
    const value = prefs().chartTimeZone;
    return value && value !== "auto" ? value : browserTimeZone;
  }

  function groupingEnabled() {
    return prefs().numberGrouping !== false;
  }

  function timeZoneOptions() {
    const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return [...new Set([resolvedTimeZone(), ...commonTimeZones, ...supported])].filter(Boolean);
  }

  function numberFormatterWith(minimumFractionDigits, maximumFractionDigits) {
    return cachedNumberFormatterWith(resolvedNumberLocale(), groupingEnabled(), minimumFractionDigits, maximumFractionDigits);
  }

  function numberFormatter(maximumFractionDigits) {
    return cachedNumberFormatter(resolvedNumberLocale(), groupingEnabled(), maximumFractionDigits);
  }

  function numberSeparators() {
    return cachedNumberSeparators(resolvedNumberLocale());
  }

  function dateTimeFormatter(locale, options, cacheId = "") {
    return cachedDateTimeFormatter(locale, options, cacheId);
  }

  function formatNumber(value) {
    return formatLocalizedNumber(resolvedNumberLocale(), groupingEnabled(), value);
  }

  function formatTimelineTime(event) {
    if (!event?.epochMs) return "snapshot";
    const epochMs = Number(event.epochMs);
    const hasMilliseconds = Number.isFinite(epochMs) && Math.abs(Math.round(epochMs)) % 1000 !== 0;
    try {
      return dateTimeFormatter(resolvedNumberLocale(), {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        ...(hasMilliseconds ? { fractionalSecondDigits: 3 } : {}),
        timeZone: resolvedTimeZone()
      }, hasMilliseconds ? "timeline-ms" : "timeline").format(new Date(epochMs));
    } catch {
      return "snapshot";
    }
  }

  function formatTimelineOffset(seconds) {
    const numeric = Number(seconds || 0);
    if (!Number.isFinite(numeric)) return "0";
    if (Math.abs(numeric % 1) > 0.0005) return numberFormatterWith(3, 3).format(numeric);
    return formatNumber(numeric);
  }

  return {
    dateTimeFormatter,
    formatNumber,
    formatTimelineOffset,
    formatTimelineTime,
    numberFormatter,
    numberFormatterWith,
    numberSeparators,
    resolvedNumberLocale,
    resolvedTimeZone,
    timeZoneOptions
  };
}
