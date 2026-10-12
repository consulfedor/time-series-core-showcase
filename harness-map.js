// Read-only navigation and accessible image inspection for the canonical map.
(() => {
  const directory = document.querySelector('meta[name="map-source-directory"]')?.content;
  const inPortal = location.protocol === 'blob:' || location.pathname.startsWith('/api/doc') || document.referrer.includes('/doc_view.html');
  if (directory && inPortal) {
    const origin = location.origin === 'null' ? new URL(document.referrer).origin : location.origin;
    document.querySelectorAll('img[src],a[href]').forEach(element => {
      const attribute = element.tagName === 'IMG' ? 'src' : 'href';
      const raw = element.getAttribute(attribute);
      if (!raw || raw.startsWith('#') || /^[a-z]+:/i.test(raw) || raw.startsWith('//')) return;
      const resolved = new URL(raw, 'https://projection.invalid/' + directory + '/');
      const file = decodeURIComponent(resolved.pathname.slice(1));
      element.setAttribute(attribute, origin + (attribute === 'src' ? '/api/doc?path=' : '/doc_view.html?path=') + encodeURIComponent(file) + resolved.hash);
    });
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'map-lightbox';
  dialog.setAttribute('aria-label', 'Увеличенное изображение');
  dialog.innerHTML = '<form method="dialog"><button aria-label="Закрыть увеличенное изображение">Закрыть · Esc</button></form><img alt="">';
  document.body.append(dialog);
  const enlarged = dialog.querySelector('img');
  document.querySelectorAll('figure img, .historical-gallery img').forEach(image => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', 'Увеличить: ' + image.alt);
    const open = () => {
      enlarged.src = image.currentSrc || image.src;
      enlarged.alt = image.alt;
      dialog.showModal();
    };
    image.addEventListener('click', open);
    image.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
  });
})();
