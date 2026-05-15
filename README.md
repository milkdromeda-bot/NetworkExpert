<p align="center">
  <img src="images/ultimateNetworkExpert.png" alt="Ultimate Network Expert" width="720"/>
</p>

<h1 align="center">Ultimate Network Expert</h1>

<p align="center">
  <strong>World-class Linux TCP socket analysis — from raw <code>ss</code> captures to expert diagnostics in seconds.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20LXC%20%7C%20Docker-blue" alt="Platform"/>
  <img src="https://img.shields.io/badge/language-JavaScript%20(ES%20Modules)-yellow" alt="Language"/>
  <img src="https://img.shields.io/badge/tests-300%2B%20unit%20tests-green" alt="Tests"/>
  <img src="https://img.shields.io/badge/license-proprietary-lightgrey" alt="License"/>
</p>

---

## ✨ What is this?

Ultimate Network Expert is a **local-first web application** that transforms raw Linux `ss` socket captures into actionable network diagnostics. Designed for **trading systems, market data infrastructure, and latency-sensitive Java applications**, it provides:

- 🔍 **Instant analysis** of thousands of sockets with risk scoring and anomaly detection
- 📊 **Synchronized metric charts** with crosshairs, drag-to-zoom, and threshold overlays
- 🧠 **JVM GC / Stall correlation** — correlate G1GC pauses with TCP slow consumer symptoms
- 📈 **BDP & Throughput analysis** — detect window-limited throughput bottlenecks
- 🎯 **Diagnostic hypotheses** with confidence scores and actionable tuning commands
- 📋 **Incident reports** — PDF, Evidence Pack ZIP, or Jira-ready wiki markup

---

## 🚀 Quick Start

```powershell
# Start the local server
.\scripts\start-server.ps1

# Open in browser
start http://localhost:4173
```

That's it. No build step, no dependencies to install, no cloud connection.

---

## 🖥️ Views

### Import
Paste `ss` output or load files (`.txt`, `.log`, `.gz`, `.zip`). Full CodeMirror editor with syntax highlighting, search, and line numbers.

### Analysis
Socket table with 40+ columns, risk scoring, anomaly detection, diagnostic hypotheses with confidence scores, advisor findings, service map, conversations, timeline, and before/after comparison.

### Monitoring

| Tab | Purpose |
|-----|---------|
| **Metrics** | Multi-chart grid with synchronized crosshairs, drag-to-zoom, dashboard presets |
| **BDP & Throughput** | Window-limited throughput vs observed, BDP vs effective window |
| **JVM Stall / GC** | G1GC pause correlation with TCP symptoms (receiver & sender mode) |
| **Advisor** | Tail-latency lens, investigation context, guided checklist |

### Guide
Searchable documentation with best practices, use cases, commands, field reference, and video resources.

---

## 🧠 JVM GC Correlation

Designed for **Java trading / market data applications** running G1GC:

- **Stream-parses** GC logs (50 MB+) without freezing
- **Receiver mode**: Recv-Q rise, rcv_space drop, persist/zero-window after GC pause
- **Sender mode**: Send-Q rise, RTT spike, cwnd drop when remote receiver stalls
- **Correlation score** (0–1) with multi-signal validation and counter-evidence
- **CPU correlation** via optional pidstat/nstat import
- **G1-specific** recommendations (Full GC, evacuation failure, humongous allocations)

```
-Xlog:gc*,safepoint=info:file=/var/log/app/gc-%p-%t.log:time,uptime,level,tags:filecount=20,filesize=50M
```

---

## 📊 Diagnostic Engine

Every hypothesis includes:

- **Confidence score** (0–100%) based on converging signals vs counter-evidence
- **Evidence list** — what was observed
- **Counter-evidence** — what argues against this conclusion
- **Actionable commands** — `sysctl`, `tc`, `ethtool` with values computed from your data
- **Validation commands** — what to run next to confirm or reject

> The tool never concludes on a single signal. Multiple converging signals increase confidence; counter-evidence reduces it.

---

## 📦 Export Options

| Format | Content |
|--------|---------|
| **PDF Report** | Full incident report with charts, anomalies, hypotheses |
| **Evidence Pack ZIP** | PDF + CSV + JSON + chart PNGs |
| **Jira Report** | Wiki markup copied to clipboard — paste into any ticket |

---

## 🔧 Recommended Collection

```bash
# Full capture with all fields
sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all > ss-full.txt

# Timestamped time series (1s interval)
t=1; while true; do
  date --iso-8601=ns
  sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all
  sleep "$t"
done | tee -a ss-timeseries.log

# High-frequency (250ms) with epoch timestamps
t_ms=250; while true; do
  printf 'EPOCH_MS=%s\n' "$(date +%s%3N)"
  sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all
  sleep "$(awk "BEGIN { print $t_ms / 1000 }")"
done >> ss-epoch-ms.log
```

---

## 🧪 Testing

```powershell
.\scripts\test.ps1       # Run 300+ unit tests
.\scripts\check.ps1      # Syntax check
.\scripts\verify.ps1     # Full verification
```

---

## 📁 Project Layout

```
src/
├── main.js                 # UI composition, state, rendering, charts
├── parser.js               # ss output parsing, timestamp extraction
├── analysis.js             # Anomaly detection, risk scoring
├── diagnostics.js          # Hypothesis engine with confidence scoring
├── gc-log-parser.js        # Java GC Unified Logging parser
├── jvm-correlation.js      # GC ↔ TCP symptom correlation engine
├── pidstat-parser.js       # pidstat/nstat CPU correlation
├── bdp-window-analysis.js  # BDP & window-limited throughput
├── timeline.js             # Timestamped snapshot aggregation
├── microburst.js           # Microburst detection
├── tail-latency.js         # P99/P99.9 tail-latency lens
├── guide-view.js           # Documentation & reference view
├── styles.css              # Dark theme, charts, responsive layout
└── ...                     # 25+ specialized modules
tests/                      # 300+ unit tests (node:test)
server.js                   # Static file server + IP intel API
```

---

## 📚 References

- [ss(8) man page — iproute2](https://manpages.debian.org/testing/iproute2/ss.8.en.html)
- [tcp(7) — TCP socket options](https://man7.org/linux/man-pages/man7/tcp.7.html)
- [Linux kernel IP sysctl](https://docs.kernel.org/next/networking/ip-sysctl.html)
- [/proc/net/tcp kernel fields](https://docs.kernel.org/6.12/networking/proc_net_tcp.html)
- [Java G1GC Tuning Guide](https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-garbage-collector.html)
- [JVM Unified Logging](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html#enable-logging-with-the-jvm-unified-logging-framework)

---

<p align="center">
  <em>Built for engineers who need to prove root cause, not guess it.</em>
</p>
