export function createWorkspaceRenderController(getDeps) {
  const current = () => getDeps();

  function captureWorkspacePosition() {
    const { document, window } = current();
    const workspace = document.querySelector(".workspace");
    return {
      scrollTop: workspace?.scrollTop || 0,
      scrollLeft: workspace?.scrollLeft || 0,
      windowScrollX: window.scrollX || 0,
      windowScrollY: window.scrollY || 0
    };
  }

  function restoreWorkspacePosition(snapshot) {
    const { document, window } = current();
    const nextWorkspace = document.querySelector(".workspace");
    if (nextWorkspace) {
      nextWorkspace.scrollTop = snapshot.scrollTop;
      nextWorkspace.scrollLeft = snapshot.scrollLeft;
    }
    window.scrollTo(snapshot.windowScrollX, snapshot.windowScrollY);
  }

  function renderKeepingWorkspacePosition() {
    const { document, queueMicrotaskRef, render, requestAnimationFrame, setTimeoutRef } = current();
    const snapshot = captureWorkspacePosition();
    const active = document.activeElement;
    if (active && typeof active.blur === "function" && active.closest?.(".modal")) active.blur();
    const restore = () => restoreWorkspacePosition(snapshot);
    render();
    restore();
    queueMicrotaskRef(restore);
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
    setTimeoutRef(restore, 0);
    setTimeoutRef(restore, 80);
  }

  function renderKeepingModalPosition() {
    const { document, render } = current();
    const modal = document.querySelector(".modal");
    const modalScrollTop = modal?.scrollTop || 0;
    const modalScrollLeft = modal?.scrollLeft || 0;
    const columnList = document.querySelector(".column-list");
    const columnListScrollTop = columnList?.scrollTop || 0;
    const columnListScrollLeft = columnList?.scrollLeft || 0;
    render();
    const nextModal = document.querySelector(".modal");
    if (nextModal) {
      nextModal.scrollTop = modalScrollTop;
      nextModal.scrollLeft = modalScrollLeft;
    }
    const nextColumnList = document.querySelector(".column-list");
    if (nextColumnList) {
      nextColumnList.scrollTop = columnListScrollTop;
      nextColumnList.scrollLeft = columnListScrollLeft;
    }
  }

  return {
    captureWorkspacePosition,
    renderKeepingModalPosition,
    renderKeepingWorkspacePosition,
    restoreWorkspacePosition
  };
}
