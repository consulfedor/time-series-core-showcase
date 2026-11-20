(() => {
  'use strict';

  const PROGRESS_PREFIX = 'english-practice:v1:';
  const LAST_LESSON_KEY = 'english-practice:last-lesson';
  const LEGACY_LESSON_ID = 'pimsleur-i-01';
  const roman = ['', 'I', 'II', 'III'];
  const graph = document.getElementById('lesson-graph');
  const nodes = document.getElementById('lesson-nodes');
  const panel = document.getElementById('level-map-panel');
  const tabs = [...document.querySelectorAll('[data-level]')];
  const themeButton = document.getElementById('home-theme-toggle');
  let lessons = [];
  let defaultLessonId = LEGACY_LESSON_ID;
  let selectedLesson = null;
  const lessonsById = new Map();
  const lessonsByPosition = new Map();
  const progressById = new Map();
  let selectedLevel = 1;
  let columns = 10;
  let layoutFrame = 0;

  if (!graph || !nodes || !panel) return;

  const finite = (n) => typeof n === 'number' && Number.isFinite(n);
  const clock = (seconds) => {
    const value = Math.floor(Math.max(0, seconds));
    return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
  };
  const progressFor = (lesson) => progressById.get(lesson.id) || {};
  const position = (lesson) => {
    const progress = progressFor(lesson);
    return finite(progress.resumeTime) ? Math.min(lesson.duration, Math.max(0, progress.resumeTime)) : 0;
  };
  const studied = (lesson) => {
    const progress = progressFor(lesson);
    return progress.completed === true && (progress.lessonRevision === lesson.revision || lesson.progressCompatibleRevisions.includes(progress.lessonRevision));
  };
  const lessonTitle = (lesson) => lesson.subtitle || lesson.title;

  function lessonHref(lesson, restart = false) {
    const params = new URLSearchParams();
    if (lesson.id !== LEGACY_LESSON_ID) params.set('lesson', lesson.id);
    if (restart) params.set('start', '1');
    const query = params.toString();
    return './lesson.html' + (query ? '?' + query : '');
  }

  function parseProgress(raw) {
    try {
      const value = raw ? JSON.parse(raw) : null;
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) { return {}; }
  }

  function storageNotice(unavailable) {
    const notice = document.getElementById('storage-status');
    notice.hidden = !unavailable;
    notice.textContent = unavailable ? 'Браузер не разрешает сохранять место в уроке.' : '';
  }

  function readProgress() {
    const previousId = selectedLesson && selectedLesson.id;
    let lastLessonId = defaultLessonId;
    progressById.clear();
    try {
      const storage = window.localStorage;
      lastLessonId = storage.getItem(LAST_LESSON_KEY) || defaultLessonId;
      lessons.forEach((lesson) => progressById.set(lesson.id, parseProgress(storage.getItem(PROGRESS_PREFIX + lesson.id))));
      storageNotice(false);
    } catch (_) { storageNotice(true); }
    selectedLesson = lessonsById.get(lastLessonId) || lessonsById.get(defaultLessonId) || null;
    if (selectedLesson && selectedLesson.id !== previousId) selectedLevel = selectedLesson.level;
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeButton.setAttribute('aria-label', theme === 'cream' ? 'Включить тёмную тему' : 'Включить светлую тему');
    themeButton.setAttribute('aria-pressed', String(theme === 'cream'));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'cream' ? '#f2eee5' : '#17191c';
  }

  function renderProgress() {
    document.getElementById('resume-card').hidden = !selectedLesson;
    if (!selectedLesson) return;
    const progress = progressFor(selectedLesson);
    const time = position(selectedLesson);
    const resume = time > 0;
    const completed = studied(selectedLesson);
    document.getElementById('resume-number').textContent = String(selectedLesson.number).padStart(2, '0');
    document.getElementById('resume-level').textContent = 'Уровень ' + roman[selectedLesson.level];
    document.getElementById('resume-duration').textContent = clock(selectedLesson.duration);
    document.getElementById('lesson-title').textContent = lessonTitle(selectedLesson);
    document.getElementById('continue-link').href = lessonHref(selectedLesson);
    document.getElementById('restart-link').href = lessonHref(selectedLesson, true);
    document.getElementById('continue-label').textContent = resume ? 'Продолжить урок' : 'Начать урок';
    document.getElementById('restart-link').hidden = !resume;
    document.getElementById('resume-progress-row').hidden = !resume;
    const note = document.getElementById('resume-note');
    note.hidden = !resume;
    note.textContent = resume ? clock(time) + ' / ' + clock(selectedLesson.duration) : '';
    document.getElementById('home-progress-fill').style.width = (time / selectedLesson.duration * 100) + '%';
    document.getElementById('home-progress').setAttribute('aria-valuenow', String(Math.round(time / selectedLesson.duration * 100)));
    document.getElementById('home-progress').setAttribute('aria-valuetext', clock(time) + ' из ' + clock(selectedLesson.duration));
    document.getElementById('completion-badge').hidden = !completed;
    if (['graphite', 'cream'].includes(progress.theme)) setTheme(progress.theme);
    else setTheme(document.documentElement.dataset.theme || 'graphite');
  }

  function makeNode(number) {
    const item = document.createElement('li');
    item.className = 'lesson-node-slot';
    const lesson = lessonsByPosition.get(selectedLevel + ':' + number);
    const available = !!lesson;
    const node = document.createElement(available ? 'a' : 'button');
    node.className = 'lesson-node' + (available ? ' is-available' : ' is-unavailable');
    node.dataset.lesson = String(number);
    if (available) {
      node.href = lessonHref(lesson);
      node.id = lesson.id === LEGACY_LESSON_ID ? 'course-lesson-1' : 'course-lesson-' + lesson.id;
      node.dataset.lessonId = lesson.id;
      node.setAttribute('aria-label', 'Уровень ' + roman[lesson.level] + '. Урок ' + number + '. ' + lessonTitle(lesson) + '.' + (studied(lesson) ? ' Изучен.' : '') + (position(lesson) > 0 ? ' Продолжить с ' + clock(position(lesson)) + '.' : ' Начать урок.'));
      node.title = lessonTitle(lesson);
      node.classList.toggle('is-studied', studied(lesson));
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
    if (available && studied(lesson)) {
      const badge = document.createElement('span');
      badge.className = 'lesson-node-check';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '✓';
      node.append(badge);
    }
    item.append(node);
    const caption = document.createElement('span');
    caption.className = 'lesson-node-caption';
    caption.textContent = available ? (studied(lesson) ? 'Изучен' : position(lesson) > 0 ? 'Продолжить' : 'Начать') : '';
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
    document.getElementById('studied-legend').hidden = !lessons.some((lesson) => lesson.level === selectedLevel && studied(lesson));
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
    if (!selectedLesson) return;
    try {
      const key = PROGRESS_PREFIX + selectedLesson.id;
      const progress = { ...parseProgress(window.localStorage.getItem(key)), theme };
      window.localStorage.setItem(key, JSON.stringify(progress));
      progressById.set(selectedLesson.id, progress);
      storageNotice(false);
    } catch (_) { storageNotice(true); }
  });

  function refreshProgress() {
    if (!lessons.length) return;
    readProgress();
    renderProgress();
    renderMap();
  }

  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === LAST_LESSON_KEY || event.key.startsWith(PROGRESS_PREFIX)) refreshProgress();
  });
  window.addEventListener('pageshow', refreshProgress);

  function catalogNotice(message, error = false) {
    const notice = document.getElementById('catalog-status');
    notice.setAttribute('role', error ? 'alert' : 'status');
    notice.hidden = !message;
    notice.textContent = message;
  }

  function validateCatalog(raw) {
    if (!raw || raw.schemaVersion !== 1 || !Array.isArray(raw.lessons) || !raw.lessons.length) throw new Error('Invalid catalog');
    const ids = new Set();
    const positions = new Set();
    const rows = raw.lessons.map((lesson) => {
      if (!lesson || typeof lesson.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(lesson.id)
        || !Number.isInteger(lesson.level) || lesson.level < 1 || lesson.level > 3
        || !Number.isInteger(lesson.number) || lesson.number < 1 || lesson.number > 30
        || !finite(lesson.duration) || lesson.duration <= 0
        || typeof lesson.title !== 'string' || !lesson.title.trim()
        || typeof lesson.revision !== 'string' || !lesson.revision
        || typeof lesson.dataUrl !== 'string' || !lesson.dataUrl) throw new Error('Invalid lesson');
      const key = lesson.level + ':' + lesson.number;
      if (ids.has(lesson.id) || positions.has(key)) throw new Error('Duplicate lesson');
      ids.add(lesson.id);
      positions.add(key);
      return { ...lesson,
        subtitle: typeof lesson.subtitle === 'string' ? lesson.subtitle : '',
        progressCompatibleRevisions: Array.isArray(lesson.progressCompatibleRevisions) ? lesson.progressCompatibleRevisions.filter((revision) => typeof revision === 'string') : [],
      };
    });
    const fallback = ids.has(raw.defaultLessonId) ? raw.defaultLessonId : LEGACY_LESSON_ID;
    if (!ids.has(fallback)) throw new Error('Default lesson unavailable');
    return { lessons: rows, defaultLessonId: fallback };
  }

  async function loadCatalog() {
    catalogNotice('Загружаем уроки…');
    try {
      const response = await fetch('./catalog.json', { credentials: 'same-origin', cache: 'no-cache' });
      if (!response.ok) throw new Error('Catalog unavailable');
      const catalog = validateCatalog(await response.json());
      lessons = catalog.lessons;
      defaultLessonId = catalog.defaultLessonId;
      lessons.forEach((lesson) => {
        lessonsById.set(lesson.id, lesson);
        lessonsByPosition.set(lesson.level + ':' + lesson.number, lesson);
      });
      refreshProgress();
      catalogNotice('');
    } catch (_) {
      lessons = [];
      lessonsById.clear();
      lessonsByPosition.clear();
      selectedLesson = null;
      renderProgress();
      renderMap();
      catalogNotice('Не удалось открыть каталог уроков. Обновите страницу.', true);
    }
  }

  renderProgress();
  renderMap();
  if ('ResizeObserver' in window) new ResizeObserver(requestLayout).observe(graph);
  else window.addEventListener('resize', requestLayout);
  loadCatalog();
})();
