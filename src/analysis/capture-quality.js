import { metricValue, parseSs } from "../parsing/parser.js";
import { parsedTimestampSnapshots, timestampBlocks } from "../timeline/timeline.js";
import {
  average,
  buildFeatureCards,
  buildRecommendedCommand,
  commandSleepIntervalMs,
  countSocketLikeLines,
  finiteNumber,
  qualityGrade,
  qualitySummary
} from "./capture-quality-helpers.js";
import {
  buildDataIntegrityWarnings,
  detectFeatures,
  summarizeSocketCoverage
} from "./capture-quality-detection.js";
import {
  buildDiagnosisReadiness,
  buildMessages
} from "./capture-quality-messages.js";

function socketList(raw, providedSockets) {
  if (Array.isArray(providedSockets) && providedSockets.length) return providedSockets;
  return parseSs(raw);
}

function snapshotIntervals(snapshots) {
  const epochs = snapshots.map(snapshot => finiteNumber(snapshot.epochMs)).filter(Number.isFinite);
  const intervalsMs = epochs.slice(1).map((epoch, index) => epoch - epochs[index]).filter(value => value >= 0);
  const durationMs = epochs.length >= 2 ? epochs[epochs.length - 1] - epochs[0] : 0;
  return { epochs, intervalsMs, durationMs };
}

function captureMetrics({ text, parsedSockets, snapshots, blocks, intervalsMs, durationMs, detected, coverage, command }) {
  const socketCounts = detected.socketCounts;
  const activeSocketRows = snapshots.length ? socketCounts.reduce((sum, count) => sum + count, 0) : parsedSockets.length;
  const observedRateRows = detected.rows.filter(socket =>
    metricValue(socket, "delivery_rate") || metricValue(socket, "pacing_rate") || metricValue(socket, "send")
  );
  const requestedIntervalMs = commandSleepIntervalMs(command);
  return {
    rawLineCount: text.split(/\r?\n/).filter(Boolean).length,
    socketLikeLineCount: countSocketLikeLines(text),
    parsedSocketCount: parsedSockets.length,
    activeSocketRows,
    snapshotCount: snapshots.length,
    timestampBlockCount: blocks.length,
    durationMs,
    intervalCount: intervalsMs.length,
    medianIntervalMs: detected.stats.medianIntervalMs,
    minIntervalMs: intervalsMs.length ? Math.min(...intervalsMs) : 0,
    maxIntervalMs: intervalsMs.length ? Math.max(...intervalsMs) : 0,
    p95IntervalMs: detected.stats.p95IntervalMs,
    avgSocketsPerSnapshot: socketCounts.length ? average(socketCounts) : parsedSockets.length,
    minSocketsPerSnapshot: socketCounts.length ? Math.min(...socketCounts) : parsedSockets.length,
    maxSocketsPerSnapshot: socketCounts.length ? Math.max(...socketCounts) : parsedSockets.length,
    highPrecisionTimestamps: detected.stats.highPrecisionTimestamps,
    observedRateRows: observedRateRows.length,
    requestedIntervalMs,
    cadenceDriftRatio: requestedIntervalMs > 0 && detected.stats.medianIntervalMs > 0 ? detected.stats.medianIntervalMs / requestedIntervalMs : 0,
    uniqueSocketIdentities: coverage.uniqueSockets,
    oneShotSocketIdentities: coverage.oneShotSockets,
    oneShotSocketRatio: coverage.oneShotRatio,
    medianSocketContinuity: coverage.medianContinuity,
    endpointsWithStateTransitions: coverage.endpointsWithStateTransitions
  };
}

export function analyzeCaptureQuality({ raw = "", sockets = [], sourceName = "", command = "", now = new Date() } = {}) {
  const text = String(raw || "");
  const parsedSockets = socketList(text, sockets);
  const blocks = timestampBlocks(text);
  const snapshots = parsedTimestampSnapshots(text).filter(snapshot => (snapshot.sockets || []).length > 0);
  const { intervalsMs, durationMs } = snapshotIntervals(snapshots);
  const detected = detectFeatures({ raw: text, command, sockets: parsedSockets, snapshots, blocks, intervalsMs, durationMs });
  const featureCards = buildFeatureCards({ features: detected.features, commandSignals: detected.commandSignals, stats: detected.stats });
  const coverage = summarizeSocketCoverage(snapshots, parsedSockets);
  const dataIntegrity = buildDataIntegrityWarnings(snapshots, intervalsMs, detected.stats, command, coverage);
  const diagnosticReadiness = buildDiagnosisReadiness(featureCards, dataIntegrity);
  const integrityPenalty = Math.min(15, dataIntegrity.filter(i => i.severity === "high").length * 5 + dataIntegrity.filter(i => i.severity === "medium").length * 2);
  const score = Math.max(0, Math.min(100, featureCards.reduce((sum, card) => sum + card.points, 0) - integrityPenalty));
  const grade = qualityGrade(score);
  const messages = buildMessages({ score, grade, featureCards, stats: detected.stats, raw: text, command, dataIntegrity });

  return {
    score,
    grade,
    summary: qualitySummary(grade),
    sourceName: sourceName || "current capture",
    recommendedCommand: buildRecommendedCommand(now),
    metrics: captureMetrics({ text, parsedSockets, snapshots, blocks, intervalsMs, durationMs, detected, coverage, command }),
    featureCards,
    diagnosticReadiness,
    socketCoverage: coverage,
    dataIntegrity,
    strengths: messages.strengths,
    warnings: messages.warnings,
    missing: messages.missing,
    recommendations: messages.recommendations,
    limits: [
      "Capture quality does not prove root cause; it only describes how much evidence is available.",
      "A good ss capture can still miss the TCP handshake, packet loss location, NIC drops outside the socket, or application-level stalls.",
      "Do not infer physical link capacity from ss alone unless a configured capacity is provided elsewhere."
    ]
  };
}

export function captureQualityGrade(score) {
  return qualityGrade(score);
}
