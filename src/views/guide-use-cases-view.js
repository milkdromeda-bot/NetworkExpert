export function renderGuideUseCasesSection({ state, escapeHtml, envCommand, commandForPeer, isAnalystRole }) {
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
      },
      {
        title: "13. IP fragmentation and MTU/MSS issues",
        group: "investigation",
        summary: "Detects path MTU problems, MSS clamping, and fragmentation indicators. A reduced MSS silently caps throughput (fewer bytes per segment = more overhead per byte). Common in VPN, tunnel, and multi-hop environments.",
        signals: ["MSS ≤ 536 with PMTU ≥ 1500 → MSS clamped", "PMTU < 1500 → tunnel or VPN reducing path MTU", "advmss - MSS > 400 → PMTUD reduced segment size", "PMTU ≥ 9000 → jumbo frames active", "IpReasmFails or IpFragFails in nstat"],
        decide: [
          "MSS clamped to 536: check iptables/nftables TCPMSS rules, VPN MTU, and PMTUD black holes (ICMP blocked).",
          "PMTU < 1500: identify the tunnel/VPN/overlay reducing MTU. Adjust inner MTU or use MSS clamping intentionally.",
          "advmss ≫ MSS: path MTU discovery reduced the effective segment. Run tracepath to find the bottleneck hop.",
          "Jumbo frames on some sockets but not others: verify end-to-end jumbo support — one non-jumbo hop fragments silently.",
          "IpFragFails growing in nstat: DF bit is set but path MTU is too small — classic PMTUD black hole."
        ],
        next: ["Filter sockets by MSS < 1400 to isolate affected flows.", "Correlate with peer IP — if one peer has low MSS, the path to that peer is the issue.", "Check if throughput is proportionally reduced (max throughput ≈ cwnd × MSS / RTT)."],
        commands: [envCommand("ss -ti | grep -E 'mss:[0-9]' | awk '{print $0}' | sort -t: -k2 -n"), envCommand("tracepath <peer-ip>"), envCommand("ip route get <peer-ip> | grep mtu"), envCommand("iptables -t mangle -L -n -v | grep -i mss", { host: true }), envCommand("nstat -az | egrep 'Frag|Reasm'", { host: true }), envCommand("ip -s link show <iface>", { host: true })],
        mitigation: "If PMTUD is broken (ICMP blocked), apply MSS clamping at the correct value (MTU - 40). Do not disable DF bit globally — it hides the problem. Fix the ICMP filtering or adjust tunnel MTU."
      },
      {
        title: "14. Packet reordering — spurious retransmissions",
        group: "investigation",
        summary: "Reordering causes TCP to mistake delayed packets for lost ones, triggering unnecessary retransmissions and cwnd reduction. The ss fields reord_seen and dsack_dups reveal this. High DSACK with low real loss = reordering, not congestion. Impact: throughput drops 20-60% because cwnd is halved on each false loss event; latency spikes from unnecessary RTO; wasted bandwidth from duplicate segments; application perceives intermittent slowness that disappears under low load.",
        signals: ["reord_seen > 0 on ss -ti output", "dsack_dups > 0 (receiver reported duplicate segments)", "bytes_retrans growing but no real packet loss on the wire", "cwnd oscillating without actual congestion", "TcpExtTCPSACKReorder in nstat"],
        decide: [
          "WHY IT HURTS: TCP interprets 3 duplicate ACKs as loss → halves cwnd → throughput collapses. With reordering, those dupACKs are false alarms. The sender retransmits data already in flight (wasting bandwidth), then receives DSACKs proving the retransmit was unnecessary. Meanwhile cwnd was already cut.",
          "High reord_seen + stable RTT + no real drops: path reorders packets (multipath, ECMP, bonding, or switch buffering).",
          "High dsack_dups ≈ retrans count: most retransmissions are spurious — TCP is over-reacting to reordering.",
          "Reordering on one peer only: the path to that peer has asymmetric routing or load-balancing.",
          "Reordering on all peers: local NIC RSS, bonding, or virtualization layer is reordering.",
          "Reordering + high RTT variance: jitter and reordering compound — consider increasing tcp_reordering sysctl."
        ],
        next: ["Filter sockets with reord_seen > 0 or dsack_dups > 0.", "Compare affected vs unaffected peers to isolate the path.", "Check if throughput is impacted (cwnd reduction from spurious loss)."],
        commands: [envCommand("ss -ti | grep reord_seen"), envCommand("nstat -az | egrep 'Reorder|DSACK|SACK'"), envCommand("sysctl net.ipv4.tcp_reordering"), envCommand("ip route show | grep -i ecmp", { host: true }), envCommand("ethtool -S <iface> | grep -i reorder", { host: true })],
        mitigation: "Increase net.ipv4.tcp_reordering (default 3) to tolerate more out-of-order packets before declaring loss. For ECMP/bonding paths, consider flow-based hashing instead of packet-based. Do not disable SACK — it helps recovery."
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
