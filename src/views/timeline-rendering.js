export function createTimelineRendering(ctx) {
  const {
    state,
    icons,
    ctx: appCtx,
    escapeHtml,
    formatNumber,
    formatTimelineTime,
    formatTimelineOffset,
    buildTimelineEvents,
    cachedStories,
    cachedMultiSocket,
    cachedRateAlerts,
    riskRank,
    renderHeatmapView,
    renderTimelineStoriesViewModel
  } = ctx;

function renderTimeline() {
  const events = buildTimelineEvents();
  if (!events.length) return `<div class="empty"><svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect x="8" y="24" width="40" height="8" rx="4" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="28" r="3" fill="currentColor" opacity="0.3"/><circle cx="28" cy="28" r="3" fill="currentColor" opacity="0.3"/><circle cx="40" cy="28" r="3" fill="currentColor" opacity="0.3"/></svg><strong>No timeline events available</strong>Import multiple timestamped ss snapshots to see how metrics evolve over time.<div class="empty-cta"><button data-action="pickFile" class="primary"><i class="ri-upload-2-line"></i> Import snapshots</button></div></div>`;
  const first = events[0]?.epochMs || Date.now();
  const last = events[events.length - 1]?.epochMs || first;
  const stories = cachedStories();
  state._multiSocketEvents = cachedMultiSocket();
  state._rateAlerts = cachedRateAlerts();
  const view = state.timelineView || "stories";
  return `<div class="timeline-workbench">
    <div class="timeline-strip">
      <span><b>${formatNumber(events.length)}</b> events</span>
      <span><b>${formatNumber(Math.max(0, Math.round((last - first) / 1000)))}s</b> window</span>
      <span><b>${formatNumber(events.filter(event => riskRank(event.severity) >= 3).length)}</b> high/critical</span>
      ${stories.length ? `<span><b>${formatNumber(stories.length)}</b> stories</span>` : ""}
    </div>
    <div class="pill-toggle" data-active="${view === "events" ? "1" : view === "heatmap" ? "2" : "0"}">
      <div class="pill-slider"></div>
      <button class="${view === "stories" ? "active" : ""}" data-action="timelineView" data-value="stories"><i class="ri-book-open-line"></i> Stories</button>
      <button class="${view === "events" ? "active" : ""}" data-action="timelineView" data-value="events"><i class="ri-list-unordered"></i> All events</button>
      <button class="${view === "heatmap" ? "active" : ""}" data-action="timelineView" data-value="heatmap"><i class="ri-fire-line"></i> Heatmap</button>
    </div>
    ${view === "heatmap" ? renderTimelineHeatmap(events) : view === "stories" ? renderTimelineStoriesView(stories) : renderTimelineEventsView(events)}
  </div>`;
}

function storyStepMetric(key) {
  const map = { "sendQ-grow": "sendQ", "persist-appears": "sendQ", "backoff-rises": "backoff", "fin-or-close": "sendQ", "recvQ-grow": "recvQ", "drops-appear": "skmem.d", "rcv-space-shrink": "rcv_space", "rto-grow": "rto", "backoff-high": "backoff", "cwnd-collapse": "cwnd", "retrans-appear": "retrans", "rwnd-high": "sendQ", "sendQ-present": "sendQ", "no-retrans": "rto", "skmem-r-grow": "skmem.r", "recvQ-high": "recvQ", "rwnd-limited": "sendQ" };
  return map[key] || "";
}

function renderTimelineHeatmap(events) {
  return renderHeatmapView(appCtx);
}

function renderTimelineStoriesView(stories) {
  return renderTimelineStoriesViewModel(stories, {
    state,
    escapeHtml,
    storyStepMetric
  });
}

function renderTimelineEventsView(events) {
  return `<div class="timeline-list">
    ${events.map(event => `<article class="timeline-event ${event.severity}">
      <div class="timeline-pin"></div>
      <div class="timeline-time"><strong>${escapeHtml(formatTimelineTime(event))}</strong><span>t+${formatTimelineOffset(event.t || 0)}s</span></div>
      <div class="timeline-body">
        <header><span class="risk ${event.severity}">${escapeHtml(event.severity)}</span><strong>${escapeHtml(event.title)}</strong><span class="metric-chip">${escapeHtml(event.metric)}</span></header>
        <p>${escapeHtml(event.detail)}</p>
      </div>
      <footer>${event.socketId ? `<button data-jump="${escapeHtml(event.socketId)}">${icons.focus} Context</button>` : ""}</footer>
    </article>`).join("")}
  </div>`;
}

function renderTimelineStories(stories) {
  return renderTimelineStoriesView(stories);
}

  return {
    renderTimeline,
    storyStepMetric,
    renderTimelineHeatmap,
    renderTimelineStoriesView,
    renderTimelineEventsView,
    renderTimelineStories
  };
}
