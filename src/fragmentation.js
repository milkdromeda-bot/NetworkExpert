/**
 * IP fragmentation and MTU/MSS mismatch detection.
 * Analyzes sockets for path MTU issues, MSS clamping, and fragmentation indicators.
 */
import { metricValue } from "./parser.js";

const ETHERNET_MTU = 1500;
const JUMBO_MTU = 9000;
const MIN_INTERNET_MSS = 536;
const TYPICAL_MSS = 1460; // 1500 - 40 (IP+TCP headers)

/**
 * @typedef {{ socket: object, issue: string, severity: "critical"|"high"|"medium"|"low", mss: number, advmss: number, pmtu: number, detail: string }} FragmentationFinding
 */

/**
 * Detect fragmentation and MTU/MSS issues across all sockets.
 * @param {object[]} sockets
 * @returns {{ findings: FragmentationFinding[], summary: { total: number, mssClamp: number, pmtuReduced: number, mismatch: number, jumbo: number } }}
 */
export function detectFragmentation(sockets) {
  const findings = [];
  let mssClamp = 0, pmtuReduced = 0, mismatch = 0, jumbo = 0;

  for (const socket of sockets) {
    if (socket.state !== "ESTAB") continue;
    const mss = metricValue(socket, "mss");
    const advmss = metricValue(socket, "advmss");
    const rcvmss = metricValue(socket, "rcvmss");
    const pmtu = metricValue(socket, "pmtu");
    if (!mss) continue;

    // Tiny MSS with normal PMTU = likely MSS clamping or PMTUD fallback
    if (mss <= MIN_INTERNET_MSS && pmtu >= ETHERNET_MTU) {
      mssClamp++;
      findings.push({
        socket, issue: "mss-clamped", severity: "high", mss, advmss, pmtu,
        detail: `MSS=${mss} is clamped to minimum while PMTU=${pmtu}. Likely iptables MSS clamping, VPN overhead, or PMTUD black hole fallback.`
      });
    }
    // PMTU below Ethernet standard
    else if (pmtu > 0 && pmtu < ETHERNET_MTU) {
      pmtuReduced++;
      findings.push({
        socket, issue: "pmtu-reduced", severity: "medium", mss, advmss, pmtu,
        detail: `PMTU=${pmtu} is below standard Ethernet (1500). Tunnel, VPN, or intermediate device is reducing path MTU. MSS=${mss}.`
      });
    }
    // MSS/advmss mismatch suggesting asymmetric path
    else if (advmss > 0 && mss > 0 && advmss - mss > 400) {
      mismatch++;
      findings.push({
        socket, issue: "mss-mismatch", severity: "medium", mss, advmss, pmtu,
        detail: `advmss=${advmss} but effective MSS=${mss} (delta ${advmss - mss}). Path MTU discovery reduced the segment size — possible intermediate device with lower MTU.`
      });
    }
    // Jumbo frame detection
    if (pmtu >= JUMBO_MTU || mss > TYPICAL_MSS + 100) {
      jumbo++;
    }
  }

  return { findings, summary: { total: findings.length, mssClamp, pmtuReduced, mismatch, jumbo } };
}
