export function createUndoCacheController(getDeps) {
  const current = () => getDeps();
  let cachedDataVersion = -1;
  let cachedStories = [];
  let cachedMultiSocket = [];
  let cachedRateAlerts = [];

  function undoSnapshot() {
    const { state } = current();
    const snap = { view: state.view, activeTab: state.activeTab, chartsTab: state.chartsTab, selectedId: state.selectedId, annotations: JSON.stringify(state.annotations), filter: state.filter };
    state._undoStack.push(snap);
    if (state._undoStack.length > 30) state._undoStack.shift();
    state._redoStack = [];
  }

  function undo() {
    const { render, state } = current();
    if (!state._undoStack.length) return;
    const currentState = { view: state.view, activeTab: state.activeTab, chartsTab: state.chartsTab, selectedId: state.selectedId, annotations: JSON.stringify(state.annotations), filter: state.filter };
    state._redoStack.push(currentState);
    applySnapshot(state, state._undoStack.pop());
    render();
  }

  function redo() {
    const { render, state } = current();
    if (!state._redoStack.length) return;
    const currentState = { view: state.view, activeTab: state.activeTab, chartsTab: state.chartsTab, selectedId: state.selectedId, annotations: JSON.stringify(state.annotations), filter: state.filter };
    state._undoStack.push(currentState);
    applySnapshot(state, state._redoStack.pop());
    render();
  }

  function applySnapshot(state, snap) {
    state.view = snap.view;
    state.activeTab = snap.activeTab;
    state.chartsTab = snap.chartsTab;
    state.selectedId = snap.selectedId;
    state.filter = snap.filter;
    try {
      state.annotations = JSON.parse(snap.annotations);
    } catch {}
  }

  function cachedStoriesValue() {
    const { detectMultiSocketCorrelation, detectRateOfChange, detectTimelineStories, state } = current();
    if (cachedDataVersion !== state.dataVersion) {
      cachedDataVersion = state.dataVersion;
      cachedStories = detectTimelineStories(state.raw, state.sockets);
      cachedMultiSocket = detectMultiSocketCorrelation(state.raw);
      cachedRateAlerts = detectRateOfChange(state.raw);
    }
    return cachedStories;
  }

  function cachedMultiSocketValue() {
    cachedStoriesValue();
    return cachedMultiSocket;
  }

  function cachedRateAlertsValue() {
    cachedStoriesValue();
    return cachedRateAlerts;
  }

  return {
    cachedMultiSocket: cachedMultiSocketValue,
    cachedRateAlerts: cachedRateAlertsValue,
    cachedStories: cachedStoriesValue,
    redo,
    undo,
    undoSnapshot
  };
}
