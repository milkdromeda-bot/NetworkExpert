/**
 * Persistence layer — localStorage load/save operations.
 */
import { normalizeAnnotations } from "../timeline/annotations.js";
import { normalizeAliasStore } from "../services/aliases.js";
import { normalizeServiceOverrideStore } from "../services/service-overrides.js";
import { normalizeTopologyProfile, topologyScopeKey } from "../config/topology.js";
import { TABLE_STATE_STORAGE_KEY, normalizeTableState, tableStateSnapshot } from "../views/table-state.js";
import { loadAlertRules, loadAlertAcks, saveAlertRules as persistAlertRules, saveAlertAcks as persistAlertAcks } from "../config/alerts.js";

export { loadAlertRules, loadAlertAcks };

export function loadFilterHistory() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertFilterHistory") || "[]");
  } catch {
    return [];
  }
}

export function saveFilterHistory(filterHistory) {
  localStorage.setItem("networkExpertFilterHistory", JSON.stringify(filterHistory.slice(0, 40)));
}

export function loadTableProfiles() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertTableProfiles") || "[]");
  } catch {
    return [];
  }
}

export function saveTableProfiles(tableProfiles) {
  localStorage.setItem("networkExpertTableProfiles", JSON.stringify(tableProfiles.slice(0, 30)));
}

export function loadDashboardProfiles() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertDashboardProfiles") || "[]");
  } catch {
    return [];
  }
}

export function saveDashboardProfiles(dashboardProfiles) {
  localStorage.setItem("networkExpertDashboardProfiles", JSON.stringify(dashboardProfiles.slice(0, 24)));
}

export function loadServiceAliases() {
  try {
    return normalizeAliasStore(JSON.parse(localStorage.getItem("networkExpertServiceAliases") || "{}"));
  } catch {
    return {};
  }
}

export function saveServiceAliases(serviceAliases) {
  localStorage.setItem("networkExpertServiceAliases", JSON.stringify(normalizeAliasStore(serviceAliases)));
}

export function loadServiceOverrides() {
  try {
    return normalizeServiceOverrideStore(JSON.parse(localStorage.getItem("networkExpertServiceOverrides") || "{}"));
  } catch {
    return normalizeServiceOverrideStore({});
  }
}

export function saveServiceOverrides(serviceOverrides) {
  localStorage.setItem("networkExpertServiceOverrides", JSON.stringify(normalizeServiceOverrideStore(serviceOverrides)));
}

export function loadTopologyProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem("networkExpertTopologyProfiles") || "{}");
    return Object.fromEntries(Object.entries(saved).map(([scope, profile]) => [scope, normalizeTopologyProfile(profile)]));
  } catch {
    return {};
  }
}

export function loadTopologyForSource(sourceName) {
  return normalizeTopologyProfile(loadTopologyProfiles()[topologyScopeKey(sourceName)]);
}

export function saveTopologyProfiles(topologyProfiles) {
  localStorage.setItem("networkExpertTopologyProfiles", JSON.stringify(topologyProfiles));
}

export function loadAnnotations() {
  try {
    return normalizeAnnotations(JSON.parse(localStorage.getItem("networkExpertAnnotations") || "[]"));
  } catch {
    return [];
  }
}

export function saveAnnotations(annotations) {
  const normalized = normalizeAnnotations(annotations);
  localStorage.setItem("networkExpertAnnotations", JSON.stringify(normalized));
  return normalized;
}

export function loadPrefsRaw() {
  try {
    return JSON.parse(localStorage.getItem("networkExpertPrefs") || "{}");
  } catch {
    return {};
  }
}

export function savePrefsRaw(prefs) {
  localStorage.setItem("networkExpertPrefs", JSON.stringify(prefs));
}

export function loadTableStateRaw() {
  try {
    return JSON.parse(localStorage.getItem(TABLE_STATE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveTableStateRaw(table, tableColumns, defaults) {
  const normalized = normalizeTableState(table, tableColumns, defaults);
  localStorage.setItem(TABLE_STATE_STORAGE_KEY, JSON.stringify(tableStateSnapshot(normalized)));
  return normalized;
}

export function saveAlertRules(alertRules) {
  persistAlertRules(alertRules);
}

export function saveAlertAcks(alertAcks) {
  persistAlertAcks(alertAcks);
}
