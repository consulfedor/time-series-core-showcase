(function () {
  if (window.OzMarkdown) return;

  let observerStarted = false;
  let chartsLoadPromise = null;
  let activeDragScroller = null;
  let activeDragStartX = 0;
  let activeDragScrollLeft = 0;
  let tableFitResizeObserver = null;
  let tableMeasureCanvas = null;
  const tableFitRefreshPending = new WeakSet();
  const tableFitRefreshQueue = [];
  let tableFitRefreshFramePending = false;
  const TABLE_COLUMN_MIN_PX = 52;
  const TABLE_COLUMN_MAX_PX = 640;
  const TABLE_COLLAPSED_BORDER_ALLOWANCE_PX = 1;
  const DOC_VIEW_LOCAL_EXT_RE = /\.(?:md|mdc|txt|text|log|json|jsonl|ya?ml|toml|ini|cfg|conf|env|py|sh|bash|zsh|js|cjs|mjs|ts|tsx|jsx|css|html|sql|service|socket|timer|path|mount|target|slice|xml|csv|tsv|pdf|docx)$/i;
  const DOC_VIEW_LOCAL_PREFIXES = [
    '/home/',
    '/root/',
    '/etc/',
    '/var/',
    '/usr/',
    '/opt/',
    '/tmp/',
    '/workspace/',
    'projects/',
    'config/',
    'tools/',
    'scripts/',
    'deploy/',
    '.agents/',
    '.codex/',
    '.claude/',
    '.cursor/',
    '_MyTwoBrain/',
  ];

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function applySimpleFormatting(escapedText) {
    let result = String(escapedText ?? '');
    result = result.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    result = result.replace(/(?<![*\w])\*([^*]+)\*(?![*\w])/g, '<i>$1</i>');
    return result;
  }

  function sanitizeHref(href) {
    const clean = String(href ?? '').trim().replace(/^<|>$/g, '');
    if (!clean) return '';
    if (/^(javascript|data):/i.test(clean)) return '';
    return clean;
  }

  function decodePercentEncodedLocalPathOnce(pathPart) {
    const path = String(pathPart || '').trim();
    if (!/%[0-9a-f]{2}/i.test(path)) return path;
    try {
      return decodeURIComponent(path);
    } catch (_) {
      return path;
    }
  }

  function splitLineRef(pathPart, hashPart = '') {
    let path = String(pathPart || '').trim();
    let line = '';
    let column = '';

    const hash = String(hashPart || '').trim();
    const hashMatch = hash.match(/^#L(\d+)(?:C(\d+))?$/i) || hash.match(/^#(\d+)(?::(\d+))?$/);
    if (hashMatch) {
      line = String(hashMatch[1] || '').trim();
      column = String(hashMatch[2] || '').trim();
    }

    const colonMatch = path.match(/^(.*?):(\d+)(?::(\d+))?$/);
    if (colonMatch && !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(path)) {
      path = String(colonMatch[1] || '').trim();
      if (!line) line = String(colonMatch[2] || '').trim();
      if (!column) column = String(colonMatch[3] || '').trim();
    }

    return { path, line, column };
  }

  function isPortalInternalHref(pathPart) {
    const path = String(pathPart || '').trim();
    if (!path) return false;
    return path.startsWith('/doc_view.html')
      || path.startsWith('/session_view.html')
      || path.startsWith('/api/')
      || path.startsWith('/vendor/')
      || path === '/styles.css'
      || path === '/oz_markdown.css'
      || path === '/oz_markdown_diagrams.js'
      || path === '/favicon.svg';
  }

  function isLikelyLocalDocPath(pathPart) {
    const path = String(pathPart || '').trim();
    if (!path) return false;
    if (path.startsWith('//')) return false;
    if (isPortalInternalHref(path)) return false;
    if (DOC_VIEW_LOCAL_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
    if (DOC_VIEW_LOCAL_EXT_RE.test(path)) return true;
    return false;
  }

  function normalizeRenderedHref(href) {
    const clean = sanitizeHref(href);
    if (!clean) return { href: '', external: false, localDoc: false };
    if (/^(https?:|mailto:|tel:)/i.test(clean)) return { href: clean, external: true, localDoc: false };
    if (clean.startsWith('#')) return { href: clean, external: false, localDoc: false };

    let raw = clean;
    if (/^file:/i.test(raw)) {
      try {
        raw = decodeURIComponent(new URL(raw).pathname || '').trim();
      } catch (_) {
        return { href: clean, external: true, localDoc: false };
      }
    }

    const hashIndex = raw.indexOf('#');
    const basePart = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
    const hashPart = hashIndex >= 0 ? raw.slice(hashIndex) : '';
    const queryIndex = basePart.indexOf('?');
    const pathPart = queryIndex >= 0 ? basePart.slice(0, queryIndex) : basePart;

    if (!isLikelyLocalDocPath(pathPart)) {
      return { href: clean, external: false, localDoc: false };
    }

    const parsed = splitLineRef(pathPart, hashPart);
    const normalizedPath = decodePercentEncodedLocalPathOnce(parsed.path);
    if (!normalizedPath) {
      return { href: clean, external: false, localDoc: false };
    }

    const params = new URLSearchParams({ path: normalizedPath });
    if (parsed.line) params.set('line', parsed.line);
    if (parsed.column) params.set('column', parsed.column);
    return {
      href: `/doc_view.html?${params.toString()}`,
      external: true,
      localDoc: true,
    };
  }

  function inlineImageExtension(href) {
    const clean = sanitizeHref(href);
    if (!clean) return '';
    const tryNames = [];
    try {
      const parsed = new URL(clean, window.location.origin);
      if (parsed.searchParams) {
        tryNames.push(parsed.searchParams.get('name') || '');
        tryNames.push(parsed.searchParams.get('file') || '');
      }
      tryNames.push(parsed.pathname || '');
    } catch (error) {
      tryNames.push(clean);
    }
    for (const candidate of tryNames) {
      const match = String(candidate || '').toLowerCase().match(/\.([a-z0-9]+)(?:$|[?#])/i);
      if (match) return match[1];
    }
    return '';
  }

  function inlineImageDisplayName(href) {
    const clean = sanitizeHref(href);
    if (!clean) return '';
    const tryNames = [];
    try {
      const parsed = new URL(clean, window.location.origin);
      if (parsed.searchParams) {
        tryNames.push(parsed.searchParams.get('name') || '');
        tryNames.push(parsed.searchParams.get('file') || '');
      }
      const pathTail = String(parsed.pathname || '').split('/').filter(Boolean).pop() || '';
      tryNames.push(pathTail);
    } catch (error) {
      tryNames.push(clean);
    }
    for (const candidate of tryNames) {
      const name = String(candidate || '').trim();
      if (name) return name;
    }
    return '';
  }

  function isInlineSafeImageHref(href) {
    const ext = inlineImageExtension(href);
    return ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || ext === 'avif' || ext === 'gif';
  }

  function shouldRenderBareLinkAsInlineImage(label, href) {
    if (!isInlineSafeImageHref(href)) return false;
    const rawLabel = String(label || '').trim();
    if (!rawLabel) return false;
    const normalizedLabel = rawLabel.toLowerCase();
    const imageName = inlineImageDisplayName(href).trim().toLowerCase();
    if (imageName && normalizedLabel === imageName) return true;
    return /^(?:image|img|screenshot|screen|photo|picture)(?:\s*[#:.-]?\s*\d+)?$/i.test(rawLabel);
  }

  function renderInlinePlainText(text) {
    const parts = String(text ?? '').split('`');
    return parts.map((part, idx) => {
      if (idx % 2 === 1) return `<code class="inline">${escapeHtml(part)}</code>`;
      const escaped = escapeHtml(part).replace(/&lt;br\s*\/?&gt;/gi, '<br>');
      return applySimpleFormatting(escaped);
    }).join('');
  }

  function renderInlineSpan(text) {
    const source = String(text ?? '');
    const linkRe = /!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+"([^"]*)")?\s*\)|\[([^\]]+)\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+"([^"]*)")?\s*\)/g;
    let out = '';
    let lastIdx = 0;
    let match;

    while ((match = linkRe.exec(source)) !== null) {
      out += renderInlinePlainText(source.slice(lastIdx, match.index));
      const isImage = typeof match[1] === 'string';
      const label = String((isImage ? match[1] : match[5]) ?? '');
      const rawHref = sanitizeHref(isImage ? (match[2] || match[3]) : (match[6] || match[7]));
      const normalizedHref = normalizeRenderedHref(rawHref);
      const href = normalizedHref.href;
      if (!href) {
        out += renderInlinePlainText(match[0]);
      } else if (isImage) {
        if (!isInlineSafeImageHref(href)) {
          const fallbackLabel = label || rawHref.split('/').pop() || href.split('/').pop() || 'image';
          const external = normalizedHref.external || /^(https?:|mailto:|tel:)/i.test(href);
          const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
          out += `<a class="md-link" href="${escapeHtml(href)}"${attrs}>${renderInlinePlainText(fallbackLabel)}</a>`;
        } else {
          const alt = escapeHtml(label || 'image');
          out += `<a class="md-image-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><img class="md-image" src="${escapeHtml(href)}" alt="${alt}" loading="lazy" decoding="async" /></a>`;
        }
      } else {
        const external = normalizedHref.external || /^(https?:|mailto:|tel:)/i.test(href);
        const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        if (shouldRenderBareLinkAsInlineImage(label, href)) {
          const alt = escapeHtml(label || 'image');
          out += `<a class="md-image-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><img class="md-image" src="${escapeHtml(href)}" alt="${alt}" loading="lazy" decoding="async" /></a>`;
        } else {
          out += `<a class="md-link" href="${escapeHtml(href)}"${attrs}>${renderInlinePlainText(label)}</a>`;
        }
      }
      lastIdx = match.index + match[0].length;
    }

    out += renderInlinePlainText(source.slice(lastIdx));
    return out;
  }

  function sourceLineAttr(lineNo, extraAttrs = '') {
    const line = Math.trunc(Number(lineNo));
    if (!Number.isFinite(line) || line < 1) return extraAttrs || '';
    return ` data-md-line="${line}"${extraAttrs || ''}`;
  }

  function renderInlineCode(line, sourceLine = 0) {
    let result = renderInlineSpan(line);
    const lineAttr = sourceLineAttr(sourceLine);
    const headingMatch = String(line).match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      return `<span class="md-h${level}"${lineAttr}>${result.replace(/^#{1,4}\s+/, '')}</span>`;
    }
    const numberedMatch = String(line).match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      const indent = numberedMatch[1].length;
      const pad = indent > 0 ? `padding-left:${indent * 6}px;` : '';
      return `<span class="md-li"${lineAttr}${pad ? ` style="${pad}"` : ''}><b>${escapeHtml(numberedMatch[2])}.</b> ${renderInlineSpan(numberedMatch[3])}</span>`;
    }
    const trimmed = String(line).trimStart();
    if (trimmed.startsWith('- ') || trimmed === '-') {
      const indent = line.length - line.trimStart().length;
      const pad = indent > 0 ? `padding-left:${indent * 6}px;` : '';
      return `<span class="md-li"${lineAttr}${pad ? ` style="${pad}"` : ''}>${result.replace(/^(\s*)- /, '$1')}</span>`;
    }
    return `<span class="md-src-line"${lineAttr}>${result}</span>`;
  }

  function splitTableRow(row) {
    let s = String(row || '').trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);

    const cells = [];
    let current = '';
    let inInlineCode = false;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const next = s[i + 1];

      if (ch === '\\' && next === '|') {
        current += '|';
        i += 1;
        continue;
      }

      if (ch === '`') {
        inInlineCode = !inInlineCode;
        current += ch;
        continue;
      }

      if (ch === '|' && !inInlineCode) {
        cells.push(current.trim());
        current = '';
        continue;
      }

      current += ch;
    }

    cells.push(current.trim());
    return cells;
  }

  function isTableSepLine(row) {
    const cells = splitTableRow(row);
    if (!cells.length) return false;
    return cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s+/g, '')));
  }

  function tableAlignments(sepRow, n) {
    const cells = splitTableRow(sepRow);
    const out = [];
    for (let i = 0; i < n; i++) {
      const raw = String(cells[i] || '').replace(/\s+/g, '');
      const left = raw.startsWith(':');
      const right = raw.endsWith(':');
      out.push(left && right ? 'center' : right ? 'right' : 'left');
    }
    return out;
  }

  function isTableHeaderLine(row) {
    const s = String(row || '').trim();
    return Boolean(s && s.includes('|') && splitTableRow(s).length >= 2);
  }

  function isTableBodyLine(row) {
    const s = String(row || '').trim();
    return Boolean(s && s.includes('|') && splitTableRow(s).length >= 2);
  }

  function renderTableBlock(headerRow, sepRow, bodyRows, sourceLine = 0) {
    const headers = splitTableRow(headerRow);
    const aligns = tableAlignments(sepRow, headers.length);
    let out = `<div class="md-table-wrap"${sourceLineAttr(sourceLine)}><table class="md-table"><thead><tr${sourceLineAttr(sourceLine)}>`;
    for (let i = 0; i < headers.length; i++) {
      const align = aligns[i] || 'left';
      const style = align !== 'left' ? ` style="text-align:${align}"` : '';
      out += `<th${style}>${renderInlineSpan(headers[i] || '')}</th>`;
    }
    out += '</tr></thead><tbody>';
    for (let rowIndex = 0; rowIndex < bodyRows.length; rowIndex++) {
      const row = bodyRows[rowIndex];
      const cells = splitTableRow(row);
      out += `<tr${sourceLineAttr(Number(sourceLine || 0) + 2 + rowIndex)}>`;
      for (let i = 0; i < headers.length; i++) {
        const align = aligns[i] || 'left';
        const style = align !== 'left' ? ` style="text-align:${align}"` : '';
        out += `<td${style}>${renderInlineSpan(cells[i] || '')}</td>`;
      }
      out += '</tr>';
    }
    out += '</tbody></table></div>';
    return out;
  }

  function renderCodeFence(code, lang, sourceLine = 0) {
    const langLabel = lang || 'code';
    const codeStartLine = Number(sourceLine || 0) > 0 ? Number(sourceLine || 0) + 1 : 0;
    const codeLineCount = String(code || '').split('\n').length;
    const codeLineAttrs = sourceLineAttr(
      codeStartLine,
      codeStartLine > 0 ? ` data-md-code-start-line="${codeStartLine}" data-md-code-line-count="${codeLineCount}"` : '',
    );
    const prose = /^(text|txt|plain|plaintext)$/i.test(String(lang || '').trim());
    return `<div class="code-fence${prose ? ' code-fence-prose' : ''}"${sourceLineAttr(sourceLine)}>` +
      `<div class="code-lang">` +
      `<span class="code-lang-label">${escapeHtml(langLabel)}</span>` +
      `<button type="button" class="code-copy" data-code-copy title="Копировать блок целиком">📋 Copy</button>` +
      `</div>` +
      `<pre${codeLineAttrs}><code>${escapeHtml(code)}</code></pre>` +
      `</div>`;
  }

  function tableFitMaxOverflowRatio(columnCount) {
    const columns = Math.max(0, Number(columnCount || 0));
    // Short narrative tables read better with wrapped cells than a wide viewport.
    if (columns <= 3) return 2;
    if (columns === 4) return 2.1;
    if (columns === 5) return 1.08;
    return 1;
  }

  function classifyAdaptiveTableMode(naturalWidth, availableWidth, columnCount) {
    const natural = Math.max(0, Number(naturalWidth || 0));
    const available = Math.max(0, Number(availableWidth || 0));
    if (available <= 0 || natural <= available + 1) return 'compact';
    const overflowRatio = natural / available;
    return overflowRatio <= tableFitMaxOverflowRatio(columnCount) + 0.001 ? 'fit' : 'scroll';
  }

  function clampNumber(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value || 0)));
  }

  function percentile(values, ratio) {
    const sorted = values
      .map((value) => Math.max(0, Number(value || 0)))
      .filter(Number.isFinite)
      .sort((left, right) => left - right);
    if (!sorted.length) return 0;
    const position = clampNumber(ratio, 0, 1) * (sorted.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  }

  function measureTableText(text, font) {
    const value = String(text || '').trim();
    if (!value) return 0;
    if (!tableMeasureCanvas && document?.createElement) {
      tableMeasureCanvas = document.createElement('canvas');
    }
    const context = tableMeasureCanvas?.getContext?.('2d');
    if (!context) return value.length * 7.2;
    context.font = font || '13px sans-serif';
    return context.measureText(value).width;
  }

  function tableCellLogicalLines(cell) {
    const lines = [''];
    const visit = (node) => {
      if (!node) return;
      if (node.nodeType === 3) {
        lines[lines.length - 1] += String(node.nodeValue || '');
        return;
      }
      if (String(node.nodeName || '').toUpperCase() === 'BR') {
        lines.push('');
        return;
      }
      Array.from(node.childNodes || []).forEach(visit);
    };
    visit(cell);
    return lines.map((line) => line.replace(/\s+/g, ' ').trim());
  }

  function flowDenseTableCodeLists(table) {
    table.querySelectorAll('th, td').forEach((cell) => {
      if (cell.dataset.ozTableCodeFlow === '1') return;
      const elements = Array.from(cell.children || []);
      const codeCount = elements.filter(
        (element) => element.matches?.('code.inline'),
      ).length;
      const breaks = elements.filter((element) => element.tagName === 'BR');
      const hasOnlyCodeAndBreaks = elements.every(
        (element) => element.matches?.('code.inline') || element.tagName === 'BR',
      );
      const hasOnlyWhitespaceText = Array.from(cell.childNodes || []).every(
        (node) => node.nodeType !== 3 || !String(node.nodeValue || '').trim(),
      );
      if (codeCount < 2 || !breaks.length || !hasOnlyCodeAndBreaks || !hasOnlyWhitespaceText) return;
      breaks.forEach((lineBreak) => lineBreak.replaceWith(document.createTextNode(' ')));
      cell.dataset.ozTableCodeFlow = '1';
    });
  }

  function addTableCodeSoftBreaks(table) {
    table.querySelectorAll('code.inline').forEach((code) => {
      if (code.dataset.ozTableSoftBreaks === '1') return;
      code.dataset.ozTableSoftBreaks = '1';
      const escaped = escapeHtml(code.textContent || '');
      code.innerHTML = escaped.replace(/([._/:=-])/g, '$1<wbr>');
    });
  }

  function collectAdaptiveColumnMetrics(table) {
    const rows = Array.from(table.rows || []);
    const columnCount = Number(table.tHead?.rows?.[0]?.cells?.length || rows[0]?.cells?.length || 0);
    const columns = Array.from({ length: columnCount }, () => ({
      widths: [],
      tokenWidths: [],
      cellProfiles: [],
      populated: 0,
      headerWidth: 0,
    }));

    rows.forEach((row, rowIndex) => {
      Array.from(row.cells || []).slice(0, columnCount).forEach((cell, columnIndex) => {
        const style = typeof getComputedStyle === 'function' ? getComputedStyle(cell) : null;
        const font = style?.font || `${style?.fontWeight || '400'} ${style?.fontSize || '13px'} ${style?.fontFamily || 'sans-serif'}`;
        const horizontalInset = Math.max(
          16,
          Number.parseFloat(style?.paddingLeft || '0')
            + Number.parseFloat(style?.paddingRight || '0')
            + Number.parseFloat(style?.borderLeftWidth || '0')
            + Number.parseFloat(style?.borderRightWidth || '0'),
        );
        const lines = tableCellLogicalLines(cell);
        const contentLines = lines.filter(Boolean);
        const lineWidths = contentLines.map((line) => measureTableText(line, font));
        const lineWidth = Math.max(0, ...lineWidths);
        const tokens = contentLines.flatMap((line) => line.split(/[\s/\\|,;:()[\]{}<>+=\u00d7-]+/u).filter(Boolean));
        const tokenWidth = Math.max(0, ...tokens.map((token) => measureTableText(token, font)));
        const width = lineWidth + horizontalInset;
        const metric = columns[columnIndex];
        metric.widths.push(width);
        metric.tokenWidths.push(tokenWidth + horizontalInset);
        metric.cellProfiles.push({ lineWidths, horizontalInset });
        if (contentLines.length) metric.populated += 1;
        if (rowIndex === 0) metric.headerWidth = width;
      });
    });

    return columns.map((column) => {
      const widths = column.widths.length ? column.widths : [TABLE_COLUMN_MIN_PX];
      const averageWidth = widths.reduce((sum, width) => sum + width, 0) / widths.length;
      const p75Width = percentile(widths, 0.75);
      const maxWidth = Math.max(...widths);
      const longestTokenWidth = Math.max(0, ...column.tokenWidths);
      const minWidth = clampNumber(
        Math.max(
          TABLE_COLUMN_MIN_PX,
          Math.min(column.headerWidth, 132),
          Math.min(longestTokenWidth, 156),
        ),
        TABLE_COLUMN_MIN_PX,
        168,
      );
      // p75 represents the normal cell; the capped max preserves outliers without
      // allowing one exceptional sentence to own the whole viewport.
      const preferredWidth = clampNumber(
        Math.max(
          minWidth,
          column.headerWidth,
          p75Width,
          Math.min(maxWidth, Math.max(p75Width * 1.22, averageWidth * 1.08)),
        ),
        minWidth,
        TABLE_COLUMN_MAX_PX,
      );
      const populatedRatio = column.populated / Math.max(1, widths.length);
      return {
        minWidth,
        preferredWidth,
        demand: Math.max(minWidth, averageWidth * Math.max(0.35, populatedRatio)),
        averageWidth,
        p75Width,
        maxWidth,
        populatedRatio,
        cellProfiles: column.cellProfiles,
      };
    });
  }

  function allocateAdaptiveColumnWidths(metrics, availableWidth) {
    const available = Math.max(0, Number(availableWidth || 0));
    const normalized = metrics.map((metric) => {
      const minWidth = Math.max(TABLE_COLUMN_MIN_PX, Number(metric?.minWidth || 0));
      return {
        minWidth,
        preferredWidth: Math.max(minWidth, Number(metric?.preferredWidth || minWidth)),
        demand: Math.max(1, Number(metric?.demand || metric?.preferredWidth || minWidth)),
      };
    });
    const minimumTotal = normalized.reduce((sum, metric) => sum + metric.minWidth, 0);
    const preferredTotal = normalized.reduce((sum, metric) => sum + metric.preferredWidth, 0);
    if (!normalized.length) {
      return { mode: 'compact', widths: [], minimumTotal: 0, preferredTotal: 0, targetWidth: 0 };
    }
    if (preferredTotal <= available + 1) {
      return {
        mode: 'compact',
        widths: normalized.map((metric) => metric.preferredWidth),
        minimumTotal,
        preferredTotal,
        targetWidth: preferredTotal,
      };
    }
    if (minimumTotal > available + 1) {
      return {
        mode: 'scroll',
        widths: normalized.map((metric) => metric.minWidth),
        minimumTotal,
        preferredTotal,
        targetWidth: minimumTotal,
      };
    }

    const widths = normalized.map((metric) => metric.minWidth);
    const active = new Set(normalized.map((_, index) => index));
    let remaining = available - minimumTotal;
    for (let pass = 0; pass < normalized.length + 1 && active.size && remaining > 0.5; pass++) {
      const weightTotal = Array.from(active).reduce(
        (sum, index) => sum + normalized[index].demand,
        0,
      );
      let consumed = 0;
      const saturated = [];
      active.forEach((index) => {
        const metric = normalized[index];
        const share = remaining * metric.demand / Math.max(1, weightTotal);
        const room = metric.preferredWidth - widths[index];
        const addition = Math.min(room, share);
        widths[index] += addition;
        consumed += addition;
        if (room <= share + 0.5) saturated.push(index);
      });
      saturated.forEach((index) => active.delete(index));
      remaining -= consumed;
      if (consumed < 0.5) break;
    }

    return {
      mode: 'fit',
      widths,
      minimumTotal,
      preferredTotal,
      targetWidth: widths.reduce((sum, width) => sum + width, 0),
    };
  }

  function estimateAdaptiveTableHeight(metrics, widths) {
    const rowCount = metrics.reduce(
      (maximum, metric) => Math.max(maximum, metric?.cellProfiles?.length || 0),
      0,
    );
    let totalHeightUnits = 0;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      let rowHeightUnits = 1;
      metrics.forEach((metric, columnIndex) => {
        const profile = metric?.cellProfiles?.[rowIndex];
        if (!profile?.lineWidths?.length) return;
        const contentWidth = Math.max(
          8,
          Number(widths[columnIndex] || 0) - Number(profile.horizontalInset || 0),
        );
        const cellHeightUnits = profile.lineWidths.reduce(
          (sum, lineWidth) => sum + Math.max(1, Number(lineWidth || 0) / contentWidth),
          0,
        );
        rowHeightUnits = Math.max(rowHeightUnits, cellHeightUnits);
      });
      totalHeightUnits += rowHeightUnits;
    }
    return totalHeightUnits;
  }

  function balanceAdaptiveColumnHeights(metrics, allocation) {
    if (allocation.mode !== 'fit' || metrics.length < 2) return allocation;
    const widths = allocation.widths.slice();
    const minimums = metrics.map((metric) => Math.max(TABLE_COLUMN_MIN_PX, Number(metric.minWidth || 0)));
    const maximums = metrics.map((metric, index) => Math.max(widths[index], Number(metric.preferredWidth || widths[index])));
    const scoreBefore = estimateAdaptiveTableHeight(metrics, widths);
    let currentScore = scoreBefore;

    for (const step of [64, 32, 16, 8, 4]) {
      for (let iteration = 0; iteration < 12; iteration++) {
        let bestMove = null;
        for (let donor = 0; donor < widths.length; donor++) {
          const donorRoom = widths[donor] - minimums[donor];
          if (donorRoom < 3) continue;
          for (let receiver = 0; receiver < widths.length; receiver++) {
            if (receiver === donor) continue;
            const receiverRoom = maximums[receiver] - widths[receiver];
            const transfer = Math.min(step, donorRoom, receiverRoom);
            if (transfer < 3) continue;
            const candidate = widths.slice();
            candidate[donor] -= transfer;
            candidate[receiver] += transfer;
            const score = estimateAdaptiveTableHeight(metrics, candidate);
            if (score < currentScore - 0.002 && (!bestMove || score < bestMove.score - 0.002)) {
              bestMove = { donor, receiver, transfer, score };
            }
          }
        }
        if (!bestMove) break;
        widths[bestMove.donor] -= bestMove.transfer;
        widths[bestMove.receiver] += bestMove.transfer;
        currentScore = bestMove.score;
      }
    }

    return {
      ...allocation,
      widths,
      heightScoreBefore: scoreBefore,
      heightScoreAfter: currentScore,
    };
  }

  function countRenderedLineTops(tops, lineHeight = 16) {
    const sameLineTolerance = Math.max(3, Number(lineHeight || 16) * 0.4);
    const lineTops = Array.from(tops || [])
      .map(Number)
      .filter(Number.isFinite)
      .sort((left, right) => left - right)
      .reduce((clusters, top) => {
        if (!clusters.length || top - clusters[clusters.length - 1] > sameLineTolerance) {
          clusters.push(top);
        }
        return clusters;
      }, []);
    return Math.max(1, lineTops.length);
  }

  function renderedCellLineCount(cell) {
    if (!document?.createRange) return 1;
    const range = document.createRange();
    range.selectNodeContents(cell);
    let lineHeight = Number(cell.dataset.ozTableLineHeight || 0);
    if (!(lineHeight > 0)) {
      lineHeight = Number.parseFloat(getComputedStyle(cell)?.lineHeight || '0') || 16;
      cell.dataset.ozTableLineHeight = lineHeight.toFixed(2);
    }
    const lineTops = Array.from(range.getClientRects())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => rect.top);
    return countRenderedLineTops(lineTops, lineHeight);
  }

  function renderedTableBottlenecks(table, columnCount) {
    const counts = Array.from({ length: columnCount }, () => 0);
    const columnLineLoads = Array.from({ length: columnCount }, () => 0);
    const columnWrapPenalties = Array.from({ length: columnCount }, () => 0);
    const heightPressure = Array.from({ length: columnCount }, () => 0);
    const rows = Array.from(table.tBodies || []).flatMap((body) => Array.from(body.rows || []));
    let lineLoad = 0;
    let wrapPenalty = 0;
    rows.forEach((row) => {
      const lineCounts = Array.from(row.cells || [])
        .slice(0, columnCount)
        .map(renderedCellLineCount);
      const maximum = Math.max(1, ...lineCounts);
      const maximumCount = lineCounts.filter((lineCount) => lineCount === maximum).length;
      const secondMaximum = Math.max(1, ...lineCounts.filter((lineCount) => lineCount < maximum));
      lineLoad += lineCounts.reduce((sum, lineCount) => sum + lineCount, 0);
      lineCounts.forEach((lineCount, columnIndex) => {
        const penalty = Math.max(0, lineCount - 2) ** 2;
        columnLineLoads[columnIndex] += lineCount;
        columnWrapPenalties[columnIndex] += penalty;
        wrapPenalty += penalty;
        if (lineCount === maximum) counts[columnIndex] += 1;
        if (lineCount === maximum && maximumCount === 1) {
          heightPressure[columnIndex] += maximum - secondMaximum;
        }
      });
    });
    return {
      counts,
      columnLineLoads,
      columnWrapPenalties,
      heightPressure,
      rowCount: rows.length,
      lineLoad,
      wrapPenalty,
    };
  }

  function renderedColumnPressure(table, columnIndex) {
    return Array.from(table.tBodies || [])
      .flatMap((body) => Array.from(body.rows || []))
      .reduce((pressure, row) => {
        const cell = row.cells?.[columnIndex];
        const lineCount = cell ? renderedCellLineCount(cell) : 0;
        pressure.lineLoad += lineCount;
        pressure.wrapPenalty += Math.max(0, lineCount - 2) ** 2;
        return pressure;
      }, { lineLoad: 0, wrapPenalty: 0 });
  }

  function balanceRenderedTableHeight(table, metrics, initialWidths, mode, availableWidth) {
    const colgroup = table.querySelector('colgroup[data-oz-adaptive-columns]');
    const columns = Array.from(colgroup?.children || []);
    const widths = initialWidths.slice();
    let targetWidth = widths.reduce((sum, width) => sum + width, 0);
    if (columns.length !== widths.length || widths.length < 2) {
      return {
        widths,
        targetWidth,
        heightBefore: 0,
        heightAfter: 0,
        lineLoadBefore: 0,
        lineLoadAfter: 0,
        wrapPenaltyBefore: 0,
        wrapPenaltyAfter: 0,
        evaluations: 0,
      };
    }
    const minimums = metrics.map((metric) => Math.max(TABLE_COLUMN_MIN_PX, Math.ceil(Number(metric.minWidth || 0))));
    const maximums = metrics.map((metric, index) => Math.max(
      widths[index],
      Math.floor(Number(
        mode === 'compact'
          ? TABLE_COLUMN_MAX_PX
          : Math.min(
            TABLE_COLUMN_MAX_PX,
            Math.max(metric.preferredWidth || 0, widths[index] + 128),
          ),
      )),
    ));
    const applyPair = (donor, receiver, donorWidth, receiverWidth) => {
      columns[donor].style.width = `${donorWidth}px`;
      columns[receiver].style.width = `${receiverWidth}px`;
    };
    const applyTargetWidth = (width) => {
      table.style.width = `${width}px`;
      table.style.minWidth = `${width}px`;
      table.style.maxWidth = `${width}px`;
    };
    const heightBefore = table.getBoundingClientRect().height;
    let currentHeight = heightBefore;
    const initialPressure = renderedTableBottlenecks(table, widths.length);
    const lineLoadBefore = initialPressure.lineLoad;
    let currentLineLoad = lineLoadBefore;
    const wrapPenaltyBefore = initialPressure.wrapPenalty;
    let currentWrapPenalty = wrapPenaltyBefore;
    let evaluations = 0;

    const iterationLimit = mode === 'compact' ? 12 : 4;
    for (let iteration = 0; iteration < iterationLimit; iteration++) {
      const pressure = renderedTableBottlenecks(table, widths.length);
      if (!pressure.rowCount) break;
      const receiverCandidates = pressure.counts
        .map((count, index) => ({
          index,
          count,
          lineLoad: pressure.columnLineLoads[index],
          wrapPenalty: pressure.columnWrapPenalties[index],
          heightPressure: pressure.heightPressure[index],
          room: maximums[index] - widths[index],
        }))
        .filter((candidate) => candidate.room >= 3)
        .sort((left, right) => (
          mode === 'compact'
            ? right.wrapPenalty - left.wrapPenalty
              || right.lineLoad - left.lineLoad
              || right.count - left.count
              || right.room - left.room
            : right.heightPressure - left.heightPressure
              || right.wrapPenalty - left.wrapPenalty
              || right.lineLoad - left.lineLoad
              || right.count - left.count
              || right.room - left.room
        ));
      if (!receiverCandidates.length) break;
      const receiver = receiverCandidates[0].index;
      let bestMove = null;
      if (mode === 'compact') {
        const freeWidth = Math.max(0, Number(availableWidth || 0) - targetWidth);
        for (const receiverCandidate of receiverCandidates.slice(0, 4)) {
          const expansionReceiver = receiverCandidate.index;
          const expansion = Math.floor(Math.min(
            128,
            freeWidth,
            maximums[expansionReceiver] - widths[expansionReceiver],
          ));
          if (expansion < 3) continue;
          columns[expansionReceiver].style.width = `${widths[expansionReceiver] + expansion}px`;
          applyTargetWidth(targetWidth + expansion);
          const candidatePressure = renderedColumnPressure(table, expansionReceiver);
          const candidateLineLoad = currentLineLoad
            - pressure.columnLineLoads[expansionReceiver]
            + candidatePressure.lineLoad;
          const candidateWrapPenalty = currentWrapPenalty
            - pressure.columnWrapPenalties[expansionReceiver]
            + candidatePressure.wrapPenalty;
          evaluations += 1;
          columns[expansionReceiver].style.width = `${widths[expansionReceiver]}px`;
          applyTargetWidth(targetWidth);
          const improvesCurrent = candidateLineLoad < currentLineLoad
            || (candidateLineLoad === currentLineLoad && candidateWrapPenalty < currentWrapPenalty);
          const improvesBest = !bestMove
            || candidateLineLoad < bestMove.lineLoad
            || (
              candidateLineLoad === bestMove.lineLoad
              && candidateWrapPenalty < bestMove.wrapPenalty
            );
          if (improvesCurrent && improvesBest) {
            bestMove = {
              donor: -1,
              receiver: expansionReceiver,
              transfer: expansion,
              height: currentHeight,
              lineLoad: candidateLineLoad,
              wrapPenalty: candidateWrapPenalty,
            };
          }
        }
      }
      const donors = mode === 'compact' ? [] : widths
        .map((width, index) => ({
          index,
          room: width - minimums[index],
          heightPressure: pressure.heightPressure[index],
          wrapPenalty: pressure.columnWrapPenalties[index],
          lineLoad: pressure.columnLineLoads[index],
        }))
        .filter((candidate) => candidate.index !== receiver && candidate.room >= 3)
        .sort((left, right) => (
          left.heightPressure - right.heightPressure
          || left.wrapPenalty - right.wrapPenalty
          || right.room - left.room
          || left.lineLoad - right.lineLoad
        ))
        .slice(0, 2);
      for (const donor of donors) {
        const seenTransfers = new Set();
        for (const requestedTransfer of [64, 32, 16]) {
          const transfer = Math.floor(Math.min(
            requestedTransfer,
            donor.room,
            maximums[receiver] - widths[receiver],
          ));
          if (transfer < 3 || seenTransfers.has(transfer)) continue;
          seenTransfers.add(transfer);
          applyPair(
            donor.index,
            receiver,
            widths[donor.index] - transfer,
            widths[receiver] + transfer,
          );
          const candidateHeight = table.getBoundingClientRect().height;
          const donorPressure = candidateHeight <= currentHeight + 0.5
            ? renderedColumnPressure(table, donor.index)
            : null;
          const receiverPressure = donorPressure
            ? renderedColumnPressure(table, receiver)
            : null;
          const candidateLineLoad = donorPressure && receiverPressure
            ? currentLineLoad
              - pressure.columnLineLoads[donor.index]
              - pressure.columnLineLoads[receiver]
              + donorPressure.lineLoad
              + receiverPressure.lineLoad
            : Number.POSITIVE_INFINITY;
          const candidateWrapPenalty = donorPressure && receiverPressure
            ? currentWrapPenalty
              - pressure.columnWrapPenalties[donor.index]
              - pressure.columnWrapPenalties[receiver]
              + donorPressure.wrapPenalty
              + receiverPressure.wrapPenalty
            : Number.POSITIVE_INFINITY;
          evaluations += 1;
          applyPair(donor.index, receiver, widths[donor.index], widths[receiver]);
          const improvesCurrent = candidateHeight < currentHeight - 0.5
            || (
              Math.abs(candidateHeight - currentHeight) <= 0.5
              && (
                candidateLineLoad < currentLineLoad
                || (
                  candidateLineLoad === currentLineLoad
                  && candidateWrapPenalty < currentWrapPenalty
                )
              )
            );
          const improvesBest = !bestMove
            || candidateHeight < bestMove.height - 0.5
            || (
              Math.abs(candidateHeight - bestMove.height) <= 0.5
              && (
                candidateLineLoad < bestMove.lineLoad
                || (
                  candidateLineLoad === bestMove.lineLoad
                  && (
                    candidateWrapPenalty < bestMove.wrapPenalty
                    || (
                      candidateWrapPenalty === bestMove.wrapPenalty
                      && transfer < bestMove.transfer
                    )
                  )
                )
              )
            );
          if (improvesCurrent && improvesBest) {
            bestMove = {
              donor: donor.index,
              receiver,
              transfer,
              height: candidateHeight,
              lineLoad: candidateLineLoad,
              wrapPenalty: candidateWrapPenalty,
            };
          }
        }
      }
      if (!bestMove) break;
      if (bestMove.donor >= 0) widths[bestMove.donor] -= bestMove.transfer;
      widths[bestMove.receiver] += bestMove.transfer;
      if (bestMove.donor >= 0) {
        applyPair(
          bestMove.donor,
          bestMove.receiver,
          widths[bestMove.donor],
          widths[bestMove.receiver],
        );
      } else {
        columns[bestMove.receiver].style.width = `${widths[bestMove.receiver]}px`;
        targetWidth += bestMove.transfer;
        applyTargetWidth(targetWidth);
        bestMove.height = table.getBoundingClientRect().height;
      }
      currentHeight = bestMove.height;
      currentLineLoad = bestMove.lineLoad;
      currentWrapPenalty = bestMove.wrapPenalty;
    }

    return {
      widths,
      targetWidth,
      heightBefore,
      heightAfter: currentHeight,
      lineLoadBefore,
      lineLoadAfter: currentLineLoad,
      wrapPenaltyBefore,
      wrapPenaltyAfter: currentWrapPenalty,
      evaluations,
    };
  }

  function applyAdaptiveColumnWidths(table, allocation) {
    let colgroup = table.querySelector('colgroup[data-oz-adaptive-columns]');
    if (!colgroup) {
      colgroup = document.createElement('colgroup');
      colgroup.dataset.ozAdaptiveColumns = '1';
      table.insertBefore(colgroup, table.firstChild);
    }
    while (colgroup.children.length < allocation.widths.length) {
      colgroup.appendChild(document.createElement('col'));
    }
    while (colgroup.children.length > allocation.widths.length) {
      colgroup.lastElementChild?.remove();
    }
    const targetWidth = Math.max(0, Math.round(allocation.targetWidth));
    const appliedWidths = allocation.widths.map((width) => Math.max(TABLE_COLUMN_MIN_PX, Math.floor(width)));
    let roundingRemainder = targetWidth - appliedWidths.reduce((sum, width) => sum + width, 0);
    const roundingOrder = allocation.widths
      .map((width, index) => ({ index, fraction: width - Math.floor(width) }))
      .sort((left, right) => right.fraction - left.fraction);
    for (let cursor = 0; roundingRemainder > 0 && roundingOrder.length; cursor++) {
      appliedWidths[roundingOrder[cursor % roundingOrder.length].index] += 1;
      roundingRemainder -= 1;
    }
    appliedWidths.forEach((width, index) => {
      colgroup.children[index].style.width = `${width}px`;
    });
    table.style.width = `${targetWidth}px`;
    table.style.minWidth = `${targetWidth}px`;
    table.style.maxWidth = `${targetWidth}px`;
    table.dataset.ozAdaptiveColumns = '1';
    return appliedWidths;
  }

  function syncTableFitMode(wrap) {
    if (!(wrap instanceof HTMLElement)) return;
    const table = wrap.querySelector('table.md-table');
    if (!(table instanceof HTMLElement)) return;

    const previousMode = String(wrap.dataset.ozTableFitMode || '');
    wrap.classList.remove('is-fit', 'is-compact');
    const wrapStyle = typeof getComputedStyle === 'function' ? getComputedStyle(wrap) : null;
    const horizontalBorder = Number.parseFloat(wrapStyle?.borderLeftWidth || '0')
      + Number.parseFloat(wrapStyle?.borderRightWidth || '0');
    const availableWidth = Math.max(
      0,
      Number(wrap.getBoundingClientRect?.().width || wrap.clientWidth || 0) - horizontalBorder,
    );
    if (availableWidth < 80) {
      const retryCount = Math.max(0, Number(wrap.dataset.ozTableFitRetry || 0));
      if (retryCount < 8) {
        wrap.dataset.ozTableFitRetry = String(retryCount + 1);
        setTimeout(() => scheduleTableFitMode(wrap), 80 * (retryCount + 1));
      }
      return;
    }
    delete wrap.dataset.ozTableFitRetry;

    flowDenseTableCodeLists(table);
    addTableCodeSoftBreaks(table);
    const metrics = collectAdaptiveColumnMetrics(table);
    const columnCount = metrics.length;
    const layoutWidth = Math.max(0, availableWidth - TABLE_COLLAPSED_BORDER_ALLOWANCE_PX);
    const initialAllocation = allocateAdaptiveColumnWidths(metrics, layoutWidth);
    const allocation = table.rows.length > 80
      ? balanceAdaptiveColumnHeights(metrics, initialAllocation)
      : initialAllocation;
    const naturalWidth = allocation.preferredTotal;
    const overflowRatio = naturalWidth > 0 ? naturalWidth / availableWidth : 1;
    let mode = allocation.mode;
    let appliedWidths = applyAdaptiveColumnWidths(table, allocation);
    const renderedBalance = mode !== 'scroll' && table.rows.length <= 80
      ? balanceRenderedTableHeight(table, metrics, appliedWidths, mode, layoutWidth)
      : {
        widths: appliedWidths,
        targetWidth: allocation.targetWidth,
        heightBefore: 0,
        heightAfter: 0,
        lineLoadBefore: 0,
        lineLoadAfter: 0,
        wrapPenaltyBefore: 0,
        wrapPenaltyAfter: 0,
        evaluations: 0,
      };
    appliedWidths = renderedBalance.widths;
    if (mode === 'compact' && renderedBalance.targetWidth >= layoutWidth - 2) mode = 'fit';

    wrap.classList.toggle('is-compact', mode === 'compact');
    wrap.classList.toggle('is-fit', mode === 'fit');
    wrap.dataset.ozTableFitMode = mode;
    wrap.dataset.ozTableFitRatio = overflowRatio.toFixed(3);
    wrap.dataset.ozTableFitBudget = String(Math.round(renderedBalance.targetWidth));
    wrap.dataset.ozTableNaturalWidth = String(Math.round(naturalWidth));
    wrap.dataset.ozTableColumnWidths = appliedWidths.join(',');
    wrap.dataset.ozTableHeightScoreBefore = Number(allocation.heightScoreBefore || 0).toFixed(3);
    wrap.dataset.ozTableHeightScoreAfter = Number(allocation.heightScoreAfter || 0).toFixed(3);
    wrap.dataset.ozTableRenderedHeightBefore = String(Math.round(renderedBalance.heightBefore));
    wrap.dataset.ozTableRenderedHeightAfter = String(Math.round(renderedBalance.heightAfter));
    wrap.dataset.ozTableLineLoadBefore = String(renderedBalance.lineLoadBefore);
    wrap.dataset.ozTableLineLoadAfter = String(renderedBalance.lineLoadAfter);
    wrap.dataset.ozTableWrapPenaltyBefore = String(renderedBalance.wrapPenaltyBefore);
    wrap.dataset.ozTableWrapPenaltyAfter = String(renderedBalance.wrapPenaltyAfter);
    wrap.dataset.ozTableHeightEvaluations = String(renderedBalance.evaluations);
    const renderedHeightSavedPct = renderedBalance.heightBefore > 0
      ? Math.max(0, Math.round((1 - renderedBalance.heightAfter / renderedBalance.heightBefore) * 100))
      : 0;
    wrap.dataset.ozTableHeightSavedPct = String(renderedHeightSavedPct);
    wrap.setAttribute(
      'title',
      mode === 'compact'
        ? `Компактная таблица: ${columnCount} кол., использовано ${Math.round(renderedBalance.targetWidth)}px; дальнейшее расширение не уменьшает высоту.${renderedHeightSavedPct > 0 ? ` Высота уменьшена на ${renderedHeightSavedPct}%.` : ''}`
        : mode === 'fit'
          ? `Таблица вписана по содержимому: ${columnCount} кол., ширина без лишних переносов была больше экрана на ${Math.max(0, Math.round((overflowRatio - 1) * 100))}%; избыток распределён переносами.${renderedHeightSavedPct > 0 ? ` Высота уменьшена ещё на ${renderedHeightSavedPct}%.` : ''}`
          : `Таблица шире физического минимума: ${columnCount} кол. Доступны Shift+wheel, колесо или drag.`,
    );
    if (mode !== 'scroll' && mode !== previousMode) wrap.scrollLeft = 0;
  }

  function scheduleTableFitMode(wrap) {
    if (!(wrap instanceof HTMLElement) || tableFitRefreshPending.has(wrap)) return;
    tableFitRefreshPending.add(wrap);
    tableFitRefreshQueue.push(wrap);
    if (tableFitRefreshFramePending) return;
    tableFitRefreshFramePending = true;
    const run = () => {
      tableFitRefreshFramePending = false;
      const nextWrap = tableFitRefreshQueue.shift();
      if (nextWrap instanceof HTMLElement) {
        tableFitRefreshPending.delete(nextWrap);
        syncTableFitMode(nextWrap);
      }
      if (tableFitRefreshQueue.length) {
        tableFitRefreshFramePending = true;
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else setTimeout(run, 0);
      }
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  function getTableFitResizeObserver() {
    if (tableFitResizeObserver || typeof ResizeObserver !== 'function') return tableFitResizeObserver;
    tableFitResizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => scheduleTableFitMode(entry.target));
    });
    return tableFitResizeObserver;
  }

  function enhanceAdaptiveTables(root) {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    const nodes = [];
    if (scope instanceof HTMLElement && scope.matches('.md-table-wrap')) nodes.push(scope);
    nodes.push(...Array.from(scope.querySelectorAll('.md-table-wrap')));
    const resizeObserver = getTableFitResizeObserver();
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.dataset.ozTableFitReady !== '1') {
        node.dataset.ozTableFitReady = '1';
        resizeObserver?.observe(node);
      }
      scheduleTableFitMode(node);
    });
  }

  function renderMermaidFence(code, sourceLine = 0) {
    return `<div class="code-fence md-mermaid-block"${sourceLineAttr(sourceLine)}>` +
      `<div class="code-lang">` +
      `<span class="code-lang-label">mermaid</span>` +
      `<button type="button" class="code-copy" data-code-copy title="Копировать блок целиком">📋 Copy</button>` +
      `</div>` +
      `<div class="md-mermaid-toolbar" role="toolbar" aria-label="Режим просмотра схемы">` +
      `<span class="md-mermaid-toolbar-label">Схема</span>` +
      `<div class="md-mermaid-actions">` +
      `<button type="button" data-mermaid-mode="overview" aria-pressed="true" disabled>Обзор</button>` +
      `<button type="button" data-mermaid-mode="read" aria-pressed="false" disabled>Читать</button>` +
      `<button type="button" data-mermaid-open disabled>На весь экран ↗</button>` +
      `</div>` +
      `</div>` +
      `<div class="md-mermaid-stage" data-mermaid-source="${encodeURIComponent(code)}" data-mermaid-state="pending">` +
      `<div class="md-mermaid-status">Rendering mermaid diagram...</div>` +
      `<div class="md-mermaid-render"></div>` +
      `<pre class="md-mermaid-fallback"><code>${escapeHtml(code)}</code></pre>` +
      `</div>` +
      `</div>`;
  }

  function renderMarkdownLite(text) {
    const lines = String(text || '').split('\n');
    let html = '';
    let inFence = false;
    let fenceLang = '';
    let fenceSourceLine = 0;
    let fenceBuf = [];
    let textBuf = [];

    function flushText() {
      if (!textBuf.length) return;
      const rendered = textBuf.map((entry) => renderInlineCode(entry.line, entry.lineNo));
      let joined = rendered[0] || '';
      for (let i = 1; i < rendered.length; i++) {
        const prevIsBlock = rendered[i - 1].startsWith('<span class="md-li"') ||
          rendered[i - 1].startsWith('<span class="md-h');
        joined += prevIsBlock ? '' : '\n';
        joined += rendered[i];
      }
      html += joined + '\n';
      textBuf = [];
    }

    function flushFence() {
      const code = fenceBuf.join('\n');
      const normalized = String(fenceLang || '').trim().toLowerCase();
      const renderedFence = normalized === 'mermaid' || normalized === 'mmd'
        ? renderMermaidFence(code, fenceSourceLine)
        : renderCodeFence(code, fenceLang || 'code', fenceSourceLine);
      html += normalized === 'vega-lite'
        ? `<div data-vega-lite>${renderedFence}</div>` : renderedFence;
      fenceBuf = [];
      fenceLang = '';
      fenceSourceLine = 0;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const sourceLine = i + 1;
      const fence = String(line).match(/^```(.*)\s*$/);
      if (fence) {
        if (!inFence) {
          flushText();
          inFence = true;
          fenceLang = (fence[1] || '').trim();
          fenceSourceLine = sourceLine;
          continue;
        }
        inFence = false;
        flushFence();
        continue;
      }

      if (inFence) {
        fenceBuf.push(line);
        continue;
      }

      if (String(line || '').trim() && i + 1 < lines.length) {
        const setext = String(lines[i + 1] || '').match(/^\s*([=\-~^])\1{2,}\s*$/);
        if (setext) {
          flushText();
          const marker = setext[1];
          const level = marker === '=' ? 1 : marker === '-' ? 2 : marker === '~' ? 3 : 4;
          html += `<span class="md-h${level}"${sourceLineAttr(sourceLine)}>${renderInlineSpan(String(line).trim())}</span>`;
          i += 1;
          continue;
        }
      }

      if (isTableHeaderLine(line) && i + 1 < lines.length && isTableSepLine(lines[i + 1])) {
        flushText();
        const headerRow = line;
        const sepRow = lines[i + 1];
        const body = [];
        i += 2;
        for (; i < lines.length; i++) {
          if (!isTableBodyLine(lines[i])) break;
          body.push(lines[i]);
        }
        i -= 1;
        html += renderTableBlock(headerRow, sepRow, body, sourceLine);
        continue;
      }

      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
        flushText();
        html += `<hr class="md-hr"${sourceLineAttr(sourceLine)} />`;
        continue;
      }

      textBuf.push({ line, lineNo: sourceLine });
    }

    if (inFence) {
      flushText();
      flushFence();
    }

    flushText();
    return html.replace(/\n$/, '');
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve(Boolean(ok));
    } catch (error) {
      return Promise.resolve(false);
    }
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        return fallbackCopy(text);
      }
    }
    return fallbackCopy(text);
  }

  function enhance(root) {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    window.OzMarkdownDiagrams?.enhance?.(scope);
    if (scope.matches?.('[data-vega-lite]') || scope.querySelector?.('[data-vega-lite]')) {
      chartsLoadPromise ||= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/oz_markdown_charts.js';
        script.onload = resolve;
        script.onerror = () => { chartsLoadPromise = null; reject(new Error('Charts unavailable')); };
        document.head.appendChild(script);
      });
      chartsLoadPromise.then(() => window.OzMarkdownCharts.enhance(scope)).catch(() => {});
    }
    enhanceAdaptiveTables(scope);
    enhanceHorizontalScrollers(scope);
  }

  function getHorizontalScrollerFromEventTarget(target) {
    const el = target instanceof HTMLElement ? target : null;
    if (!el) return null;
    return el.closest('.md-table-wrap, .code-fence pre, .md-mermaid-render');
  }

  function canScrollHorizontally(el, delta) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.scrollWidth <= el.clientWidth + 1) return false;
    if (delta < 0 && el.scrollLeft <= 0) return false;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (delta > 0 && el.scrollLeft >= maxScroll - 1) return false;
    return true;
  }

  function enhanceHorizontalScrollers(root) {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    const nodes = scope.querySelectorAll('.md-table-wrap, .code-fence pre, .md-mermaid-render');
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.dataset.ozHScrollReady === '1') return;
      node.dataset.ozHScrollReady = '1';
      if (!node.getAttribute('title') && node.matches('.md-table-wrap')) {
        node.setAttribute('title', 'Горизонтальный скролл: Shift+wheel, обычное колесо на широкой таблице или drag мышью.');
      }
    });
  }

  function installDelegates() {
    if (document.documentElement.dataset.ozMarkdownDelegates === '1') return;
    document.documentElement.dataset.ozMarkdownDelegates = '1';

    document.addEventListener('click', async (event) => {
      const btn = event.target.closest('button[data-code-copy]');
      if (!btn) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const fence = btn.closest('.code-fence');
      const codeEl = fence ? fence.querySelector('pre code') : null;
      const text = codeEl ? String(codeEl.textContent || '') : '';
      if (!text.trim()) return;
      const prev = btn.textContent;
      const ok = await copyToClipboard(text);
      btn.textContent = ok ? '✅ Copied' : '⚠️ Copy failed';
      setTimeout(() => {
        btn.textContent = prev;
      }, 1200);
    }, true);

    document.addEventListener('wheel', (event) => {
      const scroller = getHorizontalScrollerFromEventTarget(event.target);
      if (!(scroller instanceof HTMLElement)) return;

      const wantsHorizontal = event.shiftKey
        ? event.deltaY || event.deltaX
        : Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

      if (!wantsHorizontal || !canScrollHorizontally(scroller, wantsHorizontal)) return;

      scroller.scrollLeft += wantsHorizontal;
      event.preventDefault();
    }, { passive: false, capture: true });

    document.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const scroller = getHorizontalScrollerFromEventTarget(event.target);
      if (!(scroller instanceof HTMLElement)) return;
      if (!scroller.matches('.md-table-wrap')) return;
      if (scroller.scrollWidth <= scroller.clientWidth + 1) return;

      activeDragScroller = scroller;
      activeDragStartX = event.clientX;
      activeDragScrollLeft = scroller.scrollLeft;
      scroller.classList.add('is-dragging');
    }, true);

    document.addEventListener('pointermove', (event) => {
      if (!(activeDragScroller instanceof HTMLElement)) return;
      activeDragScroller.scrollLeft = activeDragScrollLeft - (event.clientX - activeDragStartX);
      event.preventDefault();
    }, true);

    function stopScrollerDrag() {
      if (!(activeDragScroller instanceof HTMLElement)) return;
      activeDragScroller.classList.remove('is-dragging');
      activeDragScroller = null;
    }

    document.addEventListener('pointerup', stopScrollerDrag, true);
    document.addEventListener('pointercancel', stopScrollerDrag, true);
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (
            node.matches('.md-table-wrap, [data-vega-lite]')
            || node.querySelector('.md-table-wrap, [data-mermaid-source], [data-vega-lite]')
          ) {
            enhance(node);
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function renderInto(element, text) {
    if (!element) return;
    element.classList.add('markdown-view');
    element.innerHTML = renderMarkdownLite(text);
    enhance(element);
  }

  installDelegates();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startObserver();
      enhance(document);
    }, { once: true });
  } else {
    startObserver();
    enhance(document);
  }

  window.OzMarkdown = {
    escapeHtml,
    renderInlineSpan,
    renderInlineCode,
    renderMarkdownLite,
    renderInto,
    enhance,
    tableFitMaxOverflowRatio,
    classifyAdaptiveTableMode,
    allocateAdaptiveColumnWidths,
    balanceAdaptiveColumnHeights,
    countRenderedLineTops,
    copyToClipboard,
  };
})();
