import { bindAppClickHandlers } from "./app-click-events.js";

export function createGlobalDomController(getDeps) {
  const undoStack = [];
  const current = () => getDeps();
  function pushUndo() {
    const { state } = current();
    undoStack.push({
      activeTab: state.activeTab,
      selectedId: state.selectedId,
      chartZoom: { ...state.chartZoom },
      view: state.view
    });
    if (undoStack.length > 20) undoStack.shift();
  }
  function popUndo() {
    const { state, render, toast } = current();
    const prev = undoStack.pop();
    if (!prev) return;
    Object.assign(state, prev);
    render();
    toast("Undo", "Reverted to previous state.");
  }
  function toggleCommandPalette() {
    const { document, state, render, setTimeout } = current();
    if (state.modal === "commandPalette") {
      state.modal = null;
      render();
      return;
    }
    state.modal = "commandPalette";
    state.commandPaletteQuery = "";
    render();
    setTimeout(() => document.querySelector("#cmdPaletteInput")?.focus(), 50);
  }
  function bindKeyboardNavigation() {
    const { document, state, render } = current();
    document.addEventListener("keydown", event => {
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) return;
      if (event.key === "Escape") {
        if (state.onboarding >= 0) {
          state.onboarding = -1;
          localStorage.setItem("networkExpertOnboarded", "1");
          render();
          return;
        }
        if (document.documentElement.classList.contains("presentation-mode")) {
          document.documentElement.classList.remove("presentation-mode");
          return;
        }
        if (state.modal) {
          state.modal = null;
          render();
          return;
        }
        if (state.drawer) {
          state.drawer = null;
          render();
        }
      }
      if (event.ctrlKey || event.metaKey) {
        const num = parseInt(event.key);
        if (num >= 1 && num <= 9) {
          const tabs = ["quality", "diagnosis", "advisor", "templates", "map", "conversations", "timeline", "alerts", "compare"];
          if (tabs[num - 1]) {
            event.preventDefault();
            state.activeTab = tabs[num - 1];
            state.view = "analysis";
            render();
          }
        }
        if (event.key === "e") {
          event.preventDefault();
          state.view = "ingest";
          render();
        }
        if (event.key === "m") {
          event.preventDefault();
          state.view = "charts";
          state.chartsTab = "charts";
          render();
        }
      }
    });
  }
  function bindExportShortcuts() {
    const { document, openIncidentReport, exportIncidentReportHtml, exportEvidencePack, copyTextToClipboard, buildJiraReport, toast, exportFixSpikeCsv } = current();
    document.addEventListener("keydown", event => {
      if (!event.ctrlKey || !event.shiftKey) return;
      if (event.key === "P") { event.preventDefault(); openIncidentReport(); }
      if (event.key === "H") { event.preventDefault(); exportIncidentReportHtml(); }
      if (event.key === "Z") { event.preventDefault(); exportEvidencePack().catch(() => {}); }
      if (event.key === "J") { event.preventDefault(); copyTextToClipboard(buildJiraReport()); toast("Jira report copied", "Paste into a Jira ticket."); }
      if (event.key === "F") { event.preventDefault(); exportFixSpikeCsv(); }
    });
  }
  function bindDocumentShortcuts() {
    const { document, state, render, clampZoomRange } = current();
    document.addEventListener("keydown", event => {
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) return;
      const sockets = state.sockets;
      if (event.key === "j" && !event.ctrlKey) {
        const idx = sockets.findIndex(socket => socket.id === state.selectedId);
        const next = sockets[Math.min(sockets.length - 1, idx + 1)];
        if (next) { pushUndo(); state.selectedId = next.id; render(); }
      }
      if (event.key === "k" && !event.ctrlKey) {
        const idx = sockets.findIndex(socket => socket.id === state.selectedId);
        const prev = sockets[Math.max(0, idx - 1)];
        if (prev) { pushUndo(); state.selectedId = prev.id; render(); }
      }
      if (event.key === "r" && !event.ctrlKey && !event.metaKey) { pushUndo(); state.chartZoom = { start: 0, end: 1 }; render(); }
      if (event.key === "z" && (event.ctrlKey || event.metaKey) && !event.shiftKey) { event.preventDefault(); popUndo(); }
      if (event.key === "k" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); toggleCommandPalette(); }
      if (event.key === "?" && !event.ctrlKey) { state.modal = state.modal === "shortcuts" ? null : "shortcuts"; render(); }
    });
    document.querySelector("#app")?.addEventListener("dblclick", event => {
      const svg = event.target.closest("svg.chart");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const xRatio = (event.clientX - rect.left) / rect.width;
      const z = state.chartZoom;
      const range = z.end - z.start;
      const center = z.start + xRatio * range;
      const newRange = range / 2;
      state.chartZoom = clampZoomRange({ start: center - newRange / 2, end: center + newRange / 2 });
      render();
    });
    document.querySelector("#app")?.addEventListener("contextmenu", event => {
      if (!event.target.closest("svg.chart")) return;
      event.preventDefault();
      const z = state.chartZoom;
      const range = z.end - z.start;
      const center = (z.start + z.end) / 2;
      const newRange = Math.min(1, range * 2);
      state.chartZoom = clampZoomRange({ start: center - newRange / 2, end: center + newRange / 2 });
      render();
    });
  }
  function bindFileDrop() {
    const { document, importFile, createBaseline, state, toast, render } = current();
    document.addEventListener("dragover", event => {
      event.preventDefault();
      document.querySelector(".drop-zone")?.classList.add("dragover");
    });
    document.addEventListener("dragleave", event => {
      if (!event.relatedTarget || !document.contains(event.relatedTarget)) document.querySelector(".drop-zone")?.classList.remove("dragover");
    });
    document.addEventListener("drop", event => {
      event.preventDefault();
      document.querySelector(".drop-zone")?.classList.remove("dragover");
      const files = [...(event.dataTransfer?.files || [])].filter(file => /\.(log|txt|out|ss|gz|zip)$/i.test(file.name));
      if (!files.length) return;
      if (files.length === 1) { importFile(files[0]); return; }
      (async () => {
        await importFile(files[0]);
        state.baseline = createBaseline();
        state.baseline.role = "healthy";
        state.baseline.label = files[0].name;
        toast("Baseline set", `${files[0].name} loaded as baseline (${state.sockets.length} sockets).`);
        await importFile(files[1]);
        state.activeTab = "compare";
        render();
        toast("Comparison ready", `${files[0].name} vs ${files[1].name} - switch to Compare tab.`);
      })();
    });
  }
  function bindVisualChrome() {
    const { document } = current();
    const backToTop = document.getElementById("backToTop");
    document.querySelector("#app")?.addEventListener("scroll", event => {
      const workspace = event.target.closest?.(".workspace");
      if (!workspace) return;
      document.querySelector(".topbar")?.classList.toggle("compact", workspace.scrollTop > 40);
      backToTop?.classList.toggle("visible", workspace.scrollTop > 300);
    }, true);
    backToTop?.addEventListener("click", () => {
      document.querySelector(".workspace")?.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.querySelector("#app")?.addEventListener("mousemove", event => {
      const panel = event.target.closest(".panel, .advisor-card, .guided-checklist-card");
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
      panel.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
    }, { passive: true });
    document.addEventListener("pointerdown", event => {
      const btn = event.target.closest("button:not(.icon)");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      ripple.className = "ripple";
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    });
  }
  function bindThemePreference() {
    const { document, window, state, render, localStorage } = current();
    if (localStorage.getItem("theme")) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    if (!media.matches && state.prefs.theme !== "light") {
      state.prefs.theme = "light";
      document.documentElement.dataset.theme = "light";
    }
    media.addEventListener("change", event => {
      state.prefs.theme = event.matches ? "dark" : "light";
      document.documentElement.dataset.theme = state.prefs.theme;
      render();
    });
  }
  function bindGlobalDomEvents() {
    bindKeyboardNavigation();
    bindAppClickHandlers(getDeps);
    bindExportShortcuts();
    bindThemePreference();
    bindDocumentShortcuts();
    bindFileDrop();
    bindVisualChrome();
  }
  return {
    bindGlobalDomEvents,
    toggleCommandPalette
  };
}
