(() => {
  'use strict';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.mn-elephant').forEach(button => {
    const symbol = button.querySelector('.mn-symbol');
    let active = false;
    let resetTimer;
    const reset = () => {
      active = false;
      window.clearTimeout(resetTimer);
      button.classList.remove('is-flying', 'is-sparked');
    };
    const play = () => {
      if (active || document.hidden) return;
      active = true;
      button.classList.add(motion.matches ? 'is-sparked' : 'is-flying');
      // A fixed button stays under the pointer while only its illustration flies.
      resetTimer = window.setTimeout(reset, motion.matches ? 650 : 2200);
    };
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') play();
    });
    // Native button activation also handles touch, Enter and Space.
    button.addEventListener('click', play);
    button.addEventListener('animationend', event => {
      if (event.target === symbol && event.animationName === 'mn-elephant-flight') reset();
    });
    button.addEventListener('animationcancel', event => {
      if (event.target === symbol) reset();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) reset();
    });
    window.addEventListener('pagehide', reset);
    motion.addEventListener('change', reset);
  });

  const candidate = new URLSearchParams(location.search).get('review') === 'candidate';
  document.querySelectorAll('.mn-practice-link, .mn-note-primary').forEach(link => {
    const preserveReview = () => {
      if (!candidate) return;
      const target = new URL(link.href, location.href);
      target.searchParams.set('review', 'candidate');
      link.href = target.href;
    };
    preserveReview();
    link.addEventListener('click', preserveReview);
    link.addEventListener('auxclick', preserveReview);
  });
  // Native details remain usable without scripts. Citation links open their
  // enclosing source disclosure before moving the reader to the reference.
  document.querySelectorAll('a.mn-cite').forEach(link => {
    link.addEventListener('click', () => {
      const target = document.getElementById(link.hash.slice(1));
      const details = target && target.closest('details');
      if (details) details.open = true;
    });
  });
})();
