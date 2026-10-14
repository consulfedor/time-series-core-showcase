(function () {
  if (window.OzMarkdownDiagrams) return;

  const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let mermaidLoadPromise = null;
  let mermaidReady = false;
  let mermaidSequence = 0;
  let cloneSequence = 0;
  let activeDialogState = null;

  function ensureMermaid() {
    if (window.mermaid) {
      if (!mermaidReady) {
        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'dark',
          fontFamily: 'Inter, Segoe UI, Ubuntu, sans-serif',
        });
        mermaidReady = true;
      }
      return Promise.resolve(window.mermaid);
    }
    if (mermaidLoadPromise) return mermaidLoadPromise;
    mermaidLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = MERMAID_URL;
      script.async = true;
      script.onload = () => {
        if (!window.mermaid) {
          reject(new Error('Mermaid did not initialize'));
          return;
        }
        mermaidReady = false;
        ensureMermaid().then(resolve, reject);
      };
      script.onerror = () => reject(new Error(`Failed to load mermaid from ${MERMAID_URL}`));
      document.head.appendChild(script);
    });
    return mermaidLoadPromise;
  }

  function svgNaturalSize(svg) {
    const viewBox = svg?.viewBox?.baseVal;
    const width = Number(viewBox?.width)
      || Number.parseFloat(svg?.getAttribute?.('width') || '')
      || Number(svg?.getBoundingClientRect?.().width)
      || 1000;
    const height = Number(viewBox?.height)
      || Number.parseFloat(svg?.getAttribute?.('height') || '')
      || Number(svg?.getBoundingClientRect?.().height)
      || 600;
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }

  function setInlineMode(block, mode) {
    if (!(block instanceof HTMLElement)) return;
    const stage = block.querySelector('.md-mermaid-stage');
    const render = block.querySelector('.md-mermaid-render');
    const svg = render?.querySelector('svg');
    if (!(stage instanceof HTMLElement) || !(render instanceof HTMLElement) || !svg) return;
    const natural = svgNaturalSize(svg);
    const nextMode = mode === 'read' ? 'read' : 'overview';
    stage.dataset.diagramMode = nextMode;
    render.dataset.diagramMode = nextMode;
    svg.style.width = nextMode === 'read'
      ? `${Math.round(natural.width)}px`
      : `min(100%, ${Math.round(natural.width)}px)`;
    svg.style.maxWidth = 'none';
    svg.style.height = 'auto';
    block.querySelectorAll('[data-mermaid-mode]').forEach((button) => {
      const active = button.dataset.mermaidMode === nextMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    render.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  }

  function cloneSvgWithUniqueIds(source) {
    const clone = source.cloneNode(true);
    const prefix = `oz-diagram-${++cloneSequence}-`;
    const nodesWithIds = [clone, ...clone.querySelectorAll('[id]')].filter((node) => node.id);
    const idMap = new Map(nodesWithIds.map((node) => [node.id, `${prefix}${node.id}`]));
    nodesWithIds.forEach((node) => { node.id = idMap.get(node.id); });
    [clone, ...clone.querySelectorAll('*')].forEach((node) => {
      for (const name of node.getAttributeNames()) {
        if (name === 'id') continue;
        let value = node.getAttribute(name) || '';
        idMap.forEach((next, previous) => { value = value.split(`#${previous}`).join(`#${next}`); });
        node.setAttribute(name, value);
      }
      if (node.localName === 'style') {
        let value = node.textContent || '';
        idMap.forEach((next, previous) => { value = value.split(`#${previous}`).join(`#${next}`); });
        node.textContent = value;
      }
    });
    return clone;
  }

  function closeDialog(dialog) {
    if (dialog?.open && typeof dialog.close === 'function') dialog.close();
    else dialog?.removeAttribute('open');
  }

  function applyDialogZoom() {
    if (!activeDialogState) return;
    const { svg, naturalWidth, zoom, scale } = activeDialogState;
    svg.style.width = `${Math.round(naturalWidth * zoom)}px`;
    svg.style.maxWidth = 'none';
    svg.style.height = 'auto';
    scale.textContent = `${Math.round(zoom * 100)}%`;
  }

  function setDialogZoom(nextZoom, view = 'native') {
    if (!activeDialogState) return;
    activeDialogState.zoom = Math.min(3, Math.max(0.05, Number(nextZoom) || 1));
    activeDialogState.canvas.dataset.view = view;
    applyDialogZoom();
  }

  function fitDialogDiagram() {
    if (!activeDialogState) return;
    const { canvas, naturalWidth, naturalHeight } = activeDialogState;
    const style = getComputedStyle(canvas);
    const availableWidth = canvas.clientWidth
      - Number.parseFloat(style.paddingLeft || '0')
      - Number.parseFloat(style.paddingRight || '0');
    const availableHeight = canvas.clientHeight
      - Number.parseFloat(style.paddingTop || '0')
      - Number.parseFloat(style.paddingBottom || '0');
    const fit = Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);
    setDialogZoom(Math.max(0.05, fit), 'fit');
    canvas.scrollTo({
      top: 0,
      left: 0,
      behavior: reducedMotion?.matches ? 'auto' : 'smooth',
    });
  }

  function ensureDialog() {
    let dialog = document.getElementById('ozMarkdownDiagramDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'ozMarkdownDiagramDialog';
    dialog.className = 'md-diagram-dialog';
    dialog.setAttribute('aria-labelledby', 'ozMarkdownDiagramTitle');
    dialog.innerHTML = `
      <div class="md-diagram-dialog-shell">
        <header class="md-diagram-dialog-head">
          <div>
            <span class="md-diagram-dialog-kicker">SCHEME VIEWER</span>
            <strong id="ozMarkdownDiagramTitle">Схема</strong>
          </div>
          <div class="md-diagram-dialog-actions" role="toolbar" aria-label="Масштаб схемы">
            <button type="button" data-diagram-minus aria-label="Уменьшить масштаб">−</button>
            <button type="button" data-diagram-native>100%</button>
            <button type="button" data-diagram-fit>Вписать</button>
            <button type="button" data-diagram-plus aria-label="Увеличить масштаб">+</button>
            <span class="md-diagram-scale" data-diagram-scale aria-live="polite">100%</span>
            <button type="button" class="md-diagram-close" data-diagram-close aria-label="Закрыть полноэкранную схему">×</button>
          </div>
        </header>
        <div class="md-diagram-canvas" data-diagram-canvas tabindex="0" aria-label="Прокручиваемая схема"></div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-diagram-minus]').addEventListener('click', () => {
      if (activeDialogState) setDialogZoom(activeDialogState.zoom - 0.2);
    });
    dialog.querySelector('[data-diagram-plus]').addEventListener('click', () => {
      if (activeDialogState) setDialogZoom(activeDialogState.zoom + 0.2);
    });
    dialog.querySelector('[data-diagram-native]').addEventListener('click', () => setDialogZoom(1));
    dialog.querySelector('[data-diagram-fit]').addEventListener('click', fitDialogDiagram);
    dialog.querySelector('[data-diagram-close]').addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog.addEventListener('keydown', (event) => {
      if (!activeDialogState) return;
      if (event.key === '+' || event.key === '=') setDialogZoom(activeDialogState.zoom + 0.2);
      else if (event.key === '-') setDialogZoom(activeDialogState.zoom - 0.2);
      else if (event.key === '0') setDialogZoom(1);
      else if (event.key.toLowerCase() === 'f') fitDialogDiagram();
      else if (event.key === 'ArrowLeft') activeDialogState.canvas.scrollBy({ left: -80 });
      else if (event.key === 'ArrowRight') activeDialogState.canvas.scrollBy({ left: 80 });
      else if (event.key === 'ArrowUp') activeDialogState.canvas.scrollBy({ top: -80 });
      else if (event.key === 'ArrowDown') activeDialogState.canvas.scrollBy({ top: 80 });
      else return;
      event.preventDefault();
    });
    dialog.addEventListener('close', () => {
      const opener = activeDialogState?.opener;
      dialog.querySelector('[data-diagram-canvas]').replaceChildren();
      activeDialogState = null;
      opener?.focus?.();
    });
    return dialog;
  }

  function openDialog(block, opener) {
    const source = block.querySelector('.md-mermaid-render svg');
    if (!source) return;
    const dialog = ensureDialog();
    const canvas = dialog.querySelector('[data-diagram-canvas]');
    const title = dialog.querySelector('#ozMarkdownDiagramTitle');
    const scale = dialog.querySelector('[data-diagram-scale]');
    const svg = cloneSvgWithUniqueIds(source);
    const natural = svgNaturalSize(source);
    title.textContent = block.dataset.diagramTitle || 'Mermaid-схема';
    canvas.dataset.view = 'native';
    canvas.replaceChildren(svg);
    activeDialogState = {
      canvas,
      naturalWidth: natural.width,
      naturalHeight: natural.height,
      opener,
      scale,
      svg,
      zoom: 1,
    };
    applyDialogZoom();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    requestAnimationFrame(() => canvas.focus({ preventScroll: true }));
  }

  function activateBlockControls(block) {
    if (!(block instanceof HTMLElement) || block.dataset.diagramControlsReady === '1') return;
    const stage = block.querySelector('.md-mermaid-stage');
    if (!(stage instanceof HTMLElement)) return;
    stage.id ||= `oz-mermaid-stage-${++mermaidSequence}`;
    block.querySelectorAll('[data-mermaid-mode], [data-mermaid-open]').forEach((button) => {
      button.disabled = false;
      button.setAttribute('aria-controls', stage.id);
    });
    block.querySelectorAll('[data-mermaid-mode]').forEach((button) => {
      button.addEventListener('click', () => setInlineMode(block, button.dataset.mermaidMode));
    });
    block.querySelector('[data-mermaid-open]')?.addEventListener('click', (event) => {
      openDialog(block, event.currentTarget);
    });
    block.dataset.diagramControlsReady = '1';
    setInlineMode(block, 'overview');
  }

  async function renderNode(node) {
    if (!(node instanceof HTMLElement) || node.dataset.mermaidMounted === '1') return;
    node.dataset.mermaidMounted = '1';
    const render = node.querySelector('.md-mermaid-render');
    const status = node.querySelector('.md-mermaid-status');
    const source = decodeURIComponent(node.dataset.mermaidSource || '');
    if (!(render instanceof HTMLElement) || !source.trim()) {
      node.dataset.mermaidState = 'error';
      if (status) status.textContent = 'Mermaid source is empty.';
      return;
    }
    try {
      const mermaid = await ensureMermaid();
      const result = await mermaid.render(`oz-mermaid-${Date.now()}-${++mermaidSequence}`, source);
      render.innerHTML = result.svg;
      result.bindFunctions?.(render);
      node.dataset.mermaidState = 'ready';
      activateBlockControls(node.closest('.md-mermaid-block'));
    } catch (error) {
      node.dataset.mermaidState = 'error';
      if (status) status.textContent = `Mermaid render failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  function enhance(root) {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    const nodes = [];
    if (scope instanceof HTMLElement && scope.matches('[data-mermaid-source]')) nodes.push(scope);
    nodes.push(...scope.querySelectorAll('[data-mermaid-source]'));
    nodes.forEach((node) => { void renderNode(node); });
  }

  window.OzMarkdownDiagrams = {
    enhance,
    fitDialogDiagram,
    openDialog,
    setInlineMode,
  };
})();
