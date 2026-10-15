"use strict";
(() => {
  const $ = (s) => document.querySelector(s);
  // Browser voice is opt-in, independent of the illustrative model selector.
  let recognition = null, utterance = null;
  const voiceLanguage = () => document.documentElement.lang === 'en' ? 'en-US' : 'ru-RU';
  const recognizerType = () => window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechAvailable = () => Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  const dictationStatus = text => { $('#voice-status').textContent = text; };
  const speechStatus = text => { $('#voice-speech-status').textContent = text; };
  function voiceAvailability() {
    $('#voice-start').disabled = Boolean(recognition) || !recognizerType();
    $('#voice-stop').disabled = !recognition;
    $('#voice-speak').disabled = !speechAvailable();
    if (!recognizerType()) dictationStatus('Диктовка не поддерживается этим браузером. Можно ввести текст вручную.');
    if (!speechAvailable()) speechStatus('Озвучка не поддерживается этим браузером.');
  }
  function stopDictation(text = 'Диктовка остановлена. Распознанный текст остался в черновике.') {
    const previous = recognition;
    recognition = null; // Ignore late callbacks, including from a previous start.
    if (previous) { try { previous.abort(); } catch (_) { /* Already ended. */ } }
    if (previous) dictationStatus(text);
    voiceAvailability();
  }
  function stopSpeech(text = 'Озвучка остановлена.') {
    const previous = utterance;
    utterance = null;
    if (previous) { window.speechSynthesis.cancel(); speechStatus(text); }
    $('#voice-silence').disabled = true;
  }
  function cleanupVoice() { stopDictation(); stopSpeech(); }
  function startDictation() {
    if (recognition) return;
    stopSpeech();
    const Recognition = recognizerType();
    if (!Recognition) { voiceAvailability(); return; }
    try {
      const current = new Recognition();
      recognition = current;
      current.lang = voiceLanguage();
      current.continuous = false;
      current.interimResults = false;
      const committed = new Set();
      current.onstart = () => {
        if (recognition === current) dictationStatus('Микрофон включён. Говорите; текст появится в черновике.');
      };
      current.onresult = event => {
        if (recognition !== current) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result.isFinal || committed.has(i)) continue;
          committed.add(i);
          const text = result[0].transcript.trim();
          if (!text) continue;
          const draft = $('#draft');
          draft.value += (draft.value && !/\s$/.test(draft.value) ? ' ' : '') + text;
          draft.dispatchEvent(new Event('input', {bubbles:true}));
        }
      };
      current.onerror = event => {
        if (recognition !== current) return;
        const errors = {
          'not-allowed':'Доступ к микрофону не разрешён. Разрешение можно проверить в настройках браузера или ввести текст вручную.',
          'service-not-allowed':'Служба диктовки запрещена браузером. Введите текст вручную.',
          'network':'Служба диктовки недоступна по сети. Текст сохранён; повторный запуск — только по кнопке.',
          'audio-capture':'Микрофон недоступен. Проверьте устройство и разрешения браузера.',
          'no-speech':'Речь не обнаружена. Можно повторить диктовку кнопкой.',
          'aborted':'Диктовка отменена.',
          'language-not-supported':'Выбранный язык диктовки не поддерживается браузером.'
        };
        stopDictation(errors[event.error] || 'Не удалось выполнить диктовку. Введите текст вручную или повторите запуск кнопкой.');
      };
      current.onend = () => {
        if (recognition !== current) return;
        recognition = null;
        dictationStatus('Диктовка завершена. Проверьте черновик: модели ничего не отправлено.');
        voiceAvailability();
      };
      dictationStatus('Ожидается разрешение браузера на микрофон. Запуск можно отменить.');
      voiceAvailability();
      current.start();
    } catch (_) {
      stopDictation();
      dictationStatus('Не удалось запустить микрофон. Проверьте разрешения браузера и защищённое соединение.');
    }
  }
  function readVoiceText() {
    stopDictation(); stopSpeech();
    if (!speechAvailable()) { voiceAvailability(); return; }
    const text = $('#voice-text').value.trim();
    if (!text) { speechStatus('Сначала выберите ответ или введите текст для озвучки.'); return; }
    try {
      const current = new window.SpeechSynthesisUtterance(text);
      current.lang = voiceLanguage();
      utterance = current;
      current.onend = () => {
        if (utterance !== current) return;
        utterance = null; $('#voice-silence').disabled = true;
        speechStatus('Озвучка завершена.');
      };
      current.onerror = () => {
        if (utterance !== current) return;
        utterance = null; $('#voice-silence').disabled = true;
        speechStatus('Не удалось озвучить текст. Проверьте голосовой движок браузера.');
      };
      $('#voice-silence').disabled = false;
      speechStatus('Озвучивается выбранный текст. Это не ответ голосового ИИ.');
      window.speechSynthesis.speak(current);
    } catch (_) {
      stopSpeech();
      speechStatus('Не удалось озвучить текст. Проверьте голосовой движок браузера.');
    }
  }
  function fillVoiceResponses() {
    const select = $('#voice-response');
    select.innerHTML = '';
    const responses = [...document.querySelectorAll('#messages .message.agent p')];
    responses.forEach((response, index) => {
      const option = document.createElement('option');
      option.value = response.textContent;
      option.textContent = 'OZ · ' + (index + 1);
      select.append(option);
    });
    select.selectedIndex = responses.length - 1;
    if (responses.length) select.value = responses[responses.length - 1].textContent;
    $('#voice-from-response').disabled = !responses.length;
    if (!$('#voice-text').value) $('#voice-text').value = select.value || '';
  }
  window.addEventListener('pagehide', cleanupVoice);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cleanupVoice(); });
  if (typeof MutationObserver !== 'undefined') {
    let previousLanguage = document.documentElement.lang;
    new MutationObserver(() => {
      if (previousLanguage === document.documentElement.lang) return;
      previousLanguage = document.documentElement.lang;
      cleanupVoice();
      dictationStatus('Язык изменён. Для диктовки нажмите кнопку запуска снова.');
      voiceAvailability();
    }).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  }
  const modelLabel = () => ({codex:'Codex · демо',claude:'Claude · демо',local:'Локальная · демо'})[$('#model').value];
  const escape = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initialEvents = ['OZ связал задачу с отчётом качества и правилом проверки.', 'Инженеру назначено восстановление 62 записей; ревьюеру — независимая сверка.'];
  const state = {view:'docs',file:'quality-report.md',source:false,explorer:true,revision:1,missing:62,checked:null,accepted:false,events:[...initialEvents],bookmarked:false};
  const valid = () => state.checked === state.revision && state.missing === 0;
  const status = () => state.accepted ? 'Принято в демо' : valid() ? 'Проверено · ждёт решения' : state.checked !== null && state.checked !== state.revision ? 'Проверка устарела' : state.missing ? 'Найдены пропуски' : 'Нужна проверка';
  const captions = {
    docs:'<strong>Документ рядом с разговором.</strong> Выберите файл в Explorer. Справа — читаемый Markdown; исходник открывается той же кнопкой. Контекст диалога сохраняется.',
    agents:'<strong>Видно, кто за что отвечает.</strong> Откройте роль: у исполнителя есть задание, инструменты и результат. Оркестратор собирает работу; человек принимает итог.',
    checks:'<strong>Проверка относится к определённой версии.</strong> Восполните пропуск → проверьте → примите результат. Затем измените входные данные: прежняя проверка перестанет быть актуальной.',
    memory:'<strong>Контекст ведёт к источнику.</strong> Wiki объясняет правило, граф связывает материалы, заметки сохраняют опыт. Откройте основание и вернитесь к той же задаче.'
  };
  const docs = () => ({
    'quality-report.md': {title:'Отчёт о качестве данных',kind:'Результат обследования',body:`<p>Суточная минутная выборка · основание r${state.revision}.</p><table><thead><tr><th>Показатель</th><th>Записей</th></tr></thead><tbody><tr><td>Ожидается</td><td>1 440</td></tr><tr><td>Получено</td><td>${1440-state.missing}</td></tr><tr><td>Пропущено</td><td class="${state.missing?'warn':'ok'}">${state.missing}</td></tr></tbody></table><h3>Вывод</h3><p>${state.missing?'Выборка неполная. Прежде чем использовать её в расчётах, нужно восполнить пропущенный диапазон.':'Пропуски в учебной выборке восполнены. Статус проверки и решение человека указаны ниже.'}</p><div class="callout">${status()}. Основание r${state.revision}.</div><button data-open="checks">Открыть проверку ↗</button>`,raw:`# Отчёт о качестве данных\n\nОснование r${state.revision}.\n\n| Показатель | Записей |\n| --- | ---: |\n| Ожидается | 1440 |\n| Получено | ${1440-state.missing} |\n| Пропущено | ${state.missing} |\n\nСтатус: ${status()}.`},
    'acceptance.md': {title:'Условия приёмки',kind:'Договорённость по задаче',body:'<p>Для этого примера суточная выборка содержит 1 440 минутных интервалов.</p><ul><li>Все ожидаемые интервалы присутствуют.</li><li>Нет повторов временных отметок.</li><li>Числа отчёта соответствуют текущей версии данных.</li><li>Результат проверен и передан человеку.</li></ul><h3>Кто решает</h3><p>OZ организует работу и показывает результат. Человек принимает его после проверки.</p><button data-open="plan">Сопоставить с планом ↗</button>',raw:'# Условия приёмки\n\n- 1440 минутных интервалов.\n- Нет пропусков и дублей.\n- Проверка относится к текущей версии.\n- Приёмка — за человеком.'},
    'recovery-note.md': {title:'Заметка о восстановлении',kind:'Опыт → применимое правило',body:'<p>Наличие записей в хранилище само по себе не подтверждает полноту истории.</p><h3>Что проверять</h3><p>Ожидаемый диапазон, уникальность временных отметок, свежесть и происхождение записи.</p><h3>Связи</h3><p>Правило приёмки → отчёт качества → проверка версии.</p><button data-file="acceptance.md">Открыть действующее правило ↗</button><div class="callout">Учебная заметка. В рабочей системе найденный прошлый опыт сначала проверяется на применимость.</div>',raw:'# Заметка о восстановлении\n\nПроверить диапазон, уникальность, свежесть и происхождение.\n\nСвязь: acceptance.md → quality-report.md → проверка версии.'}
  });
  function documentView(){const d=docs()[state.file];return `<div class="document"><div class="document-title">${state.file} · ${d.kind}</div>${state.source?`<pre>${escape(d.raw)}</pre>`:`<article class="markdown"><h2>${d.title}</h2>${d.body}</article>`}</div>`;}
  function checksView(){return `<span class="overline">Инструменты → проверка → решение</span><h2>Принимается результат, а не сообщение «готово».</h2><div class="revision">Данные r${state.revision} · проверка ${state.checked===null?'ещё не запускалась':`r${state.checked}`} · ${status()}</div><div class="metrics"><div><strong>1 440</strong><span>ожидается</span></div><div><strong>${1440-state.missing}</strong><span>получено</span></div><div><strong>${state.missing}</strong><span>пропущено</span></div></div><div class="check-row"><span>Полнота диапазона</span><b class="${state.missing?'warn':'ok'}">${state.missing?'неполный':'полный'}</b></div><div class="check-row"><span>Уникальность отметок · учебные данные</span><b class="ok">без дублей</b></div><div class="check-row"><span>Проверка текущей версии</span><b class="${valid()?'ok':'warn'}">${valid()?'актуальна':'требуется'}</b></div><div class="actions"><button id="recover" ${!state.missing?'disabled':''}>1 · Восполнить пропуск</button><button id="verify" ${valid()?'disabled':''}>2 · Проверить</button><button id="accept" class="primary" ${!valid()||state.accepted?'disabled':''}>3 · Принять результат</button></div><p>Кнопки проигрывают локальный сценарий. Загрузки с биржи, запуска агентов и публикации здесь нет.</p><button id="revise">Изменить входные данные</button><h3>В рабочем Harness</h3><p>Agent-CI связывает тесты с версией кода. Здесь показан тот же принцип актуальности проверки на небольшом примере данных.</p>`;}
  const views={
    docs:()=>`<div class="toolbar"><button id="explorer-toggle" aria-pressed="${state.explorer}">Explorer</button><button id="source-toggle" aria-pressed="${state.source}">${state.source?'Показать документ':'Исходный MD'}</button><button data-open="translation">Перевод</button><button data-open="history">История</button></div><div class="path">project / data-quality / ${state.file}</div><div class="${state.explorer?'explorer':''}">${state.explorer?`<nav class="file-tree" aria-label="Файлы проекта"><small>Документы проекта</small>${Object.entries(docs()).map(([name,d])=>`<button data-file="${name}" aria-pressed="${state.file===name}">${name}<span>${d.kind}</span></button>`).join('')}</nav>`:''}${documentView()}</div>`,
    agents:()=>`<span class="overline">Команда одной задачи</span><h2>Исполнители и их результаты</h2><p>Роли, поручения и состояние доступны без поиска по отдельным разговорам.</p><div class="agent-card"><header><b>OZ · оркестратор</b><span class="pill">собирает результат</span></header><p>Уточняет задачу, связывает документы и согласует работу исполнителей.</p><button data-open="plan">Общий план ↗</button></div><div class="agent-card"><header><b>Инженер</b><span class="pill">${state.missing?'готов к восстановлению':'результат подготовлен'}</span></header><p>Отвечает за полноту диапазона и отчёт качества.</p><button data-agent="engineer">Задание и инструменты ↗</button></div><div class="agent-card"><header><b>Ревьюер</b><span class="pill">${valid()?'проверка актуальна':'ожидает проверки'}</span></header><p>Проверяет число записей, дубли и версию основания.</p><button data-agent="reviewer">Открыть результат ↗</button></div><p><small>Имена и состояния в экскурсии учебные. В MyTwoBrain участники ведут собственные сессии и передают результаты адресными сообщениями.</small></p>`,
    plan:()=>`<span class="overline">Цель и условия завершения</span><h2>Восстановить полный отчёт</h2><ol class="steps">${[['01','Найти основание','Отчёт качества и условия приёмки связаны с задачей.'],['02','Восполнить диапазон',state.missing?`Осталось ${state.missing} записей.`:'Учебный диапазон восполнен.'],['03','Проверить результат',valid()?`Проверена текущая версия r${state.revision}.`:'Нужна проверка текущей версии.'],['04','Предъявить человеку',state.accepted?'Человек принял результат в демо.':'Окончательная приёмка ещё не выполнена.']].map(([n,t,d])=>`<li><span class="step-no">${n}</span><div><b>${t}</b><small>${d}</small></div></li>`).join('')}</ol><div class="actions"><button data-open="checks">Перейти к выполнению ↗</button><button data-file="acceptance.md">Условия приёмки ↗</button></div>`,
    checks:checksView,
    memory:()=>`<span class="overline">Память, Wiki и связи</span><h2>Найти знание — и его источник</h2><p>Эти слои отвечают на разные вопросы. Откройте материал, чтобы увидеть его место в текущей работе.</p><div class="knowledge-list"><button data-file="acceptance.md"><b>Wiki / Ontology · что принято?</b><small>Термин, договорённость и владелец правила. Здесь: условия приёмки данных.</small></button><button data-open="board"><b>DOC Graph · что с чем связано?</b><small>Путь от правила к отчёту, проверке и решению.</small></button><button data-file="recovery-note.md"><b>Zettelkasten · какой опыт пригодится?</b><small>Связанная заметка о полноте истории; прошлый опыт требует проверки.</small></button><button data-open="context"><b>Контекст задачи · с чем продолжить?</b><small>Цель, документы, текущая версия и незакрытый шаг.</small></button></div><h3>AST-навигация</h3><p>При работе с кодом показывает символы, импорты и затронутые участки. Это маршрут к реализации; сами проверки выполняются отдельно.</p>`,
    translation:()=>`<span class="overline">Оригинал и перевод рядом с диалогом</span><h2>Сверить смысл документа</h2><div class="translation-block"><span>EN · подготовленный пример</span><p>The daily sample is complete when all 1,440 minute intervals are present and timestamps are unique. Acceptance remains with the operator.</p></div><div class="translation-block"><span>RU · перевод</span><p>Суточная выборка полна, когда присутствуют все 1 440 минутных интервалов и временные отметки уникальны. Решение о приёмке остаётся за оператором.</p></div><h3>Термины</h3><table><tr><td>Coverage</td><td>Полнота диапазона</td></tr><tr><td>Acceptance</td><td>Приёмка результата</td></tr></table><p><small>Здесь показана заранее подготовленная пара текстов. Это не вызов переводчика.</small></p><button data-file="acceptance.md">Открыть документ ↗</button>`,
    board:()=>`<span class="overline">Доска связей · учебная схема</span><h2>Одна задача, четыре основания решения</h2><p>Каждый блок открывает конкретный материал и следующий шаг проверки.</p><div class="board"><button data-file="acceptance.md"><b>01 · Правило</b><small>Ожидаемый диапазон и условия приёмки ↗</small></button><button data-file="quality-report.md"><b>02 · Факт</b><small>${1440-state.missing} из 1 440 записей · r${state.revision} ↗</small></button><button data-open="checks"><b>03 · Проверка</b><small>${valid()?'Текущая версия проверена':'Нужна проверка текущей версии'} ↗</small></button><button data-open="plan"><b>04 · Решение</b><small>${state.accepted?'Принято в учебном сценарии':'Ожидается приёмка человеком'} ↗</small></button></div><p><small>Доска в рабочей системе развивается как отдельный инструмент. Здесь показан один заранее подготовленный граф.</small></p>`,
    context:()=>`<span class="overline">Состав текущей задачи</span><h2>Продолжить с известного места</h2><table><tr><td>Цель</td><td>Полный отчёт качества</td></tr><tr><td>Данные</td><td>r${state.revision}</td></tr><tr><td>Проверка</td><td>${valid()?'актуальна':'требуется'}</td></tr><tr><td>Решение человека</td><td>${state.accepted?'принято':'ожидается'}</td></tr></table><h3>Материалы</h3><div class="actions"><button data-file="quality-report.md">Отчёт ↗</button><button data-file="acceptance.md">Правило ↗</button></div><h3>Закладка</h3><p>${state.bookmarked?'Отчёт о качестве закреплён в этой экскурсии.':'Нажмите «В закладки» под диалогом, чтобы закрепить отчёт.'}</p><h3>Модель и инструменты</h3><p>Маршрут: ${escape(modelLabel())}. Выбор модели не меняет документы и не выдаёт права на действия.</p>`,
    history:()=>`<span class="overline">События текущей экскурсии</span><h2>Как получили этот результат</h2><ol class="history">${state.events.map(e=>`<li>${escape(e)}</li>`).join('')}</ol><p><small>Вкладки используют одну историю. В рабочем MyTwoBrain история хранится системой; этот публичный пример сбрасывается при перезагрузке.</small></p>`
  };
  function render(){document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===state.view;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});$('#panel').setAttribute('aria-labelledby',`tab-${state.view}`);$('#panel').innerHTML=views[state.view]();$('#version').textContent=`Основание r${state.revision}`;$('#task-status').textContent=status();}
  function announce(s){$('#feedback').textContent=s;}
  function open(view){if(!views[view])return;cleanupVoice();state.view=view;render();$('#panel').scrollTop=0;}
  function event(s){state.events.push(s);const n=document.createElement('article');n.className='message agent generated';const h=document.createElement('header');h.textContent='OZ · результат действия';const p=document.createElement('p');p.textContent=s;n.append(h,p);$('#messages').append(n);$('#messages').scrollTop=$('#messages').scrollHeight;render();announce(s);}
  function tour(view){document.querySelectorAll('[data-tour]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tour===view)));$('#scene-caption').innerHTML=captions[view];open(view);}
  function agentDetail(role){open(role==='reviewer'?'checks':'agents');if(role==='engineer'){$('#panel').innerHTML=`<span class="overline">Роль · инженер данных</span><h2>Ограниченное задание, явный результат</h2><p>Восполнить пропуск в текущем диапазоне, не менять правила расчёта.</p><h3>Инструменты</h3><table><tr><td>Проверка истории</td><td>чтение</td></tr><tr><td>Восстановление диапазона</td><td>по заданию</td></tr><tr><td>Торговые операции</td><td>вне задачи</td></tr></table><h3>Процедуры / skills</h3><p>Проверить основание → подготовить результат → передать ревьюеру. Выполнение процедуры не заменяет проверку результата.</p><div class="actions"><button data-open="checks">Результат и проверка ↗</button><button data-open="agents">К команде ↗</button></div>`;}announce('Открыто поручение исполнителя. Основной диалог сохранён.');}
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.id==='voice-toggle'){
      const show=$('#voice-panel').hidden;
      $('#voice-panel').hidden=!show;
      $('#voice-toggle').setAttribute('aria-expanded',String(show));
      if(show){fillVoiceResponses();voiceAvailability();dictationStatus(recognizerType()?'Диктовка выключена. Прочитайте предупреждение перед запуском.':'Диктовка не поддерживается этим браузером. Можно ввести текст вручную.');}
      else cleanupVoice();
    }
    if(b.id==='voice-start')startDictation();
    if(b.id==='voice-stop')stopDictation();
    if(b.id==='voice-speak')readVoiceText();
    if(b.id==='voice-silence')stopSpeech();
    if(b.id==='voice-from-draft'){$('#voice-text').value=$('#draft').value;stopSpeech();}
    if(b.id==='voice-from-response'){$('#voice-text').value=$('#voice-response').value;stopSpeech();}
    if(b.id==='reset'){cleanupVoice();$('#voice-text').value='';$('#voice-panel').hidden=true;$('#voice-toggle').setAttribute('aria-expanded','false');dictationStatus('Диктовка выключена.');speechStatus('Озвучка выключена.');}
    if(b.dataset.tour)tour(b.dataset.tour);
    if(b.dataset.tab)open(b.dataset.tab);
    if(b.dataset.open)open(b.dataset.open);
    if(b.dataset.agent)agentDetail(b.dataset.agent);
    if(b.dataset.file&&docs()[b.dataset.file]){state.file=b.dataset.file;state.source=false;open('docs');announce(`Открыт ${state.file}. Черновик и диалог сохранены.`);}
    if(b.id==='source-toggle'){state.source=!state.source;render();$('#source-toggle').focus();}
    if(b.id==='explorer-toggle'){state.explorer=!state.explorer;render();$('#explorer-toggle').focus();}
    if(b.id==='recover'&&state.missing){state.missing=0;state.revision++;state.accepted=false;event(`В демо восполнен диапазон. Получено 1 440 записей. Основание r${state.revision}; нужна проверка.`);}
    if(b.id==='verify'){state.checked=state.revision;event(state.missing?`Проверка r${state.revision} не пройдена: отсутствует ${state.missing} записей.`:`Проверка r${state.revision} пройдена: 1 440 записей, пропусков и дублей нет. Приёмка ожидается.`);}
    if(b.id==='accept'&&valid()&&!state.accepted){state.accepted=true;event(`Человек принял результат r${state.revision} в учебном сценарии.`);}
    if(b.id==='revise'){state.missing=12;state.revision++;state.accepted=false;event(`Изменено основание: r${state.revision}, пропущено 12 записей. Прежнюю проверку нельзя использовать для новой версии.`);}
    if(b.id==='bookmark'){state.bookmarked=true;state.events.push('Отчёт о качестве добавлен в закладки.');announce('Отчёт закреплён. Откройте вкладку «Контекст».');if(['context','history'].includes(state.view))render();}
    if(b.id==='sessions'){const show=$('#session-list').hidden;$('#session-list').hidden=!show;b.setAttribute('aria-expanded',String(show));}
    if(b.id==='help-button'){const show=$('#help').hidden;$('#help').hidden=!show;b.setAttribute('aria-expanded',String(show));}
    if(b.id==='reset'){Object.assign(state,{view:'docs',file:'quality-report.md',source:false,explorer:true,revision:1,missing:62,checked:null,accepted:false,events:[...initialEvents],bookmarked:false});document.querySelectorAll('.generated').forEach(n=>n.remove());$('#messages').scrollTop=0;$('#draft').value='';$('#draft-state').textContent='не отправляется';$('#model').value='codex';$('#effort').value='High';$('#session-list').hidden=true;$('#sessions').setAttribute('aria-expanded','false');tour('docs');announce('Экскурсия начата заново.');}
  });
  document.querySelectorAll('[role=tab]').forEach((b,i,all)=>b.addEventListener('keydown',e=>{const next={ArrowRight:(i+1)%all.length,ArrowLeft:(i+all.length-1)%all.length,Home:0,End:all.length-1}[e.key];if(next===undefined)return;e.preventDefault();open(all[next].dataset.tab);all[next].focus();}));
  $('#draft').addEventListener('input',()=>{$('#draft-state').textContent=$('#draft').value?'сохранён в этой странице':'не отправляется';});
  ['model','effort'].forEach(id=>$('#'+id).addEventListener('change',()=>{state.events.push(`Настройка ${id==='model'?'модели':'режима'}: ${id==='model'?modelLabel():$('#effort').value}. Внешнего вызова нет.`);render();announce('Настройка изменена в макете; диалог и черновик сохранены.');}));
  if(new URLSearchParams(location.search).get('embed')==='1'){document.body.classList.add('embedded');new ResizeObserver(()=>parent.postMessage({type:'portfolio-workspace-height',height:document.body.scrollHeight},location.origin==='null'?'*':location.origin)).observe(document.body);}
  const scenes = new Set(['docs','agents','plan','checks','memory','translation','board','context','history']);
  function showScene(scene) {if(scenes.has(scene)){if(captions[scene])tour(scene);else open(scene);}}
  window.addEventListener('message', e => {
    if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='portfolio-workspace-scene')return;
    showScene(e.data.scene);
  });
  const requestedScene=new URLSearchParams(location.search).get('tab');
  showScene(scenes.has(requestedScene)?requestedScene:'docs');
  // A shared voice link reveals controls, never starts recording or playback.
  function revealVoiceLink() {
    if (location.hash !== '#voice') return;
    if ($('#voice-panel').hidden) $('#voice-toggle').click();
    $('#voice-toggle').focus();
    $('#voice-toggle').scrollIntoView?.({block:'center',behavior:'instant'});
  }
  window.addEventListener('hashchange', revealVoiceLink);
  if (location.hash === '#voice') setTimeout(revealVoiceLink, 0);
})();
