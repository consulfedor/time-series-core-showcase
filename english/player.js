(() => {
  'use strict';

  const LESSON_URL = './lessons/demo/lesson.json';
  const lessonId = 'english-portfolio-demo-20261101';
  const progressKey = `english-practice:v1:${lessonId}`;
  const playbackRates = [0.75, 0.9, 1, 1.1, 1.25];
  const $ = (id) => document.getElementById(id);

  const els = {
    audio: $('lesson-audio'),
    tree: $('lesson-tree'),
    treeProgress: $('nav-progress-fill'),
    treeProgressLabel: $('nav-progress-label'),
    heading: $('lesson-heading'),
    description: $('lesson-description'),
    course: $('lesson-course'),
    courseTop: $('course-label'),
    courseEyebrow: $('lesson-course-eyebrow'),
    subtitleTop: $('lesson-subtitle'),
    titleTop: $('header-lesson-title'),
    navTitle: $('nav-lesson-title'),
    notice: $('player-notice'),
    focusState: $('focus-state'),
    focusLabel: document.querySelector('.focus-label'),
    karaoke: $('karaoke-text'),
    phraseKind: $('phrase-kind'),
    difficult: $('difficult-toggle'),
    reveal: $('reveal-current'),
    sceneCard: $('scene-card'),
    sceneEmpty: $('scene-empty'),
    sceneTerm: $('scene-term'),
    sceneMeaning: $('scene-meaning'),
    sceneDescription: $('scene-description'),
    sceneMethod: $('scene-method'),
    sceneArt: $('scene-art'),
    sceneImage: $('scene-image'),
    sceneDrop: $('scene-drop'),
    scenePieces: [$('scene-piece-left'), $('scene-piece-right'), $('scene-piece-base')],
    seek: $('seek-range'),
    currentTime: $('current-time'),
    durationTime: $('duration-time'),
    play: $('play-toggle'),
    playIcon: $('play-icon'),
    return: $('return-position'),
    previousBlock: $('previous-block'),
    previousPhrase: $('previous-phrase'),
    repeatPhrase: $('repeat-phrase'),
    repeatBlock: $('repeat-block'),
    nextPhrase: $('next-phrase'),
    nextBlock: $('next-block'),
    loop: $('loop-block'),
    rate: $('playback-rate'),
    volume: $('volume-range'),
    completion: $('completion-toggle'),
    theme: $('theme-toggle'),
    smaller: $('text-smaller'),
    larger: $('text-larger'),
    drawerOpen: $('open-drawer'),
    drawerClose: $('close-drawer'),
    drawerScrim: $('drawer-scrim'),
    navStorageStatus: $('nav-storage-status'),
    navStorageDot: $('nav-storage-dot'),
    playerStorageStatus: $('player-storage-status'),
    nav: $('lesson-nav'),
    expandAll: $('expand-all'),
    collapseAll: $('collapse-all'),
  };

  let lesson = null;
  let lessonUrl = null;
  let progress = null;
  let selectedPhraseId = null;
  let returnTime = null;
  let lastClock = 0;
  let lastSavedSecond = -1;
  let animationFrame = 0;
  let loopBlockId = null;
  let pendingSeek = null;
  let internalSeekTarget = null;
  let audioReady = false;
  let audioObjectUrl = null;
  let storageAvailable = false;
  let textScale = 1;
  let themeName = 'graphite';
  const phraseNodes = new Map();
  const phraseTextNodes = new Map();
  const blockNodes = new Map();
  const protectedTreePhrases = [];
  const phraseDomCache = new Map();
  let displayedPhraseId;
  let displayedWordIndex = -1;
  let renderedTreeActiveId;
  let renderedTreeSelectedId;
  let renderedTreeBoundary = 0;
  let treeDisclosedPhraseId = null;

  const safeString = (value, fallback = '') => typeof value === 'string' ? value : fallback;
  const finite = (value) => typeof value === 'number' && Number.isFinite(value);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const clock = (seconds) => {
    const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  function showNotice(message, isError = false) {
    els.notice.textContent = message;
    els.notice.hidden = !message;
    els.notice.dataset.tone = isError ? 'error' : 'info';
  }

  function setStorageStatus(available) {
    storageAvailable = available;
    const message = available
      ? 'Прогресс сохраняется в браузере на этом устройстве'
      : 'Локальное сохранение недоступно — позиция не сохраняется';
    if (els.navStorageStatus) {
      els.navStorageStatus.textContent = message;
      els.navStorageStatus.classList.toggle('storage-unavailable', !available);
    }
    if (els.playerStorageStatus) {
      els.playerStorageStatus.textContent = message;
      els.playerStorageStatus.classList.toggle('storage-unavailable', !available);
    }
    if (els.navStorageDot) els.navStorageDot.classList.toggle('is-warning', !available);
  }

  function probeStorage() {
    try {
      const storage = window.localStorage;
      const probeKey = 'english-practice:v1:storage-probe';
      storage.setItem(probeKey, '1');
      storage.removeItem(probeKey);
      setStorageStatus(true);
    } catch (_) {
      setStorageStatus(false);
    }
  }

  function safeReadProgress() {
    if (!storageAvailable) return null;
    let raw;
    try {
      raw = window.localStorage.getItem(progressKey);
    } catch (_) {
      setStorageStatus(false);
      return null;
    }
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      return value;
    } catch (_) {
      // A damaged record can be replaced with a fresh local record; storage itself still works.
      return null;
    }
  }

  function safeWriteProgress() {
    if (!lesson || !progress || !storageAvailable) return;
    const knownIds = new Set(lesson.phrases.map((phrase) => phrase.id));
    const payload = {
      lessonRevision: lesson.revision,
      resumeTime: audioReady
        ? clamp(Number.isFinite(els.audio.currentTime) ? els.audio.currentTime : 0, 0, lesson.duration)
        : clamp(finite(pendingSeek) ? pendingSeek : progress.resumeTime, 0, lesson.duration),
      volume: clamp(Number.isFinite(els.audio.volume) ? els.audio.volume : 1, 0, 1),
      playbackRate: clamp(Number.isFinite(els.audio.playbackRate) ? els.audio.playbackRate : 1, 0.5, 2),
      difficultPhraseIds: [...new Set((progress.difficultPhraseIds || []).filter((id) => knownIds.has(id)))],
      completed: progress.completed === true,
      theme: themeName,
      textScale,
      savedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(progressKey, JSON.stringify(payload));
      progress = payload;
    } catch (_) {
      setStorageStatus(false);
    }
  }

  function normalizeProgress(raw) {
    const sameRevision = !!raw && (raw.lessonRevision === lesson.revision || lesson.progressCompatibleRevisions.includes(raw.lessonRevision));
    const knownIds = new Set(lesson.phrases.map((phrase) => phrase.id));
    const resume = raw && finite(raw.resumeTime) ? clamp(raw.resumeTime, 0, lesson.duration) : 0;
    return {
      lessonRevision: lesson.revision,
      resumeTime: resume,
      volume: raw && finite(raw.volume) ? clamp(raw.volume, 0, 1) : 1,
      playbackRate: raw && playbackRates.includes(raw.playbackRate) ? raw.playbackRate : 1,
      difficultPhraseIds: sameRevision && Array.isArray(raw.difficultPhraseIds) ? [...new Set(raw.difficultPhraseIds.filter((id) => typeof id === 'string' && knownIds.has(id)))] : [],
      completed: sameRevision && raw.completed === true,
      theme: raw && raw.theme === 'cream' ? 'cream' : 'graphite',
      textScale: raw && finite(raw.textScale) ? clamp(raw.textScale, 0.8, 1.3) : 1,
      savedAt: raw && typeof raw.savedAt === 'string' ? raw.savedAt : null,
    };
  }

  function safeResourceUrl(value) {
    const raw = typeof value === 'string' ? value : value && (value.url || value.src || value.file || value.href);
    if (typeof raw !== 'string' || !raw.trim()) return null;
    try {
      const url = new URL(raw, lessonUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      if (url.origin !== location.origin) return null;
      return url.href;
    } catch (_) {
      return null;
    }
  }

  function normalizeLesson(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Файл урока имеет неверный формат.');
    if (raw.id && raw.id !== lessonId) throw new Error('Этот файл относится к другому уроку.');
    const duration = finite(raw.duration) && raw.duration > 0 ? raw.duration : 0;
    if (!duration) throw new Error('В файле урока не указана длительность.');
    const blockRows = Array.isArray(raw.blocks) ? raw.blocks : [];
    const phraseRows = Array.isArray(raw.phrases) ? raw.phrases : [];
    const blockIdSet = new Set(blockRows.map((block) => block && block.id).filter((id) => typeof id === 'string'));
    const blocks = blockRows.filter((block) => block && typeof block.id === 'string' && blockIdSet.has(block.id)).map((block, index) => ({
      id: block.id,
      title: safeString(block.title, `Блок ${index + 1}`),
      start: clamp(finite(block.start) ? block.start : 0, 0, duration),
      end: clamp(finite(block.end) ? block.end : duration, 0, duration),
      phraseIds: Array.isArray(block.phraseIds) ? block.phraseIds.filter((id) => typeof id === 'string') : [],
    })).filter((block) => block.end >= block.start);
    const validBlocks = new Set(blocks.map((block) => block.id));
    const phrases = phraseRows.filter((phrase) => phrase && typeof phrase.id === 'string' && validBlocks.has(phrase.blockId) && finite(phrase.start) && finite(phrase.end) && phrase.end >= phrase.start)
      .map((phrase) => ({
        id: phrase.id,
        blockId: phrase.blockId,
        start: clamp(phrase.start, 0, duration),
        end: clamp(phrase.end, 0, duration),
        text: safeString(phrase.text),
        language: safeString(phrase.language, 'mixed'),
        kind: safeString(phrase.kind, 'fragment'),
        words: Array.isArray(phrase.words) ? phrase.words.filter((word) => word && typeof word.text === 'string' && finite(word.start) && finite(word.end) && word.end >= word.start).map((word) => ({
          text: word.text,
          start: clamp(word.start, 0, duration),
          end: clamp(word.end, 0, duration),
        })) : [],
      })).sort((a, b) => a.start - b.start || a.end - b.end);
    if (!blocks.length || !phrases.length) throw new Error('В файле урока пока нет блоков или фраз.');
    const phraseIds = new Set(phrases.map((phrase) => phrase.id));
    const seen = new Set();
    for (const block of blocks) {
      block.phraseIds = block.phraseIds.filter((id) => {
        const phrase = phrases.find((item) => item.id === id);
        if (!phrase || phrase.blockId !== block.id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      // The phrase's blockId is authoritative; this also accepts a concise projection.
      for (const phrase of phrases) {
        if (phrase.blockId === block.id && phraseIds.has(phrase.id) && !block.phraseIds.includes(phrase.id)) block.phraseIds.push(phrase.id);
      }
      block.phraseIds.sort((a, b) => phrases.findIndex((p) => p.id === a) - phrases.findIndex((p) => p.id === b));
    }
    const media = raw.media && typeof raw.media === 'object' ? raw.media : {};
    const audioUrl = safeResourceUrl(media.audio);
    if (!audioUrl) throw new Error('В файле урока не найден доступный аудиофайл.');
    const scenes = Array.isArray(raw.mnemonicScenes) ? raw.mnemonicScenes.filter((scene) => scene && typeof scene.id === 'string').map((scene) => ({
      id: scene.id,
      term: safeString(scene.term),
      meaning: safeString(scene.meaning),
      method: safeString(scene.method),
      description: safeString(scene.description),
      asset: safeResourceUrl(scene.asset),
      animation: ['little', 'understand', 'none'].includes(scene.animation) ? scene.animation : 'none',
      cues: Array.isArray(scene.cues) ? scene.cues.filter((cue) => cue && finite(cue.start) && finite(cue.end) && cue.end >= cue.start && phraseIds.has(cue.phraseId)).map((cue) => ({ start: clamp(cue.start, 0, duration), end: clamp(cue.end, 0, duration), displayUntil: clamp(finite(cue.displayUntil) ? Math.max(cue.end, cue.displayUntil) : cue.end, 0, duration), phraseId: cue.phraseId })).sort((a, b) => a.start - b.start) : [],
    })) : [];
    return {
      id: lessonId,
      revision: safeString(raw.revision, 'unversioned'),
      progressCompatibleRevisions: Array.isArray(raw.progressCompatibleRevisions) ? raw.progressCompatibleRevisions.filter((value) => typeof value === 'string') : [],
      title: safeString(raw.title, 'Урок 1'),
      subtitle: safeString(raw.subtitle),
      course: safeString(raw.course, 'Пимслер · Уровень I'),
      duration,
      audioUrl,
      blocks: blocks.sort((a, b) => a.start - b.start),
      phrases,
      scenes,
    };
  }

  function phraseById(id) { return lesson && lesson.phrases.find((phrase) => phrase.id === id) || null; }
  function blockById(id) { return lesson && lesson.blocks.find((block) => block.id === id) || null; }

  function phraseAt(time) {
    const active = lesson.phrases.find((phrase) => phrase.start <= time && time < phrase.end);
    if (active) return active;
    let previous = null;
    for (const phrase of lesson.phrases) {
      if (phrase.start <= time) previous = phrase;
      else break;
    }
    return previous;
  }

  function activePhraseAt(time) {
    return lesson.phrases.find((phrase) => phrase.start <= time && time < phrase.end) || null;
  }

  function blockAt(time) {
    const active = lesson.blocks.find((block) => block.start <= time && time < block.end);
    if (active) return active;
    let previous = null;
    for (const block of lesson.blocks) {
      if (block.start <= time) previous = block;
      else break;
    }
    return previous;
  }

  function phraseIndex(phrase) { return phrase ? lesson.phrases.findIndex((item) => item.id === phrase.id) : -1; }
  function blockIndex(block) { return block ? lesson.blocks.findIndex((item) => item.id === block.id) : -1; }

  function getPhraseDom(phrase) {
    if (!phrase) return { id: null, nodes: [document.createTextNode('Нажмите «Play», чтобы начать занятие.')], words: [], wordNodes: [] };
    let cached = phraseDomCache.get(phrase.id);
    if (cached) return cached;
    const nodes = [];
    const wordNodes = [];
    if (!phrase.words.length) {
      nodes.push(document.createTextNode(phrase.text));
    } else {
      phrase.words.forEach((word, index) => {
        if (index > 0) nodes.push(document.createTextNode(' '));
        const span = document.createElement('span');
        span.className = 'karaoke-word';
        span.textContent = word.text;
        nodes.push(span);
        wordNodes.push(span);
      });
    }
    cached = { id: phrase.id, nodes, words: phrase.words, wordNodes };
    phraseDomCache.set(phrase.id, cached);
    return cached;
  }

  function appendPhraseText(container, phrase, time, highlightWords) {
    const cached = getPhraseDom(phrase);
    const phraseId = phrase ? phrase.id : null;
    if (displayedPhraseId !== phraseId) {
      const previousCache = phraseDomCache.get(displayedPhraseId);
      if (displayedWordIndex >= 0 && previousCache && previousCache.wordNodes[displayedWordIndex]) {
        previousCache.wordNodes[displayedWordIndex].classList.remove('is-active');
      }
      container.replaceChildren(...cached.nodes);
      container.scrollTop = 0;
      displayedPhraseId = phraseId;
      displayedWordIndex = -1;
    }
    if (!phrase) {
      const message = els.audio.paused ? 'Нажмите «Play», чтобы начать занятие.' : 'Урок начинается…';
      if (container.textContent !== message) container.textContent = message;
    }
    const nextWordIndex = highlightWords ? cached.words.findIndex((word) => word.start <= time && time < word.end) : -1;
    if (nextWordIndex !== displayedWordIndex) {
      if (displayedWordIndex >= 0 && cached.wordNodes[displayedWordIndex]) cached.wordNodes[displayedWordIndex].classList.remove('is-active');
      if (nextWordIndex >= 0 && cached.wordNodes[nextWordIndex]) {
        const node = cached.wordNodes[nextWordIndex];
        node.classList.add('is-active');
        const area = container.getBoundingClientRect();
        const word = node.getBoundingClientRect();
        if (word.bottom > area.bottom - 4) container.scrollTop += word.bottom - area.bottom + 8;
        else if (word.top < area.top + 4) container.scrollTop -= area.top - word.top + 8;
      }
      displayedWordIndex = nextWordIndex;
    }
  }

  const kindLabels = {
    instruction: 'Инструкция', prompt: 'Вопрос', model: 'Образец ответа', dialogue: 'Диалог', fragment: 'Часть слова', closing: 'Завершение',
  };

  function hidesFutureText(phrase) {
    return phrase.language === 'en' && ['model', 'dialogue', 'fragment'].includes(phrase.kind);
  }

  function updateTreePhraseText(phrase, time) {
    const button = phraseNodes.get(phrase.id);
    const textNode = phraseTextNodes.get(phrase.id);
    if (!button || !textNode) return;
    const hiddenAnswer = hidesFutureText(phrase) && phrase.start > time && phrase.id !== treeDisclosedPhraseId;
    textNode.textContent = hiddenAnswer ? (kindLabels[phrase.kind] || 'Английская фраза') : phrase.text;
    button.setAttribute('aria-label', hiddenAnswer
      ? `${kindLabels[phrase.kind] || 'Английская фраза'} · ${clock(phrase.start)}. Нажмите, чтобы перейти.`
      : `${clock(phrase.start)} · ${phrase.text}`);
  }

  function treeVisibleBoundary(time) {
    let low = 0;
    let high = protectedTreePhrases.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (protectedTreePhrases[mid].start <= time) low = mid + 1;
      else high = mid;
    }
    return low;
  }

  function buildTree() {
    phraseNodes.clear();
    phraseTextNodes.clear();
    blockNodes.clear();
    protectedTreePhrases.length = 0;
    phraseDomCache.clear();
    renderedTreeActiveId = undefined;
    renderedTreeSelectedId = undefined;
    renderedTreeBoundary = 0;
    const fragment = document.createDocumentFragment();
    lesson.blocks.forEach((block, index) => {
      const details = document.createElement('details');
      details.className = 'tree-block';
      details.dataset.blockId = block.id;
      const summary = document.createElement('summary');
      const title = document.createElement('span');
      title.className = 'block-title';
      title.textContent = block.title || `Блок ${index + 1}`;
      const time = document.createElement('span');
      time.className = 'block-time';
      time.textContent = clock(block.start);
      summary.append(title, time);
      details.append(summary);
      const phrases = document.createElement('div');
      phrases.className = 'tree-phrases';
      block.phraseIds.map(phraseById).filter(Boolean).forEach((phrase) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tree-phrase';
        button.dataset.phraseId = phrase.id;
        const initialTime = finite(pendingSeek) ? pendingSeek : 0;
        const hiddenAnswer = hidesFutureText(phrase) && phrase.start > initialTime && phrase.id !== treeDisclosedPhraseId;
        button.setAttribute('aria-label', hiddenAnswer
          ? `${kindLabels[phrase.kind] || 'Английская фраза'} · ${clock(phrase.start)}. Нажмите, чтобы перейти.`
          : `${clock(phrase.start)} · ${phrase.text}`);
        const dot = document.createElement('span');
        dot.className = 'tree-play-dot';
        dot.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.className = 'tree-phrase-text';
        text.textContent = hiddenAnswer ? (kindLabels[phrase.kind] || 'Английская фраза') : phrase.text;
        const stamp = document.createElement('span');
        stamp.className = 'tree-phrase-time';
        stamp.textContent = clock(phrase.start);
        button.append(dot, text, stamp);
        button.addEventListener('click', () => {
          const previousDisclosure = phraseById(treeDisclosedPhraseId);
          treeDisclosedPhraseId = phrase.id;
          if (previousDisclosure && previousDisclosure.id !== phrase.id) updateTreePhraseText(previousDisclosure, els.audio.currentTime || 0);
          details.open = true;
          selectedPhraseId = phrase.id;
          navigateTo(phrase.start, { manual: true, selectedId: phrase.id });
          closeDrawer();
        });
        phrases.append(button);
        phraseNodes.set(phrase.id, button);
        phraseTextNodes.set(phrase.id, text);
        if (hidesFutureText(phrase)) protectedTreePhrases.push(phrase);
      });
      details.append(phrases);
      fragment.append(details);
      blockNodes.set(block.id, details);
    });
    els.tree.replaceChildren(fragment);
    protectedTreePhrases.sort((a, b) => a.start - b.start);
    const selected = phraseById(selectedPhraseId);
    const selectedBlock = selected && blockById(selected.blockId);
    if (selectedBlock && blockNodes.has(selectedBlock.id)) blockNodes.get(selectedBlock.id).open = true;
  }

  function renderTree(active, time) {
    const visibleBoundary = treeVisibleBoundary(time);
    if (visibleBoundary !== renderedTreeBoundary) {
      const from = Math.min(visibleBoundary, renderedTreeBoundary);
      const to = Math.max(visibleBoundary, renderedTreeBoundary);
      for (let i = from; i < to; i += 1) updateTreePhraseText(protectedTreePhrases[i], time);
      renderedTreeBoundary = visibleBoundary;
    }
    const activeId = active ? active.id : null;
    if (renderedTreeActiveId !== activeId) {
      const previous = phraseNodes.get(renderedTreeActiveId);
      const next = phraseNodes.get(activeId);
      if (previous) previous.classList.remove('is-playing');
      if (next) next.classList.add('is-playing');
      renderedTreeActiveId = activeId;
    }
    if (renderedTreeSelectedId !== selectedPhraseId) {
      const previous = phraseNodes.get(renderedTreeSelectedId);
      const next = phraseNodes.get(selectedPhraseId);
      if (previous) {
        previous.classList.remove('is-selected');
        previous.removeAttribute('aria-current');
      }
      if (next) {
        next.classList.add('is-selected');
        next.setAttribute('aria-current', 'true');
      }
      renderedTreeSelectedId = selectedPhraseId;
      if (renderedTreeSelectedId) updateTreePhraseText(phraseById(renderedTreeSelectedId), time);
      if (previous) {
        const previousId = previous.dataset.phraseId;
        const previousPhrase = phraseById(previousId);
        if (previousPhrase) updateTreePhraseText(previousPhrase, time);
      }
    }
  }

  function showPhrase(time, active, displayPhrase) {
    appendPhraseText(els.karaoke, displayPhrase, time, !!active && displayPhrase && active.id === displayPhrase.id && !els.audio.paused);
    const prev = displayPhrase || null;
    const nextIndex = prev ? phraseIndex(prev) + 1 : 0;
    const next = lesson.phrases[nextIndex] || null;
    const inResponseGap = !active && !!prev && prev.kind === 'prompt' && time >= prev.end && (!next || time < next.start);
    els.focusState.textContent = els.audio.ended ? 'Запись закончилась' : active ? (els.audio.paused ? 'На паузе' : 'Сейчас звучит') : (inResponseGap ? 'Пауза для ответа' : displayPhrase ? 'Текущая фраза' : els.audio.paused ? 'Готово к прослушиванию' : 'Начало урока');
    els.focusLabel.classList.toggle('is-speaking', !!active && !els.audio.paused);
    els.phraseKind.textContent = displayPhrase ? (kindLabels[displayPhrase.kind] || 'Фраза') : '';
    els.difficult.disabled = !displayPhrase;
    els.difficult.setAttribute('aria-pressed', String(!!displayPhrase && progress.difficultPhraseIds.includes(displayPhrase.id)));
    els.difficult.textContent = displayPhrase && progress.difficultPhraseIds.includes(displayPhrase.id) ? '★ Сложная фраза' : '☆ Сложная фраза';
  }

  function renderScene(time) {
    const entry = lesson.scenes.map((scene) => ({ scene, cue: scene.cues.reduce((latest, cue) => cue.start <= time && time < cue.displayUntil ? cue : latest, null) })).find((item) => item.cue);
    if (!entry) {
      els.sceneCard.hidden = true;
      els.sceneEmpty.hidden = true;
      return;
    }
    const { scene, cue } = entry;
    els.sceneEmpty.hidden = true;
    els.sceneCard.hidden = false;
    els.sceneTerm.textContent = scene.term;
    els.sceneMeaning.textContent = scene.meaning;
    els.sceneDescription.textContent = scene.description;
    els.sceneMethod.textContent = scene.method ? `Приём: ${scene.method}` : '';
    els.sceneArt.dataset.animation = scene.animation;
    const phase = cue.end > cue.start ? clamp((time - cue.start) / (cue.end - cue.start), 0, 1) : 0;
    els.sceneArt.style.setProperty('--scene-progress', String(phase));
    const hasArt = !!scene.asset;
    const puzzle = hasArt && scene.animation === 'understand';
    const little = hasArt && scene.animation === 'little';
    els.sceneArt.hidden = !hasArt;
    els.sceneCard.classList.toggle('no-art', !hasArt);
    els.sceneArt.dataset.step = String(Math.max(1, Math.min(3, Math.floor(phase * 3) + 1)));
    els.sceneArt.style.setProperty('--drop-x', `${25.5 + (21 - 25.5) * phase}%`);
    els.sceneArt.style.setProperty('--drop-y', `${47 + (78.5 - 47) * phase}%`);
    els.sceneImage.hidden = !hasArt || puzzle;
    els.sceneDrop.hidden = !little;
    els.scenePieces.forEach((piece) => {
      piece.hidden = !puzzle;
      if (puzzle && piece.src !== scene.asset) piece.src = scene.asset;
      if (!puzzle && piece.hasAttribute('src')) piece.removeAttribute('src');
    });
    if (puzzle) els.sceneImage.removeAttribute('src');
    else if (hasArt && els.sceneImage.src !== scene.asset) els.sceneImage.src = scene.asset;
    if (!hasArt) {
      els.sceneImage.removeAttribute('src');
      els.sceneDrop.hidden = true;
    }
  }

  function renderTime() {
    if (!lesson) return;
    const time = clamp(Number.isFinite(els.audio.currentTime) ? els.audio.currentTime : 0, 0, lesson.duration);
    lastClock = time;
    const active = activePhraseAt(time);
    const displayPhrase = active || phraseAt(time);
    els.currentTime.textContent = clock(time);
    els.durationTime.textContent = clock(lesson.duration);
    els.seek.max = String(lesson.duration);
    els.seek.value = String(time);
    const percent = lesson.duration ? (time / lesson.duration) * 100 : 0;
    els.seek.style.setProperty('--range-fill', `${percent}%`);
    const block = blockAt(time);
    const progressPercent = lesson.duration ? Math.min(100, percent) : 0;
    els.treeProgress.style.width = `${progressPercent}%`;
    els.treeProgressLabel.textContent = `${Math.floor(progressPercent)}%`;
    els.return.disabled = returnTime === null;
    els.playIcon.textContent = els.audio.paused ? '▶' : 'Ⅱ';
    els.play.setAttribute('aria-label', els.audio.paused ? 'Воспроизвести' : 'Пауза');
    showPhrase(time, active, displayPhrase);
    renderScene(time);
    renderTree(active, time);
    const index = phraseIndex(displayPhrase);
    els.previousPhrase.disabled = index <= 0;
    els.nextPhrase.disabled = index < 0 || index >= lesson.phrases.length - 1;
    const bIndex = blockIndex(block);
    els.previousBlock.disabled = bIndex <= 0;
    els.repeatBlock.disabled = bIndex < 0;
    els.nextBlock.disabled = bIndex < 0 || bIndex >= lesson.blocks.length - 1;
    els.reveal.disabled = !displayPhrase;
    if (!selectedPhraseId && displayPhrase) selectedPhraseId = displayPhrase.id;
    maybeSavePosition(time);
  }

  function maybeSavePosition(time) {
    const second = Math.floor(time);
    if (second !== lastSavedSecond) {
      lastSavedSecond = second;
      safeWriteProgress();
    }
  }

  function enableControls() {
    [els.seek, els.play, els.previousBlock, els.previousPhrase, els.repeatPhrase, els.repeatBlock, els.nextPhrase, els.nextBlock, els.loop, els.rate, els.volume, els.completion].forEach((el) => { el.disabled = false; });
    els.difficult.disabled = false;
    els.reveal.disabled = false;
  }

  function setInternalTime(time) {
    const target = clamp(time, 0, lesson.duration);
    if (els.audio.readyState < 1) pendingSeek = target;
    internalSeekTarget = target;
    try {
      els.audio.currentTime = target;
    } catch (_) {
      pendingSeek = target;
    }
    renderTime();
  }

  function beginManualNavigation() {
    if (returnTime === null) {
      returnTime = clamp(Number.isFinite(els.audio.currentTime) ? els.audio.currentTime : lastClock, 0, lesson.duration);
    }
    renderTime();
  }

  function clearLoopIfOutside(time) {
    if (!loopBlockId) return;
    const block = blockById(loopBlockId);
    if (block && block.start <= time && time < block.end) return;
    loopBlockId = null;
    els.loop.checked = false;
    els.loop.setAttribute('aria-label', 'Повторять блок');
  }

  function navigateTo(time, options = {}) {
    if (!lesson) return;
    if (options.manual) beginManualNavigation();
    if (options.selectedId) selectedPhraseId = options.selectedId;
    clearLoopIfOutside(time);
    const wasPlaying = !els.audio.paused;
    setInternalTime(time);
    safeWriteProgress();
    if (wasPlaying) {
      const playResult = els.audio.play();
      if (playResult && typeof playResult.catch === 'function') playResult.catch(() => showNotice('Нажмите Play, чтобы продолжить воспроизведение.', false));
    } else {
      els.audio.pause();
    }
  }

  function closeDrawer() {
    document.body.classList.remove('drawer-open');
    els.drawerScrim.hidden = true;
    els.drawerOpen.setAttribute('aria-expanded', 'false');
  }

  function openDrawer() {
    document.body.classList.add('drawer-open');
    els.drawerScrim.hidden = false;
    els.drawerOpen.setAttribute('aria-expanded', 'true');
    els.drawerClose.focus();
  }

  function revealCurrentPhrase() {
    const phrase = phraseAt(els.audio.currentTime || 0);
    if (!phrase) return;
    selectedPhraseId = phrase.id;
    const block = blockById(phrase.blockId);
    if (block && blockNodes.has(block.id)) blockNodes.get(block.id).open = true;
    renderTime();
    const node = phraseNodes.get(phrase.id);
    if (node) node.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function movePhrase(delta, repeat = false) {
    const current = phraseAt(els.audio.currentTime || 0);
    if (!current) return;
    const index = phraseIndex(current);
    const target = repeat ? current : lesson.phrases[index + delta];
    if (target) navigateTo(target.start, { manual: true, selectedId: target.id });
  }

  function moveBlock(delta, repeat = false) {
    const current = blockAt(els.audio.currentTime || 0);
    if (!current) return;
    const index = blockIndex(current);
    const target = repeat ? current : lesson.blocks[index + delta];
    if (!target) return;
    const firstPhrase = target.phraseIds.map(phraseById).find(Boolean);
    if (firstPhrase) selectedPhraseId = firstPhrase.id;
    if (blockNodes.has(target.id)) blockNodes.get(target.id).open = true;
    navigateTo(target.start, { manual: true, selectedId: firstPhrase ? firstPhrase.id : null });
  }

  function toggleDifficult() {
    const phrase = phraseAt(els.audio.currentTime || 0);
    if (!phrase) return;
    const ids = new Set(progress.difficultPhraseIds);
    if (ids.has(phrase.id)) ids.delete(phrase.id); else ids.add(phrase.id);
    progress.difficultPhraseIds = [...ids];
    renderTime();
    safeWriteProgress();
  }

  async function applyInitialState(rawProgress) {
    progress = normalizeProgress(rawProgress);
    themeName = progress.theme;
    textScale = progress.textScale;
    document.documentElement.dataset.theme = themeName;
    document.documentElement.style.setProperty('--text-scale', String(textScale));
    els.theme.setAttribute('aria-label', themeName === 'graphite' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
    els.audio.volume = progress.volume;
    els.volume.value = String(progress.volume);
    // Loading a new media source resets playbackRate to defaultPlaybackRate.
    els.audio.defaultPlaybackRate = progress.playbackRate;
    els.audio.playbackRate = progress.playbackRate;
    els.rate.value = String(progress.playbackRate);
    els.completion.setAttribute('aria-pressed', String(progress.completed));
    els.completion.textContent = progress.completed ? '✓ Изучил · Снять отметку' : 'Изучил';
    const params = new URLSearchParams(location.search);
    pendingSeek = params.get('start') === '1' ? 0 : progress.resumeTime;
    lastSavedSecond = Math.floor(pendingSeek);
    const initialPhrase = phraseAt(pendingSeek);
    selectedPhraseId = initialPhrase ? initialPhrase.id : lesson.phrases[0].id;
    buildTree();
    // UI5175 static delivery has no byte-range support. A small, complete
    // audio Blob gives native media reliable seeking without a new backend.
    showNotice('Загружаем аудио урока…');
    const audioResponse = await fetch(lesson.audioUrl, { credentials: 'same-origin' });
    if (!audioResponse.ok) throw new Error('Не удалось загрузить аудио урока.');
    const audioBlob = await audioResponse.blob();
    if (!audioBlob.size || audioBlob.size > 32 * 1024 * 1024) throw new Error('Неверный размер аудиофайла урока.');
    audioObjectUrl = URL.createObjectURL(audioBlob);
    els.audio.src = audioObjectUrl;
    els.audio.load();
    showNotice('');
    enableControls();
    els.heading.textContent = lesson.title;
    els.description.textContent = lesson.subtitle;
    els.navTitle.textContent = lesson.title;
    els.course.textContent = lesson.course;
    els.courseTop.textContent = lesson.course;
    els.courseEyebrow.textContent = lesson.course;
    els.titleTop.textContent = lesson.title;
    els.subtitleTop.textContent = lesson.subtitle || lesson.title;
    document.title = `${lesson.title} — Английский`;
    renderTime();
  }

  function startAnimationFrame() {
    if (animationFrame || els.audio.paused) return;
    const paint = () => {
      animationFrame = 0;
      renderTime();
      if (!els.audio.paused && !els.audio.ended) animationFrame = requestAnimationFrame(paint);
    };
    animationFrame = requestAnimationFrame(paint);
  }

  function stopAnimationFrame() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  async function loadLesson() {
    probeStorage();
    try {
      lessonUrl = new URL(LESSON_URL, location.href);
      if (lessonUrl.origin !== location.origin) throw new Error('Файл урока должен открываться с этого сайта.');
      const response = await fetch(lessonUrl.href, { credentials: 'same-origin', cache: 'no-cache' });
      if (!response.ok) throw new Error('Не удалось загрузить данные урока.');
      const raw = await response.json();
      lesson = normalizeLesson(raw);
      lesson.scenes.forEach((scene) => { if (scene.asset) { const preload = new Image(); preload.decoding = "async"; preload.src = scene.asset; } });
      await applyInitialState(safeReadProgress());
    } catch (error) {
      els.heading.textContent = 'Урок пока недоступен';
      els.description.textContent = 'Проверьте, что данные урока и аудиофайл находятся на месте.';
      els.navTitle.textContent = 'Демонстрация';
      els.tree.replaceChildren();
      const message = error && typeof error.message === 'string' ? error.message : 'Не удалось открыть урок.';
      showNotice(message, true);
      els.karaoke.textContent = 'Когда урок загрузится, здесь появятся фразы для практики.';
    }
  }

  els.play.addEventListener('click', () => {
    if (!lesson) return;
    if (els.audio.paused) {
      els.audio.play().then(() => showNotice('')).catch(() => showNotice('Не удалось запустить аудио. Проверьте, что файл урока доступен.', true));
    } else {
      els.audio.pause();
    }
  });

  els.audio.addEventListener('play', () => { showNotice(''); startAnimationFrame(); renderTime(); });
  els.audio.addEventListener('playing', startAnimationFrame);
  els.audio.addEventListener('pause', () => { stopAnimationFrame(); renderTime(); safeWriteProgress(); });
  els.audio.addEventListener('ended', () => { stopAnimationFrame(); renderTime(); safeWriteProgress(); });
  els.audio.addEventListener('timeupdate', () => {
    if (lesson && loopBlockId && !els.audio.paused) {
      const loopBlock = blockById(loopBlockId);
      if (loopBlock && els.audio.currentTime >= loopBlock.end) setInternalTime(loopBlock.start);
    }
    renderTime();
  });
  els.audio.addEventListener('loadedmetadata', () => {
    if (pendingSeek !== null && lesson) {
      const target = pendingSeek;
      pendingSeek = null;
      setInternalTime(target);
    }
    audioReady = true;
    renderTime();
    safeWriteProgress();
  });
  els.audio.addEventListener('seeked', () => {
    internalSeekTarget = null;
    renderTime();
    safeWriteProgress();
  });
  els.audio.addEventListener('seeking', () => {
    if (internalSeekTarget !== null && Math.abs(els.audio.currentTime - internalSeekTarget) < 0.2) return;
    if (lesson && returnTime === null) returnTime = clamp(lastClock, 0, lesson.duration);
    if (lesson) clearLoopIfOutside(els.audio.currentTime);
    renderTime();
  });
  els.audio.addEventListener('ratechange', () => { if (lesson) { renderTime(); safeWriteProgress(); } });
  els.audio.addEventListener('volumechange', () => { if (lesson && progress) safeWriteProgress(); });
  els.audio.addEventListener('error', () => {
    if (lesson && els.audio.error) showNotice('Не удалось открыть аудиофайл урока. Проверьте, что файл доступен рядом с данными урока.', true);
  });
  [els.sceneImage, ...els.scenePieces].forEach((image) => image.addEventListener('error', () => {
    els.sceneArt.hidden = true;
    els.sceneCard.classList.add('no-art');
  }));

  els.seek.addEventListener('pointerdown', () => { if (lesson) beginManualNavigation(); });
  els.seek.addEventListener('input', () => {
    if (!lesson) return;
    const target = Number(els.seek.value);
    beginManualNavigation();
    clearLoopIfOutside(target);
    setInternalTime(target);
  });
  els.seek.addEventListener('change', safeWriteProgress);
  els.previousPhrase.addEventListener('click', () => movePhrase(-1));
  els.nextPhrase.addEventListener('click', () => movePhrase(1));
  els.repeatPhrase.addEventListener('click', () => movePhrase(0, true));
  els.previousBlock.addEventListener('click', () => moveBlock(-1));
  els.repeatBlock.addEventListener('click', () => moveBlock(0, true));
  els.nextBlock.addEventListener('click', () => moveBlock(1));
  els.return.addEventListener('click', () => {
    if (returnTime === null) return;
    const target = returnTime;
    returnTime = null;
    navigateTo(target, { manual: false });
    renderTime();
  });
  els.loop.addEventListener('change', () => {
    if (els.loop.checked) {
      const block = blockAt(els.audio.currentTime || 0);
      loopBlockId = block ? block.id : null;
    } else loopBlockId = null;
    const activeBlock = blockById(loopBlockId);
    els.loop.setAttribute('aria-label', activeBlock ? `Повторять блок: ${activeBlock.title}` : 'Повторять блок');
  });
  els.rate.addEventListener('change', () => { els.audio.playbackRate = Number(els.rate.value); safeWriteProgress(); });
  els.volume.addEventListener('input', () => { els.audio.volume = Number(els.volume.value); safeWriteProgress(); });
  els.completion.addEventListener('click', () => {
    progress.completed = !progress.completed;
    els.completion.setAttribute('aria-pressed', String(progress.completed));
    els.completion.textContent = progress.completed ? '✓ Изучил · Снять отметку' : 'Изучил';
    safeWriteProgress();
  });
  els.difficult.addEventListener('click', toggleDifficult);
  els.reveal.addEventListener('click', revealCurrentPhrase);
  els.expandAll.addEventListener('click', () => blockNodes.forEach((node) => { node.open = true; }));
  els.collapseAll.addEventListener('click', () => blockNodes.forEach((node) => { node.open = false; }));
  els.drawerOpen.addEventListener('click', openDrawer);
  els.drawerClose.addEventListener('click', closeDrawer);
  els.drawerScrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && document.body.classList.contains('drawer-open')) closeDrawer(); });
  els.theme.addEventListener('click', () => {
    themeName = themeName === 'graphite' ? 'cream' : 'graphite';
    document.documentElement.dataset.theme = themeName;
    els.theme.setAttribute('aria-label', themeName === 'graphite' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
    if (progress) progress.theme = themeName;
    safeWriteProgress();
  });
  els.smaller.addEventListener('click', () => {
    textScale = clamp(Math.round((textScale - 0.1) * 10) / 10, 0.8, 1.3);
    document.documentElement.style.setProperty('--text-scale', String(textScale));
    if (progress) progress.textScale = textScale;
    safeWriteProgress();
  });
  els.larger.addEventListener('click', () => {
    textScale = clamp(Math.round((textScale + 0.1) * 10) / 10, 0.8, 1.3);
    document.documentElement.style.setProperty('--text-scale', String(textScale));
    if (progress) progress.textScale = textScale;
    safeWriteProgress();
  });
  window.addEventListener('pagehide', safeWriteProgress);
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted && audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) safeWriteProgress(); });

  loadLesson();
})();
