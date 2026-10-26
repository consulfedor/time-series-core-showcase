/* MyTwoBrain HOME materialization · private reviewer.
   All interaction stays local: no requests, no tracking, no mutation of published pages. */
(() => {
  "use strict";
  const lang = document.documentElement.lang === "en" ? "en" : "ru";
  const sitePrefix = location.pathname.startsWith("/time-series-core-showcase/")
    ? "/time-series-core-showcase" : "";
  const context = document.querySelector(".meaning-context");
  const contextButton = context?.querySelector(".context-explain-trigger");
  if (context && contextButton) {
    const setOpen = open => {
      context.classList.toggle("is-open", open);
      contextButton.setAttribute("aria-expanded", String(open));
    };
    contextButton.addEventListener("click", () => {
      setOpen(contextButton.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("pointerdown", event => {
      if (!context.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && contextButton.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        contextButton.focus();
      }
    });
  }
  const graph = document.getElementById("graph");
  const info = {
    human: {
      ru: ["Человек определяет желаемое", "Намерение формирует направление цели, воображение — образ желаемого целого. Потребности, ценности и ограничения задают основания выбора. Человек сохраняет право изменить цель и принять результат.", "Намерение → направление · воображение → образ", "/mytwobrain/workspace.html"],
      en: ["The human defines what is desired", "Intention shapes the direction of the goal; imagination forms the desired whole. Needs, values and constraints ground the choice. The person retains authority over changing the goal and accepting the result.", "Intention → direction · imagination → image", "/en/mytwobrain/workspace.html"]
    },
    agent: {
      ru: ["Агент дополняет недостающую картину", "Агент помогает находить релевантные знания, варианты и существенные противоречия, оценивать осуществимость и выбирать проверку. Аргументированное несогласие полезнее механического одобрения.", "Роль агента · знания и критика", "/mytwobrain/#system-interaction"],
      en: ["The agent fills relevant gaps", "The agent brings relevant knowledge, alternatives and essential contradictions, helps assess feasibility and select tests. Reasoned disagreement is more valuable than automatic agreement.", "Agent role · knowledge and critique", "/en/mytwobrain/#system-interaction"]
    },
    goal: {
      ru: ["Цель формируется совместно", "Намерение формирует направление цели, воображение — образ желаемого целого. Человек и агент совместно уточняют образ до согласованной версии Gᵥ, а концепция обосновывает путь воплощения. Требования и критерии приёмки сохраняют её смысл.", "Формируемая цель · концептуальная модель", "/mytwobrain/"],
      en: ["A goal is formed together", "Intention gives the goal its direction; imagination forms the desired whole. The person and agent jointly refine the image into an agreed goal version Gᵥ, while the concept grounds the path to realization. Requirements and acceptance criteria preserve its meaning.", "Forming goal · conceptual model", "/en/mytwobrain/"]
    },
    plan: {
      ru: ["Концепция обосновывает путь воплощения", "Требования выражают, каким должно быть желаемое. Концепция объясняет осуществимость пути, а план задаёт зависимости, гипотезы, исполнителей и ближайший проверяемый шаг. Изменение существенных критериев требует новой согласованной версии цели.", "Концепция → план → следующий проверяемый шаг", "/mytwobrain/#systems"],
      en: ["The concept grounds the path to realization", "Requirements define what the outcome must satisfy. The concept explains why the path is feasible; the plan then specifies dependencies, hypotheses, owners and the next verifiable step. Material changes to acceptance criteria require a new goal version.", "Concept → plan → next verifiable step", "/en/mytwobrain/#systems"]
    },
    build: {
      ru: ["Материализация даёт предметный результат", "Агент использует системы и инструменты, чтобы создать документ, код, модель или работающий сервис. Важно не только выполнить команду, но и предъявить полученное: что создано, где это открыть и как проверить соответствие требованиям.", "Действие → доступный результат → проверка", "/mytwobrain/#systems"],
      en: ["Materialization produces something tangible", "The agent uses systems and tools to produce a document, code, a model or a working service. Executing a command is not the finish: show what was created, where to open it and how to check it against the requirements.", "Action → accessible result → verification", "/en/mytwobrain/#systems"]
    },
    proof: {
      ru: ["Общая точка наблюдателя · UI и API", "Агент сообщает: «Создал ревизию — откройте её в реестре». Человек видит эту же сущность, её данные, состояние и доступные действия в UI; агент проверяет тот же идентификатор и факты через API. Создать, наблюдать, использовать, архивировать и удалить — понятный жизненный цикл. Ясно, что уже подтверждено, что ещё требует проверки и какое решение принимает человек.", "Одна сущность · общий путь проверки · решение", "/mytwobrain/workspace.html"],
      en: ["Shared observation point · UI and API", "The agent reports: ‘I created the revision — open it in the registry.’ The person sees that same entity, its data, state and available actions in the UI; the agent checks the same identity and facts through the API. Create, inspect, use, archive and delete form an understandable lifecycle. Both know what was verified, what remains open and where a human decision is needed.", "One entity · shared verification path · decision", "/en/mytwobrain/workspace.html"]
    },
    result: {
      ru: ["Принять, продолжить или изменить путь", "Осознанное решение человека сопоставляет результат с целью и требованиями. Полученный Useful оценивается относительно ожидаемого эффекта, времени, качества и полной цены. Подтверждение пользы отдельно от самого эффекта. Опыт возвращается в память и обе рекурсивные петли.", "Принятие · Useful · опыт · следующий шаг", "/mytwobrain/#useful"],
      en: ["Accept, continue or change direction", "A reasoned human decision compares the result with the goal and requirements. Useful is assessed against expected benefit, time, quality and total cost. Evidence for an effect is separate from the effect itself. Experience feeds memory and both recursive loops.", "Acceptance · Useful · experience · next step", "/en/mytwobrain/#useful"]
    }
  };
  if (graph) {
    const buttons = Array.from(graph.querySelectorAll(".node[data-node]"));
    const canvas = graph.querySelector(".process-canvas");
    const edges = Array.from(graph.querySelectorAll(".wire[data-edge]"));
    const stages = Array.from(graph.querySelectorAll(".timeline-stages [data-stage]"));
    const stageButtons = Array.from(graph.querySelectorAll("[data-stage-target]"));
    const timelineStatus = graph.querySelector("[data-timeline-status]");
    const title = graph.querySelector("[data-readout-title]");
    const body = graph.querySelector("[data-readout-body]");
    const status = graph.querySelector("[data-readout-status]");
    const link = graph.querySelector("[data-readout-link]");
    const readout = graph.querySelector(".graph-readout");
    const tour = graph.querySelector("[data-graph-tour]");
    const tourLabel = tour?.querySelector("[data-tour-label]");
    const tourSymbol = tour?.querySelector(".tour-symbol");
    const order = ["human", "agent", "goal", "plan", "build", "proof", "result"];
    const stageOrder = ["goal", "plan", "build", "proof", "result"];
    // Read actual card rectangles. Arrows terminate at card borders rather
    // than at hardcoded SVG points that drift as the layout changes.
    const graphSvg = graph.querySelector(".process-wires");
    const nodeLookup = Object.fromEntries(buttons.map(b => [b.dataset.node, b]));
    const edgeLookup = Object.fromEntries(edges.map(p => [p.dataset.edge, p]));
    const positionEdges = () => {
      if (!graphSvg || graphSvg.getBoundingClientRect().width < 100) return;
      const r = graphSvg.getBoundingClientRect();
      const point = (id, side, position = .5) => {
        const v = nodeLookup[id].getBoundingClientRect();
        const x = side === "left" ? v.left : side === "right" ? v.right : v.left + v.width * position;
        const y = side === "top" ? v.top : side === "bottom" ? v.bottom : v.top + v.height * position;
        return {x: (x-r.left)/r.width*1160, y: (y-r.top)/r.height*570};
      };
      const route = (name, from, to, axis = "horizontal") => {
        const a = point(...from), b = point(...to);
        const d = axis === "vertical" ?
          Math.max(18, Math.abs(b.y-a.y)*.48) * Math.sign(b.y-a.y || 1) :
          Math.max(19, Math.abs(b.x-a.x)*.44) * Math.sign(b.x-a.x || 1);
        const c = axis === "vertical" ?
          "M"+a.x+","+a.y+" C"+a.x+","+(a.y+d)+" "+b.x+","+(b.y-d)+" "+b.x+","+b.y :
          "M"+a.x+","+a.y+" C"+(a.x+d)+","+a.y+" "+(b.x-d)+","+b.y+" "+b.x+","+b.y;
        edgeLookup[name]?.setAttribute("d",c);
      };
      route("human-goal",["human","right",.52],["goal","left",.34]);
      route("agent-goal",["agent","right",.5],["goal","left",.72]);
      route("goal-plan",["goal","right",.49],["plan","left",.5]);
      route("plan-build",["plan","bottom",.5],["build","top",.5],"vertical");
      route("build-proof",["build","bottom",.54],["proof","top",.78],"vertical");
      route("proof-result",["proof","left",.54],["result","right",.54]);
      route("result-agent",["result","left",.3],["agent","bottom",.53]);
      route("result-goal",["result","top",.58],["goal","bottom",.53],"vertical");
    };
    let edgeFrame = 0;
    const relayoutEdges = () => {
      if (edgeFrame) cancelAnimationFrame(edgeFrame);
      edgeFrame = requestAnimationFrame(() => { edgeFrame = 0; positionEdges(); });
    };
    window.addEventListener("resize",relayoutEdges,{passive:true});
    const stageNames = lang === "ru"
      ? ["Цель", "План", "Воплощение", "Проверка", "Принятие"]
      : ["Goal", "Plan", "Materialization", "Verification", "Acceptance"];
    const connectionMap = {
      human: ["human-goal"],
      agent: ["agent-goal"],
      goal: ["human-goal", "agent-goal", "goal-plan"],
      plan: ["goal-plan", "plan-build"],
      build: ["plan-build", "build-proof"],
      proof: ["build-proof", "proof-result"],
      result: ["proof-result", "result-agent", "result-goal"]
    };
    const relatedNodes = {
      human: ["goal"], agent: ["goal"], goal: ["human", "agent", "plan"],
      plan: ["goal", "build"], build: ["plan", "proof"],
      proof: ["build", "result"], result: ["proof", "human", "agent"]
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let tourTimer = null;
    const stopTour = () => {
      if (tourTimer !== null) window.clearInterval(tourTimer);
      tourTimer = null;
      if (tour) tour.setAttribute("aria-pressed", "false");
      if (tourLabel) tourLabel.textContent = lang === "ru" ? "Проследить путь" : "Follow the journey";
      if (tourSymbol) tourSymbol.textContent = "▶";
      if (readout) readout.setAttribute("aria-live", "polite");
    };
    const setSelected = (id, focusPanel = false) => {
      const item = info[id]?.[lang];
      if (!item) return;
      buttons.forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.node === id));
        button.classList.toggle("is-related", (relatedNodes[id] || []).includes(button.dataset.node));
      });
      canvas.classList.add("has-selection");
      canvas.dataset.loopActive = ["human", "agent", "goal", "result"].includes(id) ? "reflection" : "materialization";
      edges.forEach(path => path.classList.toggle("is-active", connectionMap[id].includes(path.dataset.edge)));
      graph.dataset.selected = id;
      const stageId = ["human", "agent"].includes(id) ? "goal" : id;
      const stageIndex = stageOrder.indexOf(stageId);
      stages.forEach((stage, index) => {
        stage.querySelector("[data-stage-target]")?.setAttribute("aria-pressed", String(index === stageIndex));
        stage.classList.toggle("is-current", index === stageIndex);
        stage.classList.toggle("is-complete", index < stageIndex);
        if (index === stageIndex) stage.setAttribute("aria-current", "step");
        else stage.removeAttribute("aria-current");
      });
      if (timelineStatus) timelineStatus.textContent =
        String(stageIndex + 1).padStart(2, "0") + " · " + stageNames[stageIndex];
      title.textContent = item[0];
      body.textContent = item[1];
      status.textContent = item[2];
      link.href = sitePrefix + item[3];
      link.textContent = lang === "ru" ? "Открыть основание ↗" : "Explore the source ↗";
      if (!reduceMotion.matches) {
        readout.classList.remove("is-updating");
        void readout.offsetWidth;
        readout.classList.add("is-updating");
      }
      if (focusPanel) readout?.focus({preventScroll:true});
    };
    buttons.forEach(button => {
      button.addEventListener("click", () => {
        stopTour();
        setSelected(button.dataset.node, true);
      });
      button.addEventListener("keydown", event => {
        const current = order.indexOf(button.dataset.node);
        const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        const target = event.key === "Home" ? 0 :
          event.key === "End" ? order.length - 1 :
          delta ? (current + delta + order.length) % order.length : null;
        if (target === null) return;
        event.preventDefault();
        stopTour();
        setSelected(order[target]);
        buttons.find(b => b.dataset.node === order[target])?.focus({preventScroll:true});
      });
    });
    stageButtons.forEach(button => button.addEventListener("click", () => {
      stopTour();
      // The visitor is reading the lower panel: keep focus and scroll here.
      setSelected(button.dataset.stageTarget, false);
    }));
    if (tour) tour.addEventListener("click", () => {
      if (tourTimer !== null) { stopTour(); return; }
      if (reduceMotion.matches) {
        const current = order.indexOf(graph.dataset.selected);
        setSelected(order[(current + 1) % order.length]);
        return;
      }
      let index = 0;
      tour.setAttribute("aria-pressed", "true");
      if (tourLabel) tourLabel.textContent = lang === "ru" ? "Остановить" : "Pause journey";
      if (tourSymbol) tourSymbol.textContent = "Ⅱ";
      readout?.setAttribute("aria-live", "off");
      setSelected(order[index++]);
      tourTimer = window.setInterval(() => {
        if (index >= order.length) { stopTour(); return; }
        setSelected(order[index++]);
      }, 1850);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopTour();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && tourTimer !== null) {
        stopTour();
        tour?.focus({preventScroll:true});
      }
    });
    setSelected("goal", false);
    relayoutEdges();
  }
  // The existing charts are measured source fragments, not fabricated points.
  const explorer = document.querySelector("[data-signal-explorer]");
  if (explorer) {
    const tabs = Array.from(explorer.querySelectorAll("[data-signal-tab]"));
    const panels = Array.from(explorer.querySelectorAll("[data-signal-view]"));
    const selectSignal = key => {
      tabs.forEach(tab => {
        const active = tab.dataset.signalTab === key;
        tab.setAttribute("aria-pressed", String(active));
        tab.classList.toggle("selected", active);
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.signalView !== key; });
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectSignal(tab.dataset.signalTab));
      tab.addEventListener("keydown", event => {
        const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!direction) return;
        event.preventDefault();
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        selectSignal(next.dataset.signalTab);
        next.focus({preventScroll:true});
      });
    });
    selectSignal("pulse");
  }
  const current = new URL(location.href);
  document.querySelectorAll("[data-lang-link]").forEach(anchor => {
    const locale = anchor.dataset.langLink;
    if (locale === lang) anchor.setAttribute("aria-current","page");
    else anchor.removeAttribute("aria-current");
    // Native links work without JavaScript; this only preserves the current
    // review mode, fragment and (when present) the selected graph context.
    anchor.addEventListener("click", () => {
      const target = new URL(anchor.href);
      const review = current.searchParams.get("review");
      if (review && ["baseline", "changes", "candidate"].includes(review)) {
        target.searchParams.set("review",review);
      }
      target.hash = location.hash;
      anchor.href = target.pathname + target.search + target.hash;
    });
  });
  if (current.searchParams.get("review") === "changes") {
    document.body.classList.add("review-changes");
    const toolbar = document.createElement("aside");
    toolbar.className = "editorial-diff";
    toolbar.setAttribute("aria-label",lang === "en" ? "What changed" : "Что изменилось");
    const title = document.createElement("strong");
    title.textContent = lang === "en" ? "Revision · what changed" : "Редакция · что изменилось";
    const text = document.createElement("p");
    text.textContent = lang === "en"
      ? "The accepted edition remains available as history. The new Home follows one Symbiotic Self process, selects what is relevant and then best suited to the goal, and links to Semantic islands in the existing memory system. It also shows a grounded workspace example and evidence-led work."
      : "Прежняя редакция доступна в истории. Новая Главная показывает единый процесс Симбиотического Я, выбор из доступного релевантного и лучшего для цели, Семантические острова внутри существующей системы памяти, рабочий пример и результаты с основаниями.";
    const a = document.createElement("a");
    a.href = (lang === "en" ? "/en/" : "/") + "?review=baseline";
    a.textContent = lang === "en" ? "Historical baseline ↗" : "Историческая основа ↗";
    toolbar.append(title,text,a);
    document.body.append(toolbar);
  }
})();
