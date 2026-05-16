<p align="center">
  <img src="images/ultimateNetworkExpert.png" alt="Ultimate Network Expert" width="720"/>
</p>

<h1 align="center">Ultimate Network Expert</h1>

<p align="center">
  <strong>Turn raw Linux <code>ss</code> captures into expert-level incident diagnosis in seconds — no cloud, no agents, no dependencies.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20LXC%20%7C%20Docker-blue" alt="Platform"/>
  <img src="https://img.shields.io/badge/language-JavaScript%20(ES%20Modules)-yellow" alt="Language"/>
  <img src="https://img.shields.io/badge/tests-300%2B%20unit%20tests-green" alt="Tests"/>
  <img src="https://img.shields.io/badge/dark%20%2F%20light-theme-blueviolet" alt="Theme"/>
  <img src="https://img.shields.io/badge/license-proprietary-lightgrey" alt="License"/>
</p>

---

## 🔥 See It In Action (10 seconds)

```bash
node server.js
# Open http://localhost:4173
# Click "🔥 See it in action" → Analyze
```

You'll instantly see:
- An **AI-generated summary** explaining what happened
- A **Root Cause Matrix** ranking 8 possible causes
- **Causal stories** narrating the incident timeline
- **Multi-socket correlation** proving process-wide stalls
- **Velocity alerts** showing how fast metrics exploded
- **Playbooks** with exact commands to run

---

## ✨ What Makes This Different

| Feature | Datadog ($35/host/mo) | Dynatrace ($69/host/mo) | **This tool (free, local)** |
|---------|----------------------|------------------------|---------------------------|
| AI summary in plain language | ✅ (cloud) | ❌ | ✅ **local, no data leaves** |
| Causal narrative (stories) | ❌ | ❌ | ✅ |
| Root cause matrix with confidence | ❌ | Partial | ✅ |
| Multi-socket correlation | ❌ | ❌ | ✅ (process/peer/container) |
| Rate-of-change velocity alerts | ✅ | ✅ | ✅ |
| Integrated playbooks with real PID | ❌ | ❌ | ✅ |
| Before/after comparison with verdict | ❌ | ❌ | ✅ |
| One-click HTML incident report | ❌ | PDF only | ✅ |
| Works offline, no agents | ❌ | ❌ | ✅ |

---

## 📖 Example: AI Summary Output

After loading a capture where a Java process experienced a GC stall:

> ✨ **java:2155462** experienced a simultaneous stall across **5 connections** at **13:28:12 UTC**, showing Recv-Q > 128KB.
>
> Peak velocity: Send-Q reached **30.4MB/s** (639KB → 2.0MB in 46ms).
>
> *Most likely cause: Slow consumer (80% confidence, 5/6 signals present).*

---

## 📖 Example: Timeline Story

```
Peer stopped reading — 4/4 steps matched

  📈 13:28:10.343 UTC — Send-Q grows
  📈 13:29:00.113 UTC — persist timer appears
  📈 13:29:00.333 UTC — backoff increases
  🔴 13:29:04.117 UTC — connection torn down

  → The remote peer likely stopped consuming data [java:2155462→192.168.145.115:37678]
```

Each step is clickable → zooms the chart to that exact timestamp with an annotation.

---

## 📖 Example: Root Cause Matrix

```
CONFIDENCE  SIGNALS  PROBABLE CAUSE
80%         5/6      Slow consumer / receiver not reading
55%         4/8      JVM stall / GC pause
40%         3/6      Network congestion / path loss
25%         2/5      Buffer pressure / memory exhaustion
13%         1/8      Application overproduction / burst
```

When capture quality is insufficient, confidence is **capped** with a visible warning.

---

## 📖 Example: Multi-Socket Correlation

```
Process-wide symptom: java:2155462 — 5 sockets

  13:28:12.000 UTC — 5/5 sockets (100%) simultaneously show Recv-Q > 128KB

  → Common cause on java:2155462 — strongly suggests process-level issue
    (GC/STW, deadlock, event loop stall). Validate with thread dump and GC logs.
```

Detects correlations by **process**, **peer**, and **container/cgroup**.

---

## 📖 Example: Velocity Alert

```
🔴 critical  13:29:00.333 UTC  Send-Q on java:2208995 — 30.4MB/s
   (639 KB → 2071 KB in 46 ms)
   App is writing faster than TCP can drain — peer or path cannot keep up.
```

---

## 📖 Example: Playbook

```
▶ Playbook: Slow consumer investigation

📍 Local (receiver/sender):
  pidstat -druwt -p 2155462 1 5
  jstack 2155462 > /tmp/thread_dump.txt

📍 Peer side:
  ss -tinpm dst 192.168.145.205

📍 Host / infra:
  sysctl net.ipv4.tcp_rmem net.core.rmem_max
  cat /proc/net/sockstat

⚠️ Do NOT conclude:
  • Do not increase receive buffers without understanding why the app is not reading
  • Do not blame the network if Recv-Q is growing locally

🛡️ Prudent mitigation:
  • Check GC logs for STW pauses correlating with Recv-Q growth
  • Check thread dumps for blocked reader threads
```

---

## 📖 Example: Before/After Comparison

```
Healthy → Incident  |  baseline.log → incident.log

⚠️ Slow consumer onset — network path is healthy but receiver is not keeping up.

WHAT CHANGED:
  • 3 sockets Recv-Q exploded (+488KB, +312KB, +256KB)
  • persist timer appeared on 4 sockets
  • Drops grew on 2 sockets (total +47)

WHAT STAYED HEALTHY:
  • RTT stable across most sockets
  • No retransmission growth
  • cwnd stable or growing
```

---

## 📖 Example: Exported HTML Incident Report

The exported report is a **standalone HTML file** (no dependencies, works offline) containing:

1. AI Summary (plain language)
2. Capture Quality score
3. Root Cause Matrix table
4. Causal Stories with timestamps
5. Multi-socket correlations
6. Velocity alerts table
7. Top diagnostic hypotheses with evidence
8. Recommended playbook with commands

Respects your current theme (dark/light).

---

## 🚀 Quick Start

```bash
# Clone and start
git clone <repo-url>
cd NetworkExpert
node server.js

# Open http://localhost:4173
```

No build step. No `npm install`. No cloud. Just a browser.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` to `Ctrl+9` | Switch analysis tabs |
| `Ctrl+E` | Editor (Import) |
| `Ctrl+M` | Monitoring (Charts) |
| `Esc` | Close modal/drawer |

---

## 🖥️ Views

| View | Purpose |
|------|---------|
| **Import** | Paste ss output, open files, or click "See it in action" |
| **Analysis** | Diagnosis, Matrix, Stories, Advisor, Timeline, Compare, Alerts |
| **Monitoring** | Metric charts, BDP, JVM/GC correlation |
| **Guide** | Best practices, use cases, commands, references |

---

## 🔧 Recommended Collection Command

```bash
while true; do
  date --iso-8601=ns
  ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all
  sleep 1
done | tee -a /tmp/networkexpert_ss_$(date +%Y%m%d_%H%M%S).log
```

This gives you: timestamps, TCP internals, timers, socket memory, process owner, kernel identity, cgroup, counters, and extended context.

---

## 🧠 Intelligence Modules

| Module | What it does |
|--------|-------------|
| `capture-quality.js` | Scores capture completeness, detects counter resets, identity changes, timestamp gaps |
| `diagnostics.js` | Builds hypotheses with confidence scoring, wouldConfirm/wouldReject |
| `root-cause-matrix.js` | 8 declarative causes with weighted signals |
| `timeline-stories.js` | 7 causal patterns matched sequentially across snapshots |
| `multi-socket-correlation.js` | Process-wide, peer-wide, container-wide stall detection |
| `rate-of-change.js` | Velocity spike detection (bytes/s, not just thresholds) |
| `playbooks.js` | 6 contextual playbooks with variable substitution |
| `ai-summary.js` | Natural language summary from all analysis modules |
| `compare.js` | Baseline narrative with verdict, peer diff, anomaly diff |
| `incident-report.js` | Standalone HTML report generator |

---

## 🧪 Testing

```bash
node --test tests/**/*.test.js    # Run all tests
node --check src/main.js          # Syntax check
```

---

## 🎨 Themes

- **Dark mode** (default) — optimized for long analysis sessions
- **Light mode** — high-contrast, colored headers, blue accents

Toggle with the ☀️/🌙 button in the header. Editor syntax highlighting adapts automatically.

---

## 📦 Export Options

| Format | Content | Use case |
|--------|---------|----------|
| **Executive PDF** | Short printable overview | Stakeholders, managers |
| **Full HTML Report** | Complete analysis with stories, matrix, playbooks | Post-mortem, Confluence |
| **Evidence Pack ZIP** | PDF + CSV + JSON + chart PNGs | Archival, compliance |
| **Jira Report** | Wiki markup copied to clipboard | Ticket description |

---

## 📁 Architecture

```
src/
├── main.js                      # UI, state, rendering (537KB)
├── parser.js                    # ss output parsing
├── diagnostics.js               # Hypothesis engine
├── root-cause-matrix.js         # Declarative cause matrix
├── timeline-stories.js          # Causal narrative patterns
├── multi-socket-correlation.js  # Process/peer/container clustering
├── rate-of-change.js            # Velocity spike detection
├── playbooks.js                 # Contextual investigation guides
├── ai-summary.js                # Natural language generation
├── capture-quality.js           # Data integrity & scoring
├── compare.js                   # Baseline comparison & verdict
├── incident-report.js           # HTML report generator
├── gc-log-parser.js             # Java GC log parser
├── jvm-correlation.js           # GC ↔ TCP correlation
├── bdp-window-analysis.js       # BDP throughput analysis
├── timeline.js                  # Snapshot aggregation
├── styles.css                   # Dark/light themes (204KB)
└── ...                          # 30+ specialized modules
tests/                           # 300+ unit tests
server.js                        # Zero-dependency static server
```

---

## 📚 References

- [ss(8) man page — iproute2](https://manpages.debian.org/testing/iproute2/ss.8.en.html)
- [tcp(7) — TCP socket options](https://man7.org/linux/man-pages/man7/tcp.7.html)
- [Linux kernel IP sysctl](https://docs.kernel.org/next/networking/ip-sysctl.html)
- [/proc/net/tcp kernel fields](https://docs.kernel.org/6.12/networking/proc_net_tcp.html)
- [TCP_INFO struct (kernel source)](https://github.com/torvalds/linux/blob/master/include/uapi/linux/tcp.h)
- [iproute2 ss source](https://github.com/iproute2/iproute2/blob/main/misc/ss.c)

---

<p align="center">
  <strong>Built for engineers who need to prove root cause, not guess it.</strong><br/>
  <em>No cloud. No agents. No guessing. Just evidence.</em>
</p>
