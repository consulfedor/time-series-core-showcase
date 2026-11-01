(() => {
  'use strict';

  const KEY = 'english-practice:v1:pimsleur-i-01';
  const DURATION = 1772.205;
  const REVISION = 'pimsleur-i-01-v1-3154bd9e80ed';
  const COMPATIBLE_REVISIONS = new Set([REVISION, 'pimsleur-i-01-v1-1989115db813', 'pimsleur-i-01-v1-ec8c7781a890']);
  const roman = ['', 'I', 'II', 'III'];
  const graph = document.getElementById('lesson-graph');
  const nodes = document.getElementById('lesson-nodes');
  const panel = document.getElementById('level-map-panel');
  const tabs = [...document.querySelectorAll('[data-level]')];
  const themeButton = document.getElementById('home-theme-toggle');
  let progress = {};
  let selectedLevel = 1;
  let columns = 10;
  let layoutFrame = 0;
  let storageUnavailable = false;

  if (!graph || !nodes || !panel) return;

  const finite = (n) => typeof n === 'number' && Number.isFinite(n);
  const clock = (seconds) => {
    const value = Math.floor(Math.min(DURATION, Math.max(0, seconds)));
    return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
  };
  const position = () => finite(progress.resumeTime) ? Math.min(DURATION, Math.max(0, progress.resumeTime)) : 0;
  const studied = () => COMPATIBLE_REVISIONS.has(progress.lessonRevision) && progress.completed === true;

  function storageNotice(unavailable) {
    storageUnavailable = unavailable;
    const notice = document.getElementById('storage-status');
    notice.hidden = !unavailable;
    notice.textContent = unavailable ? 'Браузер не разрешает сохранять место в уроке.' : '';
  }

  function readProgress() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const value = raw ? JSON.parse(raw) : null;
      progress = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      storageNotice(storageUnavailable);
    } catch (error) {
      progress = {};
      if (error instanceof SyntaxError) storageNotice(storageUnavailable);
      else storageNotice(true);
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeButton.setAttribute('aria-label', theme === 'cream' ? 'Включить тёмную тему' : 'Включить светлую тему');
    themeButton.setAttribute('aria-pressed', String(theme === 'cream'));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'cream' ? '#f2eee5' : '#17191c';
  }

  function renderProgress() {
    const time = position();
    const resume = time > 0;
    const completed = studied();
    document.getElementById('continue-label').textContent = resume ? 'Продолжить урок' : 'Начать урок';
    document.getElementById('restart-link').hidden = !resume;
    document.getElementById('resume-progress-row').hidden = !resume;
    const note = document.getElementById('resume-note');
    note.hidden = !resume;
    note.textContent = resume ? clock(time) + ' / 29:32' : '';
    document.getElementById('home-progress-fill').style.width = (time / DURATION * 100) + '%';
    document.getElementById('home-progress').setAttribute('aria-valuenow', String(Math.round(time / DURATION * 100)));
    document.getElementById('home-progress').setAttribute('aria-valuetext', clock(time) + ' из 29 минут 32 секунд');
    document.getElementById('completion-badge').hidden = !completed;
    document.getElementById('studied-legend').hidden = !completed;
    if (['graphite', 'cream'].includes(progress.theme)) setTheme(progress.theme);
    else setTheme(document.documentElement.dataset.theme || 'graphite');
  }

  function makeNode(number) {
    const item = document.createElement('li');
    item.className = 'lesson-node-slot';
    const available = selectedLevel === 1 && number === 1;
    const node = document.createElement(available ? 'a' : 'button');
    node.className = 'lesson-node' + (available ? ' is-available' : ' is-unavailable');
    node.dataset.lesson = String(number);
    if (available) {
      node.href = './lesson.html';
      node.id = 'course-lesson-1';
      node.setAttribute('aria-label', 'Уровень I. Урок 1. Первое знакомство.' + (studied() ? ' Изучен.' : '') + (position() > 0 ? ' Продолжить с ' + clock(position()) + '.' : ' Начать урок.'));
      node.title = 'Первое знакомство';
      node.classList.toggle('is-studied', studied());
    } else {
      node.type = 'button';
      node.disabled = true;
      node.title = 'Уровень ' + roman[selectedLevel] + ', урок ' + number + ' — ещё не подготовлен';
      node.setAttribute('aria-label', node.title);
    }
    const label = document.createElement('span');
    label.className = 'lesson-node-number';
    label.textContent = String(number).padStart(2, '0');
    node.append(label);
    if (available && studied()) {
      const badge = document.createElement('span');
      badge.className = 'lesson-node-check';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '✓';
      node.append(badge);
    }
    item.append(node);
    const caption = document.createElement('span');
    caption.className = 'lesson-node-caption';
    caption.textContent = available ? (studied() ? 'Изучен' : position() > 0 ? 'Продолжить' : 'Начать') : '';
    item.append(caption);
    return item;
  }

  function layoutGraph() {
    layoutFrame = 0;
    const width = graph.clientWidth;
    columns = width >= 980 ? 10 : width >= 580 ? 6 : 5;
    nodes.style.setProperty('--map-columns', String(columns));
    [...nodes.children].forEach((item, i) => {
      const row = Math.floor(i / columns);
      const column = i % columns;
      item.style.gridRow = String(row + 1);
      item.style.gridColumn = String(row % 2 ? columns - column : column + 1);
    });
    const origin = graph.getBoundingClientRect();
    const points = [...nodes.querySelectorAll('.lesson-node')].map((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.left - origin.left + box.width / 2, y: box.top - origin.top + box.height / 2 };
    });
    const svg = document.getElementById('lesson-connections');
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + graph.clientHeight);
    document.getElementById('lesson-path').setAttribute('d', points.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' '));
  }

  function requestLayout() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(layoutGraph);
  }

  function renderMap() {
    tabs.forEach((tab) => {
      const current = Number(tab.dataset.level) === selectedLevel;
      tab.setAttribute('aria-selected', String(current));
      tab.tabIndex = current ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', 'level-tab-' + selectedLevel);
    nodes.setAttribute('aria-label', 'Уроки уровня ' + roman[selectedLevel]);
    nodes.replaceChildren(...Array.from({ length: 30 }, (_, i) => makeNode(i + 1)));
    requestLayout();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { selectedLevel = Number(tab.dataset.level); renderMap(); });
    tab.addEventListener('keydown', (event) => {
      let target = null;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target === null) return;
      event.preventDefault();
      selectedLevel = target + 1;
      renderMap();
      tabs[target].focus();
    });
  });

  themeButton.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'cream' ? 'graphite' : 'cream';
    setTheme(theme);
    progress = { ...progress, theme };
    try { window.localStorage.setItem(KEY, JSON.stringify(progress)); storageNotice(false); }
    catch (_) { storageNotice(true); }
  });
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) { readProgress(); renderProgress(); renderMap(); }
  });
  window.addEventListener('pageshow', () => { readProgress(); renderProgress(); renderMap(); });

  try {
    const storage = window.localStorage;
    storage.setItem('english-practice:v1:storage-probe', '1');
    storage.removeItem('english-practice:v1:storage-probe');
    storageNotice(false);
    readProgress();
  } catch (_) { storageNotice(true); }
  renderProgress();
  renderMap();
  if ('ResizeObserver' in window) new ResizeObserver(requestLayout).observe(graph);
  else window.addEventListener('resize', requestLayout);
})();
