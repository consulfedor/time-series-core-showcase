"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('.view-panel')];
  const frame = $('#workspace-demo');
  const scenes = Object.freeze({
    dialog: 'dialog', docs: 'docs', memory: 'memory', voice: 'voice',
    agents: 'dialog', plan: 'dialog', checks: 'dialog', history: 'dialog',
    context: 'memory', translation: 'docs', board: 'memory',
  });
  const hasScene = name => Object.hasOwn(scenes, name);
  let active = 'dialog', demoScene = 'dialog', lastHeight = 0;
  let language = document.documentElement.lang;
  const embedded = new URLSearchParams(location.search).get('embed') === '1';

  // One sandboxed frontend keeps its local examples across outer views.
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
    postDemo('portfolio-demo-scene', {scene: demoScene});
    syncDemoViewport();
  }
  function selectDemo(scene) {
    if (demoScene === scene) return;
    demoScene = scene;
    postDemo('portfolio-demo-scene', {scene});
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

  function knowledgeView(name) {
    if (!['ontology', 'terms', 'board'].includes(name)) return;
    document.querySelectorAll('[data-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.view === name));
    });
    document.querySelectorAll('.knowledge-screen').forEach(figure => {
      figure.hidden = figure.id !== `screen-${name}`;
    });
    selectDemo(name);
  }

  function showScene(scene, focus = false) {
    if (!hasScene(scene)) return;
    active = scenes[scene];
    tabs.forEach(button => {
      const selected = button.dataset.tab === active;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.id !== `panel-${active}`; });
    if (active === 'memory') {
      const selected = scene === 'board' ? 'board'
        : $('[data-view][aria-pressed="true"]')?.dataset.view || 'ontology';
      knowledgeView(selected);
    } else selectDemo(active);
    if (focus) $(`#tab-${active}`).focus();
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

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.dataset.tab) navigate(button.dataset.tab, {push: true});
    if (button?.dataset.view) knowledgeView(button.dataset.view);
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
  tabs.forEach((button, index) => button.addEventListener('keydown', event => {
    const next = {ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    navigate(tabs[next].dataset.tab, {push: true, focus: true});
  }));
  const restoreRoute = () => navigate(locationRoute(), {scroll: Boolean(location.hash)});
  window.addEventListener('hashchange', restoreRoute);
  window.addEventListener('popstate', restoreRoute);
  window.addEventListener('message', event => {
    if (event.source === frame?.contentWindow &&
        ['null', location.origin].includes(event.origin) &&
        event.data?.type === 'portfolio-demo-viewport-request') {
      syncDemoViewport();
      return;
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

