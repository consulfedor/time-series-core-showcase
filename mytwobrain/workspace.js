"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const panels = [...document.querySelectorAll('.view-panel')];
  const frame = $('#workspace-demo');
  const scenes = Object.freeze({
    dialog: 'dialog', docs: 'docs', memory: 'memory', voice: 'voice',
    agents: 'dialog', plan: 'dialog', composer: 'dialog', alerts: 'dialog',
    checks: 'dialog', history: 'dialog', context: 'memory',
    ontology: 'memory', terms: 'memory', translation: 'docs', board: 'memory',
  });
  const hasScene = name => Object.hasOwn(scenes, name);
  let demoScene = 'dialog', demoReveal = false, lastHeight = 0;
  let language = document.documentElement.lang;
  const embedded = new URLSearchParams(location.search).get('embed') === '1';

  // One sandboxed frontend keeps its local examples. Explanations stay visible.
  function postDemo(type, value) {
    frame?.contentWindow?.postMessage({type, ...value}, '*');
  }
  function syncDemoViewport() {
    if (!frame?.getBoundingClientRect) return;
    const frameTop = frame.getBoundingClientRect().top + frame.clientTop;
    const top = Math.max(0, Math.min(frame.clientHeight, -frameTop));
    const bottom = Math.max(top, Math.min(frame.clientHeight, window.innerHeight - frameTop));
    if (bottom > top) postDemo('portfolio-demo-viewport', {top, height: bottom - top});
  }
  function syncDemo() {
    postDemo('portfolio-language', {language: document.documentElement.lang});
    postDemo('portfolio-demo-scene', {scene: demoScene, reveal: demoReveal});
    syncDemoViewport();
  }
  function selectDemo(scene, reveal = false) {
    demoScene = scene;
    demoReveal = reveal;
    postDemo('portfolio-demo-scene', {scene, reveal});
  }
  frame?.addEventListener('load', syncDemo);
  window.addEventListener('scroll', syncDemoViewport, {passive: true});
  window.addEventListener('resize', syncDemoViewport);

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

  function reflectKnowledgeView(name) {
    if (!['memory', 'ontology', 'terms', 'board'].includes(name)) return;
    document.body.dataset.knowledgeView = name;
  }

  function knowledgeView(name, reveal = false) {
    if (!['memory', 'ontology', 'terms', 'board'].includes(name)) return;
    reflectKnowledgeView(name);
    selectDemo(name, reveal);
  }

  function showScene(scene, focus = false, reveal = false) {
    if (!hasScene(scene)) return;
    const currentArea = scenes[scene];
    panels.forEach(panel => { panel.hidden = false; });
    if (currentArea === 'memory') {
      const selected = ['ontology', 'terms', 'board'].includes(scene) ? scene : 'memory';
      knowledgeView(selected, reveal);
    } else selectDemo(['checks', 'history'].includes(scene) ? 'dialog' : scene, reveal);
    if (focus) frame?.focus({preventScroll: true});
  }

  function resolveRoute(name) {
    if (hasScene(name)) return {scene: name, target: null};
    const target = document.getElementById(name);
    if (['workspace-zones', 'screen-workplace'].includes(name) && target) return {scene: 'dialog', target};
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

  // The single demo, zone branches and nested links share one history-aware route.
  function navigate(name, {push = false, focus = false, scroll = false} = {}) {
    const route = resolveRoute(name);
    if (!route) return false;
    const reveal = !route.target && Boolean(push || location.hash ||
      new URLSearchParams(location.search).get('tab'));
    // Preserve named inner scenes without a second outer tab bar.
    showScene(route.target ? route.scene : name, false, reveal);
    if (route.target) {
      if (/^screen-(memory|ontology|terms|board)$/.test(route.target.id)) {
        knowledgeView(route.target.id.replace(/^screen-/, ''));
      }
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
    } else {
      if (scroll) frame?.scrollIntoView({block: 'start'});
      if (focus) frame?.focus({preventScroll: true});
    }
    if (push && location.protocol !== 'file:') {
      const url = new URL(location.href);
      url.hash = name;
      if (url.href !== location.href) history.pushState(null, '', url);
    }
    syncLanguageLinks();
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    const link = event.target.closest('a[href]');
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      const href = link.getAttribute('href');
      if (href.startsWith('#') && navigate(href.slice(1), {push: true, focus: true, scroll: true})) {
        event.preventDefault();
        return;
      }
    }
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
  const restoreRoute = () => navigate(locationRoute(), {scroll: Boolean(location.hash)});
  window.addEventListener('hashchange', restoreRoute);
  window.addEventListener('popstate', restoreRoute);
  window.addEventListener('message', event => {
    if (event.source === frame?.contentWindow &&
        ['null', location.origin].includes(event.origin)) {
      if (event.data?.type === 'portfolio-demo-viewport-request') {
        syncDemoViewport();
        return;
      }
      if (event.data?.type === 'portfolio-workspace-inner-view') {
        reflectKnowledgeView(event.data.view);
        return;
      }
    }
    if (window === parent || event.source !== parent || event.origin !== location.origin ||
        event.data?.type !== 'portfolio-workspace-scene' || !hasScene(event.data.scene)) return;
    showScene(event.data.scene);
  });

  const languageObserver = new MutationObserver(() => {
    if (language === document.documentElement.lang) return;
    language = document.documentElement.lang;
    postDemo('portfolio-language', {language});
    syncLanguageLinks();
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
    languageObserver.disconnect();
    sizeObserver?.disconnect();
  });
  window.addEventListener('pageshow', () => { lastHeight = 0; observe(); });
  if (embedded) {
    document.body.classList.add('embedded');
    document.querySelectorAll('[data-component-ref],.system-return').forEach(link => {
      link.target = '_top';
    });
  }
  document.addEventListener('DOMContentLoaded', syncLanguageLinks, {once: true});
  restoreRoute();
  observe();
  syncDemo();
})();


