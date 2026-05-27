export function ssOptionKey(short, long) {
  return short || long;
}

export function ssOptionIntel(intelMap, short, long, desc, group) {
  const key = ssOptionKey(short, long);
  return intelMap[key] || intelMap[long] || intelMap[short] || {
    role: `${group || "ss"} option`,
    adds: desc,
    use: "Enable when this field is needed for the current investigation.",
    missing: "The related context may be unavailable in analysis."
  };
}

export function ssOptionObject(option) {
  const [short, long, desc, group] = option;
  return { short, long, desc, group, key: ssOptionKey(short, long) };
}

export function selectedSsOption(options, active, helpKey = "") {
  const objects = options.map(ssOptionObject);
  return objects.find(option => option.key === helpKey)
    || objects.find(option => active.some(item => ssOptionKey(item.short, item.long) === option.key))
    || objects.find(option => option.key === "-i")
    || objects[0];
}

export function renderSsOptionDetail({ short = "", long = "", desc = "", group = "", key = "" }, ctx = {}) {
  const escapeHtml = ctx.escapeHtml || (value => String(value ?? ""));
  const getIntel = ctx.ssOptionIntel || ((s, l, d, g) => ssOptionIntel({}, s, l, d, g));
  const detailKey = key || ssOptionKey(short, long);
  const intel = getIntel(short, long, desc, group);
  return `
    <article class="ss-option-detail-card">
      <span class="ss-option-kicker">ss option intelligence</span>
      <strong>${escapeHtml(detailKey)}${long && long !== detailKey ? ` <small>${escapeHtml(long)}</small>` : ""}</strong>
      <span class="ss-option-role">${escapeHtml(intel.role)}</span>
      <span>${escapeHtml(desc)}</span>
      <dl>
        <dt>What it adds</dt><dd>${escapeHtml(intel.adds)}</dd>
        <dt>Use it when</dt><dd>${escapeHtml(intel.use)}</dd>
        <dt>If missing</dt><dd>${escapeHtml(intel.missing)}</dd>
      </dl>
    </article>
  `;
}

export function renderSsOptionChip(option, ctx = {}) {
  const escapeHtml = ctx.escapeHtml || (value => String(value ?? ""));
  const getIntel = ctx.ssOptionIntel || ((s, l, d, g) => ssOptionIntel({}, s, l, d, g));
  const key = ssOptionKey(option.short, option.long);
  const intel = getIntel(option.short, option.long, option.desc, option.group);
  return `
    <span class="ss-option-chip-wrap" title="${escapeHtml(`${key}: ${intel.role}. ${option.desc}`)}">
      <span class="chip hot">${escapeHtml(key)}</span>
    </span>
  `;
}

export function renderSsOptionControl(option, coverage, selectedKey, ctx = {}) {
  const escapeHtml = ctx.escapeHtml || (value => String(value ?? ""));
  const getIntel = ctx.ssOptionIntel || ((s, l, d, g) => ssOptionIntel({}, s, l, d, g));
  const [short, long, desc, group] = option;
  const key = ssOptionKey(short, long);
  const intel = getIntel(short, long, desc, group);
  const active = coverage.find(c => c.short === short && c.long === long)?.active;
  return `
    <div class="check ss-option-row ${key === selectedKey ? "selected" : ""}" data-ss-option-help="${escapeHtml(key)}" role="button" tabindex="0" title="${escapeHtml(`Show ${key} details`)}">
      <label class="ss-option-check">
        <input type="checkbox" data-opt="${escapeHtml(key)}" ${active ? "checked" : ""}/>
        <span class="ss-option-code"><b>${escapeHtml(key)}</b><small>${escapeHtml(intel.role)}</small></span>
      </label>
    </div>
  `;
}

export function renderSsCommandBuilder(ctx = {}) {
  const state = ctx.state || {};
  const parseUiIntervalSeconds = ctx.parseUiIntervalSeconds || (value => Number(String(value).replace(",", ".")));
  const validateSsCommandConfig = ctx.validateSsCommandConfig || (() => ({ fields: {} }));
  const escapeHtml = ctx.escapeHtml || (value => String(value ?? ""));
  const defaultSsLogPath = ctx.defaultSsLogPath || (() => "/tmp/networkexpert_ss.log");
  const c = state.ssCommandConfig || {};
  const interval = parseUiIntervalSeconds(c.intervalSeconds);
  const teeRisk = Boolean(c.outputPath && c.appendOutput !== false && c.loop && interval <= 0.05);
  const validation = validateSsCommandConfig(c);
  const fieldClass = key => validation.fields[key]?.valid === false ? "ss-field invalid" : validation.fields[key]?.level === "warning" ? "ss-field warning" : "ss-field";
  const fieldInvalid = key => validation.fields[key]?.valid === false ? ` aria-invalid="true"` : "";
  const fieldMessage = key => escapeHtml(validation.fields[key]?.message || "");
  return `<div class="ss-command-builder">
    <section class="ss-command-group ss-command-group--mode">
      <strong>Collection mode</strong>
      <label class="check inline"><input id="ssCmdTimestamp" type="checkbox" ${c.timestamp !== false ? "checked" : ""}/> Timestamp each run</label>
      <label class="check inline"><input id="ssCmdLoop" type="checkbox" ${c.loop ? "checked" : ""}/> Repeat command</label>
      <label class="ss-interval-field ${fieldClass("intervalSeconds")}"><span>Interval (s)</span><input id="ssCmdInterval" type="text" inputmode="decimal" value="${escapeHtml(c.intervalSeconds || "1")}"${fieldInvalid("intervalSeconds")} /><small data-ss-field-msg="intervalSeconds">${fieldMessage("intervalSeconds") || "e.g. 0.01"}</small></label>
    </section>
    <section class="ss-command-group ss-command-group--filter">
      <strong>Socket filter</strong>
      <label class="${fieldClass("srcIp")} ss-field--ip"><span>Source IP</span><input id="ssCmdSrcIp" spellcheck="false" placeholder="source address" value="${escapeHtml(c.srcIp || "")}"${fieldInvalid("srcIp")} /><small data-ss-field-msg="srcIp">${fieldMessage("srcIp")}</small></label>
      <label class="${fieldClass("srcPort")} ss-field--port"><span>Source port</span><input id="ssCmdSrcPort" inputmode="numeric" placeholder="port" value="${escapeHtml(c.srcPort || "")}"${fieldInvalid("srcPort")} /><small data-ss-field-msg="srcPort">${fieldMessage("srcPort")}</small></label>
      <label class="${fieldClass("dstIp")} ss-field--ip"><span>Destination IP</span><input id="ssCmdDstIp" spellcheck="false" placeholder="destination address" value="${escapeHtml(c.dstIp || "")}"${fieldInvalid("dstIp")} /><small data-ss-field-msg="dstIp">${fieldMessage("dstIp")}</small></label>
      <label class="${fieldClass("dstPort")} ss-field--port"><span>Destination port</span><input id="ssCmdDstPort" inputmode="numeric" placeholder="port" value="${escapeHtml(c.dstPort || "")}"${fieldInvalid("dstPort")} /><small data-ss-field-msg="dstPort">${fieldMessage("dstPort")}</small></label>
    </section>
    <section class="ss-command-group ss-command-group--output">
      <strong>Output</strong>
      <label><span>Log file</span><input id="ssCmdOutputPath" placeholder="${escapeHtml(defaultSsLogPath())}" value="${escapeHtml(c.outputPath || "")}" /></label>
      <label class="check inline"><input id="ssCmdAppend" type="checkbox" ${c.appendOutput !== false ? "checked" : ""}/> Append with tee -a</label>
      <div class="ss-command-warning ${teeRisk ? "" : "hidden"}" data-ss-command-warning><i class="ri-error-warning-line"></i><span>At <b data-ss-warning-interval>${escapeHtml(String(c.intervalSeconds || "1"))}</b>s, terminal output plus <code>tee</code> can become the bottleneck. The recorder may not sustain the requested frequency; prefer local disk, tmpfs, a larger interval, or redirect only if precise cadence matters.</span></div>
    </section>
  </div>`;
}
