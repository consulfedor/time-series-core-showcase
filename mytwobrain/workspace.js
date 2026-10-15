"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('.view-panel')];
  const viewer = $('#image-viewer');
  const scenes = Object.freeze({
    dialog: 'dialog', docs: 'docs', memory: 'memory', voice: 'voice',
    agents: 'dialog', plan: 'dialog', checks: 'dialog', history: 'dialog',
    context: 'dialog', translation: 'docs', board: 'memory',
  });
  const hasScene = name => Object.hasOwn(scenes, name);
  let active = 'dialog', returnFocus = null, lastHeight = 0;
  let language = document.documentElement.lang;
  const embedded = new URLSearchParams(location.search).get('embed') === '1';

  function closeViewer(restoreFocus = true) {
    if (viewer.open) viewer.close();
    // Release the full-size image and reference on navigation/lifecycle changes.
    $('#viewer-image').removeAttribute('src');
    $('#viewer-image').alt = '';
    $('#viewer-original').removeAttribute('href');
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }

  function knowledgeView(name) {
    if (!['ontology', 'terms', 'board'].includes(name)) return;
    closeViewer(false);
    document.querySelectorAll('[data-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.view === name));
    });
    document.querySelectorAll('.knowledge-screen').forEach(figure => {
      figure.hidden = figure.id !== `screen-${name}`;
    });
  }

  function showScene(scene, focus = false, updateHash = false) {
    if (!hasScene(scene)) return;
    const wasOpen = viewer.open;
    closeViewer(false);
    active = scenes[scene];
    tabs.forEach(button => {
      const selected = button.dataset.tab === active;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.id !== `panel-${active}`; });
    if (scene === 'board') knowledgeView('board');
    if (focus || wasOpen) $(`#tab-${active}`).focus();
    if (updateHash && location.protocol !== 'file:') {
      const url = new URL(location.href);
      url.hash = active;
      history.replaceState(null, '', url);
    }
  }

  function zoom(figure, trigger) {
    if (!figure || figure.hidden || figure.closest('.view-panel')?.hidden) return;
    const image = figure.querySelector('img');
    if (!image || image.dataset.unavailable === 'true') return;
    closeViewer(false);
    returnFocus = trigger;
    // The path comes only from a static local image, never from messages or URL input.
    $('#viewer-image').src = image.getAttribute('src');
    $('#viewer-image').alt = image.alt;
    $('#viewer-caption').textContent = figure.querySelector('figcaption p').textContent;
    $('#viewer-original').href = image.getAttribute('src');
    viewer.showModal();
    $('#viewer-close').focus();
    $('.viewer-scroll').scrollTop = 0;
    $('.viewer-scroll').scrollLeft = 0;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.dataset.tab) showScene(button.dataset.tab, false, true);
    if (button?.dataset.view) knowledgeView(button.dataset.view);
    if (button?.dataset.zoom) zoom(document.getElementById(button.dataset.zoom), button);
    if (button?.id === 'viewer-close') closeViewer();
    const link = event.target.closest('a[href]');
    if (link && link.id !== 'viewer-original') closeViewer(false);
  });
  tabs.forEach((button, index) => button.addEventListener('keydown', event => {
    const next = {ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    showScene(tabs[next].dataset.tab, true, true);
  }));
  viewer.addEventListener('cancel', event => { event.preventDefault(); closeViewer(); });

  // Missing upstream assets stay visibly unavailable rather than becoming fake screens.
  document.querySelectorAll('.screen-image').forEach(image => {
    function unavailable() {
      if (image.dataset.unavailable === 'true') return;
      image.dataset.unavailable = 'true';
      image.hidden = true;
      const figure = image.closest('figure');
      figure.querySelector('[data-zoom]').disabled = true;
      const status = document.createElement('p');
      status.className = 'screen-error';
      status.setAttribute('role', 'status');
      status.textContent = document.documentElement.lang === 'en'
        ? 'Image unavailable.' : 'Кадр недоступен.';
      figure.prepend(status);
    }
    image.addEventListener('error', unavailable);
    if (image.complete && image.naturalWidth === 0) unavailable();
  });

  function locationScene() {
    const hash = location.hash.slice(1);
    const query = new URLSearchParams(location.search).get('tab');
    return hasScene(hash) ? hash : hasScene(query) ? query : 'dialog';
  }
  window.addEventListener('hashchange', () => showScene(locationScene()));
  window.addEventListener('message', event => {
    if (window === parent || event.source !== parent || event.origin !== location.origin ||
        event.data?.type !== 'portfolio-workspace-scene' || !hasScene(event.data.scene)) return;
    showScene(event.data.scene);
  });

  const languageObserver = new MutationObserver(() => {
    if (language === document.documentElement.lang) return;
    language = document.documentElement.lang;
    const wasOpen = viewer.open;
    closeViewer();
    if (wasOpen) $(`#tab-${active}`).focus();
  });
  const sizeObserver = embedded ? new ResizeObserver(() => {
    const height = document.body.scrollHeight;
    if (height === lastHeight) return;
    lastHeight = height;
    if (window !== parent && location.origin !== 'null') {
      parent.postMessage({type: 'portfolio-workspace-height', height}, location.origin);
    }
  }) : null;
  function observe() {
    languageObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
    sizeObserver?.observe(document.body);
  }
  window.addEventListener('pagehide', () => {
    closeViewer(false);
    languageObserver.disconnect();
    sizeObserver?.disconnect();
  });
  window.addEventListener('pageshow', () => { lastHeight = 0; observe(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) closeViewer(false);
  });
  if (embedded) document.body.classList.add('embedded');
  showScene(locationScene());
  observe();
})();
