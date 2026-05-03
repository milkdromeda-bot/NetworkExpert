# NetworkExpert

NetworkExpert is a local web UI for analyzing Linux `ss` / iproute2 socket captures, especially large or timestamped collections gathered on Ubuntu hosts and containers.

## Quick Start

Start the local server:

```powershell
.\scripts\start-server.ps1
```

Restart it if another thread or terminal already launched it:

```powershell
.\scripts\restart-server.ps1
```

Then open `http://localhost:4173`.

## Validation

All project scripts use the bundled Node runtime, so `node` and `npm` do not need to be on `PATH`.

```powershell
.\scripts\check.ps1
.\scripts\test.ps1
.\scripts\verify.ps1
```

## What The UI Covers

- Socket table with risk, protocol, state, endpoint, queue, RTT/RTO, and process filters
- Grouped conversation view for repeated snapshots of the same socket
- Charts and metric correlations for queue growth, RTT, RTO, throughput, and drops
- Import of raw text, gzip, and zip files with progressive parsing
- Guidance tabs for Linux collection strategy and field interpretation

The app is designed to stay useful on large datasets: pagination, sorting, grouping, column layout control, and dense filtering are built in.

## Recommended Collection

Full capture:

```bash
sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all > ss-full.txt
sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all -o state established > ss-established.txt
sudo ss -s > ss-summary.txt
```

Timestamped time series every `t` seconds:

```bash
t=5
while true; do
  date --iso-8601=ns
  sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all
  sleep "$t"
done | tee -a ss-timeseries.log
```

Timestamped time series every `t_ms` milliseconds:

```bash
t_ms=250
while true; do
  printf 'EPOCH_MS=%s\n' "$(date +%s%3N)"
  sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all
  sleep "$(awk "BEGIN { print $t_ms / 1000 }")"
done >> ss-epoch-ms.log
```

For very large hosts, `ss` collection can become expensive. Prefer `-n -H -O`, collect only the states you need, and store raw evidence for offline analysis.

## Project Layout

- `server.js`: static server and IP intelligence API endpoint
- `src/main.js`: UI composition, state coordination, filters, tables, and charts
- `src/parser.js`: timestamp parsing, socket row parsing, detail extraction
- `src/analysis.js`: anomaly detection and risk scoring
- `src/importer.js`: text, gzip, and zip import pipeline
- `src/styles.css`: layout, theming, filter ergonomics, tables, drawers, and charts
- `tests/`: parser, analysis, timeline, navigation, and regression coverage
- `scripts/`: local run, restart, check, test, and verify helpers

## References

Field and option coverage follows the Linux `ss(8)` documentation and related networking references:

- Debian testing `ss(8)`: https://manpages.debian.org/testing/iproute2/ss.8.en.html
- man7 `tcp(7)`: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux kernel IP sysctl networking docs: https://docs.kernel.org/next/networking/ip-sysctl.html
- Linux kernel `/proc/net/tcp` docs: https://docs.kernel.org/6.12/networking/proc_net_tcp.html
