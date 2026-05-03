# NetworkExpert

Local JavaScript interface for analyzing `ss` output from Ubuntu and iproute2.

## Run

```powershell
.\scripts\start-server.ps1
```

To restart a server previously launched from another thread or terminal:

```powershell
.\scripts\restart-server.ps1
```

To run validations with the bundled Node runtime even when `node` or `npm` are not on `PATH`:

```powershell
.\scripts\check.ps1
.\scripts\test.ps1
.\scripts\verify.ps1
```

Then open `http://localhost:4173` or the active port shown by the server.

## Functional Source

Option and field coverage follows the `ss(8)` iproute2 7.0.0-1 Debian unstable man page, updated on April 16, 2026, and the man7.org `ss(8)` page.

Reference links:

- Debian testing `ss(8)`: https://manpages.debian.org/testing/iproute2/ss.8.en.html
- man7 `tcp(7)`: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux kernel IP sysctl networking documentation: https://docs.kernel.org/next/networking/ip-sysctl.html
- Linux kernel `/proc/net/tcp` documentation: https://docs.kernel.org/6.12/networking/proc_net_tcp.html

## Recommended Collection

```bash
sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all > ss-full.txt
sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all -o state established > ss-established.txt
sudo ss -s > ss-summary.txt
while true; do date --iso-8601=ns; sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all; sleep 5; done > ss-timeseries.log
```

Collect every `t` seconds:

```bash
t=5
while true; do
  date --iso-8601=ns
  sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all
  sleep "$t"
done | tee -a ss-timeseries.log
```

Collect every `t_ms` milliseconds:

```bash
t_ms=250
while true; do
  printf 'EPOCH_MS=%s\n' "$(date +%s%3N)"
  sudo ss -HOntepmi --tos --cgroup --inet-sockopt -a -A all
  sleep "$(awk "BEGIN { print $t_ms / 1000 }")"
done >> ss-epoch-ms.log
```

With thousands of sockets, `ss` can have noticeable overhead because it queries the kernel, enumerates sockets, and formats many lines. Options such as `-p`, `-T`, `-e`, `-m`, `-i`, `--bpf`, `--bpf-maps`, `--cgroup`, and name resolution add cost. Prefer `-n -H -O`, filter by `state`, `sport`, `dport`, `dev`, or `cgroup`, and store to a file for offline analysis.

## Large Files

The interface handles large collections with pagination, column sorting, useful filters, adjustable page size, column selection, pin/unpin, column movement, and socket grouping. The `groups` view summarizes multiple snapshots of the same socket with queue maximums, RTT/RTO, drops, and anomalies.

The interface is split into tabs:

- `Import`: file opening and pasted `ss` output.
- `Analysis`: full-screen table, filters, sorting, pagination, and grouping.
- `Charts`: multiple charts on the same socket and correlation between two statistics.
- `Guide`: collection commands and overhead best practices.

A regular website cannot read other browser tabs without an extension or explicit browser permissions. That capability should remain optional and use a dedicated extension if needed.

Destructive options such as `--kill` are documented but flagged as dangerous in the interface.

## Code Layout

- `src/main.js`: UI composition, state coordination, table rendering, chart workspace wiring.
- `src/data.js`: `ss` option catalog, field documentation, preferences, and sample generators.
- `src/parser.js`: ANSI cleanup, timestamp parsing, `ss` row parsing, socket detail extraction.
- `src/analysis.js`: anomaly detection, risk scoring, and socket risk annotation.
- `src/importer.js`: text, gzip, and zip import paths with progressive parsing callbacks.
- `src/styles.css`: black theme, layout, responsive grids, drawers, tables, and chart styling.
- `vendor/jszip.min.js`: local ZIP reader used for offline `.zip` imports.
