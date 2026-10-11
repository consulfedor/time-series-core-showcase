"use strict";
(() => {
  const $ = (selector) => document.querySelector(selector);
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const state = { plan: 120, actual: 96, revision: 1, checkedRevision: null, view: "document", file: "dossier.md", source: false,
    events: ["Заявка и ведомость связаны с задачей: 120 и 96 комплектов.", "Подготовлен расчёт. Отправка поставщику не разрешена."] };
  const checked = () => state.checkedRevision === state.revision;
  const gap = () => state.plan - state.actual;
  const percent = () => Math.round(gap() / state.plan * 100);
  const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const message = (text) => {
    const article = document.createElement("article");
    article.className = "message assistant generated";
    article.innerHTML = '<header><span>Агент · демо</span><small>Изменение состояния</small></header><p></p>';
    article.querySelector("p").textContent = text;
    $("#messages").append(article);
    $("#messages").scrollTop = $("#messages").scrollHeight;
  };
  const announce = (text) => { $("#feedback").textContent = text; };
  function rawDocument() {
    if (state.file === "receipt.csv") return `item,planned,received,revision\nКомплекты,${state.plan},${state.actual},${state.revision}`;
    if (state.file === "decision.md") return `# Предложение по поставке\n\nНе хватает ${gap()} комплектов (${percent()}%).\n\n- Запросить срок допоставки.\n- Ответственный за согласование: руководитель закупок.\n- Статус: черновик, не отправлен.\n\nПроверка расчёта: ${checked() ? "актуальна" : "требуется"}, основание r${state.revision}.`;
    return `# Сверка поставки\n\nОснование: заявка + приходная ведомость, r${state.revision}.\n\n| Показатель | Комплекты |\n| --- | ---: |\n| Заявлено | ${state.plan} |\n| Поступило | ${state.actual} |\n| Расхождение | ${gap()} |\n\n**${state.plan} − ${state.actual} = ${gap()} комплектов (${percent()}%).**\n\nПроверка: ${checked() ? "актуальна" : "требуется"}.\n\nПредложение: запросить срок допоставки. Внешняя отправка требует решения человека.`;
  }
  function documentView() {
    const bar = `<div class="file-bar"><code>${state.file} · r${state.revision}</code><button id="toggle-source" aria-pressed="${state.source}">${state.source ? "Читать документ" : "Исходник"}</button></div>`;
    if (state.source) return bar + `<pre>${escape(rawDocument())}</pre>`;
    if (state.file === "receipt.csv") return bar + `<article class="markdown"><span class="eyebrow">Предпросмотр данных</span><h2>Приходная ведомость</h2><p>Одна строка исходных данных в читаемом виде.</p><table><thead><tr><th>Позиция</th><th>Заявлено</th><th>Поступило</th></tr></thead><tbody><tr><td>Комплекты</td><td>${state.plan}</td><td>${state.actual}</td></tr></tbody></table><p>Версия r${state.revision}. Именно эти числа использует расчёт — не значения из старого сообщения.</p></article>`;
    if (state.file === "decision.md") return bar + `<article class="markdown"><span class="eyebrow">Markdown · читаемый документ</span><h2>Предложение по поставке</h2><p>Недопоставка: <strong>${gap()} комплектов (${percent()}%)</strong>.</p><div class="callout">Запросить у поставщика срок допоставки оставшихся ${gap()} комплектов.</div><h3>Кто принимает решение</h3><p>Руководитель закупок проверяет условия и согласует обращение. Агент не отправляет письмо и не изменяет заказ.</p><h3>Статус</h3><p>Черновик. Расчёт ${checked() ? "проверен" : "требует проверки"} по основанию r${state.revision}. Внешних действий нет.</p></article>`;
    return bar + `<article class="markdown"><span class="eyebrow">Markdown · читаемый документ</span><h2>Сверка поставки</h2><p>Заявка и приходная ведомость связаны с одной задачей. Единица измерения — комплект.</p><table><thead><tr><th>Показатель</th><th>Количество</th></tr></thead><tbody><tr><td>Заявлено</td><td>${state.plan}</td></tr><tr><td>Поступило</td><td>${state.actual}</td></tr><tr><td>Расхождение</td><td>${gap()}</td></tr></tbody></table><div class="formula"><strong>${state.plan} − ${state.actual} = ${gap()}</strong><span>Недопоставка · ${percent()}% от заявки</span></div><h3>${checked() ? "Расчёт проверен" : "Нужна проверка расчёта"}</h3><p>${checked() ? `Сверены числа и формула для версии r${state.revision}. Подтверждение относится только к этому основанию.` : `Основание r${state.revision} ещё не имеет актуальной проверки. Нажмите «Проверить расчёт» слева.`}</p><div class="callout">Следующее решение: запросить срок допоставки. Ни согласование, ни отправка не выполнены автоматически.</div></article>`;
  }
  const views = {
    document: () => documentView(),
    explorer: () => `<span class="eyebrow">Файлы этой задачи</span><h2>Выбрать и прочитать</h2><p>Выбор файла меняет предпросмотр, но не закрывает диалог.</p><div class="file-list" aria-label="Файлы">${["dossier.md", "receipt.csv", "decision.md"].map(file => `<button data-file="${file}" aria-pressed="${state.file === file}">${file}</button>`).join("")}</div>${documentView()}`,
    plan: () => `<span class="eyebrow">От вопроса к результату</span><h2>План работы</h2><ol class="steps"><li><div><b>Собрать основание · готово</b><span>Заявка и ведомость, версия r${state.revision}.</span></div></li><li><div><b>Вычислить расхождение · готово</b><span>${state.plan} − ${state.actual} = ${gap()} комплектов.</span></div></li><li><div><b>Проверить расчёт · ${checked() ? "готово" : "ожидает"}</b><span>${checked() ? `Квитанция проверки относится к r${state.revision}.` : "Нужна проверка текущей версии основания."}</span></div></li><li><div><b>Согласовать обращение · за человеком</b><span>Руководитель закупок определяет дальнейшее действие. Ничего не отправлено.</span></div></li></ol><button data-file-open="decision.md">Открыть предложение ↗</button>`,
    agents: () => `<span class="eyebrow">Роли и границы действий · демо</span><h2>Кто делает следующий шаг</h2><p>Учебные состояния. Реальные фоновые процессы на этой странице не запускаются.</p><div class="agent-row"><header><b>Аналитик</b><span class="pill">Расчёт готов</span></header><p>Читает основание и считает расхождение. Не меняет заказ.</p></div><div class="agent-row"><header><b>Проверяющий</b><span class="pill">${checked() ? "Проверено" : "Ожидает запуска"}</span></header><p>Сверяет входные числа, арифметику и версию. Не подтверждает физическую приёмку товара.</p></div><div class="agent-row"><header><b>Человек</b><span class="pill">Принимает решение</span></header><p>Согласует предложение и разрешает внешнее действие. Здесь отправка недоступна.</p></div><h3>Маршрут модели</h3><p>${$("#model").selectedOptions[0].textContent}. Это выбор в макете, не проверка доступности модели или разрешение раскрывать данные.</p>`,
    history: () => `<span class="eyebrow">Последовательность работы</span><h2>Что произошло</h2><p>Смена вкладки не начинает новую задачу. Здесь видны изменения основания и проверки.</p><ol class="timeline">${state.events.map((event, index) => `<li><small>Событие ${String(index + 1).padStart(2, "0")}</small>${escape(event)}</li>`).join("")}</ol>`,
    links: () => `<span class="eyebrow">Связи одной задачи</span><h2>Откуда взялся результат</h2><p>Нажмите узел — откроется соответствующий контекст. Диалог слева останется на месте.</p><div class="flow"><button data-open="plan"><b>Постановка и план</b><span>Что требуется решить ↗</span></button><span class="arrow" aria-hidden="true">↓</span><button data-file-open="receipt.csv"><b>Основание · r${state.revision}</b><span>Заявка ${state.plan} / факт ${state.actual} ↗</span></button><span class="arrow" aria-hidden="true">↓</span><button data-file-open="dossier.md"><b>Расчёт и проверка</b><span>${gap()} комплектов · ${checked() ? "проверено" : "проверка нужна"} ↗</span></button><span class="arrow" aria-hidden="true">↓</span><button data-file-open="decision.md"><b>Предложение человеку</b><span>Черновик, не отправлен ↗</span></button></div><button data-open="history">История изменений ↗</button><div class="callout">Изменение основания отменяет актуальность проверки, а не историю. Решение должно опираться на текущие данные.</div>`
  };
  function render() {
    tabs.forEach(tab => { const active = tab.dataset.tab === state.view; tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; });
    $("#panel").setAttribute("aria-labelledby", `tab-${state.view}`);
    $("#panel").innerHTML = views[state.view]();
    $("#revision").textContent = `Основание r${state.revision}`;
    $("#state-ref").textContent = `r${state.revision} · ${checked() ? "проверен" : "не проверен"}`;
    $("#task-status").textContent = checked() ? "Расчёт проверен" : state.checkedRevision !== null ? "Проверка устарела" : "Ожидает проверки";
    $("#task-status").classList.toggle("checked", checked());
    $("#verify").disabled = checked();
    $("#verify").textContent = checked() ? `Проверено · r${state.revision}` : "Проверить расчёт";
    $("#revise").disabled = state.revision > 1;
    $("#revise").textContent = state.revision > 1 ? "Факт обновлён до 108" : "Обновить факт до 108";
  }
  function open(view, focus = false) {
    state.view = view; render();
    if (focus) $("#panel").focus({ preventScroll: true });
    announce(`Открыт раздел «${$(`#tab-${view}`).textContent}». Диалог и заметка сохранены в этой странице.`);
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.tab) open(button.dataset.tab);
    if (button.dataset.open) { state.file = "dossier.md"; state.source = false; open(button.dataset.open, true); }
    if (button.dataset.file || button.dataset.fileOpen) {
      state.file = button.dataset.file || button.dataset.fileOpen; state.source = false;
      if (button.dataset.fileOpen) open("document", true); else render();
      announce(`Предпросмотр ${state.file} открыт. Основание r${state.revision}.`);
    }
    if (button.id === "toggle-source") { state.source = !state.source; render(); $("#toggle-source").focus(); }
  });
  tabs.forEach((tab, index) => tab.addEventListener("keydown", (event) => {
    const keys = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault(); const next = tabs[keys[event.key]]; open(next.dataset.tab); next.focus();
  }));
  $("#verify").addEventListener("click", () => {
    if (checked()) return;
    state.checkedRevision = state.revision;
    const result = `Проверка r${state.revision}: ${state.plan} − ${state.actual} = ${gap()} комплектов (${percent()}%). Числа и версия совпадают. Обращение поставщику остаётся черновиком.`;
    state.events.push(result); message(result); render(); announce(result);
  });
  $("#revise").addEventListener("click", () => {
    if (state.revision > 1) return;
    const wasChecked = checked(); state.actual = 108; state.revision = 2;
    const result = `Получено новое основание r2: поступило 108 комплектов. Расхождение теперь 12 (10%). ${wasChecked ? "Проверка r1 больше не актуальна." : "Текущая версия ещё не проверена."} Нужна повторная сверка.`;
    state.events.push(result); message(result); render(); announce(result);
  });
  $("#model").addEventListener("change", () => {
    const choice = $("#model").selectedOptions[0].textContent;
    state.events.push(`В макете выбран маршрут: ${choice}. Данные никуда не отправлены.`);
    render(); announce("Маршрут изменён только в макете. Вызова модели нет.");
  });
  $("#help-button").addEventListener("click", () => {
    const show = $("#help").hidden; $("#help").hidden = !show; $("#help-button").setAttribute("aria-expanded", String(show));
  });
  $("#reset").addEventListener("click", () => {
    Object.assign(state, { actual: 96, revision: 1, checkedRevision: null, view: "document", file: "dossier.md", source: false,
      events: ["Заявка и ведомость связаны с задачей: 120 и 96 комплектов.", "Подготовлен расчёт. Отправка поставщику не разрешена."] });
    document.querySelectorAll(".generated").forEach(node => node.remove()); $("#draft").value = ""; $("#model").value = "local";
    render(); announce("Учебный пример сброшен: план 120, факт 96. Локальная заметка очищена.");
  });
  if (new URLSearchParams(location.search).get("embed") === "1") {
    document.body.classList.add("embedded");
    new ResizeObserver(() => {
      const targetOrigin = location.origin === "null" ? "*" : location.origin;
      parent.postMessage({ type: "portfolio-workspace-height", height: document.body.scrollHeight }, targetOrigin);
    }).observe(document.body);
  }
  render();
})();
