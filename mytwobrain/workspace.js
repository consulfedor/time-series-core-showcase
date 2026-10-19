"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('.view-panel')];
  const viewer = $('#image-viewer');
  const zoneDialog = $('#workspace-zone-dialog');
  const canPreviewZone = typeof zoneDialog?.showModal === 'function';
  const scenes = Object.freeze({
    dialog: 'dialog', docs: 'docs', memory: 'memory', voice: 'voice',
    agents: 'dialog', plan: 'dialog', checks: 'dialog', history: 'dialog',
    context: 'dialog', translation: 'docs', board: 'memory',
  });
  const hasScene = name => Object.hasOwn(scenes, name);
  let active = 'dialog', returnFocus = null, zoneReturnFocus = null, lastHeight = 0;
  let language = document.documentElement.lang;
  const embedded = new URLSearchParams(location.search).get('embed') === '1';

  function syncLanguageLinks() {
    document.querySelectorAll('a[data-static-language]').forEach(link => {
      const url = new URL(link.href, location.href);
      url.hash = location.hash;
      url.search = location.search;
      link.href = url.href;
      if (link.dataset.staticLanguage === document.documentElement.lang) {
        link.setAttribute('aria-current', 'page');
      } else link.removeAttribute('aria-current');
    });
  }

  function closeViewer(restoreFocus = true) {
    if (viewer.open) viewer.close();
    // Release the full-size image and reference on navigation/lifecycle changes.
    $('#viewer-image').removeAttribute('src');
    $('#viewer-image').alt = '';
    $('#viewer-original').removeAttribute('href');
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }

  function closeZone(restoreFocus = true) {
    if (zoneDialog?.open) zoneDialog.close();
    if (restoreFocus && zoneReturnFocus?.isConnected) zoneReturnFocus.focus();
    zoneReturnFocus = null;
  }

  function previewZone(id, trigger) {
    const zone = document.getElementById(id);
    if (!canPreviewZone || !zone?.matches('[data-workspace-zone]')) return false;
    closeViewer(false);
    closeZone(false);
    zoneReturnFocus = trigger;
    // Copy only the two canonical text fields; never clone IDs or function markup.
    $('#zone-dialog-title').textContent = zone.querySelector('.zone-title').textContent;
    $('#zone-dialog-intro').textContent = zone.querySelector('.zone-intro').textContent;
    $('#zone-dialog-more').href = `#${zone.id}`;
    zoneDialog.showModal();
    $('#zone-dialog-close').focus();
    return true;
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

  function showScene(scene, focus = false) {
    if (!hasScene(scene)) return;
    const wasOpen = viewer.open || zoneDialog?.open;
    closeViewer(false);
    closeZone(false);
    active = scenes[scene];
    tabs.forEach(button => {
      const selected = button.dataset.tab === active;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.id !== `panel-${active}`; });
    if (scene === 'board') knowledgeView('board');
    if (focus || wasOpen) $(`#tab-${active}`).focus();
  }

  function resolveRoute(name) {
    if (hasScene(name)) return {scene: name, target: null};
    const target = document.getElementById(name);
    const panel = target?.closest('.view-panel');
    const scene = panel?.id.replace(/^panel-/, '');
    return hasScene(scene) ? {scene, target} : null;
  }

  function locationRoute() {
    let hash = '';
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* Ignore malformed hashes. */ }
    const query = new URLSearchParams(location.search).get('tab');
    return resolveRoute(hash) ? hash : hasScene(query) ? query : 'dialog';
  }

  // Tabs, zone branches and nested function links share one history-aware route.
  function navigate(name, {push = false, focus = false, scroll = false} = {}) {
    const route = resolveRoute(name);
    if (!route) return false;
    showScene(route.scene);
    if (route.target) {
      const knowledge = route.target.closest('.knowledge-screen');
      if (knowledge) knowledgeView(knowledge.id.replace(/^screen-/, ''));
      const ancestors = [];
      for (let node = route.target; node && node !== document.body; node = node.parentElement) {
        if (node.tagName === 'DETAILS') ancestors.unshift(node);
      }
      ancestors.forEach(details => { details.open = true; });
      if (scroll) route.target.scrollIntoView({block: 'start'});
      if (focus) {
        const target = route.target.matches('details')
          ? route.target.querySelector(':scope > summary') : route.target;
        if (!target.matches('a[href],button,summary,input,select,textarea,[tabindex]')) {
          target.setAttribute('tabindex', '-1');
        }
        target.focus({preventScroll: true});
      }
    } else if (focus) {
      $(`#tab-${active}`).focus();
    }
    if (push && location.protocol !== 'file:') {
      const url = new URL(location.href);
      url.hash = name;
      if (url.href !== location.href) history.pushState(null, '', url);
    }
    syncLanguageLinks();
    return true;
  }

  function zoom(figure, trigger) {
    if (!figure || figure.hidden || figure.closest('.view-panel')?.hidden) return;
    const image = figure.querySelector('img');
    if (!image || image.dataset.unavailable === 'true') return;
    closeViewer(false);
    closeZone(false);
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
    if (button?.dataset.tab) navigate(button.dataset.tab, {push: true});
    if (button?.dataset.view) knowledgeView(button.dataset.view);
    if (button?.dataset.zoom) zoom(document.getElementById(button.dataset.zoom), button);
    if (button?.id === 'viewer-close') closeViewer();
    if (button?.id === 'zone-dialog-close') closeZone();
    const link = event.target.closest('a[href]');
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      if (link.dataset.zoneOpen && previewZone(link.dataset.zoneOpen, link)) {
        event.preventDefault();
        return;
      }
      const href = link.getAttribute('href');
      if (href.startsWith('#') && navigate(href.slice(1), {push: true, focus: true, scroll: true})) {
        event.preventDefault();
        return;
      }
    }
    if (link && link.id !== 'viewer-original') closeViewer(false);
    const summary = event.target.closest('[data-workspace-zone] > summary, [data-workspace-function] > summary');
    if (summary && !link && !button) {
      const details = summary.parentElement;
      event.preventDefault();
      if (!details.open) {
        navigate(details.id, {push: true});
      } else {
        details.open = false;
        const current = resolveRoute(locationRoute())?.target;
        if (current && details.contains(current)) {
          const parentBranch = details.parentElement.closest('[data-workspace-zone], [data-workspace-function]');
          navigate(parentBranch?.id || 'dialog', {push: true});
        }
      }
    }
  });
  if (canPreviewZone) document.querySelectorAll('[data-zone-open]').forEach(link => {
    link.setAttribute('role', 'button');
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('keydown', event => {
      if (event.key !== ' ' || event.repeat) return;
      event.preventDefault();
      link.click();
    });
  });
  tabs.forEach((button, index) => button.addEventListener('keydown', event => {
    const next = {ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    navigate(tabs[next].dataset.tab, {push: true, focus: true});
  }));
  viewer.addEventListener('cancel', event => { event.preventDefault(); closeViewer(); });
  zoneDialog?.addEventListener('cancel', event => { event.preventDefault(); closeZone(); });

  // Missing upstream assets stay visibly unavailable rather than becoming fake screens.
  document.querySelectorAll('.screen-image').forEach(image => {
    function unavailable() {
      if (image.dataset.unavailable === 'true') return;
      image.dataset.unavailable = 'true';
      image.hidden = true;
      const figure = image.closest('figure');
      figure.querySelector('[data-zoom]').disabled = true;
      figure.querySelectorAll('[data-zone-open]').forEach(link => { link.hidden = true; });
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

  const restoreRoute = () => navigate(locationRoute(), {scroll: Boolean(location.hash)});
  window.addEventListener('hashchange', restoreRoute);
  window.addEventListener('popstate', restoreRoute);
  window.addEventListener('message', event => {
    if (window === parent || event.source !== parent || event.origin !== location.origin ||
        event.data?.type !== 'portfolio-workspace-scene' || !hasScene(event.data.scene)) return;
    showScene(event.data.scene);
  });

  const languageObserver = new MutationObserver(() => {
    if (language === document.documentElement.lang) return;
    language = document.documentElement.lang;
    const wasOpen = viewer.open || zoneDialog?.open;
    closeViewer();
    closeZone();
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
    closeZone(false);
    languageObserver.disconnect();
    sizeObserver?.disconnect();
  });
  window.addEventListener('pageshow', () => { lastHeight = 0; observe(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { closeViewer(false); closeZone(false); }
  });
  if (embedded) {
    document.body.classList.add('embedded');
    document.querySelectorAll('[data-component-ref],.system-return').forEach(link => {
      link.target = '_top';
    });
  }
  document.addEventListener('DOMContentLoaded', syncLanguageLinks, {once: true});
  restoreRoute();
  observe();
})();
