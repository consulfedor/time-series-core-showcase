/* One authored model, one set of panels; no backend or duplicate scene state. */
"use strict";

function selectValueScene(section, id) {
  const scenes = [...section.querySelectorAll("[data-value-scene]")];
  const selected = scenes.find(scene => scene.dataset.valueScene === id);
  if (!selected) return false;
  scenes.forEach(scene => { scene.hidden = scene !== selected; });
  section.querySelectorAll("[data-projection-node]").forEach(control => {
    control.setAttribute("aria-pressed", String(control.dataset.projectionNode === id));
  });
  return true;
}

function bindValueScenes(section) {
  const root = section.querySelector("[data-html-projection]");
  const sceneIds = [...section.querySelectorAll("[data-value-scene]")].map(scene => scene.dataset.valueScene);
  const nodeIds = (root?._projectionModel?.nodes || []).map(node => node.id);
  if (!nodeIds.length || sceneIds.length !== nodeIds.length ||
      new Set(sceneIds).size !== sceneIds.length || !sceneIds.every((id, i) => nodeIds[i] === id)) return false;
  const observer = section.querySelector(".value-observer");
  const home = section.querySelector("[data-value-home]");
  const dialog = section.querySelector(".value-dialog");
  const close = section.querySelector("[data-value-close]");
  const narrow = window.matchMedia("(max-width: 900px)");
  let trigger;
  const restore = () => {
    home.append(observer);
    trigger?.focus({ preventScroll: true });
  };
  dialog.addEventListener("close", restore);
  close.addEventListener("click", () => dialog.close());
  narrow.addEventListener("change", () => { if (dialog.open) dialog.close(); });
  section.querySelectorAll("[data-projection-node]").forEach(node => {
    node.setAttribute("role", "button");
    node.setAttribute("aria-controls", "value-observer");
    node.setAttribute("aria-label", `Рассмотреть: ${node.querySelector("strong")?.textContent || node.dataset.projectionNode}`);
    const openScene = () => {
      const id = node.dataset.projectionNode;
      if (!selectValueScene(section, id)) return;
      trigger = node;
      // Mobile opens the SAME panel. Escape restores the exact place and focus.
      if (narrow.matches && typeof dialog.showModal === "function") {
        section.querySelector("[data-value-dialog-body]").append(observer);
        dialog.setAttribute("aria-labelledby", `scene-${id}`);
        dialog.showModal();
        dialog.scrollTop = 0;
      }
    };
    node.addEventListener("click", openScene);
    node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openScene();
    });
  });
  selectValueScene(section, nodeIds[0]);
  return true;
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const section = document.getElementById("value");
    if (section) bindValueScenes(section);
  }, { once: true });
}
if (typeof module !== "undefined") module.exports = { selectValueScene, bindValueScenes };
