export function renderGuideMonitoringSection({ escapeHtml }) {
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
