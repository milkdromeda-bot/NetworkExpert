export function metricSource(metric) {
  return {
    rtt: "ss -i field rtt:<avg>/<var>",
    rttvar: "ss -i field rtt:<avg>/<var>, second value",
    rto: "ss -i field rto",
    rcv_rtt: "ss -i field rcv_rtt",
    rcv_space: "ss -i field rcv_space",
    rcv_ssthresh: "ss -i field rcv_ssthresh",
    sendQ: "ss table column Send-Q",
    recvQ: "ss table column Recv-Q",
    cwnd: "ss -i field cwnd",
    ato: "ss -i field ato",
    "skmem.r": "ss -m skmem r",
    "skmem.rb": "ss -m skmem rb",
    "skmem.t": "ss -m skmem t",
    "skmem.d": "ss -m skmem d",
    "skmem.d_rate": "derived from skmem d deltas / elapsed time",
    pacing_rate: "ss -i field pacing_rate",
    delivery_rate: "ss -i field delivery_rate",
    tx_bps: "derived from bytes_acked deltas, fallback delivery/pacing rate",
    rx_bps: "derived from bytes_received deltas",
    bytes_sent: "ss -i field bytes_sent",
    bytes_acked: "ss -i field bytes_acked",
    bytes_received: "ss -i field bytes_received",
    segs_out: "ss -i field segs_out",
    segs_in: "ss -i field segs_in",
    backoff: "ss -i field backoff",
    retrans: "ss timer:(..., ..., retrans)"
  }[metric] || "parsed ss metric";
}

export function metricInterpretation(metric) {
  return {
    rtt: "Latency baseline for this TCP flow. Rising RTT shows path queueing, distance, congestion, overloaded peers, or virtualization jitter.",
    rttvar: "Jitter around RTT. High variance makes RTO and tail latency unstable even when average RTT looks acceptable.",
    rto: "TCP retransmission timeout. Elevated RTO is a stronger recovery/loss signal than RTT alone.",
    rcv_rtt: "Receive-side RTT estimator used by Linux receive-window autotuning. Useful context for window sizing.",
    rcv_space: "Current receive space Linux can advertise. Low values matter when Recv-Q and receive memory are also under pressure.",
    rcv_ssthresh: "Receive-side autotuning threshold/current window clamp. Use trends, not a single value, and do not confuse it with sender ssthresh.",
    sendQ: "Bytes waiting locally to be sent or acknowledged. Growth often points to slow peer consumption, congestion, or TCP backoff.",
    recvQ: "Bytes waiting locally for the application to read. Growth points to local process or scheduler read latency.",
    cwnd: "Congestion window in segments. Low cwnd limits throughput even when the app wants to send.",
    ato: "Delayed ACK timeout. High values can add latency to small or request/response workloads.",
    "skmem.r": "Kernel receive memory currently allocated to this socket. High values show receive-side pressure or burst absorption.",
    "skmem.rb": "Receive buffer limit. Compare skmem.r against this value to see whether receive memory is near its budget.",
    "skmem.t": "Kernel transmit memory currently allocated to this socket. High values show outbound buffering or drain pressure.",
    "skmem.d": "Socket memory drops. Any increase is loss/pressure evidence, especially if it grows over time.",
    "skmem.d_rate": "Rate at which socket memory drops are increasing. This separates old static counters from current loss/pressure.",
    pacing_rate: "Kernel TCP pacing allowance. Collapse after a healthy value suggests congestion-control backoff or app-limited behavior.",
    delivery_rate: "Kernel estimate of delivered bandwidth. Compare with pacing and queues to separate path limit from application limit.",
    tx_bps: "Estimated transmit throughput from acknowledged bytes between snapshots. Best for seeing forward progress.",
    rx_bps: "Estimated receive throughput from received bytes between snapshots. Best for spotting receive-side stalls.",
    bytes_sent: "Cumulative bytes sent locally. The BDP module uses its delta for outbound observed throughput when available.",
    bytes_acked: "Cumulative acknowledged outbound bytes. Use slope/delta over time rather than the absolute value.",
    bytes_received: "Cumulative inbound bytes. Use slope/delta over time rather than the absolute value.",
    segs_out: "Cumulative outbound TCP segments. Useful for tiny-write or packet-efficiency patterns.",
    segs_in: "Cumulative inbound TCP segments. Useful with bytes_received to spot small packets or burst patterns.",
    backoff: "TCP retransmission backoff exponent. Non-zero values mean recovery is becoming increasingly expensive.",
    retrans: "Active retransmission timer count from ss timer data. Correlate with RTO and Send-Q."
  }[metric] || "Metric parsed from the current socket timeline.";
}

export function metricCorrelations(metric) {
  return {
    rtt: ["RTO", "RTT variance", "Send-Q", "delivery_rate"],
    rttvar: ["RTO", "RTT", "backoff", "retrans"],
    rto: ["RTT variance", "backoff", "retrans", "Send-Q"],
    rcv_rtt: ["rcv_ssthresh", "rcv_space", "RTT", "retrans"],
    rcv_space: ["Observed BDP", "Recv-Q", "skmem.r", "persist"],
    rcv_ssthresh: ["rcv_space", "Recv-Q", "skmem.rb", "rcv_rtt"],
    sendQ: ["TX bandwidth", "RTO", "cwnd", "skmem.t"],
    recvQ: ["RX bandwidth", "skmem.r", "process owner", "socket drops"],
    cwnd: ["pacing_rate", "Send-Q", "RTO", "delivery_rate"],
    ato: ["RTT", "RX/TX bandwidth", "request latency"],
    "skmem.r": ["Recv-Q", "socket drops", "RX bandwidth", "process owner"],
    "skmem.rb": ["skmem.r", "Recv-Q", "rcv_space", "socket drops"],
    "skmem.t": ["Send-Q", "pacing_rate", "delivery_rate", "RTO"],
    "skmem.d": ["Recv-Q", "skmem.r", "RX bandwidth", "burst timing"],
    "skmem.d_rate": ["Socket drops", "Recv-Q", "skmem.r", "RX bandwidth bursts"],
    pacing_rate: ["delivery_rate", "cwnd", "Send-Q", "RTO"],
    delivery_rate: ["pacing_rate", "TX bandwidth", "Send-Q", "cwnd"],
    tx_bps: ["Send-Q", "delivery_rate", "pacing_rate", "bytes_acked"],
    rx_bps: ["Recv-Q", "bytes_received", "skmem.r", "drops"],
    bytes_sent: ["Outbound BDP", "delivery_rate", "segs_out", "Send-Q"],
    bytes_acked: ["TX bandwidth", "segs_out", "delivery_rate"],
    bytes_received: ["RX bandwidth", "segs_in", "Recv-Q"],
    segs_out: ["bytes_acked", "MSS", "retrans"],
    segs_in: ["bytes_received", "Recv-Q", "skmem.r"],
    backoff: ["RTO", "retrans", "Send-Q", "delivery_rate"],
    retrans: ["RTO", "backoff", "RTT variance", "Send-Q"]
  }[metric] || ["RTT", "queues", "process", "peer"];
}

export function metricReliabilityProfile(metric) {
  const derived = ["tx_bps", "rx_bps", "skmem.d_rate"].includes(metric);
  const cumulative = ["bytes_sent", "bytes_acked", "bytes_received", "segs_out", "segs_in", "skmem.d"].includes(metric);
  const timer = ["backoff", "retrans", "rto", "ato"].includes(metric);
  const receiverSide = ["recvQ", "rcv_rtt", "rcv_space", "rcv_ssthresh", "skmem.r", "skmem.rb"].includes(metric);
  const senderSide = ["sendQ", "cwnd", "skmem.t", "pacing_rate", "delivery_rate", "bytes_sent", "bytes_acked", "segs_out"].includes(metric);
  const base = {
    confidence: derived ? "Derived from timeline deltas" : cumulative ? "Direct counter, best read as a trend" : timer ? "Direct TCP timer/state signal" : "Direct ss field",
    scope: receiverSide ? "Mostly local receive-side evidence for this socket." : senderSide ? "Mostly local send-side evidence for this socket." : "Socket-local TCP evidence; peer or path meaning depends on correlation.",
    limits: derived
      ? "Sensitive to sampling interval, counter resets, socket recreation, and missing timestamps."
      : cumulative
        ? "The absolute value can include old history. The slope between snapshots is usually more useful."
        : "One isolated sample is weak evidence. Prefer sustained change across several snapshots."
  };
  return {
    rtt: {
      confidence: "Direct Linux TCP RTT estimator",
      scope: "Path plus peer behavior as observed by this local TCP stack.",
      limits: "RTT can rise because of network queueing, peer scheduling, virtualization, delayed ACKs, or capture timing. It is not a root cause by itself."
    },
    rttvar: {
      confidence: "Direct Linux RTT variance estimator",
      scope: "Measures stability of RTT for this flow from the local stack perspective.",
      limits: "High variance explains tail risk and RTO growth, but does not identify whether the jitter is in the network, host, or peer."
    },
    rto: {
      confidence: "Direct TCP retransmission timeout value",
      scope: "Local TCP recovery timer for this socket.",
      limits: "A high RTO is a consequence of RTT/variance/recovery state. It does not prove an active retransmission without retrans/backoff or counter movement."
    },
    rcv_space: {
      confidence: "Direct Linux receive-window autotuning field",
      scope: "Local receiver-side advertised-space context.",
      limits: "It is not the full configured receive buffer and not a link capacity. Low values need Recv-Q/skmem/persist context."
    },
    rcv_ssthresh: {
      confidence: "Direct Linux receive autotuning threshold",
      scope: "Local receive-window growth/clamp context.",
      limits: "It is not sender congestion ssthresh. A drop is a clue, not proof of slow consumer without queue and memory pressure."
    },
    sendQ: {
      confidence: "Direct ss table queue value",
      scope: "Local outbound queue for bytes not yet sent or not yet acknowledged.",
      limits: "Send-Q alone cannot distinguish slow peer, path congestion, app burst, zero window, or retransmission recovery."
    },
    recvQ: {
      confidence: "Direct ss table queue value",
      scope: "Local unread receive queue for this socket.",
      limits: "Recv-Q points toward local application drain latency, but confirm with skmem.r, rcv_space, process/JVM, and sustained samples."
    },
    cwnd: {
      confidence: "Direct TCP congestion window value",
      scope: "Local sender congestion-control allowance, expressed in segments.",
      limits: "Low cwnd limits sending, but can be normal after idle/app-limited periods. Compare with MSS, Send-Q, pacing, RTT, and retrans."
    },
    backoff: {
      confidence: "Direct TCP recovery backoff exponent",
      scope: "Local TCP is extending wait time for recovery or probing.",
      limits: "Backoff is defensive waiting, not automatically a bad network. It needs retrans/RTO or persist/zero-window context."
    },
    retrans: {
      confidence: "Direct ss timer retrans value when timer data is present",
      scope: "Local retransmission timer state for the socket.",
      limits: "Do not confuse active timer count with cumulative bytes_retrans. Use both when available."
    },
    delivery_rate: {
      confidence: "Kernel delivery-rate estimate",
      scope: "Local estimate of recently delivered outbound bandwidth.",
      limits: "Can be bursty, stale, app-limited, and directional. Do not infer physical link capacity from it alone."
    },
    pacing_rate: {
      confidence: "Kernel pacing allowance",
      scope: "Local sender pacing budget chosen by TCP/congestion control.",
      limits: "A low pacing rate may reflect congestion control, app-limited behavior, or prior recovery. It is not measured throughput."
    }
  }[metric] || base;
}

export function metricDiagnosticGuidance(metric) {
  const defaults = {
    benign: ["Flat or stable values around the normal baseline.", "Short isolated blips that recover without queue growth."],
    investigate: ["Sustained trend over multiple snapshots.", "Movement aligned with queues, timers, drops, or throughput collapse."],
    avoid: ["Do not make a critical diagnosis from this metric alone.", "Do not compare unrelated sockets without checking direction, state, and sampling window."],
    checks: ["Compare before/after baseline.", "Open the correlated charts and inspect the same time window."]
  };
  const map = {
    sendQ: {
      benign: ["Brief growth during an application burst that drains quickly.", "Stable low queue while bytes_acked continues to advance."],
      investigate: ["Send-Q grows while TX bandwidth or delivery_rate falls.", "Send-Q grows with RTO/backoff/retrans, or with persist/zero-window context."],
      avoid: ["Do not label this as network congestion until RTT/RTO/retrans/cwnd support it.", "Do not ignore the peer: slow consumer and receive-window closure can produce the same local queue."],
      checks: ["Check RTO, backoff, cwnd, pacing_rate, delivery_rate, bytes_acked slope, and peer receive health."]
    },
    recvQ: {
      benign: ["Small bursts that are drained by the application within a few samples.", "Recv-Q grows during a known burst while skmem.r remains far from rb."],
      investigate: ["Recv-Q remains high while skmem.r approaches skmem.rb.", "Recv-Q grows while RX bandwidth continues, or around JVM/GC/scheduler stalls."],
      avoid: ["Do not call this packet loss or IP congestion by itself.", "Do not blame the sender until local read latency is excluded."],
      checks: ["Check skmem.r/rb, rcv_space, drops, process owner, JVM stalls, CPU steal, and application read loop."]
    },
    rcv_space: {
      benign: ["Healthy rcv_space that stays comfortably above observed BDP.", "Temporary dip that recovers before queues or persist appear."],
      investigate: ["rcv_space collapses while Recv-Q and skmem.r rise.", "Throughput approaches the window-limited theoretical ceiling for several snapshots."],
      avoid: ["Do not use wscale alone as current window size.", "Do not infer physical line capacity from rcv_space."],
      checks: ["Compare rcv_space with observed BDP, Recv-Q, skmem.r/rb, rcv_rtt, and persist timer."]
    },
    rcv_ssthresh: {
      benign: ["Stable or high threshold with normal Recv-Q and receive memory.", "One lower sample without a sustained trend."],
      investigate: ["Drop greater than 30/50/70 percent over time, especially with low rcv_space.", "Sharp drop plus high Recv-Q, skmem.r near rb, and persist or drops."],
      avoid: ["Do not confuse receive autotuning threshold with sender congestion ssthresh.", "Do not claim slow consumer from rcv_ssthresh alone."],
      checks: ["Compute current/max ratio, drop percentage, elapsed time, rcv_space, Recv-Q, skmem.r/rb, rcv_rtt, and retrans."]
    },
    rtt: {
      benign: ["Stable RTT near minrtt/baseline.", "A short spike without queue, retrans, or throughput impact."],
      investigate: ["RTT rises with retrans/backoff and cwnd or pacing collapse.", "RTT rises at the same time as Send-Q or throughput degradation."],
      avoid: ["Do not call slow consumer from RTT alone.", "Do not compare LAN and WAN sockets with the same absolute threshold."],
      checks: ["Compare minrtt, rttvar, RTO, retrans, cwnd, pacing_rate, and delivery_rate."]
    },
    rto: {
      benign: ["RTO remains close to the expected baseline and retrans/backoff stay flat.", "Higher RTO after a past event that no longer correlates with queues."],
      investigate: ["RTO expands with RTT variance and active retrans/backoff.", "High RTO plus growing Send-Q or falling delivered bandwidth."],
      avoid: ["Do not treat high RTO as proof of current packet loss unless retrans/backoff/counters move.", "Do not ignore delayed ACK or jitter-heavy environments."],
      checks: ["Check RTT variance, retrans, bytes_retrans, backoff, Send-Q, and cwnd."]
    },
    cwnd: {
      benign: ["Low cwnd on idle or app-limited flows with no Send-Q.", "cwnd recovers quickly after a short event."],
      investigate: ["Low cwnd with Send-Q backlog and low delivery_rate.", "cwnd collapse with retrans, rising RTT, or pacing-rate reduction."],
      avoid: ["Do not compare cwnd across flows without MSS and RTT.", "Do not call receive-window bottleneck from cwnd alone."],
      checks: ["Estimate cwnd bytes as cwnd * MSS, then compare with Send-Q, RTT, pacing_rate, delivery_rate, and retrans."]
    },
    backoff: {
      benign: ["0, or a very short isolated 1 that clears quickly.", "No queue buildup and normal progress in bytes_acked/received."],
      investigate: ["Backoff increases progressively, especially 2-3+ under load.", "Backoff 4+ or 6+ with high RTO, retrans, persist, or Send-Q growth."],
      avoid: ["Do not say bad network automatically: zero window, peer freeze, firewall blackhole, or application stall can also cause waiting.", "Do not ignore timer type: persist changes the interpretation."],
      checks: ["Check timer type, retrans, RTO, Send-Q, rcv_space, persist, and peer process health."]
    },
    retrans: {
      benign: ["Timer value stays 0 and bytes_retrans does not increase.", "Old cumulative retrans with no current timer activity."],
      investigate: ["Active retrans timer with increasing RTO/backoff.", "bytes_retrans or retrans count increases while RTT variance and Send-Q worsen."],
      avoid: ["Do not use retrans:0/N as proof of zero loss; N can be historical or timer context depending on ss output.", "Do not ignore DSACK/reordering when retrans appears small."],
      checks: ["Compare bytes_retrans, retrans timer, dsack_dups, reord_seen, RTO, RTT variance, and cwnd."]
    },
    "skmem.d": {
      benign: ["Static non-zero value that never increases during the capture.", "No corresponding Recv-Q/skmem.r pressure or throughput dip."],
      investigate: ["Counter increases during bursts or while skmem.r approaches rb.", "Drops align with Recv-Q growth, RX bursts, or receive-window collapse."],
      avoid: ["Do not treat an old absolute drop count as current loss.", "Do not ignore sampling: deltas are stronger than totals."],
      checks: ["Use skmem.d_rate, Recv-Q, skmem.r/rb, RX bandwidth, and burst timing."]
    },
    "skmem.d_rate": {
      benign: ["Zero rate through the active capture.", "A tiny one-sample increase without related pressure."],
      investigate: ["Sustained positive drop rate.", "Drop-rate spikes aligned with RX bursts, Recv-Q, or skmem.r near rb."],
      avoid: ["Do not overread one bad sampling interval.", "Do not merge sockets with different identities or recreated kernel sk values."],
      checks: ["Inspect raw skmem.d deltas, socket identity, Recv-Q, skmem.r/rb, and RX bandwidth."]
    },
    tx_bps: {
      benign: ["Throughput follows expected application pacing and bytes_acked advances smoothly.", "Low throughput with no backlog on an idle/app-limited socket."],
      investigate: ["TX throughput falls while Send-Q grows.", "TX throughput is capped near window-limited throughput or falls with cwnd/RTO issues."],
      avoid: ["Do not infer physical link capacity without a configured capacity.", "Do not compare derived bps across uneven sampling windows without checking timestamps."],
      checks: ["Compare bytes_acked deltas, Send-Q, delivery_rate, pacing_rate, RTT, cwnd, and rcv_space/BDP."]
    },
    rx_bps: {
      benign: ["Receive throughput matches expected feed profile and Recv-Q drains.", "Brief pauses without queue accumulation."],
      investigate: ["RX throughput continues while Recv-Q/skmem.r grows.", "RX throughput drops while sender/peer still expects traffic."],
      avoid: ["Do not call a network outage from low RX alone; the sender may be idle.", "Do not ignore counter reset or socket recreation."],
      checks: ["Compare bytes_received deltas, Recv-Q, skmem.r/rb, drops, rcv_space, and application/JVM activity."]
    }
  };
  return { ...defaults, ...(map[metric] || {}) };
}
