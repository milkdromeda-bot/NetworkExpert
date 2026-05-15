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
      ["Compressed long-running collection", envCommand("t=10; while true; do date --iso-8601=ns; ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep \"$t\"; done | gzip -c >> ss-timeseries.log.gz")]
    ];
    const sections = [
      { key: "best", icon: "ri-lightbulb-line", label: "Best Practices" },
      { key: "views", icon: "ri-layout-grid-line", label: "Analysis Views" },
      { key: "cases", icon: "ri-route-line", label: "Use Cases" },
      { key: "commands", icon: "ri-terminal-box-line", label: "Commands" },
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
        ${tab === "cases" ? renderGuideUseCases() : ""}
        ${tab === "commands" ? commands.map(([title, cmd], index) => renderGuideCommandCard(title, cmd, index)).join("") : ""}
        ${tab === "fields" ? renderFields() : ""}
        ${tab === "refs" ? renderGuideReferences() : ""}
      </main>
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
    const cases = [
      {
        title: "1. Slow consumer or congested send path",
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
        title: "6. Exposed listeners and missing ownership",
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
      }
    ];
    return `<div class="usecase-grid">${cases.map(item => `<article class="guide-card usecase-card">
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
    </article>`).join("")}</div>`;
  }
  
  function renderGuideReferences() {
    const videos = [
      { title: "Brendan Gregg - Linux Performance Tools", url: "https://www.youtube.com/watch?v=FJW8nGV4jxY", channel: "USENIX", tag: "observability" },
      { title: "Brendan Gregg - BPF Performance Analysis at Netflix", url: "https://www.youtube.com/watch?v=16slh29iN1g", channel: "USENIX ATC", tag: "observability" },
      { title: "Understanding G1 GC - Monica Beckwith", url: "https://www.youtube.com/watch?v=iGRfyhE02lA", channel: "Devoxx", tag: "jvm" },
      { title: "Java GC Tuning - Kirk Pepperdine", url: "https://www.youtube.com/watch?v=we_enrM7TSY", channel: "QCon", tag: "jvm" },
      { title: "Cloudflare - How TCP Sockets Work", url: "https://www.youtube.com/watch?v=PpsEaqJV_A0", channel: "Cloudflare TV", tag: "fundamentals" }
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
