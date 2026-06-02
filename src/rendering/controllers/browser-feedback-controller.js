export function createBrowserFeedbackController(getDeps) {
  const current = () => getDeps();

  function toast(title, text, type = "") {
    const { document, escapeHtml, setTimeoutRef } = current();
    const stack = document.querySelector("#toastStack");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p><button class="toast-close" aria-label="Close">x</button><span class="toast-progress"></span>`;
    el.querySelector(".toast-close").addEventListener("click", () => {
      el.classList.add("leaving");
      setTimeoutRef(() => el.remove(), 300);
    });
    el.addEventListener("mouseenter", () => { el.classList.add("paused"); });
    el.addEventListener("mouseleave", () => { el.classList.remove("paused"); });
    stack.appendChild(el);
    while (stack.children.length > 4) stack.firstElementChild.remove();
    setTimeoutRef(() => {
      if (!el.classList.contains("paused")) {
        el.classList.add("leaving");
        setTimeoutRef(() => el.remove(), 300);
        return;
      }
      const wait = () => {
        if (!el.classList.contains("paused")) {
          el.classList.add("leaving");
          setTimeoutRef(() => el.remove(), 300);
        } else {
          setTimeoutRef(wait, 500);
        }
      };
      setTimeoutRef(wait, 500);
    }, 8000);
  }

  async function copyTextToClipboard(text) {
    const { document, navigatorRef } = current();
    const value = String(text || "");
    if (!value) return false;
    if (navigatorRef.clipboard?.writeText) {
      await navigatorRef.clipboard.writeText(value);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }

  return {
    copyTextToClipboard,
    toast
  };
}
