export function renderTimelineStoriesViewModel(stories, deps) {
  const {
    state,
    escapeHtml,
    storyStepMetric
  } = deps;

  if (!stories.length && !state._multiSocketEvents?.length) return `<div class="timeline-stories-empty"><i class="ri-movie-2-line"></i><p>No causal pattern detected yet. Need more snapshots or stronger signals.</p></div>`;
  const groupEvents = state._multiSocketEvents || [];
  const _rawRates = state._rateAlerts || [];
  const _rateGroupMap = new Map();
  for (const a of _rawRates) { const k = `${a.process || a.peer}|${a.metric}|${a.epochMs}`; const g = _rateGroupMap.get(k); if (g) { g.count++; } else { _rateGroupMap.set(k, { ...a, count: 1 }); } }
  const rateAlerts = [..._rateGroupMap.values()].slice(0, 3);
  const rateTotal = _rateGroupMap.size;
  return `<section class="timeline-stories">
    ${rateAlerts.length ? `<div class="rate-alerts">
      ${rateAlerts.map(a => {
        const isBytes = a.metric === "recvQ" || a.metric === "sendQ" || a.metric === "skmem.r";
        const prev = isBytes ? `${Math.round(a.prevValue / 1024)} KB` : String(a.prevValue);
        const curr = isBytes ? `${Math.round(a.currValue / 1024)} KB` : String(a.currValue);
        const dt = a.dtMs >= 1000 ? `${(a.dtMs / 1000).toFixed(1)}s` : `${Math.round(a.dtMs)} ms`;
        const explain = a.metric === "sendQ" ? "App is writing faster than TCP can drain - peer or path cannot keep up."
          : a.metric === "recvQ" ? "Data arriving faster than the app reads - local process may be stalled."
          : a.metric === "skmem.r" ? "Kernel receive buffer filling rapidly - app not consuming."
          : a.metric === "skmem.d" ? "Packets being dropped - buffer overflow."
          : a.metric === "rto" ? "Retransmission timeout escalating - path or peer unresponsive."
          : a.metric === "backoff" ? "TCP retry backoff jumped - prolonged wait before next probe."
          : "";
        const time = a.epochMs ? new Date(a.epochMs).toISOString().slice(11, 23) + " UTC" : "";
        const countBadge = a.count > 1 ? ` <span class="rate-count">\u00d7${a.count} sockets</span>` : "";
        return `<div class="rate-alert ${a.severity}"><span class="risk ${a.severity}">${escapeHtml(a.severity)}</span>${time ? ` <span class="rate-time">${escapeHtml(time)}</span>` : ""} <b>${escapeHtml(a.label)}</b> on ${escapeHtml(a.process || a.peer)}${countBadge} &middot; <span class="rate-value">${escapeHtml(a.rateFormatted)}</span> <small>(${prev} &rarr; ${curr} in ${dt})</small> <span class="rate-explain">${explain}</span></div>`;
      }).join("")}
      ${rateTotal > 3 ? `<div class="rate-more"><button data-action="timelineView" data-value="events"><i class="ri-list-unordered"></i> +${rateTotal - 3} more velocity alerts ? All Events</button></div>` : ""}
    </div>` : ""}
    ${groupEvents.length ? `<div class="multi-socket-events">
      ${(() => {
        const byProcess = new Map();
        for (const event of groupEvents) {
          const k = event.narrative.title;
          const g = byProcess.get(k);
          if (g) { g.lines.push(event.narrative.line); } else { byProcess.set(k, { title: event.narrative.title, socketCount: event.socketCount, conclusion: event.narrative.conclusion, lines: [event.narrative.line] }); }
        }
        return [...byProcess.values()].slice(0, 2).map(g => `<article class="timeline-story group-event">
          <div class="story-header">
            <strong>${escapeHtml(g.title)}</strong>
            <span class="story-completeness">${g.socketCount} sockets</span>
          </div>
          <div class="story-narrative">
            ${g.lines.map(line => `<div class="story-step"><span class="story-dot group-dot"></span><span class="story-text">${escapeHtml(line)}</span></div>`).join("")}
            <div class="story-conclusion">${escapeHtml(g.conclusion)}</div>
          </div>
        </article>`).join("");
      })()}
    </div>` : ""}
    ${stories.length ? (() => {
      const socketKeys = [...new Set(stories.map(s => s.socketKey))];
      const socketCount = socketKeys.length;
      const patternTypes = [...new Set(stories.map(s => s.title))];
      const scope = socketCount === 1 ? `1 socket affected` : `${socketCount} sockets affected`;
      const peerLabel = socketCount === 1 && stories[0].socket ? (stories[0].socket.peer || stories[0].socketKey) : "";
      const socketNav = socketCount > 1 ? `<div class="stories-socket-nav">${socketKeys.map((sk, i) => { const s = stories.find(st => st.socketKey === sk); const label = s?.socket?.details?.process ? `${s.socket.details.process.name}:${s.socket.details.process.pid}` : sk.slice(0, 24); const peer = s?.socket?.peer || ""; const active = (!state.storySocketFilter && i === 0) || state.storySocketFilter === sk; return `<button class="story-socket-pill ${active ? "active" : ""}" data-action="filterStorySocket" data-socket-key="${escapeHtml(sk)}" title="${escapeHtml(sk)}">${escapeHtml(label)} → ${escapeHtml(peer.slice(0, 20))}</button>`; }).join("")}</div>` : "";
      return `${socketNav}<div class="stories-summary"><i class="ri-git-merge-line"></i> <b>${stories.length} ${stories.length === 1 ? "story" : "stories"}</b> - ${scope}${socketCount > 1 ? ` - ${patternTypes.length} distinct ${patternTypes.length === 1 ? "pattern" : "patterns"} (${escapeHtml(patternTypes.join(", "))})` : peerLabel ? ` - ${escapeHtml(peerLabel)}` : ""}</div>`;
    })() : ""}
    ${(() => { const filtered = state.storySocketFilter ? stories.filter(s => s.socketKey === state.storySocketFilter) : stories; return filtered.slice(0, 6); })().map(story => `<article class="timeline-story">
      <div class="story-header">
        <strong>${escapeHtml(story.title)}</strong>
        <span class="story-socket" title="${escapeHtml(story.socketKey)}">${escapeHtml((() => { const p = story.socket?.details?.process; const local = p ? `${p.name}:${p.pid}` : "local"; const peer = story.socket?.peer || story.socketKey.slice(0, 28); return `${local} \u2192 ${peer}`; })())}</span>
        <span class="story-completeness" title="${story.matchedSteps.length}/${story.totalSteps} expected steps observed in sequence">${story.matchedSteps.length}/${story.totalSteps} steps matched</span>
      </div>
      <div class="story-narrative">
        ${story.narrative.map((line, i) => i === story.narrative.length - 1
          ? `<div class="story-conclusion">${escapeHtml(line)}</div>`
          : `<div class="story-step${i === story.narrative.length - 2 && /torn down|abandoned|critical/i.test(line) ? " story-step-critical" : ""}"><button class="story-jump" data-action="storyJumpToChart" data-epoch="${story.matchedSteps[i]?.epochMs || ""}" data-metric="${storyStepMetric(story.matchedSteps[i]?.key || "")}" data-label="${escapeHtml(story.matchedSteps[i]?.label || "")}" title="Zoom chart to this moment"><i class="ri-line-chart-line"></i></button><span class="story-dot"></span><span class="story-text">${escapeHtml(line)}</span></div>`
        ).join("")}
      </div>
    </article>`).join("")}
  </section>`;

}
