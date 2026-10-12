/* Scene adapter only: no model duplicate, backend, credentials, or private state. */
"use strict";

function selectValueScene(section, id) {
  const scenes = [...section.querySelectorAll("[data-value-scene]")];
  const selected = scenes.find(scene => scene.dataset.valueScene === id);
  if (!selected) return false;
  scenes.forEach(scene => { scene.hidden = scene !== selected; });
  section.querySelectorAll("[data-value-select], [data-projection-node]").forEach(control => {
    const identity = control.dataset.valueSelect || control.dataset.projectionNode;
    control.setAttribute("aria-pressed", String(identity === id));
  });
  const status = section.querySelector("[data-value-status]");
  if (status) status.textContent = selected.querySelector(".eyebrow")?.textContent || id;
  return true;
}

function bindValueScenes(section) {
  const root = section.querySelector("[data-html-projection]");
  const sceneIds = [...section.querySelectorAll("[data-value-scene]")].map(scene => scene.dataset.valueScene);
  const nodeIds = (root?._projectionModel?.nodes || []).map(node => node.id);
  if (sceneIds.length !== nodeIds.length || !sceneIds.every(id => nodeIds.includes(id))) return false;
  section.querySelectorAll("[data-value-select]").forEach(button => {
    button.addEventListener("click", () => selectValueScene(section, button.dataset.valueSelect));
  });
  section.querySelectorAll("[data-projection-node]").forEach(node => {
    node.setAttribute("role", "button");
    node.setAttribute("aria-controls", "value-observer");
    node.setAttribute("aria-label", `Рассмотреть: ${node.querySelector("strong")?.textContent || node.dataset.projectionNode}`);
    const openScene = () => {
      selectValueScene(section, node.dataset.projectionNode);
      // On a narrow screen the real interface precedes the diagram; reveal
      // the chosen result without moving keyboard focus or losing graph state.
      if (typeof window !== "undefined" && window.innerWidth <= 1080) {
        section.querySelector(".value-observer").scrollIntoView({ block: "start", behavior: "instant" });
      }
    };
    node.addEventListener("click", openScene);
    node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openScene();
    });
  });
  section.querySelector(".value-observer").id = "value-observer";
  selectValueScene(section, "workplace");
  return true;
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const section = document.getElementById("value");
    if (section) bindValueScenes(section);
  }, { once: true });
}
if (typeof module !== "undefined") module.exports = { selectValueScene, bindValueScenes };
