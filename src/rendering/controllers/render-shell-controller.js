export function createRenderShellController(getDeps) {
  const current = () => getDeps();

  function showBusy() {
    const { document } = current();
    document.getElementById("inlineBusy")?.classList.add("visible");
  }

  function hideBusy() {
    const { document } = current();
    document.getElementById("inlineBusy")?.classList.remove("visible");
    document.getElementById("busyOverlay")?.classList.remove("visible");
  }

  function staggerReveal() {
    const { document, IntersectionObserver } = current();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute("data-reveal", "");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    document
      .querySelectorAll(".workspace .advisor-card, .workspace .timeline-story, .workspace .expert-strip article, .workspace .diagnosis-grid > *")
      .forEach((el, index) => {
        el.style.animationDelay = `${index * 35}ms`;
        el.style.opacity = "0";
        observer.observe(el);
      });
  }

  function positionTabIndicator() {
    const { document } = current();
    const active = document.querySelector(".app-tab.active");
    const indicator = document.getElementById("tabIndicator");
    if (!active || !indicator) return;
    const tabsRect = active.closest(".app-tabs").getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    indicator.style.left = `${rect.left - tabsRect.left}px`;
    indicator.style.width = `${rect.width}px`;
  }

  function animateCounters() {
    const { document, performance, requestAnimationFrame } = current();
    document.querySelectorAll("[data-countup]").forEach(el => {
      const target = parseInt(el.dataset.countup, 10);
      if (isNaN(target)) return;
      const prev = parseInt(el.dataset.prev || "0", 10);
      if (prev === target) return;
      el.dataset.prev = target;
      const duration = 500;
      const start = performance.now();
      const fmt = n => n.toLocaleString("fr");
      (function step(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(Math.round(prev + (target - prev) * ease));
        if (t < 1) requestAnimationFrame(step);
      })(start);
    });
  }

  function renderSkeleton(type) {
    const skeletons = {
      analysis: `<div class="skeleton-grid" style="margin-bottom:16px">${Array(4).fill('<div class="skeleton skeleton-kpi"></div>').join("")}</div><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-chart" style="margin-top:16px"></div>`,
      table: `<div class="skeleton skeleton-title"></div>${Array(8).fill('<div class="skeleton skeleton-table-row"></div>').join("")}`,
      charts: `<div class="skeleton-grid">${Array(2).fill('<div class="skeleton skeleton-chart"></div>').join("")}</div>`
    };
    return skeletons[type] || skeletons.analysis;
  }

  function renderError(err) {
    const { consoleRef, document, escapeHtml } = current();
    consoleRef.error("Render error:", err);
    const app = document.querySelector("#app");
    if (!app) return;
    app.innerHTML = `<div style="padding:40px;max-width:700px;margin:0 auto;font-family:monospace">
      <h2 style="color:#ff5c77">Render error</h2>
      <p style="color:#c4d0de">A module crashed during rendering. Your data is preserved in memory.</p>
      <pre style="background:#0b1018;padding:16px;border-radius:8px;overflow:auto;color:#ff9f43;font-size:12px">${escapeHtml(err?.stack || err?.message || String(err))}</pre>
      <button onclick="try{render()}catch(e){}" style="padding:8px 16px;background:#5db7ff;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-top:12px">Retry render</button>
      <button onclick="location.reload()" style="padding:8px 16px;background:#52657a;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-top:12px;margin-left:8px">Reload page</button>
    </div>`;
  }

  function renderOnboarding() {
    const { state } = current();
    const steps = [
      { icon: "ri-upload-cloud-line", title: "Import your data", desc: "Click <b>Open ss file</b> or <b>Auto-detect dir</b> to load ss, vmstat, nstat, GC logs, and FIX logs at once.", target: "[data-action='pickAutoDir'],[data-action='openSsFile']", view: "ingest", anchor: "bottom" },
      { icon: "ri-play-line", title: "Analyze", desc: "Paste ss output in the editor and click <b>Analyze</b>, or use a sample from <b>See it in action</b>.", target: "[data-action='parse']", view: "ingest", anchor: "bottom" },
      { icon: "ri-stethoscope-line", title: "Diagnosis & Advisor", desc: "The tool builds a Root Cause Matrix, causal stories, and multi-socket correlation. Explore tabs for deep analysis.", target: "[data-tab='diagnosis'],[data-tab='advisor']", view: "analysis", anchor: "bottom" },
      { icon: "ri-line-chart-line", title: "Monitoring charts", desc: "Real-time charts with zoom, crosshair sync, and annotations. Use sub-tabs for BDP, JVM, and FIX Latency.", target: "[data-view='charts']", view: "charts", anchor: "bottom" },
      { icon: "ri-node-tree", title: "Service Map", desc: "Topology view shows process to socket to peer connections. Use <b>Geo & Flow</b> tabs for traffic distribution.", target: "[data-tab='map']", view: "analysis", anchor: "bottom" },
      { icon: "ri-settings-3-line", title: "Settings & Export", desc: "Customize thresholds, export PDF/HTML reports, evidence packs, or Jira tickets from the gear menu.", target: ".gear-btn", view: "ingest", anchor: "left" }
    ];
    const step = steps[state.onboarding] || steps[0];
    const isLast = state.onboarding >= steps.length - 1;
    if (step.view) state.view = step.view;
    return `<div class="onboarding-overlay" data-tour-step="${state.onboarding}" data-tour-target="${step.target}" data-tour-anchor="${step.anchor}">
      <div class="onboarding-card">
        <div class="onboarding-progress">${steps.map((_, index) => `<span class="${index <= state.onboarding ? "active" : ""}"></span>`).join("")}</div>
        <div class="onboarding-icon"><i class="${step.icon}"></i></div>
        <h2>${step.title}</h2>
        <p>${step.desc}</p>
        <div class="onboarding-actions">
          <button data-action="skipOnboarding" class="onboarding-skip">Skip tour</button>
          <button data-action="${isLast ? "finishOnboarding" : "nextOnboarding"}" class="primary">${isLast ? "Start using" : "Next &rarr;"}</button>
        </div>
        <span class="onboarding-step-count">${state.onboarding + 1}/${steps.length}</span>
      </div>
    </div>`;
  }

  function positionTourCard() {
    const { document, window } = current();
    const overlay = document.querySelector(".onboarding-overlay");
    if (!overlay) return;
    const selector = overlay.dataset.tourTarget;
    const anchor = overlay.dataset.tourAnchor || "bottom";
    const card = overlay.querySelector(".onboarding-card");
    if (!card) return;
    const target = selector ? document.querySelector(selector) : null;
    if (!target) {
      Object.assign(card.style, { position: "fixed", bottom: "24px", right: "24px", top: "auto", left: "auto" });
      return;
    }
    const rect = target.getBoundingClientRect();
    target.style.position = target.style.position || "relative";
    target.style.zIndex = "100001";
    target.style.boxShadow = "0 0 0 4px rgba(57,214,214,0.6), 0 0 20px rgba(57,214,214,0.3)";
    target.style.borderRadius = "6px";
    Object.assign(card.style, { position: "fixed", bottom: "auto", right: "auto" });
    if (anchor === "bottom") {
      card.style.top = `${Math.min(rect.bottom + 12, window.innerHeight - 260)}px`;
      card.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 380))}px`;
    } else if (anchor === "left") {
      card.style.top = `${Math.max(12, rect.top - 40)}px`;
      card.style.left = `${Math.max(12, rect.left - 380)}px`;
    }
  }

  return {
    animateCounters,
    hideBusy,
    positionTabIndicator,
    positionTourCard,
    renderError,
    renderOnboarding,
    renderSkeleton,
    showBusy,
    staggerReveal
  };
}
