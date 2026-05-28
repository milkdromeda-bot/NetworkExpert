export function normalizeSsEditorTheme(value, themes = [], fallback = "") {
  return themes.some(theme => theme.id === value) ? value : fallback;
}

export function ssCommandTimestamp(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function defaultSsLogPath(date = new Date()) {
  return `/tmp/networkexpert_ss_${ssCommandTimestamp(date)}.log`;
}

export function defaultSsCommandConfig(date = new Date()) {
  return {
    timestamp: true,
    loop: false,
    intervalSeconds: "1",
    srcIp: "",
    srcPort: "",
    dstIp: "",
    dstPort: "",
    outputPath: defaultSsLogPath(date),
    appendOutput: true
  };
}

export function parseUiIntervalSeconds(value) {
  const number = Number(String(value || "1").trim().replace(",", "."));
  return Number.isFinite(number) ? number : 1;
}

export function applySsEditorThemePreview({ documentRef = globalThis.document, fallback = "", themes = [], value } = {}) {
  const theme = normalizeSsEditorTheme(value, themes, fallback);
  const panel = documentRef?.querySelector(".ingest-source-panel");
  if (!panel) return;
  themes.forEach(item => panel.classList.remove(`ss-editor-theme-${item.id}`));
  panel.classList.add(`ss-editor-theme-${theme}`);
}

export function readSsCommandConfig(documentRef = globalThis.document) {
  return {
    timestamp: Boolean(documentRef?.querySelector("#ssCmdTimestamp")?.checked),
    loop: Boolean(documentRef?.querySelector("#ssCmdLoop")?.checked),
    intervalSeconds: documentRef?.querySelector("#ssCmdInterval")?.value.trim() || "1",
    srcIp: documentRef?.querySelector("#ssCmdSrcIp")?.value.trim() || "",
    srcPort: documentRef?.querySelector("#ssCmdSrcPort")?.value.trim() || "",
    dstIp: documentRef?.querySelector("#ssCmdDstIp")?.value.trim() || "",
    dstPort: documentRef?.querySelector("#ssCmdDstPort")?.value.trim() || "",
    outputPath: documentRef?.querySelector("#ssCmdOutputPath")?.value.trim() || "",
    appendOutput: Boolean(documentRef?.querySelector("#ssCmdAppend")?.checked)
  };
}

export function updateSsCommandValidation(validation, documentRef = globalThis.document) {
  const ids = {
    intervalSeconds: "ssCmdInterval",
    srcIp: "ssCmdSrcIp",
    srcPort: "ssCmdSrcPort",
    dstIp: "ssCmdDstIp",
    dstPort: "ssCmdDstPort"
  };
  Object.entries(ids).forEach(([key, id]) => {
    const result = validation.fields[key] || { valid: true, message: "" };
    const input = documentRef?.querySelector(`#${id}`);
    const label = input?.closest(".ss-field");
    const message = documentRef?.querySelector(`[data-ss-field-msg="${key}"]`);
    input?.setAttribute("aria-invalid", result.valid === false ? "true" : "false");
    input?.setCustomValidity(result.valid === false ? result.message : "");
    label?.classList.toggle("invalid", result.valid === false);
    label?.classList.toggle("warning", result.valid !== false && result.level === "warning");
    if (message) message.textContent = result.message || (key === "intervalSeconds" ? "e.g. 0.01" : "");
  });
  documentRef?.querySelector("#commandInput")?.classList.toggle("ss-command-stale", !validation.valid);
}
