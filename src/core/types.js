// @ts-nocheck
/**
 * @file Type definitions for NetworkExpert.
 * Import this file nowhere — it exists only for IDE autocompletion via JSDoc.
 */

// ─── Socket types ───────────────────────────────────────────────────────────

/**
 * @typedef {{ host: string, port: string }} Address
 */

/**
 * @typedef {{ r?: number, rb?: number, t?: number, tb?: number, f?: number, w?: number, o?: number, bl?: number, d?: number }} Skmem
 */

/**
 * @typedef {{ name: string, expire: string, expireMs: number, retrans: number }} Timer
 */

/**
 * @typedef {{ name: string, pid: number, fd: number }} Process
 */

/**
 * @typedef {{ send: number, receive: number }} Wscale
 */

/**
 * @typedef {{ avg: number, var: number }} RttValue
 */

/**
 * @typedef {Object} SocketDetails
 * @property {string[]} flags
 * @property {Record<string, any>} values
 * @property {Skmem} skmem
 * @property {Timer|null} timer
 * @property {Process|null} process
 * @property {string} raw
 */

/**
 * @typedef {Object} Socket
 * @property {string} id
 * @property {string} state - TCP state (ESTAB, CLOSE-WAIT, TIME-WAIT, LISTEN, etc.)
 * @property {number} recvQ
 * @property {number} sendQ
 * @property {string} local - Local endpoint (ip:port)
 * @property {string} peer - Remote endpoint (ip:port)
 * @property {Address} localAddress
 * @property {Address} peerAddress
 * @property {string} family - tcp, tcp6, udp, mptcp, unix
 * @property {SocketDetails} details
 * @property {string} raw
 * @property {string} [risk] - Computed: critical, high, medium, low
 * @property {number[]} [_rttHistory] - Injected for sparkline rendering
 */

// ─── Anomaly types ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} Anomaly
 * @property {string} socketId
 * @property {string} title
 * @property {"critical"|"high"|"medium"|"low"|"info"} severity
 * @property {string} metric
 * @property {number} value
 * @property {number} threshold
 * @property {string} [detail]
 */

// ─── Preferences ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Prefs
 * @property {"dark"|"light"} theme
 * @property {"compact"|"comfortable"} [density]
 * @property {string} graphMetric
 * @property {string} graphStyle
 * @property {boolean} autoToast
 * @property {string} [ssEditorTheme]
 * @property {string} [paginationPosition]
 * @property {string} [defaultDashboardPreset]
 * @property {number} [configuredLinkCapacityMbps]
 * @property {Object} chartLayout
 * @property {string[]} chartLayout.panelOrder
 */

// ─── Table state ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TableState
 * @property {string} sortKey
 * @property {"asc"|"desc"} sortDir
 * @property {number} page
 * @property {number} pageSize
 * @property {string[]} pinned
 * @property {string[]} visibleColumns
 * @property {string[]} columnOrder
 * @property {TableFilters} filters
 * @property {number} [_scrollTop]
 */

/**
 * @typedef {Object} TableFilters
 * @property {string} text
 * @property {string} [risk]
 * @property {string} [state]
 * @property {string} [protocol]
 * @property {string} [process]
 * @property {string} [srcIp]
 * @property {string} [dstIp]
 * @property {string} [srcPort]
 * @property {string} [dstPort]
 */

// ─── App state ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AppState
 * @property {string} raw
 * @property {boolean} showEditor
 * @property {boolean} analysisSidebarCollapsed
 * @property {boolean} breadcrumbMenuOpen
 * @property {string} command
 * @property {string} sourceName
 * @property {Socket[]} sockets
 * @property {string|null} selectedId
 * @property {string|null} activeContextId
 * @property {string} activeContextReason
 * @property {Anomaly[]} anomalies
 * @property {boolean} analysisDirty
 * @property {number} dataVersion
 * @property {Prefs} prefs
 * @property {"ingest"|"analysis"|"charts"|"guide"} view
 * @property {string} activeTab
 * @property {string} chartsTab
 * @property {string|null} expandedChart
 * @property {string|null} drawer
 * @property {string|null} modal
 * @property {TableState} table
 * @property {{ start: number, end: number }} chartZoom
 * @property {Object[]} history
 * @property {string[]} chartMetrics
 * @property {string|null} openMenuId
 * @property {{ left: number, top: number }|null} openMenuPos
 * @property {string|null} openChartMoveMetric
 * @property {{ left: number, top: number }|null} openChartMovePos
 * @property {Object} [cache]
 */

// ─── Analysis types ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} DiagnosticHypothesis
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {"critical"|"high"|"medium"|"low"} severity
 * @property {number} confidence - 0 to 1
 * @property {string[]} signals
 * @property {string[]} missingSignals
 * @property {string} [socketId]
 */

/**
 * @typedef {Object} TimelineStory
 * @property {string} title
 * @property {string} narrative
 * @property {"critical"|"high"|"medium"|"low"} severity
 * @property {{ label: string, epochMs: number, metric: string }[]} steps
 * @property {string} [socketId]
 */

/**
 * @typedef {Object} RateAlert
 * @property {string} metric
 * @property {string} socketId
 * @property {"critical"|"high"|"medium"} severity
 * @property {number} velocity
 * @property {number} from
 * @property {number} to
 * @property {number} durationMs
 */
