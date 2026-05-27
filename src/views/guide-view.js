import { ACCESS_ROLES, LINUX_PROFILES } from "../config/expert-config.js";
import { renderGuideMonitoringSection } from "./guide-monitoring-view.js";
import { renderGuideUseCasesSection } from "./guide-use-cases-view.js";

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
    return renderGuideMonitoringSection({ escapeHtml });
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
    return renderGuideUseCasesSection({ state, escapeHtml, envCommand, commandForPeer, isAnalystRole });
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
