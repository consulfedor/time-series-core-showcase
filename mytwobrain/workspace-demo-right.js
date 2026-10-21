(function () {
  'use strict';

  // AICODE-ENTRY:portfolio-right-workspace — local Docs and agent examples.
  // Native control semantics: UI5175 session_view / agent_registry_harness.
  window.WorkspaceDemoRight = {
    create(api) {
      const {state,C,t,esc,button,mdBox,docText,docLang,saveDraft,renderWorkspace,
        refreshHelp,openModal,closeModal,announce} = api;
      const $ = (selector,root=document) => root.querySelector(selector);
      const $$ = (selector,root=document) => Array.from(root.querySelectorAll(selector));
      const dictionaries = {
        ru: {
          rightExplorerIntro:'Найдите материал и прочитайте его рядом со списком. Open переносит выбранный файл в рабочую вкладку.',
          rightRoot:'Папка материалов',rightSort:'Порядок файлов',rightAlpha:'А–Я',rightModified:'Изменено ↓',
          rightUp:'Up',rightReload:'Reload',rightNew:'New',rightFolder:'Папка',rightDocument:'Документ',
          rightPreview:'Предпросмотр',rightPreviewOpen:'Открыть выбранный документ',rightPreviewExpand:'Развернуть предпросмотр',
          rightPreviewClose:'Закрыть Pane',rightNoSelection:'Выберите файл: его содержание появится здесь.',
          rightPaneValue:'Список файлов остаётся перед глазами, пока вы оцениваете материал.',
          rightDocTabs:'Открытые документы',rightTabClose:'Закрыть вкладку',rightUnsaved:'Есть правки',
          rightNewName:'Имя Markdown-файла',rightNewText:'Начальный текст',rightNewTitle:'Новый документ в примере',
          rightNewHint:'Документ появится в текущей папке и откроется в редакторе. Он хранится только в этой демонстрации до сброса или перезагрузки.',
          rightCreate:'Создать',rightNameRequired:'Введите имя файла без пути, например notes.md.',
          rightNameExists:'Такой файл уже есть в этой папке. Выберите другое имя.',
          rightCreated:'Документ создан в примере.',rightPathMissing:'Такого файла нет среди материалов примера. Выберите его в Explorer.',
          rightReloaded:'Список примера обновлён; ваши документы и правки сохранены.',rightAtRoot:'Это корневая папка выбранного набора.',
          rightNoFiles:'В этой папке ещё нет документов. New создаст первый Markdown-файл.',
          rightDocsHelp:'Файлы и смысл под рукой',rightLocalDates:'Даты и размеры относятся к подготовленным примерам.',
          rightTranslationMissing:'Для вашего нового документа ещё нет подготовленного перевода. Оригинал и ваши правки сохранены.',
          rightLibraryName:'Индекс знаний',rightOpsName:'Проверка готовности',rightKnowledgeFolder:'Знания',rightOpsFolder:'Эксплуатация',
          rightAgentsIntro:'Два специалиста с понятной ответственностью. Сравните роли, откройте их диалоги и посмотрите готовые материалы.',
          rightAgents:'Agents',rightGroups:'Groups',rightArchive:'Group archive',rightSessionArchive:'Session archive ↗',
          rightAddAgent:'+ Agent',rightAddGroup:'+ Group',rightRefresh:'Обновить пример',rightSearch:'Поиск агента, роли или группы…',
          rightAgent:'Агент',rightActivity:'Состояние',rightModel:'Модель / рассуждение',rightGroupRole:'Группа / роль',
          rightActive:'Active',rightInactive:'Inactive',rightRole:'Role',rightReady:'Готов',rightWorking:'Работает',
          rightNoAgents:'Нет агентов по выбранным условиям. Измените поиск или включите фильтры.',
          rightShown:'Показано',rightTotal:'из',rightTeam:'Рабочая команда',rightUngrouped:'Без группы',
          rightLibrarian:'Библиотекарь',rightDevops:'Девопс',rightLibrarianRole:'Знания и материалы',rightDevopsRole:'Готовность и эксплуатация',
          rightLibrarianAbout:'Собирает источники, связывает документы и сохраняет принятые решения так, чтобы следующий участник быстро вошёл в работу.',
          rightDevopsAbout:'Проверяет готовность результата, показывает основания статуса и оставляет понятный следующий шаг для эксплуатации.',
          rightProfile:'Профиль агента',rightChat:'Диалог агента',rightExampleIdentity:'Демонстрационный агент',
          rightAgentName:'Имя',rightAgentPurpose:'Ответственность',rightAgentGroup:'Группа',rightAgentSave:'Сохранить профиль',
          rightAgentSaved:'Профиль изменён в примере.',rightAgentRequired:'Введите имя агента.',
          rightAgentCreated:'Агент добавлен в демонстрационную таблицу.',rightAgentCreateHint:'Настройте пример роли. Новый профиль появится в таблице; его диалог покажет подготовленный сценарий.',
          rightGroupName:'Название группы',rightGroupCreate:'Добавить группу',rightGroupRequired:'Введите название группы.',
          rightGroupCreated:'Группа добавлена в примере.',rightGroupEmpty:'Архив групп пуст. Группу можно убрать из активного списка и затем восстановить.',
          rightArchiveGroup:'В архив',rightRestoreGroup:'Восстановить',rightMembers:'участников',rightGroupArchived:'Группа перемещена в архив примера.',
          rightGroupRestored:'Группа восстановлена.',rightLocalNotice:'Все состояния и диалоги здесь — подготовленные примеры. Изменения сохраняются до сброса или перезагрузки страницы.',
          rightChatHuman:'Задача человека',rightChatAgent:'Подготовленный ответ',rightAgentArtifact:'Открыть материал в Docs',
          rightAgentFlagHint:'Pool исключает Special и Fedor only. Так видна разница между общим исполнителем и закреплённой ролью.',
          rightArchiveTitle:'Архив сессий',rightArchiveText:'Архив помогает вернуться к завершённому обсуждению и его результатам. В этом примере сохранены два диалога специалистов: откройте любой из них.',
          rightRefreshed:'Подготовленные статусы перечитаны. Ваши локальные профили и группы сохранены.',rightSortAgents:'Сортировать агентов',
          rightCloseDoc:'Закрыть документ',rightNewAgent:'Новый специалист',rightNewAgentAbout:'Помогает выполнить ограниченную задачу и передаёт проверяемый результат.',
          rightSaveOriginal:'Сохраняется оригинал документа. Перевод остаётся отдельным подготовленным материалом.'
        },
        en: {
          rightExplorerIntro:'Find a material and read it beside the file list. Open promotes the selected file into a working document tab.',
          rightRoot:'Material folder',rightSort:'File order',rightAlpha:'A–Z',rightModified:'Modified ↓',
          rightUp:'Up',rightReload:'Reload',rightNew:'New',rightFolder:'Folder',rightDocument:'Document',
          rightPreview:'Preview',rightPreviewOpen:'Open selected document',rightPreviewExpand:'Expand preview',
          rightPreviewClose:'Close Pane',rightNoSelection:'Select a file to preview its contents here.',
          rightPaneValue:'Keep the file list in view while assessing a material.',rightDocTabs:'Open documents',rightTabClose:'Close tab',rightUnsaved:'Edited',
          rightNewName:'Markdown filename',rightNewText:'Initial text',rightNewTitle:'New example document',
          rightNewHint:'The document will appear in the current folder and open in Edit. It lives only in this demonstration until reset or page reload.',
          rightCreate:'Create',rightNameRequired:'Enter a filename without a path, such as notes.md.',rightNameExists:'This folder already contains that filename. Choose another name.',
          rightCreated:'Document created in the example.',rightPathMissing:'This file is not among the example materials. Select a file in Explorer.',
          rightReloaded:'Example list refreshed; your documents and edits are preserved.',rightAtRoot:'This is the selected root folder.',
          rightNoFiles:'This folder has no documents yet. New creates its first Markdown file.',rightDocsHelp:'Files and their meaning within reach',
          rightLocalDates:'Dates and sizes describe the prepared examples.',rightTranslationMissing:'Your new document has no prepared translation yet. Its original and your edits are preserved.',
          rightLibraryName:'Knowledge index',rightOpsName:'Readiness review',rightKnowledgeFolder:'Knowledge',rightOpsFolder:'Operations',
          rightAgentsIntro:'Two specialists with clear responsibilities. Compare their roles, open their conversations and inspect their finished materials.',
          rightAgents:'Agents',rightGroups:'Groups',rightArchive:'Group archive',rightSessionArchive:'Session archive ↗',
          rightAddAgent:'+ Agent',rightAddGroup:'+ Group',rightRefresh:'Refresh example',rightSearch:'Search agents, roles or groups…',
          rightAgent:'Agent',rightActivity:'Activity',rightModel:'Model / reasoning',rightGroupRole:'Group / role',
          rightActive:'Active',rightInactive:'Inactive',rightRole:'Role',rightReady:'Ready',rightWorking:'Working',
          rightNoAgents:'No agents match these conditions. Change the search or enable the filters.',rightShown:'Showing',rightTotal:'of',
          rightTeam:'Project team',rightUngrouped:'Ungrouped',rightLibrarian:'Librarian',rightDevops:'DevOps',
          rightLibrarianRole:'Knowledge and materials',rightDevopsRole:'Readiness and operations',
          rightLibrarianAbout:'Organizes sources, connects documents and preserves decisions so the next participant can pick up the work quickly.',
          rightDevopsAbout:'Reviews readiness, shows the evidence behind a status and leaves a clear next step for operation.',
          rightProfile:'Agent profile',rightChat:'Agent conversation',rightExampleIdentity:'Demonstration agent',rightAgentName:'Name',rightAgentPurpose:'Responsibility',
          rightAgentGroup:'Group',rightAgentSave:'Save profile',rightAgentSaved:'Profile changed in the example.',rightAgentRequired:'Enter an agent name.',
          rightAgentCreated:'Agent added to the demonstration table.',rightAgentCreateHint:'Set up an example role. The new profile appears in the table; its conversation shows a prepared scenario.',
          rightGroupName:'Group name',rightGroupCreate:'Add group',rightGroupRequired:'Enter a group name.',rightGroupCreated:'Group added in the example.',
          rightGroupEmpty:'The group archive is empty. You can archive an active group and restore it later.',rightArchiveGroup:'Archive',rightRestoreGroup:'Restore',
          rightMembers:'members',rightGroupArchived:'Group moved to the example archive.',rightGroupRestored:'Group restored.',
          rightLocalNotice:'All states and conversations are prepared examples. Changes last until reset or page reload.',
          rightChatHuman:'Human task',rightChatAgent:'Prepared reply',rightAgentArtifact:'Open material in Docs',
          rightAgentFlagHint:'Pool excludes Special and Fedor only. This distinguishes a shared worker from an assigned specialist.',
          rightArchiveTitle:'Session archive',rightArchiveText:'An archive lets you revisit a finished conversation and its results. This example retains two specialist conversations; open either one.',
          rightRefreshed:'Prepared states refreshed. Your local profiles and groups are preserved.',rightSortAgents:'Sort agents',
          rightCloseDoc:'Close document',rightNewAgent:'New specialist',rightNewAgentAbout:'Helps complete a bounded task and hands over a verifiable result.',
          rightSaveOriginal:'Save applies to the original document. Its translation remains a separate prepared material.'
        }
      };
      const helpPairs = {
        rightAgents:['Посмотреть специалистов, их ответственность и подготовленные результаты. Таблица относится к этому примеру; откройте профиль или Chat нужного агента.','Inspect specialists, their responsibilities and prepared results. This table belongs to the example; open the relevant agent’s profile or Chat.'],
        rightRoot:['Выбрать папку материалов. Быстрый переход к знаниям или эксплуатации; путь и список показывают выбранный набор.','Choose a material folder. Jump to knowledge or operations; the path and list confirm your selection.'],
        rightSort:['Упорядочить файлы по имени или дате. Последний материал легче найти; порядок меняется только в текущем примере.','Order files by name or date. Find recent material faster; only this example’s display order changes.'],
        rightUp:['Подняться на один уровень. Список обновится, а открытый документ и правки сохранятся.','Move up one folder. The list updates while the open document and edits stay intact.'],
        rightReload:['Перечитать список демонстрационных файлов. Ваши локальные документы и правки остаются на месте.','Refresh the example file list. Your local documents and edits remain in place.'],
        rightNew:['Создать Markdown-документ в этой папке. Он откроется в редакторе и останется в примере до сброса.','Create a Markdown document in this folder. It opens in Edit and remains in the example until reset.'],
        rightPreview:['Выбрать файл для Pane. Содержание видно рядом со списком; рабочая вкладка и её правки сохраняются.','Select a file for Pane. Read its contents beside the list while the working tab and its edits stay intact.'],
        rightPreviewOpen:['Открыть выбранный материал в рабочей вкладке. Тот же файл можно читать и редактировать; его путь остаётся видимым.','Open the selected material in a working tab. Read and edit that same file; its path remains visible.'],
        rightPreviewExpand:['Развернуть этот материал в окне. Удобно читать широкую таблицу; Explorer сохранит папку и выбор.','Expand this material in a dialog. Read a wide table comfortably; Explorer keeps your folder and selection.'],
        rightPreviewClose:['Скрыть предпросмотр и дать списку больше места. Повторное Pane вернёт выбранный материал.','Hide the preview to give the list more room. Pane restores the selected material.'],
        rightDocTabs:['Вернуться к открытому документу. Каждый файл сохраняет свой локальный текст, чтобы не терять ход работы.','Return to an open document. Each file keeps its local text so you can continue without losing context.'],
        rightTabClose:['Закрыть эту вкладку. Правки остаются в файле примера, который можно снова открыть из Explorer.','Close this tab. Its edits remain in the example file and return when reopened from Explorer.'],
        rightCloseDoc:['Закрыть текущую рабочую вкладку. Локальные правки сохраняются в файле примера; откройте его снова из Explorer, чтобы продолжить.','Close the current working tab. Local edits remain in the example file; reopen it from Explorer to continue.'],
        rightDocsHelp:['Explorer помогает найти материал, Pane — быстро оценить, Viewer/Edit — работать с выбранным файлом. Здесь используются подготовленные Markdown-документы; проверьте путь и содержание после выбора.','Explorer finds a material, Pane previews it, and Viewer/Edit works with the chosen file. These are prepared Markdown documents; compare their paths and contents after selecting.'],
        rightSearch:['Найти специалиста по имени, ответственности или группе. Поиск фильтрует только демонстрационную таблицу; число строк обновится.','Find a specialist by name, responsibility or group. Search filters only the demonstration table; its row count updates.'],
        rightAgent:['Открыть профиль: ответственность, роль и ожидаемый результат. Так понятнее, кому поручать задачу. Изменения касаются только примера.','Open the profile: responsibility, role and expected result. Understand whom to ask. Edits apply only to this example.'],
        rightAgentFilter:['Показать нужные состояния или роли. Фильтр не запускает и не останавливает агентов; его результат виден в строках таблицы.','Show the chosen states or roles. Filtering does not start or stop an agent; inspect the resulting table rows.'],
        rightAgentFlag:['Изменить флаг демонстрационного профиля. Pool исключает Special и Fedor only; роль и фильтры обновятся по выбранному сочетанию.','Change a demonstration profile flag. Pool excludes Special and Fedor only; roles and filters reflect the selected combination.'],
        rightChat:['Открыть отдельный подготовленный диалог этого специалиста. Результат связан с материалом, а основная беседа и набранная задача сохраняются.','Open this specialist’s separate prepared conversation. Its result links to a material, while the main conversation and task draft remain intact.'],
        rightAgentArtifact:['Перейти от ответа специалиста к его материалу. Docs откроет тот же файл, сохранив основную беседу.','Move from the specialist’s reply to its material. Docs opens that same file and preserves the main conversation.'],
        rightGroups:['Посмотреть состав команды. Группы связывают специалистов по задаче; это локальные данные примера.','Inspect team membership. Groups connect specialists working on a task; these are local example data.'],
        rightArchive:['Посмотреть убранные из активного списка группы. Их можно вернуть; профили участников сохраняются.','Inspect groups removed from the active list. Restore them while preserving their members’ profiles.'],
        rightRefresh:['Обновить вид подготовленной таблицы. Локальные профили и группы сохраняются; живые рабочие процессы не запускаются.','Refresh the prepared table. Local profiles and groups are preserved; no live worker is started.'],
        rightAddAgent:['Задать имя и ответственность нового примера агента. Профиль появится в таблице; его Chat покажет подготовленный сценарий.','Set an example agent’s name and responsibility. Its profile appears in the table; Chat shows a prepared scenario.'],
        rightAddGroup:['Собрать специалистов в именованную группу. Новая группа появится в таблице и в выборе профиля.','Organize specialists in a named group. The new group appears in the table and profile selector.'],
        rightSortAgents:['Упорядочить таблицу по выбранной колонке. Повторное нажатие меняет направление; стрелка показывает текущий порядок.','Order the table by the chosen column. Click again to reverse it; the arrow shows the current order.'],
        rightSessionArchive:['Вернуться к завершённым примерам диалогов и их материалам. Основная беседа остаётся на месте.','Revisit completed example conversations and their materials. The main conversation stays in place.']
      };
      for (const lang of ['ru','en']) {
        Object.assign(C[lang],dictionaries[lang]);
        for (const [key,value] of Object.entries(helpPairs)) C[lang].helps[key]=value[lang==='ru'?0:1];
        for (const key of Object.keys(dictionaries[lang])) if (!C[lang].helps[key]) C[lang].helps[key]=dictionaries[lang][key];
        C[lang].rightAgentFilter=lang==='ru'?'Фильтр состояния и роли':'State and role filter';
        C[lang].rightAgentFlag=lang==='ru'?'Флаг профиля агента':'Agent profile flag';
        for(const [key,label] of Object.entries({autostart:'A_S',orchestrator:'Orchestrator',special:'Special',ownerOnly:'Fedor only',pool:'Pool'})){
          C[lang]['rightFlag'+key]=label;
          C[lang].helps['rightFlag'+key]=label+': '+C[lang].helps.rightAgentFlag;
        }
      }
      C.ru.library='# Индекс знаний проекта\n\n> **Библиотекарь:** нужный источник находится по смыслу, а решение сохраняет своё основание.\n\n## Карта материалов\n\n| Материал | Что подтверждает | Когда открыть |\n|---|---|---|\n| Краткий план | Цель, границы и критерии | Перед началом работы |\n| Исследование | Наблюдения и вопросы | Перед решением |\n| Словарь | Согласованные значения | При разном понимании |\n\n## Передача следующему участнику\n\n1. Начать с актуального плана.\n2. Проверить источники нужного решения.\n3. Записать изменение рядом с основанием.\n\n```mermaid\nflowchart TD\n  A["Материалы"] --> B["Индекс знаний"]\n  B --> C["Проверяемое решение"]\n  C --> D["Продолжение работы"]\n  D --> B\n```\n\n- [x] Источники сгруппированы по назначению.\n- [x] Решения связаны с контекстом.\n- [ ] Новый участник проверил понятность передачи.\n\n**Это подготовленный пример**, а не инвентаризация пользовательских файлов.';
      C.en.library='# Project knowledge index\n\n> **Librarian:** find a source by its meaning and preserve the evidence behind a decision.\n\n## Material map\n\n| Material | What it establishes | When to open it |\n|---|---|---|\n| Project brief | Goal, scope and criteria | Before starting |\n| Research | Observations and questions | Before deciding |\n| Glossary | Agreed meanings | When interpretations differ |\n\n## Handoff to the next participant\n\n1. Start with the current brief.\n2. Inspect the sources behind the decision.\n3. Record changes beside their evidence.\n\n```mermaid\nflowchart TD\n  A["Materials"] --> B["Knowledge index"]\n  B --> C["Verifiable decision"]\n  C --> D["Continuing work"]\n  D --> B\n```\n\n- [x] Sources grouped by purpose.\n- [x] Decisions connected to context.\n- [ ] The next participant reviewed the handoff.\n\n**This is a prepared example**, not an inventory of user files.';
      C.ru.ops='# Проверка готовности\n\n> **Девопс:** состояние понятно, потому что рядом показаны проверка, результат и следующий шаг.\n\n## Подготовленный отчёт\n\n| Проверка | Результат примера | Основание |\n|---|---|---|\n| Сборка | Готово | Сборочный отчёт |\n| Основной сценарий | Пройден | Просмотр результата |\n| Восстановление | Описано | Предыдущая версия сохранена |\n| Приёмка человеком | Ожидается | Ссылка передана на просмотр |\n\n## Передача в работу\n\n- [x] Результат и его версия определены.\n- [x] Проверки связаны с результатом.\n- [x] Следующий шаг записан.\n- [ ] Человек подтвердил удобство основного сценария.\n\n```yaml\nresult: prepared-example\nchecks: complete\nnext_step: human-review\n```\n\n**Следующее действие:** открыть пример и пройти основной сценарий. Эти статусы иллюстрируют отчёт, а не состояние реального сервера.';
      C.en.ops='# Readiness review\n\n> **DevOps:** a state is understandable when its check, evidence and next step are visible together.\n\n## Prepared report\n\n| Check | Example result | Evidence |\n|---|---|---|\n| Build | Complete | Build report |\n| Main scenario | Passed | Result review |\n| Recovery | Documented | Previous version retained |\n| Human acceptance | Awaited | Review link handed over |\n\n## Operational handoff\n\n- [x] Result and version identified.\n- [x] Checks linked to the result.\n- [x] Next step recorded.\n- [ ] A person confirmed the main scenario is usable.\n\n```yaml\nresult: prepared-example\nchecks: complete\nnext_step: human-review\n```\n\n**Next action:** open the example and walk through the main scenario. These statuses illustrate a report, not a real server state.';
      for (const file of [{id:'library',path:'project/knowledge/index.md',name:'rightLibraryName'},{id:'ops',path:'project/operations/readiness.md',name:'rightOpsName'}]) {
        if (!C.files.some(f=>f.id===file.id)) C.files.push(file);
      }
      const defaults=()=>({root:'project',dir:'project',sort:'modified_desc',paneOpen:true,selected:'brief',tabs:['brief'],saved:{},created:[],originals:{},sequence:0,status:'',listScroll:0,
        agentMode:'agents',query:'',agentSort:'name',agentDirection:1,filters:{active:true,inactive:true,orchestrator:true,helper:true},
        groups:[{id:'team',nameKey:'rightTeam',archived:false}],agentSequence:0,groupSequence:0,
        rows:[{id:'librarian',terminal:'D011',nameKey:'rightLibrarian',roleKey:'rightLibrarianRole',aboutKey:'rightLibrarianAbout',active:true,activity:'ready',orchestrator:false,autostart:true,special:true,ownerOnly:false,pool:false,group:'team',artifact:'library',reasoning:'high'},
          {id:'devops',terminal:'D005',nameKey:'rightDevops',roleKey:'rightDevopsRole',aboutKey:'rightDevopsAbout',active:true,activity:'working',orchestrator:true,autostart:true,special:true,ownerOnly:false,pool:false,group:'team',artifact:'ops',reasoning:'high'}]});
      let right=defaults();
      const fileById=id=>C.files.find(f=>f.id===id);
      const fileName=file=>file.path.split('/').pop();
      const dirname=path=>path.slice(0,path.lastIndexOf('/'));
      const fileTitle=file=>t(file.name);
      const nameOf=row=>row.name??t(row.nameKey);
      const roleOf=row=>row.role??t(row.roleKey);
      const aboutOf=row=>row.about??t(row.aboutKey);
      const groupName=group=>group?.name??(group?t(group.nameKey):t('rightUngrouped'));
      const groupOf=row=>right.groups.find(g=>g.id===row.group);
      const isDirty=id=>['ru','en'].some(lang=>state.edits[`${lang}:${id}`]!==undefined&&state.edits[`${lang}:${id}`]!== (right.saved[`${lang}:${id}`]??C[lang][id]));
      function redraw(focusId,keepScroll=true) {
        if(keepScroll)right.listScroll=$('#r47-file-list')?.scrollTop??right.listScroll;
        renderWorkspace();
        if (focusId) $('#'+focusId)?.focus({preventScroll:true});
      }
      function chooseDoc(id) {
        const file=fileById(id);if(!file)return;
        right.status='';
        if(!right.tabs.includes(id))right.tabs.push(id);
        right.selected=id;
        if(!file.path.startsWith(right.root+'/'))right.root='project';
        right.dir=dirname(file.path);
      }
      function openDocument(id) { if(fileById(id)){chooseDoc(id);api.chooseDoc(id);} }
      function tabStrip() {
        return `<div id="r47-doc-tabs" class="docswb-open-tabs r47-doc-tabs" aria-label="${esc(t('rightDocTabs'))}">${right.tabs.map(id=>{
          const f=fileById(id);return f?`<div class="r47-doc-tab ${state.doc===id?'active':''}" data-file="${esc(id)}">${button('r47-doc-tab',fileName(f)+(isDirty(id)?' *':''),'rightDocTabs',`data-file="${esc(id)}" aria-pressed="${state.doc===id}"`)}${button('r47-doc-tab-close','×','rightTabClose',`data-file="${esc(id)}" aria-label="${esc(t('rightTabClose')+' · '+fileName(f))}"`)}</div>`:'';
        }).join('')}</div>`;
      }
      function preview() {
        const file=fileById(right.selected);
        return `<aside id="r47-preview-pane" class="docswb-explorer-preview-pane r47-preview-pane" ${right.paneOpen?'':'hidden'}><div class="docswb-explorer-preview-head r47-preview-head"><strong>${esc(file?fileName(file):t('rightPreview'))}</strong>${file?button('r47-preview-open','Open','rightPreviewOpen','id="r47-preview-open" data-source-id="docsWorkbenchExplorerPreviewOpen"')+button('r47-preview-expand','↗','rightPreviewExpand',`aria-label="${esc(t('rightPreviewExpand'))}"`):''}${button('r47-preview-close','×','rightPreviewClose',`data-source-id="docsWorkbenchExplorerPreviewClose" aria-label="${esc(t('rightPreviewClose'))}"`)}</div><div id="r47-preview-body" class="docswb-preview docswb-explorer-preview r47-preview-body" data-preview-file="${esc(file?.id??'')}">${file?`<p class="r47-preview-path">${esc(file.path)}</p>${mdBox(docText(file.id,state.lang))}`:`<p class="tab-intro">${esc(t('rightNoSelection'))}</p>`}</div></aside>`;
      }
      function explorer() {
        const entries=[],folders=new Set();
        C.files.forEach((file,index)=>{if(!file.path.startsWith(right.dir+'/'))return;const remainder=file.path.slice(right.dir.length+1);if(remainder.includes('/'))folders.add(right.dir+'/'+remainder.split('/')[0]);else entries.push({file,index});});
        entries.sort((a,b)=>right.sort==='alpha'?fileName(a.file).localeCompare(fileName(b.file),state.lang):b.index-a.index);
        const parts=right.dir.split('/');
        const breadcrumbs=parts.map((part,i)=>button('r47-breadcrumb',part,'rightRoot',`data-path="${esc(parts.slice(0,i+1).join('/'))}" ${i===parts.length-1?'aria-current="location"':''}`)).join('<span aria-hidden="true">/</span>');
        const rows=Array.from(folders).sort().map(path=>`<div class="r47-file-row r47-folder-row">${button('r47-folder','📁 '+path.split('/').pop(),'rightRoot',`data-path="${esc(path)}" class="r47-file-select"`)}<small>${esc(t('rightFolder'))}</small></div>`).join('')+entries.map(({file,index})=>`<div class="file-row r47-file-row ${right.selected===file.id?'selected':''}" data-file="${esc(file.id)}"><button type="button" class="r47-file-select" data-demo-action="r47-file-preview" data-help="rightPreview" data-file="${esc(file.id)}" aria-pressed="${right.selected===file.id}"><span aria-hidden="true">▤</span><span><strong>${esc(fileName(file))}</strong><small>${esc(fileTitle(file))}</small><small class="r47-file-path">${esc(file.path)}</small><small>${esc(t('rightDocument'))} · 20.10.26 15:${String(30+index).padStart(2,'0')} · ${(new TextEncoder().encode(docText(file.id,state.lang)).length/1024).toFixed(1)} KB${isDirty(file.id)?' · '+esc(t('rightUnsaved')):''}</small></span></button>${button('r47-file-open','Open','rightPreviewOpen',`data-file="${esc(file.id)}" class="r47-file-open" aria-label="Open · ${esc(fileName(file))}"`)}</div>`).join('');
        return `<section class="r47-explorer"><p class="tab-intro">${esc(t('rightExplorerIntro'))}</p><div class="docswb-toolbar r47-explorer-toolbar"><label class="visually-hidden" for="r47-root">${esc(t('rightRoot'))}</label><select id="r47-root" data-source-id="docsWorkbenchRoot" data-demo-action="r47-root" data-help="rightRoot">${['project','project/knowledge','project/operations'].map(path=>`<option value="${path}" ${right.root===path?'selected':''}>${path}</option>`).join('')}</select><label class="visually-hidden" for="r47-sort">${esc(t('rightSort'))}</label><select id="r47-sort" data-source-id="docsWorkbenchSort" data-demo-action="r47-sort" data-help="rightSort"><option value="modified_desc" ${right.sort==='modified_desc'?'selected':''}>${esc(t('rightModified'))}</option><option value="alpha" ${right.sort==='alpha'?'selected':''}>${esc(t('rightAlpha'))}</option></select>${button('r47-docs-help','?','rightDocsHelp',`aria-label="${esc(t('rightDocsHelp'))}"`)}${button('r47-up','Up','rightUp','data-source-id="docsWorkbenchUp"')}${button('r47-reload','Reload','rightReload','data-source-id="docsWorkbenchReload"')}${button('r47-new','New','rightNew','data-source-id="docsWorkbenchNew"')}</div><nav class="docswb-breadcrumbs r47-breadcrumbs" aria-label="${esc(t('rightRoot'))}">${breadcrumbs}</nav><div class="docswb-explorer-layout r47-explorer-layout ${right.paneOpen?'pane-open':''}"><div id="r47-file-list" class="docswb-explorer r47-file-list">${rows||`<p class="inline-note">${esc(t('rightNoFiles'))}</p>`}</div>${preview()}</div><p class="r47-list-footnote">${esc(right.status||t('rightLocalDates'))}</p></section>`;
      }
      function docs() {
        const file=fileById(state.doc)||fileById('brief');
        const modeButtons=['viewer','edit','explorer'].map(mode=>button('doc-'+mode,mode==='viewer'?'Viewer':mode==='edit'?'Edit':'Explorer',mode,`data-source-id="docsWorkbenchMode${mode[0].toUpperCase()+mode.slice(1)}" aria-pressed="${state.view===mode}"`)).join('');
        const toolbar=modeButtons+button('doc-pane','Pane','rightPreview',`data-source-id="docsWorkbenchExplorerPaneToggle" aria-pressed="${state.view==='explorer'&&right.paneOpen}"`)+button('doc-original','Original','original',`aria-pressed="${!state.translated}"`)+button('doc-translation','Translation','translation',`aria-pressed="${state.translated}"`)+`<span class="r47-toolbar-spacer"></span>`+button('r47-close-doc','Close','rightCloseDoc')+button('save-doc','Save','save')+button('r47-docs-help','?','rightDocsHelp',`aria-label="${esc(t('rightDocsHelp'))}"`);
        let body;
        if(state.view==='explorer')body=explorer();
        else if(state.view==='edit')body=`<div class="pane-content"><label class="small-label" for="doc-editor">Markdown · ${esc(file.path)}</label><textarea class="docswb-editor doc-editor" id="doc-editor" data-source-id="docsWorkbenchEditor" data-help="edit">${esc(docText(file.id))}</textarea><p class="r47-list-footnote">${esc(t('rightSaveOriginal'))}</p></div>`;
        else body=`<div class="docswb-content-shell pane-content doc-paper"><div class="doc-kicker"><span>${esc(t('docVersion'))}</span><span>${esc(state.translated?t('translation'):'Markdown')}${isDirty(file.id)?' · '+esc(t('rightUnsaved')):''}</span></div>${mdBox(docText(file.id),'docswb-preview')}</div>`;
        return `<div class="session-side-action-row doc-toolbar r47-doc-toolbar">${toolbar}</div><div class="document-address"><label class="visually-hidden" for="doc-path">${esc(t('documentPath'))}</label><input id="doc-path" value="${esc(file.path)}" data-help="documentPath" spellcheck="false">${button('open-path','Open','open')}</div>${tabStrip()}${body}`;
      }
      function closeTab(id) {
        saveDraft();const index=right.tabs.indexOf(id);if(index<0)return;
        right.tabs.splice(index,1);
        if(state.doc===id){const next=right.tabs[Math.min(index,right.tabs.length-1)];if(next){state.doc=next;state.translated=false;}else state.view='explorer';}
        redraw();
      }
      function openNewDocument() {
        saveDraft();openModal(t('rightNewTitle'),`<p class="tab-intro">${esc(t('rightNewHint'))}</p><p class="r47-preview-path">${esc(right.dir)}</p><label class="small-label" for="r47-doc-new-name">${esc(t('rightNewName'))}</label><input id="r47-doc-new-name" class="form-select" data-help="rightNewName" value="notes.md" maxlength="70" spellcheck="false"><label class="small-label" for="r47-doc-new-text">${esc(t('rightNewText'))}</label><textarea id="r47-doc-new-text" class="copy-field" data-help="rightNewText">${esc(state.lang==='ru'?'# Рабочая заметка\n\n## Решение\n\n- Основание:\n- Следующий шаг:':'# Working note\n\n## Decision\n\n- Evidence:\n- Next step:')}</textarea><div class="toolbar tab-empty-space">${button('r47-new-save',t('rightCreate'),'rightNew','class="primary"')}</div>`);
        $('#r47-doc-new-name')?.focus();
      }
      function createDocument() {
        const input=$('#r47-doc-new-name');let name=input.value.trim();
        if(!name||/[\\/<>:"|?*]/.test(name)||Array.from(name).some(char=>char.charCodeAt(0)<32)||name==='.'||name==='..'){input.setCustomValidity(t('rightNameRequired'));input.reportValidity();return;}
        if(!/\.md$/i.test(name))name+='.md';
        const path=right.dir+'/'+name;if(C.files.some(f=>f.path.toLowerCase()===path.toLowerCase())){input.setCustomValidity(t('rightNameExists'));input.reportValidity();return;}
        const id='local-doc-'+(++right.sequence),nameKey='r47LocalDocName'+right.sequence,text=$('#r47-doc-new-text').value;
        C.files.push({id,path,name:nameKey});
        // One authored original: changing UI language never creates a translation.
        // Existing composer saveDraft/docText keep their locale-keyed interface.
        const original=right.originals[id]={text};
        for(const lang of ['ru','en']){
          C[lang][nameKey]=name;C[lang][id]=text;
          Object.defineProperty(state.edits,`${lang}:${id}`,{
            enumerable:true,configurable:true,
            get:()=>original.text,set:value=>{original.text=String(value);}
          });
        }
        right.created.push(id);closeModal();chooseDoc(id);state.doc=id;state.tab='docs';state.view='edit';state.translated=false;redraw();announce(t('rightCreated'));$('#doc-editor')?.focus();
      }
      function openPath() {
        const input=$('#doc-path'),path=input.value.trim().replace(/\\/g,'/').toLowerCase();
        const file=C.files.find(f=>f.path.toLowerCase()===path||fileName(f).toLowerCase()===path||fileTitle(f).toLowerCase()===path);
        if(file){input.removeAttribute('aria-invalid');openDocument(file.id);}else{input.setAttribute('aria-invalid','true');right.status=t('rightPathMissing');announce(right.status);openModal(t('chooseFile'),`<p class="inline-note">${esc(right.status)}</p><div class="r47-path-options">${C.files.map(f=>button('r47-path-file',f.path,'rightPreviewOpen',`data-file="${esc(f.id)}"`)).join('')}</div>`);}
      }
      function visibleAgents() {
        const q=right.query.trim().toLocaleLowerCase(state.lang),filters=right.filters;
        return right.rows.filter(row=>(filters[row.active?'active':'inactive']&&filters[row.orchestrator?'orchestrator':'helper'])&&(!q||[nameOf(row),roleOf(row),groupName(groupOf(row)),row.terminal,t(row.activity==='working'?'rightWorking':'rightReady')].join(' ').toLocaleLowerCase(state.lang).includes(q))).sort((a,b)=>{
          const value=row=>right.agentSort==='name'?nameOf(row):right.agentSort==='group'?groupName(groupOf(row)):right.agentSort==='role'?(row.orchestrator?'Orchestrator':'Helper'):right.agentSort==='activity'?row.activity:right.agentSort==='active'?String(row.active):right.agentSort==='model'?'6.1 Sol '+row.reasoning:String(row[right.agentSort]??'');
          return right.agentDirection*value(a).localeCompare(value(b),state.lang)||a.terminal.localeCompare(b.terminal);
        });
      }
      const flagLabel={autostart:'A_S',orchestrator:'Orch.',special:'Special',ownerOnly:'Fedor only',pool:'Pool'};
      function flagInput(row,key,modal=false) {
        return `<input type="checkbox" ${row[key]?'checked':''} data-demo-action="${modal?'r47-profile-flag':'r47-agent-row-flag'}" data-help="rightFlag${key}" data-agent="${esc(row.id)}" data-flag="${key}" aria-label="${esc(nameOf(row)+' · '+flagLabel[key])}" ${modal?`id="r47-profile-${key}"`:''}>`;
      }
      function agentTable() {
        const rows=visibleAgents();
        const columns=[['name',t('rightAgent')],['active','Zellij'],['activity',t('rightActivity')],['cli','CLI'],['model',t('rightModel')],...Object.entries(flagLabel),['group',t('rightGroupRole')],['chat','Chat']];
        const heading=columns.map(([key,label])=>`<th scope="col" ${!['cli','chat'].includes(key)?`aria-sort="${right.agentSort===key?(right.agentDirection===1?'ascending':'descending'):'none'}"`:''}>${['cli','chat'].includes(key)?esc(label):button('r47-agent-sort',label+(right.agentSort===key?(right.agentDirection===1?' ↑':' ↓'):''),'rightSortAgents',`data-sort="${key}"`)}</th>`).join('');
        return `<div class="r47-agent-table-scroll"><table class="r47-agent-table" id="r47-agent-table"><thead><tr>${heading}</tr></thead><tbody>${rows.map(row=>`<tr data-agent="${esc(row.id)}"><td>${button('r47-agent-profile',nameOf(row),'rightAgent',`data-agent="${esc(row.id)}" class="r47-agent-name"`)}<small>${esc(row.terminal+' · '+roleOf(row))}</small></td><td>${button('r47-agent-presence',(row.active?'●':'○')+' ▣','rightAgentFilter',`data-agent="${esc(row.id)}" aria-label="${esc(nameOf(row)+' · '+t(row.active?'rightActive':'rightInactive'))}" class="r47-presence ${row.active?'active':''}"`)}</td><td class="r47-agent-activity ${row.activity}">${esc(t(row.activity==='working'?'rightWorking':'rightReady'))}</td><td><span class="r47-example-cell">demo</span></td><td><strong>6.1 Sol</strong><small>${esc(row.reasoning)}</small></td>${Object.keys(flagLabel).map(key=>`<td>${flagInput(row,key)}</td>`).join('')}<td><span>${esc(groupName(groupOf(row)))}</span><small>${row.orchestrator?'Orchestrator':'Helper'}</small></td><td>${button('r47-agent-chat','Chat ↗','rightChat',`data-agent="${esc(row.id)}"`)}</td></tr>`).join('')}</tbody></table></div>${rows.length?'':`<p id="r47-agent-empty" class="inline-note">${esc(t('rightNoAgents'))}</p>`}<p class="r47-list-footnote" id="r47-agent-count">${esc(t('rightShown'))} ${rows.length} ${esc(t('rightTotal'))} ${right.rows.length} · ${esc(t('rightExampleIdentity'))}</p>`;
      }
      function groups() {
        const archive=right.agentMode==='archive',list=right.groups.filter(g=>g.archived===archive&&(!right.query||groupName(g).toLowerCase().includes(right.query.toLowerCase())));
        return `<div class="r47-groups">${list.map(group=>{const members=right.rows.filter(r=>r.group===group.id);return `<article class="fixture-card" data-group="${esc(group.id)}"><h3>${esc(groupName(group))}</h3><p>${members.length} ${esc(t('rightMembers'))}</p><div class="r47-group-members">${members.map(row=>button('r47-agent-profile',nameOf(row),'rightAgent',`data-agent="${esc(row.id)}"`)).join('')}</div><div class="toolbar">${button(archive?'r47-group-restore':'r47-group-archive',t(archive?'rightRestoreGroup':'rightArchiveGroup'),'rightArchive',`data-group="${esc(group.id)}"`)}</div></article>`;}).join('')||`<p class="inline-note">${esc(t('rightGroupEmpty'))}</p>`}</div>`;
      }
      function agents() {
        const filters=Object.entries(right.filters).map(([key,on])=>`<label><input type="checkbox" data-demo-action="r47-agent-filter" data-help="rightAgentFilter" data-filter="${key}" ${on?'checked':''}><span>${key==='active'?t('rightActive'):key==='inactive'?t('rightInactive'):key==='orchestrator'?'Orchestrator':'Helper'}</span></label>`).join('');
        return `<section class="r47-agents"><p class="tab-intro">${esc(t('rightAgentsIntro'))}</p><div class="r47-registry-head"><div class="r47-registry-modes">${[['agents','rightAgents',right.rows.length],['groups','rightGroups',right.groups.filter(g=>!g.archived).length],['archive','rightArchive',right.groups.filter(g=>g.archived).length]].map(([mode,label,count])=>button('r47-agent-mode',t(label)+' '+count,label,`data-mode="${mode}" aria-pressed="${right.agentMode===mode}"`)).join('')}</div><div class="r47-registry-actions">${button('r47-session-archive',t('rightSessionArchive'),'rightSessionArchive')}${button('r47-add-agent',t('rightAddAgent'),'rightAddAgent')}${button('r47-add-group',t('rightAddGroup'),'rightAddGroup')}${button('r47-agent-refresh','↻','rightRefresh',`aria-label="${esc(t('rightRefresh'))}"`)}</div></div><label class="visually-hidden" for="r47-agent-search">${esc(t('rightSearch'))}</label><input type="search" id="r47-agent-search" data-help="rightSearch" placeholder="${esc(t('rightSearch'))}" value="${esc(right.query)}"><div class="r47-agent-filters">${filters}${button('r47-agents-help','?','rightAgent',`aria-label="${esc(t('rightProfile'))}"`)}</div><div id="r47-agent-results">${right.agentMode==='agents'?agentTable():groups()}</div><p class="r47-list-footnote">${esc(t('rightLocalNotice'))}</p></section>`;
      }
      function groupOptions(selected='team') { return `<option value="">${esc(t('rightUngrouped'))}</option>`+right.groups.filter(g=>!g.archived||g.id===selected).map(g=>`<option value="${esc(g.id)}" ${selected===g.id?'selected':''}>${esc(groupName(g))}</option>`).join(''); }
      function openAgentProfile(id) {
        const row=right.rows.find(r=>r.id===id);if(!row)return;saveDraft();
        openModal(nameOf(row),`<p class="tab-intro">${esc(t('rightExampleIdentity'))} · ${esc(row.terminal)}</p><p>${esc(aboutOf(row))}</p><div class="r47-agent-profile" data-agent="${esc(id)}"><label class="small-label" for="r47-profile-name">${esc(t('rightAgentName'))}</label><input class="form-select" id="r47-profile-name" data-help="rightAgentName" maxlength="80" value="${esc(nameOf(row))}"><label class="small-label" for="r47-profile-role">${esc(t('rightAgentPurpose'))}</label><textarea id="r47-profile-role" class="copy-field r47-short-field" data-help="rightAgentPurpose" maxlength="300">${esc(roleOf(row))}</textarea><label class="small-label" for="r47-profile-group">${esc(t('rightAgentGroup'))}</label><select class="form-select" id="r47-profile-group" data-demo-action="r47-agent-group-select" data-help="rightGroups">${groupOptions(row.group)}</select><div class="r47-profile-flags">${Object.entries(flagLabel).map(([key,label])=>`<label>${flagInput(row,key,true)}<span>${esc(label)}</span></label>`).join('')}</div><p class="inline-note">${esc(t('rightAgentFlagHint'))}</p><div class="toolbar">${button('r47-agent-profile-save',t('rightAgentSave'),'rightAgent',`data-agent="${esc(id)}" class="primary"`)}${button('r47-agent-chat','Chat ↗','rightChat',`data-agent="${esc(id)}"`)}</div></div>`);
      }
      function chatText(row) {
        if(row.id==='librarian')return state.lang==='ru'?'### Задача\n\nСобери материалы проекта так, чтобы следующий участник быстро понял принятые решения.\n\n### Результат\n\nИндекс связывает **цель → источники → решения → продолжение**.\n\n| Материал | Польза |\n|---|---|\n| План | Удерживает цель |\n| Исследование | Даёт основания решения |\n| Словарь | Сохраняет единое понимание |\n\n- [x] Материалы сгруппированы.\n- [x] Следующий шаг указан.\n\nОткройте **индекс знаний**: таблица, схема и чеклист доступны как рабочий Markdown.':'### Task\n\nOrganize the project materials so the next participant can quickly understand the decisions.\n\n### Result\n\nThe index connects **goal → sources → decisions → continuation**.\n\n| Material | Benefit |\n|---|---|\n| Brief | Keeps the goal clear |\n| Research | Provides decision evidence |\n| Glossary | Preserves shared meaning |\n\n- [x] Materials grouped.\n- [x] Next step identified.\n\nOpen the **knowledge index**: its table, diagram and checklist are working Markdown.';
        if(row.id==='devops')return state.lang==='ru'?'### Задача\n\nПокажи готовность результата и что требуется для передачи в работу.\n\n### Результат\n\n| Слой | Статус примера | Что проверить |\n|---|---|---|\n| Сборка | Готово | Отчёт соответствует версии |\n| Сценарий | Пройден | Основное действие доступно |\n| Приёмка | Ожидается | Человек проходит сценарий |\n\n**Следующий шаг:** человеческая проверка удобства.\n\n```yaml\nchecks: complete\nnext_step: human-review\n```\n\nОткройте **проверку готовности** — основания статуса остаются рядом с итогом.':'### Task\n\nShow the result’s readiness and what is needed for operational handoff.\n\n### Result\n\n| Layer | Example state | What to verify |\n|---|---|---|\n| Build | Complete | Report matches the version |\n| Scenario | Passed | Main action is available |\n| Acceptance | Awaited | A person walks through the scenario |\n\n**Next step:** a human usability review.\n\n```yaml\nchecks: complete\nnext_step: human-review\n```\n\nOpen the **readiness review** to inspect the evidence beside the conclusion.';
        return state.lang==='ru'?'### Подготовленный сценарий\n\n1. Уточнить ожидаемый результат.\n2. Проверить материалы задачи.\n3. Передать результат с критериями готовности.\n\n> Ваш профиль сохранён в примере. Ответ здесь показывает формат передачи работы.':'### Prepared scenario\n\n1. Clarify the expected result.\n2. Review the task materials.\n3. Hand over a result with acceptance criteria.\n\n> Your profile is saved in the example. This reply demonstrates a handoff format.';
      }
      function openAgentChat(id) {
        const row=right.rows.find(r=>r.id===id);if(!row)return;saveDraft();
        openModal(t('rightChat')+' · '+nameOf(row),`<p class="tab-intro">${esc(t('rightExampleIdentity'))} · ${esc(row.terminal)} · ${esc(roleOf(row))}</p><article class="r47-agent-chat" id="r47-agent-chat-content" data-agent="${esc(id)}">${mdBox(chatText(row))}</article><div class="toolbar">${button('r47-agent-artifact',t('rightAgentArtifact'),'rightAgentArtifact',`data-file="${esc(row.artifact)}" class="primary"`)}${button('r47-agent-profile',t('rightProfile'),'rightAgent',`data-agent="${esc(id)}"`)}</div><p class="r47-list-footnote">${esc(t('rightLocalNotice'))}</p>`);
      }
      function addAgent() {
        openModal(t('rightAddAgent'),`<p class="tab-intro">${esc(t('rightAgentCreateHint'))}</p><label class="small-label" for="r47-agent-name">${esc(t('rightAgentName'))}</label><input id="r47-agent-name" class="form-select" data-help="rightAgentName" maxlength="80" value="${esc(t('rightNewAgent'))}"><label class="small-label" for="r47-agent-role">${esc(t('rightAgentPurpose'))}</label><textarea id="r47-agent-role" class="copy-field r47-short-field" data-help="rightAgentPurpose" maxlength="300">${esc(t('rightNewAgentAbout'))}</textarea><label class="small-label" for="r47-agent-group">${esc(t('rightAgentGroup'))}</label><select id="r47-agent-group" class="form-select" data-demo-action="r47-agent-group-select" data-help="rightGroups">${groupOptions()}</select><div class="toolbar">${button('r47-agent-create',t('rightCreate'),'rightAddAgent','class="primary"')}</div>`);
      }
      function createAgent() {
        const input=$('#r47-agent-name');if(!input.value.trim()){input.setCustomValidity(t('rightAgentRequired'));input.reportValidity();return;}
        const sequence=++right.agentSequence;right.rows.push({id:'local-agent-'+sequence,terminal:'D'+String(100+sequence),name:input.value.trim(),role:$('#r47-agent-role').value.trim()||t('rightNewAgentAbout'),about:t('rightNewAgentAbout'),active:false,activity:'ready',orchestrator:false,autostart:false,special:false,ownerOnly:false,pool:true,group:$('#r47-agent-group').value,artifact:'brief',reasoning:'high'});
        right.query='';right.filters.inactive=true;right.filters.helper=true;right.agentMode='agents';closeModal();redraw();announce(t('rightAgentCreated'));
      }
      function saveAgent(id) {
        const row=right.rows.find(r=>r.id===id),input=$('#r47-profile-name');if(!row||!input)return;
        if(!input.value.trim()){input.setCustomValidity(t('rightAgentRequired'));input.reportValidity();return;}
        row.name=input.value.trim();row.role=$('#r47-profile-role').value.trim();row.group=$('#r47-profile-group').value;
        for(const key of Object.keys(flagLabel))row[key]=$('#r47-profile-'+key).checked;
        closeModal();redraw();announce(t('rightAgentSaved'));
      }
      function enforceFlags(object,key,value) {
        object[key]=value;if(key==='pool'&&value){object.special=false;object.ownerOnly=false;}if(['special','ownerOnly'].includes(key)&&value)object.pool=false;
      }
      function action(actionName,el) {
        switch(actionName) {
          case 'doc-viewer':case 'doc-edit':case 'doc-explorer':saveDraft();state.view=actionName.slice(4);if(state.view==='edit')state.translated=false;if(state.view!=='explorer'&&!right.tabs.includes(state.doc))right.tabs.push(state.doc);redraw();break;
          case 'doc-pane':saveDraft();right.paneOpen=state.view==='explorer'?!right.paneOpen:true;state.view='explorer';redraw();break;
          case 'doc-original':case 'doc-translation':saveDraft();if(actionName==='doc-translation'&&right.created.includes(state.doc)){openModal(t('translation'),`<p class="inline-note">${esc(t('rightTranslationMissing'))}</p>`);break;}state.translated=actionName==='doc-translation';state.view='viewer';if(!right.tabs.includes(state.doc))right.tabs.push(state.doc);redraw();break;
          case 'save-doc':saveDraft();if(state.translated){announce(t('rightSaveOriginal'));break;}for(const lang of right.created.includes(state.doc)?['ru','en']:[state.lang])right.saved[`${lang}:${state.doc}`]=docText(state.doc,lang);state.view='viewer';if(!right.tabs.includes(state.doc))right.tabs.push(state.doc);redraw();announce(t('saved'));break;
          case 'open-path':openPath();break;
          case 'r47-file-preview':saveDraft();right.selected=el.dataset.file;right.paneOpen=true;redraw();announce(t('rightPreview')+' · '+fileById(right.selected)?.path);break;
          case 'r47-file-open':case 'r47-doc-tab':openDocument(el.dataset.file);break;
          case 'r47-path-file':closeModal();openDocument(el.dataset.file);break;
          case 'r47-doc-tab-close':closeTab(el.dataset.file);break;
          case 'r47-close-doc':closeTab(state.doc);break;
          case 'r47-preview-open':openDocument(right.selected);break;
          case 'r47-preview-close':right.paneOpen=false;redraw();break;
          case 'r47-preview-expand':{const file=fileById(right.selected);if(file)openModal(fileTitle(file),`<p class="r47-preview-path">${esc(file.path)}</p>${mdBox(docText(file.id,state.lang))}<div class="toolbar">${button('r47-path-file','Open','rightPreviewOpen',`data-file="${esc(file.id)}"`)}</div>`);break;}
          case 'r47-folder':case 'r47-breadcrumb':right.dir=el.dataset.path;if(!right.dir.startsWith(right.root))right.root='project';right.listScroll=0;right.status='';redraw(null,false);break;
          case 'r47-up':if(right.dir===right.root){announce(t('rightAtRoot'));right.status=t('rightAtRoot');}else{right.dir=dirname(right.dir);right.status='';right.listScroll=0;}redraw(null,false);break;
          case 'r47-reload':right.status=t('rightReloaded');redraw();announce(right.status);break;
          case 'r47-new':openNewDocument();break;
          case 'r47-new-save':createDocument();break;
          case 'r47-docs-help':openModal(t('rightDocsHelp'),mdBox(state.lang==='ru'?'## Найти → оценить → работать\n\n1. **Explorer:** папки, имя, дата и размер помогают найти материал.\n2. **Pane:** выбранный файл читается рядом со списком — можно быстро сравнить несколько материалов.\n3. **Open:** тот же файл открывается во вкладке Viewer/Edit.\n\nОригинал, подготовленный перевод и локальные правки различаются. Закрытая вкладка не удаляет файл. **Все изменения этого примера живут до сброса или перезагрузки страницы.**\n\nПроверьте: измените абзац в Edit, посмотрите другой файл через Pane и вернитесь в прежнюю вкладку. Текст сохранится.':'## Find → assess → work\n\n1. **Explorer:** folders, names, dates and sizes help locate a material.\n2. **Pane:** read the selected file beside the list and compare materials quickly.\n3. **Open:** promote that same file into Viewer/Edit.\n\nThe original, prepared translation and local edits remain distinct. Closing a tab does not delete its file. **Example changes last until reset or page reload.**\n\nTry editing a paragraph, previewing another file in Pane, then returning to the original tab. Its text remains.'));break;
          case 'r47-agent-mode':right.agentMode=el.dataset.mode;redraw();break;
          case 'r47-agent-sort':right.agentDirection=right.agentSort===el.dataset.sort?-right.agentDirection:1;right.agentSort=el.dataset.sort;redraw();break;
          case 'r47-agent-presence':{const row=right.rows.find(r=>r.id===el.dataset.agent);if(row)openModal(nameOf(row),mdBox(`## ${t(row.active?'rightActive':'rightInactive')}\n\n${aboutOf(row)}\n\n${t('rightLocalNotice')}`));break;}
          case 'r47-agent-profile':openAgentProfile(el.dataset.agent);break;
          case 'r47-agent-profile-save':saveAgent(el.dataset.agent);break;
          case 'r47-agent-chat':openAgentChat(el.dataset.agent);break;
          case 'r47-agent-artifact':closeModal();openDocument(el.dataset.file);break;
          case 'r47-agent-refresh':redraw();announce(t('rightRefreshed'));break;
          case 'r47-add-agent':addAgent();break;
          case 'r47-agent-create':createAgent();break;
          case 'r47-add-group':openModal(t('rightAddGroup'),`<label class="small-label" for="r47-group-name">${esc(t('rightGroupName'))}</label><input id="r47-group-name" class="form-select" data-help="rightGroups" maxlength="80"><div class="toolbar">${button('r47-group-create',t('rightGroupCreate'),'rightAddGroup','class="primary"')}</div>`);break;
          case 'r47-group-create':{const input=$('#r47-group-name');if(!input.value.trim()){input.setCustomValidity(t('rightGroupRequired'));input.reportValidity();break;}right.groups.push({id:'local-group-'+(++right.groupSequence),name:input.value.trim(),archived:false});right.agentMode='groups';right.query='';closeModal();redraw();announce(t('rightGroupCreated'));break;}
          case 'r47-group-archive':case 'r47-group-restore':{const group=right.groups.find(g=>g.id===el.dataset.group);if(group)group.archived=actionName==='r47-group-archive';redraw();announce(t(actionName==='r47-group-archive'?'rightGroupArchived':'rightGroupRestored'));break;}
          case 'r47-session-archive':openModal(t('rightArchiveTitle'),`<p class="tab-intro">${esc(t('rightArchiveText'))}</p><div class="r47-path-options">${right.rows.slice(0,2).map(row=>button('r47-agent-chat',nameOf(row)+' · Chat ↗','rightChat',`data-agent="${esc(row.id)}"`)).join('')}</div>`);break;
          case 'r47-agents-help':openModal(t('rightProfile'),mdBox(state.lang==='ru'?'## Понятная ответственность\n\n- **Библиотекарь** собирает источники и сохраняет смысл решений.\n- **Девопс** связывает готовность с проверкой и следующим шагом.\n- **Группа** объединяет участников задачи.\n- **Chat** открывает отдельный пример разговора и его результат.\n\nФильтры меняют вид таблицы. Флаги и профили меняются только в демонстрации; ни одна кнопка не запускает настоящего агента.':'## Clear responsibilities\n\n- **Librarian** organizes sources and preserves the meaning of decisions.\n- **DevOps** connects readiness to evidence and a next step.\n- **Groups** connect task participants.\n- **Chat** opens a separate example conversation and its result.\n\nFilters change the table view. Flags and profiles change only within the demonstration; no button starts a real agent.'));break;
          default:return false;
        }
        return true;
      }
      function onChange(event) {
        const el=event.target,actionName=el.dataset.demoAction;
        if(actionName==='r47-root'){right.root=el.value;right.dir=el.value;right.status='';right.listScroll=0;redraw('r47-root',false);}
        if(actionName==='r47-sort'){right.sort=el.value;redraw('r47-sort');}
        if(actionName==='r47-agent-filter'){right.filters[el.dataset.filter]=el.checked;redraw();$(`[data-filter="${el.dataset.filter}"]`)?.focus({preventScroll:true});}
        if(actionName==='r47-agent-row-flag'){const row=right.rows.find(r=>r.id===el.dataset.agent);if(row){enforceFlags(row,el.dataset.flag,el.checked);redraw();$(`[data-agent="${el.dataset.agent}"][data-flag="${el.dataset.flag}"]`)?.focus({preventScroll:true});}}
        if(actionName==='r47-profile-flag'){const draft={};for(const key of Object.keys(flagLabel))draft[key]=$('#r47-profile-'+key).checked;enforceFlags(draft,el.dataset.flag,el.checked);for(const key of Object.keys(flagLabel))$('#r47-profile-'+key).checked=draft[key];}
      }
      function onInput(event) {
        const el=event.target;
        if(el.id==='r47-agent-search'){right.query=el.value;$('#r47-agent-results').innerHTML=right.agentMode==='agents'?agentTable():groups();refreshHelp($('#r47-agent-results'));}
        if(el.id.startsWith('r47-')&&typeof el.setCustomValidity==='function')el.setCustomValidity('');
        if(el.id==='doc-editor'){state.edits[`${docLang()}:${state.doc}`]=el.value;const tab=$(`#r47-doc-tabs [data-demo-action="r47-doc-tab"][data-file="${state.doc}"]`);if(tab)tab.textContent=fileName(fileById(state.doc))+(isDirty(state.doc)?' *':'');}
      }
      function onKeydown(event) {
        if(event.isComposing||event.key!=='Enter')return;
        if(event.target.id==='doc-path'){event.preventDefault();openPath();}
        if(event.target.id==='r47-doc-new-name'){event.preventDefault();createDocument();}
        if(event.target.id==='r47-agent-name'){event.preventDefault();createAgent();}
        if(event.target.id==='r47-group-name'){event.preventDefault();action('r47-group-create',event.target);}
      }
      function afterRender() {
        const list=$('#r47-file-list');
        if(list){list.scrollTop=right.listScroll;list.dataset.directory=right.dir;list.dataset.root=right.root;}
        $$('.r47-file-row[data-file]').forEach(row=>{
          const file=fileById(row.dataset.file);if(!file)return;
          row.dataset.path=file.path;
          row.dataset.modified='2026-10-20T15:'+String(30+C.files.indexOf(file)).padStart(2,'0')+':00Z';
          row.dataset.selected=String(right.selected===file.id);
        });
      }
      function reset() {
        for(const id of right.created){const index=C.files.findIndex(f=>f.id===id);if(index!==-1){const [file]=C.files.splice(index,1);for(const lang of ['ru','en']){delete C[lang][id];delete C[lang][file.name];delete state.edits[`${lang}:${id}`];}}}
        right=defaults();
      }
      return {docs,agents,action,afterRender,reset,chooseDoc,onChange,onInput,onKeydown};
    }
  };
})();
