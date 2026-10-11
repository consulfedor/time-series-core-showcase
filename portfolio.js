"use strict";
const workspaceFrame = document.querySelector("iframe.workspace");
window.addEventListener("message", event => {
  if (event.source !== workspaceFrame.contentWindow || event.origin !== location.origin) return;
  const data = event.data;
  if (data?.type === "portfolio-workspace-height" && Number.isFinite(data.height) && data.height > 0 && data.height < 10000) {
    workspaceFrame.style.height = `${Math.ceil(data.height) + 2}px`;
  }
});
