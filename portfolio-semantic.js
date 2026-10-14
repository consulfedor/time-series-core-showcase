// Locale-aware layout over the existing OzMarkdownDiagrams viewer.
"use strict";

function selectSemanticSource(stage, language) {
  return language === "en" ? stage.dataset.mermaidSourceEn : stage.dataset.mermaidSourceRu;
}

function disclosureIsOpen(stage) {
  for (let parent = stage.parentElement; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS' && !parent.open) return false;
  }
  return true;
}

function bindSemanticDiagrams(document, viewer) {
  let language = new URL(document.defaultView.location.href).searchParams.get("lang") === "en" ? "en" : document.documentElement.lang;
  const entries = [...document.querySelectorAll("[data-mermaid-source-ru][data-mermaid-source-en]")].map(stage => ({stage, busy:false, rendered:null, started:null}));
  function update(entry) {
    if (entry.busy || entry.rendered === language || !disclosureIsOpen(entry.stage)) return;
    const source = selectSemanticSource(entry.stage, language);
    if (!source) throw Error("Missing reviewed semantic diagram locale");
    entry.busy = true;
    entry.started = language;
    entry.stage.dataset.mermaidSource = source;
    entry.stage.dataset.mermaidState = "pending";
    delete entry.stage.dataset.mermaidMounted;
    viewer.enhance(entry.stage);
  }
  for (const entry of entries) {
    const stateObserver = new MutationObserver(() => {
      if (!entry.busy || !["ready", "error"].includes(entry.stage.dataset.mermaidState)) return;
      entry.busy = false;
      entry.rendered = entry.started;
      entry.stage.dataset.diagramLanguage = entry.rendered;
      if (entry.stage.dataset.mermaidState === "ready") {
        const block = entry.stage.closest(".md-mermaid-block");
        const mode = block.querySelector('[data-mermaid-mode][aria-pressed="true"]')?.dataset.mermaidMode;
        viewer.setInlineMode(block, mode);
        if (document.querySelector("#ozMarkdownDiagramDialog[open]")) viewer.openDialog(block, block.querySelector("[data-mermaid-open]"));
      }
      // Serialize rapid switches: an older asynchronous render never wins.
      update(entry);
    });
    stateObserver.observe(entry.stage, {attributes:true, attributeFilter:["data-mermaid-state"]});
    update(entry);
  }
  const localeObserver = new MutationObserver(() => {
    const next = document.documentElement.lang;
    if (!["ru", "en"].includes(next) || next === language) return;
    language = next;
    entries.forEach(update);
  });
  localeObserver.observe(document.documentElement, {attributes:true, attributeFilter:["lang"]});
  const onDisclosure = event => {
    if (event.target.tagName !== 'DETAILS' || !event.target.open) return;
    entries.filter(entry => event.target.contains(entry.stage)).forEach(update);
  };
  document.addEventListener('toggle', onDisclosure, true);
  return () => {
    localeObserver.disconnect();
    document.removeEventListener('toggle', onDisclosure, true);
  };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => bindSemanticDiagrams(document, window.OzMarkdownDiagrams), {once:true});
}
if (typeof module !== "undefined") module.exports = {selectSemanticSource, bindSemanticDiagrams, disclosureIsOpen};
