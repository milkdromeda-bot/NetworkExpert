export function createCodeMirrorController(getDeps) {
  const current = () => getDeps();
  let instance = null;

  function getInstance() {
    return instance;
  }

  function initCodeMirror() {
    const { CodeMirror, document, setTimeoutRef, state } = current();
    const container = document.querySelector("#cmContainer");
    if (!container || !CodeMirror) return instance;
    if (container.querySelector(".CodeMirror")) return instance;
    instance = CodeMirror(container, {
      value: state.raw || "",
      mode: "ss",
      theme: "default",
      lineNumbers: true,
      lineWrapping: state.editorWordWrap,
      readOnly: false,
      placeholder: "Paste ss output or a timestamped collection here...",
      extraKeys: {
        "Ctrl-F": "findPersistent",
        "Cmd-F": "findPersistent",
        "Ctrl-G": "jumpToLine",
        "Cmd-G": "jumpToLine"
      }
    });
    instance.on("change", () => { state.raw = instance.getValue(); });
    instance.on("paste", () => {
      setTimeoutRef(() => {
        const val = instance.getValue();
        if (val.length > 20 && val.length < 500000) document.querySelector("[data-action='parse']")?.click();
      }, 100);
    });
    instance.setSize("100%", "clamp(360px, 58vh, 620px)");
    return instance;
  }

  function syncFromCodeMirror() {
    if (instance) current().state.raw = instance.getValue();
  }

  return {
    getInstance,
    initCodeMirror,
    syncFromCodeMirror
  };
}
