import { ACCESS_ROLES, LINUX_PROFILES } from "./expert-config.js";

export function createGuideView(context) {
  const { state, html, icons, escapeHtml, isAnalystRole, isLxcProfile, envCommand, linuxProfileLabel, accessRoleLabel, ubuntuProfileLabel, renderFields, commandForPeer, analysisTabGuide, analysisTabDocs = [] } = context;

  function renderGuide() {
    const tab = state.guideTab || "best";
    const search = state.guideSearch || "";
    const hostEvidence = isAnalystRole()
      ? envCommand("ip -s link show\nbridge link\ntc -s qdisc show\nethtool -S <iface> | egrep -i 'drop|err|timeout|reset|miss|crc'", { host: true })
      : isLxcProfile()
        ? "ip -s link show\nbridge link\nlxc network list\nlxc config show <container> --expanded\ntc -s qdisc show"
        : "ip -s link show\ntc -s qdisc show\nethtool -S <iface>";
    const commands = [
      ["Maximum collection", envCommand("ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all")],
      ["Established TCP with timers", envCommand("ss -HOntepmi --tos --cgroup --inet-sockopt -o state established")],
      ["Sampling every t seconds", envCommand("t=5; while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$t\"; done | tee -a ss-timeseries.log")],
      ["Sampling every t milliseconds", envCommand("t_ms=250; while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$(awk \\\"BEGIN { print $t_ms / 1000 }\\\")\"; done | tee -a ss-timeseries-ms.log")],
      ["Epoch timestamp in milliseconds", envCommand("t_ms=500; while true; do printf 'EPOCH_MS=%s\\n' \"$(date +%s%3N)\"; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$(awk \\\"BEGIN { print $t_ms / 1000 }\\\")\"; done >> ss-epoch-ms.log")],
      ["Quick kernel summary", envCommand("ss -s")],
      ["Top listening ports", envCommand("ss -Hlnptu")],
      [isAnalystRole() ? "Ops handoff: host-side evidence" : "Host-side LXD evidence", hostEvidence],
      ["Compressed long-running collection", envCommand("t=10; while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$t\"; done | gzip -c >> ss-timeseries.log.gz")],
      ["vmstat — CPU and scheduling (1s interval)", "vmstat -t 1 > vmstat.log"],
      ["sar — CPU, memory, IO, network (1s interval)", "sar -u -r -b -n DEV 1 > sar.log"],
      ["nstat — per-second TCP kernel counters", "while true; do nstat -r >/dev/null; sleep 1; echo \"=== $(date --iso-8601=ns) ===\"; nstat -z | egrep 'TcpRetransSegs|TcpExtTCPSynRetrans|TcpExtTCPTimeouts|TcpExtTCPBacklogDrop|TcpExtListenOverflows|TcpExtListenDrops|TcpExtTCPRcvQDrop|TcpExtPruneCalled|TcpExtTCPAbort|TcpExtTCP.*ZeroWindow|TcpExtTCPSACKReorder|IpInDiscards|IpOutDiscards'; done | tee -a nstat-critical.log"],
      ["Complete correlation bundle (all sources)", "# Run all in parallel on the target host:\nvmstat -t 1 > vmstat.log &\nwhile true; do nstat -r >/dev/null; sleep 1; echo \"=== $(date --iso-8601=ns) ===\"; nstat -z | egrep 'Tcp|Ip'; done > nstat.log &\nt=0.1; while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$t\"; done > ss.log &\n# Then load the directory with Auto-detect dir"]
    ];
    const sections = [
      { key: "best", icon: "ri-lightbulb-line", label: "Best Practices" },
      { key: "views", icon: "ri-layout-grid-line", label: "Analysis Views" },
      { key: "monitoring", icon: "ri-line-chart-line", label: "Monitoring" },
      { key: "cases", icon: "ri-route-line", label: "Use Cases" },
      { key: "commands", icon: "ri-terminal-box-line", label: "Commands" },
      { key: "remediation", icon: "ri-first-aid-kit-line", label: "Remediation" },
      { key: "fields", icon: "ri-table-line", label: "Fields" },
      { key: "refs", icon: "ri-video-line", label: "References & Videos" }
    ];
    return html`<div class="guide-shell guide-v2">
      <aside class="guide-sidebar">
        <div class="guide-search-wrap">
          <i class="ri-search-line"></i>
          <input id="guideSearchInput" class="guide-search" type="search" placeholder="Search guide..." value="${escapeHtml(search)}" autocomplete="off"/>
        </div>
        <nav class="guide-nav">
          ${sections.map(s => `<button class="guide-nav-item ${tab === s.key ? "active" : ""}" data-guide-tab="${s.key}"><i class="${s.icon}"></i><span>${s.label}</span></button>`).join("")}
        </nav>
        <div class="guide-context-card">
          <strong>${escapeHtml(linuxProfileLabel())}</strong>
          <span>${escapeHtml(accessRoleLabel())} · ${escapeHtml(ubuntuProfileLabel())}</span>
        </div>
      </aside>
      <main class="guide-content">
        ${tab === "best" ? renderGuideBestPractices() : ""}
        ${tab === "views" ? renderGuideAnalysisViews() : ""}
        ${tab === "monitoring" ? renderGuideMonitoring() : ""}
        ${tab === "cases" ? renderGuideUseCases() : ""}
        ${tab === "commands" ? commands.map(([title, cmd], index) => renderGuideCommandCard(title, cmd, index)).join("") : ""}
        ${tab === "remediation" ? renderGuideRemediation() : ""}
        ${tab === "fields" ? renderFields() : ""}
        ${tab === "refs" ? renderGuideReferences() : ""}
      </main>
    </div>`;
  }
  
  function renderGuideRemediation() {
    const rows = [
      ["Socket drops / buffer overflow", "sudo sysctl -w net.core.rmem_max=16777216\nsudo sysctl -w net.ipv4.tcp_rmem='4096 131072 16777216'", "Increase receive buffer to prevent drops under burst"],
      ["Retransmissions / path loss", "mtr --report --report-cycles 100 <PEER_IP>\nethtool -S <INTERFACE> | grep -i 'error\\|drop\\|crc'", "Identify where packets are lost on the path"],
      ["High RTT / latency", "mtr --tcp --port 443 --report <PEER_IP>\nss -ti dst <PEER_IP> | grep rtt", "Pinpoint latency source (network vs app)"],
      ["RTO backoff / timeouts", "sysctl net.ipv4.tcp_keepalive_time net.ipv4.tcp_keepalive_intvl\nss -to dst <PEER_IP>", "Check if connection is stuck in backoff"],
      ["Recv-Q growing / slow consumer", "ss -tnp | awk '$2 > 0'\nsudo sysctl -w net.core.somaxconn=4096", "App not reading fast enough — increase backlog or fix app"],
      ["Window scaling / autotuning", "sysctl net.ipv4.tcp_window_scaling\nsudo sysctl -w net.ipv4.tcp_rmem='4096 131072 67108864'", "Ensure window can grow to match BDP"],
      ["Send-Q growing / peer not ACKing", "ss -tnp | awk '$3 > 0'\ntcpdump -i <IF> -c 100 dst <PEER_IP> and tcp[tcpflags] & tcp-ack != 0", "Peer is slow or path is congested"],
      ["GC pause / JVM stall", "jstat -gcutil <PID> 1000\njcmd <PID> GC.heap_info", "Check if GC pauses correlate with TCP symptoms"],
      ["CPU scheduling / runqueue", "vmstat 1 10\nmpstat -P ALL 1 5\npidstat -u -p <PID> 1 5", "Check if CPU saturation causes network delays"],
      ["NIC ring buffer overflow", "ethtool -g <INTERFACE>\nsudo ethtool -G <INTERFACE> rx 4096", "Increase NIC ring buffer if rx_missed > 0"]
    ];
    return `<div class="guide-section"><h2><i class="ri-first-aid-kit-line"></i> Remediation Cheat Sheet</h2>
      <p style="color:var(--muted);margin-bottom:12px">Click any command to copy. Replace &lt;PEER_IP&gt;, &lt;INTERFACE&gt;, &lt;PID&gt;, &lt;PORT&gt; with your values.</p>
      <table class="guide-pattern-table">
        <thead><tr><th>Problem</th><th>Commands</th><th>Why</th></tr></thead>
        <tbody>${rows.map(([problem, cmds, why]) => `<tr>
          <td><strong>${problem}</strong></td>
          <td><pre class="code" style="margin:0;font-size:11px;padding:6px 10px;border-radius:4px;background:rgba(0,0,0,0.3);cursor:pointer;white-space:pre-wrap" data-copy-cmd="${cmds.replace(/"/g, '&quot;')}" title="Click to copy">${cmds}</pre></td>
          <td>${why}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
  }


  function renderGuideCommandCard(title, command, index) {
    const key = `guide-command-${index}`;
    const copied = state.copiedGuideCommand === key;
    return `<article class="guide-card guide-command-card" data-guide-command-card>
      <header class="guide-command-head">
        <strong>${escapeHtml(title)}</strong>
        <button class="copy-command-button ${copied ? "copied" : ""}" data-action="copyGuideCommand" data-command-key="${escapeHtml(key)}" title="Copy command to clipboard" aria-label="Copy ${escapeHtml(title)} command">
          ${copied ? `<i class="ri-check-line"></i> Copied` : `${icons.copy} Copy`}
        </button>
      </header>
      <pre class="code">${escapeHtml(command)}</pre>
    </article>`;
  }

  function renderGuideAnalysisViews() {
    const active = analysisTabGuide?.("diagnosis") || analysisTabDocs[0];
    const docs = analysisTabDocs.length ? analysisTabDocs : active ? [active] : [];
    return `<div class="analysis-view-guide-modal guide-analysis-views">
      <section class="analysis-view-guide-hero">
        <div>
          <span class="tooltip-kicker">Analysis navigation</span>
          <strong>Choose the right view for the question</strong>
          <p>Analysis views move from high-level hypotheses to raw socket evidence. Start broad, then drill into the exact proof before deciding root cause.</p>
        </div>
        <ol>
          <li><b>Start with Diagnosis</b> for prioritized hypotheses.</li>
          <li><b>Use Advisor</b> for next checks and mitigation direction.</li>
          <li><b>Verify in Sockets, Timeline, Charts, or Expert</b> before deciding root cause.</li>
        </ol>
      </section>
      <section class="analysis-view-guide-grid">
        ${docs.map(tab => `<article class="field-card analysis-view-guide-card">
          <header><span>${escapeHtml(tab.label)}</span></header>
          <p>${escapeHtml(tab.short)}</p>
          <dl>
            <div><dt>Use it when</dt><dd>${escapeHtml(tab.use)}</dd></div>
            <div><dt>Shows</dt><dd>${escapeHtml(tab.shows)}</dd></div>
            <div><dt>Best next move</dt><dd>${escapeHtml(tab.next)}</dd></div>
          </dl>
        </article>`).join("")}
      </section>
    </div>`;
  }

  function renderGuideMonitoring() {
    const tabs = [
      {
        name: "Metrics",
        icon: "ri-line-chart-line",
        purpose: "Real-time and historical visualization of individual TCP metrics across timestamped snapshots.",
        features: [
          "Multi-metric chart grid with configurable layout (1–4 columns, compact/tall density)",
          "Synchronized crosshairs across all charts — hover one, see the same instant on all others",
          "Drag-to-zoom on any chart to isolate a time window",
          "Zoom/Pan/Reset controls per chart and global",
          "Threshold lines (comfort/warning/danger) overlaid on each metric",
          "Chart statistics panel with percentile distribution (P50/P95/P99/P99.9)",
          "Dashboard presets: NOC, Deep investigation, Single metric focus",
          "Save/load custom dashboard configurations"
        ],
        workflow: "Select metrics from the checkbox bar → arrange layout → use crosshairs to correlate events across metrics → drag-zoom into anomalies → export charts as PNG or include in incident report.",
        tips: [
          "Enable 'Sync crosshairs' in Layout preferences to see the same timestamp across all charts simultaneously.",
          "Use the Microburst preset to focus on RX bandwidth, Recv-Q, skmem, and drops together.",
          "Right-click on a chart to add a timestamped annotation at that exact point."
        ]
      },
      {
        name: "BDP & Throughput",
        icon: "ri-speed-line",
        purpose: "Bandwidth-Delay Product analysis — compare observed throughput with the theoretical maximum allowed by the TCP receive window and RTT.",
        features: [
          "Window-limited theoretical throughput chart (Mbps over time)",
          "Observed BDP vs effective window chart (bytes over time)",
          "Clickable legends to isolate individual series",
          "Y-axis auto-scales to visible series for detail on low-value metrics",
          "Configurable link capacity (100 Mbps to 50 Gbps) adds a reference line",
          "Direction selector: Inbound (bytes_received) or Outbound (bytes_sent)",
          "Synchronized crosshairs between both charts with detailed tooltip"
        ],
        workflow: "Set Direction (inbound/outbound) → optionally set Capacity → read the charts: if observed throughput tracks the window-limited line, the TCP window is the bottleneck, not the physical link.",
        tips: [
          "If 'Max by window' and 'Observed' overlap, the receive window is limiting throughput — investigate rcv_space, wscale, or receiver application speed.",
          "Set Capacity to your known link speed to see the 'Configured capacity' reference line and the 'Target BDP' on the BDP chart.",
          "Hide high-value series (click legend) to auto-scale Y-axis and see detail on lower metrics."
        ]
      },
      {
        name: "JVM Stall / GC Correlation",
        icon: "ri-brain-line",
        purpose: "Correlate Java GC pauses and safepoints with TCP symptoms to determine if JVM stop-the-world events cause slow consumer behavior.",
        features: [
          "Stream-parse large GC logs (50 MB+) without freezing the browser",
          "Receiver mode: detect Recv-Q rise, rcv_space drop, persist/zero-window after GC pause",
          "Sender mode: detect Send-Q rise, RTT spike, cwnd drop when remote receiver GC stalls",
          "Correlation score (0–1) with multi-signal validation and counter-evidence",
          "GC bars colored by type: Young (green), Mixed (yellow), Full/Remark (red), Safepoint (purple)",
          "Scatter plot: pause duration vs delta metric — click to zoom timeline",
          "TCP state change annotations (ESTAB → FIN-WAIT)",
          "Send-Q plateau detection (>3s sustained backpressure)",
          "Optional pidstat/nstat import for CPU scheduling correlation",
          "G1-specific recommendations (Full GC, evacuation failure, humongous, CPU starvation)"
        ],
        workflow: "Choose mode (Receiver/Sender) → Load GC log → review correlation score and severity → use scatter plot to identify worst pauses → click to zoom timeline → validate with pidstat if CPU scheduling is suspected.",
        tips: [
          "A score of 0 does not mean the GC is harmless — it means ss snapshots were too sparse to capture the effect. Increase sampling frequency.",
          "In Sender mode, look for Send-Q plateaus coinciding with GC bars on the remote receiver.",
          "Load pidstat output to confirm whether GC pauses coincide with CPU wait spikes or context switch storms.",
          "Use the severity filter to focus on warning+ events and hide noise from short young GCs.",
          "The recommended JVM logging flags are shown in the import panel — use them for production-grade GC observability."
        ]
      },
      {
        name: "FIX Latency Correlation",
        icon: "ri-exchange-line",
        purpose: "Correlate FIX protocol message latency (tag 52 vs server receive time) with TCP socket state, kernel counters, CPU scheduling, and GC pauses to identify the root cause of trading message delays.",
        features: [
          "Parse FIX application logs (.log, .txt, .gz, .zip) — supports multi-file and directory loading",
          "Auto-detect directory: load ss + GC + vmstat + nstat + FIX from a single folder",
          "Endpoint matching: correlates FIX session IP:port with ss socket peers (IPv4, IPv6, IPv4-mapped)",
          "Multi-source correlation: ss (per-socket retrans, RTT, Recv-Q, cwnd), nstat (host-wide TCP counters/s), vmstat (CPU runqueue, scheduling), GC (JVM pauses)",
          "Cause classification: Network / Kernel / CPU / GC / Unknown with confidence score 0–1",
          "4 interactive charts: Lag timeline + Recv-Q overlay, Lag vs Score scatter, CPU + Run Queue, TCP Drops & Retrans",
          "GC freeze zones: visual overlay showing JVM Stop-The-World periods on the timeline",
          "Per-chart zoom/pan/reset, clickable legends to show/hide series, crosshair tooltips",
          "Configurable lag threshold (1–100ms), GC window (auto or manual), CPU cores for runqueue threshold",
          "Click table rows to highlight the corresponding point on charts"
        ],
        workflow: "Load ss file → load FIX logs (or use Auto-detect dir) → optionally add vmstat/nstat/GC → set lag threshold → review cause breakdown → zoom into spike clusters → click table rows to locate on charts → use legends to isolate series.",
        tips: [
          "nstat counters are host-wide (all sockets). On a busy host, nstat retrans correlation may be coincidental — ss per-socket evidence is more reliable.",
          "If all causes are 'Unknown', the network is innocent. The TCP socket was healthy at spike time. Look at application thread-pool scheduling or process-level delays.",
          "Use 'auto' GC window — it calculates 2× average pause duration automatically from the GC log.",
          "Set CPU cores to your actual logical CPU count for accurate runqueue threshold detection.",
          "Dot colors represent correlation strength (not lag severity): critical = strong cause evidence, none = healthy socket at spike time."
        ]
      },
      {
        name: "Advisor",
        icon: "ri-compass-3-line",
        purpose: "Investigation context and tail-latency analysis for the selected socket — guides the next diagnostic step.",
        features: [
          "Investigation context card showing the selected socket's anomalies and key metrics",
          "Tail-latency lens: P95/P99/P99.9 analysis with worst-window detection",
          "Zoom to worst window button for instant focus on the sharpest degradation",
          "Guided checklist linking to Charts and Analysis views"
        ],
        workflow: "Select a socket in Analysis → switch to Monitoring/Advisor → review the investigation context → use 'Zoom worst window' to jump to the tail-latency event → correlate with other tabs.",
        tips: [
          "The Advisor tab requires a socket to be selected. Choose one from the Analysis view first.",
          "Tail-latency analysis is most useful when you have high-frequency timestamped snapshots (≤1s interval).",
          "Use the guided checklist to systematically validate each hypothesis before concluding."
        ]
      }
    ];
    return `<div class="guide-monitoring-shell">
      <section class="guide-monitoring-hero">
        <span class="tooltip-kicker">Monitoring view</span>
        <strong>Real-time correlation and deep metric analysis</strong>
        <p>The Monitoring view provides five specialized sub-tabs for different investigation depths. Use Metrics for broad overview, BDP for throughput bottleneck analysis, JVM Stall for GC correlation, FIX Latency for trading message delay root-cause analysis, and Advisor for guided investigation of a specific socket.</p>
      </section>
      <div class="guide-monitoring-grid">
        ${tabs.map(t => `<article class="guide-card guide-monitoring-card">
          <header><i class="${t.icon}"></i><strong>${escapeHtml(t.name)}</strong></header>
          <p class="guide-monitoring-purpose">${escapeHtml(t.purpose)}</p>
          <section><h4>Features</h4><ul>${t.features.map(f => `<li>${escapeHtml(f)}</li>`).join("")}</ul></section>
          <section><h4>Workflow</h4><p>${escapeHtml(t.workflow)}</p></section>
          <section><h4>Pro tips</h4><ul class="guide-tips">${t.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join("")}</ul></section>
        </article>`).join("")}
      </div>
    </div>`;
  }

  function renderGuideBestPractices() {
    return `
      <article class="guide-card"><strong>1. Collect the right fields first</strong><p>Start with -H -O -n -t -u -e -p -m -i --tos --cgroup --inet-sockopt -a -A all. In analyst mode, run it from inside the container without sudo; process fields may be partial. Ops/root can add sudo or lxc exec when needed.</p></article>
      ${isLxcProfile() ? `<article class="guide-card"><strong>2. LXC/LXD namespace rule</strong><p>${isAnalystRole() ? "Default analyst mode: run ss, ip route, and local checks inside the container. If symptoms point to host path loss, request host veth, bridge, qdisc, ethtool, and softnet evidence from ops/root." : "Ops/root mode: collect socket evidence with lxc exec, then collect route, veth, bridge, qdisc, ethtool, and softnet evidence on the LXD host."}</p></article>` : ""}
      <article class="guide-card"><strong>2. Keep collection overhead under control</strong><p>For thousands of sockets, prefer -n -H -O, filter by state/sport/dport/dev/cgroup, and increase the sampling interval. Avoid name resolution and expensive BPF details unless needed.</p></article>
      <article class="guide-card"><strong>3. Always timestamp snapshots</strong><p>Use date --iso-8601=ns or EPOCH_MS before every ss snapshot so queues, RTT, RTO, drops, and buffer pressure can be correlated over time.</p></article>
      <article class="guide-card microburst-guide-card">
        <strong>4. Microburst guide</strong>
        <p>Microbursts are short receive-side pressure windows where RX bandwidth, Recv-Q, socket receive memory, and drops rise together. In Charts, NetworkExpert marks the detected window with yellow bands so you can align the burst across several metrics at once.</p>
        <div class="guide-card-actions">
          <button class="primary" data-action="sampleMicroburst">${icons.chart} Load microburst sample</button>
        </div>
      </article>
      <article class="guide-card microburst-guide-card">
        <strong>5. Tail latency guide</strong>
        <p>Tail latency is about the extremes, not the average. Use it when short RTT or RTO spikes matter more than the median. The Tail latency lens highlights the worst short window, shows P95/P99/P99.9 behavior, and lets you jump straight to the sharpest degradation.</p>
        <div class="guide-card-actions">
          <button class="primary" data-action="sampleTailLatency">${icons.chart} Load tail latency sample</button>
        </div>
      </article>
      <article class="guide-card"><strong>6. Receive backlog sanity check</strong><p>If socket drops say "dropped before demultiplexing" during RX bursts, check sysctl net.core.netdev_max_backlog. A value of 1000 is plausible on Ubuntu defaults and can be too small for burst-heavy NIC/GRO/LRO delivery. Confirm with /proc/net/softnet_stat first; then test sudo sysctl -w net.core.netdev_max_backlog=10000 and persist only after before/after evidence.</p></article>
      <article class="guide-card"><strong>7. Store raw evidence</strong><p>Write to .log, .gz, or .zip so you can re-run analysis offline and compare with application, host, and network telemetry.</p></article>`;
  }
  
  function renderGuideUseCases() {
    const quickRef = `<div class="guide-quick-ref" style="margin-bottom:16px;overflow-x:auto"><table class="guide-pattern-table"><thead><tr><th>Pattern</th><th>Detected via ss</th><th>Root cause side</th></tr></thead><tbody><tr><td><code>slow-consumer</code></td><td>Consumer (Recv-Q local)</td><td><span class="badge">Consumer (slow application)</span></td></tr><tr><td><code>path-blackhole</code></td><td>Sender (RTO / backoff)</td><td><span class="badge">Network (intermediate equipment)</span></td></tr><tr><td><code>peer-stopped-reading</code></td><td>Sender (Send-Q / persist)</td><td><span class="badge">Consumer (frozen application)</span></td></tr><tr><td><code>congestion-event</code></td><td>Sender (retrans / cwnd)</td><td><span class="badge">Network (saturated link)</span></td></tr><tr><td><code>buffer-exhaustion</code></td><td>Consumer (skmem.d / drops)</td><td><span class="badge">Kernel (memory pressure)</span></td></tr></tbody></table></div>`;
    const cases = [
      {
        title: "1. Slow consumer or congested send path",
        group: "investigation",
        summary: "Start here when Send-Q, skmem.t, or transmit memory grows. The key question is whether the peer is slow, the path is congested, or the local application is overproducing.",
        signals: ["Send-Q rising over time", "skmem.t or skmem.w near transmit limits", "TX bandwidth flat or falling", "RTO/backoff rising", "cwnd or pacing_rate collapsing"],
        decide: [
          "Send-Q high + RTO/backoff high + low cwnd: investigate network loss, shaping, qdisc, MTU, or route instability.",
          "Send-Q high + RTO normal + one peer affected: suspect peer slow-consumption or peer-side application latency.",
          "Send-Q high across many peers + local process writes heavily: suspect local producer/backpressure design.",
          "TX bandwidth low while delivery_rate/pacing_rate low: TCP is limiting the flow, not just the application."
        ],
        next: ["Open Charts: Send-Q vs TX bandwidth, Send-Q vs RTO, cwnd vs pacing rate.", "Group by peer. If one peer dominates, investigate that remote side first.", "On LXC/LXD, confirm host veth/bridge/qdisc/NIC counters before tuning container buffers."],
        commands: [commandForPeer(state.sockets[0]), envCommand("ss -tinpm state established"), envCommand("ip -s route get <peer-ip>", { host: true }), envCommand("tc -s qdisc show", { host: true }), envCommand("nstat -az | egrep 'Retrans|Timeout|TCPLoss|TCPAbort'", { host: true })],
        mitigation: "Apply backpressure or rate limits first. Increase tcp_wmem only after proving memory headroom and after ruling out loss/qdisc/peer slowness."
      },
      {
        title: "2. Local application not reading fast enough",
        group: "investigation",
        summary: "Use this path when Recv-Q or receive socket memory grows. The likely owner is often the local process, runtime, scheduler, or worker pool.",
        signals: ["Recv-Q sustained above warning", "skmem.r or skmem.rb high", "RX bandwidth continues while application-level throughput stalls", "Drops appear after receive bursts", "One process or one local port dominates"],
        decide: [
          "Recv-Q high + process concentrated on one service: inspect that PID, event loop, worker pool, GC, blocking I/O, or database/file dependencies.",
          "Recv-Q high + CPU run queue or pidstat pressure: suspect CPU starvation or scheduler latency.",
          "Recv-Q high + skmem.d increasing: receive-side buffering is failing; collect host softnet/NIC/drop evidence.",
          "Recv-Q high across many services: suspect host/container CPU, memory pressure, or shared network namespace bottleneck."
        ],
        next: ["Group by process and local port.", "Chart Recv-Q vs RX bandwidth and Recv-Q vs skmem.r.", "Compare socket symptoms with application logs at the same timestamps."],
        commands: [envCommand("ss -tinpm state established"), envCommand("pidstat -druwt -p <pid> 1"), envCommand("top -H -p <pid>"), envCommand("strace -tt -p <pid> -e trace=network"), envCommand("sysctl net.ipv4.tcp_rmem net.core.rmem_max")],
        mitigation: "Fix the read loop, worker saturation, or backpressure. Tune rmem only as a controlled burst-absorption change, not as a substitute for draining data."
      },
      {
        title: "3. Packet loss, jitter, or path instability",
        group: "investigation",
        summary: "This path is for RTO spikes, RTT variance, retransmission timers, backoff, low cwnd, pacing collapse, or socket drops.",
        signals: ["RTO jumps above warning/danger", "RTT variance rises before timeout", "backoff non-zero", "retrans timer count grows", "cwnd drops sharply", "skmem.d non-zero"],
        decide: [
          "High RTO + high RTT variance: suspect jitter, delayed ACKs, overloaded peer, or unstable path.",
          "High RTO + backoff + low cwnd: prioritize packet loss or congestion-control recovery.",
          "Only one destination affected: check route, peer network, firewall, load balancer, or remote host.",
          "Many destinations affected: check host interface, qdisc, bridge/veth, NIC, virtualization, or upstream network."
        ],
        next: ["Use expert correlation RTT variance vs RTO, then Backoff vs RTO.", "Compare a bad peer with a healthy peer collected at the same time.", "Collect route, qdisc, NIC, and softnet counters from the correct namespace/host."],
        commands: [envCommand("ss -ti dst <peer-ip>"), envCommand("ip -s route get <peer-ip>", { host: true }), envCommand("ip -s link show dev <iface>", { host: true }), envCommand("ethtool -S <iface> | egrep -i 'drop|err|timeout|reset|miss|crc'", { host: true }), envCommand("tracepath <peer-ip>", { host: true })],
        mitigation: "Do not hide loss by blindly increasing buffers. Fix drops, qdisc shaping, MTU mismatch, overloaded virtual bridge, NIC errors, or peer/network instability."
      },
      {
        title: "4. Socket buffer and memory pressure",
        group: "investigation",
        summary: "Use this when skmem.r, skmem.t, rb/tb, w, bl, or d are high. The goal is to know whether buffers are absorbing a burst or masking a sustained bottleneck.",
        signals: ["skmem.r high with Recv-Q high", "skmem.t or skmem.w high with Send-Q high", "skmem.d increasing", "rb/tb close to configured limits", "Many sockets consuming memory at once"],
        decide: [
          "High skmem.r + high Recv-Q: local receiver is not draining fast enough.",
          "High skmem.t + high Send-Q: peer/path cannot drain outbound data fast enough.",
          "Drops with high memory pressure: collect kernel memory, softnet, NIC, and backlog evidence immediately.",
          "Buffers high but queues stable and no drops: may be normal burst absorption; watch trend before tuning."
        ],
        next: ["Open socket details and compare r/rb/t/tb/w/bl/d.", "Chart skmem.r, skmem.t, drops, Send-Q, and Recv-Q together.", "Check system-wide memory and TCP buffer sysctls."],
        commands: [envCommand("ss -tinpm"), envCommand("sysctl net.core.netdev_max_backlog net.ipv4.tcp_rmem net.ipv4.tcp_wmem net.ipv4.tcp_mem net.core.rmem_max net.core.wmem_max"), envCommand("cat /proc/net/softnet_stat", { host: true }), envCommand("nstat -az | egrep 'Prune|Collapse|Rcv|Drop|Memory'", { host: true }), envCommand("cat /proc/net/sockstat /proc/net/sockstat6", { host: true })],
        mitigation: "Tune backlog and buffers with guardrails: if softnet drops rise and netdev_max_backlog is 1000, test 10000 before larger socket buffers; define memory/latency budget and keep before/after ss timelines."
      },
      {
        title: "5. LXC/LXD namespace split: container symptom or host network problem?",
        group: "investigation",
        summary: "In LXC/LXD, ss inside the container sees the container network namespace. Host bridge, veth, qdisc, NIC, and route evidence may live outside the container.",
        signals: ["Container sockets show queues but host counters show drops", "Only containers on one bridge are affected", "veth/bridge qdisc backlog grows", "Container route differs from host route", "Missing process or cgroup context"],
        decide: [
          "Only one container/service affected: start with container process, Recv-Q/Send-Q, cgroup, and local port.",
          "Several containers on same bridge affected: inspect LXD bridge, veth pairs, host qdisc, firewall, and MTU.",
          "Host NIC errors/drops increase: continue on the host/network path, not only inside the container.",
          isAnalystRole() ? "Container ss lacks process ownership: keep the gap explicit, or ask ops/root for privileged recollection." : "Container ss lacks process ownership: recollect with lxc exec and sufficient privileges."
        ],
        next: isAnalystRole()
          ? ["Collect container-local ss and route evidence for the same incident window.", "If host evidence is needed, hand off a precise request to ops/root.", "Keep timestamps aligned across analyst and ops collections."]
          : ["Collect both container-local ss and host-side interface/qdisc evidence for the same incident window.", "Map container interface to host veth/bridge.", "Keep timestamps aligned across container and host collections."],
        commands: [
          envCommand("ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all"),
          envCommand("ip route"),
          envCommand("ip addr show"),
          envCommand("lxc list", { host: true }),
          envCommand("lxc config show <container> --expanded", { host: true }),
          envCommand("ip -s link show", { host: true }),
          envCommand("bridge link", { host: true }),
          envCommand("tc -s qdisc show", { host: true })
        ],
        mitigation: "Avoid container-only tuning when host-side veth/bridge/NIC evidence points elsewhere. Escalate with both namespaces in the evidence bundle."
      },
      {
        title: "6. Root Cause Matrix and Confidence Scoring",
        group: "intelligence",
        summary: "Use the Diagnosis tab to see the Root Cause Matrix — a single view showing all possible causes ranked by signal confidence. Each hypothesis includes what would confirm or reject it.",
        signals: ["Multiple competing hypotheses visible", "Ambiguous flag when two causes are close", "Confidence percentage per cause", "Present/absent signal count"],
        decide: [
          "Top cause >60% with no ambiguity: focus investigation on that hypothesis first.",
          "Ambiguous flag active: collect more evidence before choosing a path — use the 'What would confirm/reject' section.",
          "All causes <30%: the capture may lack critical fields — check Capture Quality tab first.",
          "Multiple causes >50%: they may be correlated (e.g., slow consumer causes buffer pressure). Read both playbooks."
        ],
        next: ["Open the Hypotheses toggle to see detailed evidence cards.", "Expand 'What would confirm or reject' on the top hypothesis.", "Follow the Playbook for the top cause."],
        commands: [envCommand("ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all")],
        mitigation: "Never act on a single hypothesis without checking counter-evidence. The matrix shows competing explanations — use it to avoid premature conclusions."
      },
      {
        title: "7. Timeline Stories — causal narrative",
        group: "intelligence",
        summary: "The Timeline tab detects causal patterns across snapshots and tells the story: what happened, in what order, and what it means. Toggle between Stories (narrative) and All Events (raw list).",
        signals: ["Send-Q grow → persist → FIN = peer stopped reading", "Recv-Q grow → drops = local overload", "RTO escalate → backoff high = path dead", "cwnd collapse → retrans = congestion event", "rwnd_limited >50% = sender throttled by receiver window"],
        decide: [
          "Story at 100% match: high confidence — the full causal chain was observed.",
          "Story at 60-80%: partial match — some steps are missing, collect more snapshots.",
          "No stories detected: capture may be too short or too few snapshots. Need ≥3 timestamped samples.",
          "Multiple stories on same socket: read them in chronological order — they may be phases of the same incident."
        ],
        next: ["Check the timestamps in the narrative against application logs or GC logs.", "Use the Playbook from the matching hypothesis.", "If no story matches, switch to All Events for the raw chronological view."],
        commands: [envCommand("while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep 1; done | tee -a /tmp/capture.log")],
        mitigation: "Stories are pattern-based, not proof. Always validate with packet captures or application-level evidence before acting."
      },
      {
        title: "8. Multi-socket correlation — common cause detection",
        group: "intelligence",
        summary: "Detects when multiple sockets share the same symptom simultaneously, grouped by PID or peer. This identifies a common cause and orients the diagnostic: same PID + different peers → process/JVM suspect; same peer + multiple PIDs → peer or path suspect.",
        signals: ["N sockets enter persist at the same snapshot", "Recv-Q jumps on all sockets of one PID", "Send-Q grows to all connections toward one peer", "Drops appear on multiple sockets simultaneously"],
        decide: [
          "Same PID + different peers + RTT stable + no retrans: strongly suggests process-level issue (GC, deadlock, event loop).",
          "Same peer + multiple PIDs: could be peer application, peer kernel, or network path to that peer.",
          "Same host + multiple processes: suspect host/NIC/bridge/qdisc/CPU steal, not individual processes.",
          "Partial ratio (50-80%): some connections affected — check thread pool saturation or partial resource exhaustion."
        ],
        next: ["Check the Timeline Stories tab for group events (orange border).", "Correlate the timestamp with GC logs or application logs.", "Use the Playbook for the matching hypothesis."],
        commands: [envCommand("ss -tinpm state established | egrep 'persist|Recv-Q'"), envCommand("jstack <pid>"), envCommand("jstat -gcutil <pid> 1000 5")],
        mitigation: "If process-wide freeze is confirmed, focus on JVM/application tuning, not network tuning. The network is a victim, not the cause."
      },
      {
        title: "9. Before/After comparison — incident detection",
        group: "intelligence",
        summary: "Load a healthy capture as baseline, then load the incident capture (or vice versa). The Compare tab shows exactly what changed: metrics that exploded, new peers, new anomalies, and an automatic verdict.",
        signals: ["Recv-Q or Send-Q delta >100KB", "New peers appeared", "persist timer appeared where absent before", "Drops grew from 0", "rcv_ssthresh dropped significantly"],
        decide: [
          "Verdict says 'Slow consumer onset' + RTT stable: the network is fine, fix the application.",
          "Verdict says 'Network degradation' + RTT/retrans grew: investigate the path with mtr/traceroute.",
          "Verdict says 'Buffer exhaustion' + drops grew: the receiver is overwhelmed — check process and buffers.",
          "No significant change: the incident may not be visible in ss — check application logs, GC, or packet captures."
        ],
        next: ["Use the bidirectional workflow: 'This is healthy' or 'This is the incident' depending on which capture you loaded first.", "After comparison, jump to the Diagnosis tab for the detailed hypothesis on the incident capture.", "Export the comparison as part of your post-mortem evidence."],
        commands: [envCommand("# Collect baseline during normal operation"), envCommand("while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep 1; done | tee -a /tmp/baseline.log"), envCommand("# Collect during incident with same command"), envCommand("while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep 1; done | tee -a /tmp/incident.log")],
        mitigation: "Always compare with the same ss options and similar duration. A 5-second capture vs a 60-second baseline will produce misleading deltas."
      },
      {
        title: "10. Integrated Playbooks",
        group: "workflow",
        summary: "Each diagnostic hypothesis includes a contextual Playbook with commands for local, peer, and host sides, plus explicit warnings about what NOT to conclude and prudent mitigation steps.",
        signals: ["Playbook available on hypothesis cards in Diagnosis tab", "Commands pre-filled with actual PID, peer IP, interface", "Sections: Local, Peer, Host, Do NOT conclude, Mitigation"],
        decide: [
          "Playbook shows local commands with PID: run them on the machine where the capture was taken.",
          "Playbook shows peer commands: you need access to the remote side or ask the peer team.",
          "Do NOT conclude section warns against a common mistake: read it before acting.",
          "Mitigation is marked 'prudent': it is safe to try but may not fix the root cause."
        ],
        next: ["Copy commands from the Playbook and run them during the incident window.", "Correlate Playbook output with the Timeline stories.", "If the Playbook suggests GC/thread investigation, import the GC log in the JVM tab."],
        commands: [envCommand("# Playbook commands are auto-generated from your capture context"), envCommand("# Example: pidstat -druwt -p <detected-pid> 1 5")],
        mitigation: "Playbooks guide investigation, not resolution. Always validate before applying tuning suggestions."
      },
      {
        title: "11. Exposed listeners and missing ownership",
        group: "workflow",
        summary: "Use this when LISTEN sockets are wildcard-bound, unexpected, or missing process ownership. It is a security and operability check, not only a performance check.",
        signals: ["LISTEN on 0.0.0.0 or ::", "Unknown process field", "Unexpected public service port", "Many listeners in a container", "Port bound in the wrong namespace"],
        decide: [
          "Wildcard listener is expected and firewalled: document it and keep ownership visible.",
          "Wildcard listener unexpected: check service config, systemd unit, container profile, and firewall exposure.",
          "Process missing: rerun with sudo -p or container-local privileges.",
          "Listener appears in container but not host: verify LXD proxy/device/network exposure."
        ],
        next: ["Filter LISTEN sockets by local port and process.", "Validate bind address against intended exposure model.", "Check firewall and LXD profile/device configuration."],
        commands: [envCommand("ss -Hlnptu"), envCommand("ss -HOntepmi --cgroup --inet-sockopt -a -A all"), envCommand("lsof -nP -iTCP -sTCP:LISTEN", { host: true }), envCommand("systemctl status <service>", { host: true }), envCommand("lxc config show <container> --expanded", { host: true })],
        mitigation: "Bind explicitly where possible, document intentional wildcard listeners, and keep process attribution in routine collections."
      },
      {
        title: "12. Congestion window phases — slow-start, avoidance, recovery",
        group: "intelligence",
        summary: "The cwnd chart now classifies each snapshot into a TCP congestion control phase. This reveals whether the connection is ramping up (slow-start), cruising (congestion avoidance), recovering from loss (fast recovery), or actively losing packets.",
        signals: ["cwnd doubles between snapshots → slow-start", "cwnd grows by ~1 segment/RTT → congestion avoidance", "cwnd drops >30% with retransmission → loss event", "cwnd climbs back toward previous peak → fast recovery", "cwnd = 0 → idle / no data in flight"],
        decide: [
          "Mostly slow-start: connection is short-lived or was recently idle. Normal for HTTP request/response patterns.",
          "Mostly congestion-avoidance: connection is long-lived and stable. Throughput is bounded by cwnd × MSS / RTT.",
          "Frequent loss → recovery cycles: path is lossy or congested. Correlate with RTT spikes and retransmission counters.",
          "Stuck in recovery (never reaches previous peak): persistent congestion or aggressive shaping. Check qdisc, policer, or intermediate device.",
          "Sudden transition from avoidance to loss across multiple sockets: shared event (link flap, route change, NIC error)."
        ],
        next: ["Open Monitoring → Metrics and select cwnd + RTT + retrans together.", "Look for synchronized loss events across multiple sockets (Multi-socket correlation).", "Compare cwnd behavior with pacing_rate and delivery_rate to confirm throughput impact."],
        commands: [envCommand("ss -ti dst <peer-ip> | grep cwnd"), envCommand("nstat -az | egrep 'TCPLoss|TCPRetrans|TCPSack|TCPReorder'"), envCommand("tc -s qdisc show dev <iface>", { host: true }), envCommand("ethtool -S <iface> | grep -i drop", { host: true })],
        mitigation: "Do not increase buffers to compensate for cwnd collapse — fix the loss source. If cwnd is limited by receive window (rwnd_limited), the bottleneck is the receiver, not the path."
      }
    ];
    const groups = [
      { key: "investigation", label: "Investigation paths", icon: "ri-search-eye-line" },
      { key: "intelligence", label: "Intelligence & analysis", icon: "ri-brain-line" },
      { key: "workflow", label: "Workflow & operations", icon: "ri-route-line" }
    ];
    return `${quickRef}<div class="usecase-grouped">${groups.map((g, gi) => {
      const items = cases.filter(c => c.group === g.key);
      return `<details class="usecase-group" ${gi === 0 ? "open" : ""}>
        <summary><i class="${g.icon}"></i> ${escapeHtml(g.label)} <span class="usecase-count">${items.length}</span></summary>
        <div class="usecase-grid">${items.map(item => `<article class="guide-card usecase-card">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.summary)}</p>
      <div class="usecase-sections">
        <section><h4><i class="ri-radar-line"></i> Signals</h4><ul>${item.signals.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></section>
        <section><h4><i class="ri-route-line"></i> How to choose the next path</h4><ul>${item.decide.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></section>
        <section><h4><i class="ri-focus-3-line"></i> Next investigation</h4><ul>${item.next.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</ul></section>
      </div>
      <details>
        <summary><i class="ri-terminal-box-line"></i> Evidence commands</summary>
        <pre class="code">${escapeHtml(item.commands.join("\n"))}</pre>
      </details>
      <p class="mitigation"><i class="ri-shield-check-line"></i> ${escapeHtml(item.mitigation)}</p>
    </article>`).join("")}</div>
      </details>`;
    }).join("")}</div>`;
  }
  
  function renderGuideReferences() {
    const videos = [
      { title: "Brendan Gregg - Linux Performance Tools", url: "https://www.youtube.com/watch?v=FJW8nGV4jxY", channel: "USENIX", tag: "observability" },
      { title: "Brendan Gregg - BPF Performance Analysis at Netflix", url: "https://www.youtube.com/watch?v=16slh29iN1g", channel: "USENIX ATC", tag: "observability" },
      { title: "Cloudflare - How TCP Sockets Work", url: "https://www.youtube.com/watch?v=PpsEaqJV_A0", channel: "Cloudflare TV", tag: "fundamentals" },
      { title: "Cloudflare - SYN Flood Mitigations", url: "https://www.youtube.com/watch?v=w0QbnxKRD0w", channel: "Cloudflare TV", tag: "tcp" },
      { title: "Hussein Nasser - TCP Deep Dive", url: "https://www.youtube.com/watch?v=rmFX1V49K8U", channel: "Hussein Nasser", tag: "tcp" }
    ];
    const docs = [
      { title: "ss(8) man page - iproute2", url: "https://manpages.debian.org/testing/iproute2/ss.8.en.html", cat: "Man pages" },
      { title: "tcp(7) - TCP socket options", url: "https://man7.org/linux/man-pages/man7/tcp.7.html", cat: "Man pages" },
      { title: "Linux IP sysctl documentation", url: "https://docs.kernel.org/next/networking/ip-sysctl.html", cat: "Kernel docs" },
      { title: "/proc/net/tcp kernel fields", url: "https://docs.kernel.org/6.12/networking/proc_net_tcp.html", cat: "Kernel docs" },
      { title: "TCP_INFO struct reference", url: "https://github.com/torvalds/linux/blob/master/include/uapi/linux/tcp.h", cat: "Source" },
      { title: "iproute2 source (ss)", url: "https://github.com/iproute2/iproute2/blob/main/misc/ss.c", cat: "Source" },
      { title: "Java G1GC Tuning Guide", url: "https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-garbage-collector.html", cat: "JVM" },
      { title: "JVM Unified Logging", url: "https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html#enable-logging-with-the-jvm-unified-logging-framework", cat: "JVM" },
      { title: "Brendan Gregg - TCP/IP Observability", url: "https://www.brendangregg.com/blog/2018-10-08/dtrace-for-linux-2018.html", cat: "Blog" },
      { title: "Cloudflare - SYN packet handling", url: "https://blog.cloudflare.com/syn-packet-handling-in-the-wild/", cat: "Blog" }
    ];
    const cats = [...new Set(docs.map(d => d.cat))];
    return `<div class="guide-refs-grid">
      <section class="guide-refs-videos">
        <h3><i class="ri-video-line"></i> Video Resources</h3>
        <div class="guide-video-list">
          ${videos.map(v => { const vid = v.url.match(/v=([^&]+)/)?.[1] || ""; return `<a class="guide-video-card" href="${escapeHtml(v.url)}" target="_blank" rel="noreferrer">
            <img class="guide-video-thumb" src="https://img.youtube.com/vi/${escapeHtml(vid)}/mqdefault.jpg" alt="" loading="lazy" onerror="this.style.display='none'" onload="if(this.naturalWidth<200)this.style.display='none'"/>
            <span class="guide-video-tag">${escapeHtml(v.tag)}</span>
            <strong>${escapeHtml(v.title)}</strong>
            <span class="guide-video-channel"><i class="ri-youtube-line"></i> ${escapeHtml(v.channel)}</span>
          </a>`; }).join("")}
        </div>
      </section>
      <section class="guide-refs-docs">
        <h3><i class="ri-book-open-line"></i> Documentation & Source</h3>
        <div class="guide-refs-cats">
        ${cats.map(cat => `<div class="guide-refs-cat">
          <h4>${escapeHtml(cat)}</h4>
          ${docs.filter(d => d.cat === cat).map(d => `<a class="guide-ref-link" href="${escapeHtml(d.url)}" target="_blank" rel="noreferrer"><i class="ri-external-link-line"></i> ${escapeHtml(d.title)}</a>`).join("")}
        </div>`).join("")}
        </div>
      </section>
    </div>`;
  }

  return { renderGuide };
}
