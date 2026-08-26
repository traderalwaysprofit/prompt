(() => {
  const init = () => {
    const header = document.querySelector('.site-header');
    const nav = header?.querySelector('nav');
    if (!header || !nav) return;

    // Keep the onboarding entry created by home-ui-patch.js as the single source of truth.
    const canonicalOnboarding = nav.querySelector('#nav-onboarding');
    nav.querySelectorAll('[data-action="onboarding"]').forEach((item) => {
      if (item !== canonicalOnboarding) item.remove();
    });

    // Remove the legacy mobile menu created by older UI patches.
    document.querySelector('#mobile-nav-menu')?.remove();

    let toggle = header.querySelector('#mobile-menu-toggle');
    if (!toggle || toggle.dataset.samsonCanonical !== '1') {
      const freshToggle = document.createElement('button');
      freshToggle.id = 'mobile-menu-toggle';
      freshToggle.className = 'mobile-menu-toggle';
      freshToggle.type = 'button';
      freshToggle.dataset.samsonCanonical = '1';
      freshToggle.setAttribute('aria-label', 'Buka menu');
      freshToggle.setAttribute('aria-expanded', 'false');
      freshToggle.innerHTML = '<span></span><span></span><span></span>';
      if (toggle) toggle.replaceWith(freshToggle);
      else header.appendChild(freshToggle);
      toggle = freshToggle;
    }

    const panels = Array.from(document.querySelectorAll('.mobile-menu-panel'));
    let panel = panels.shift();
    panels.forEach((duplicate) => duplicate.remove());
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'mobile-menu-panel';
      header.insertAdjacentElement('afterend', panel);
    }
    panel.innerHTML = '<div class="mobile-menu-title">SAMSON PROMPT</div><button data-mobile-nav="explore">Explore</button><button data-mobile-nav="recent">Recently Used</button><button data-mobile-nav="favorites">Favorites</button><button data-mobile-nav="onboarding">Onboarding AI</button>';

    if (toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';

    const close = () => {
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Buka menu');
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const open = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    });

    panel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-mobile-nav]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();

      const action = button.dataset.mobileNav;
      const target = action === 'recent'
        ? nav.querySelector('#nav-recent')
        : action === 'favorites'
          ? nav.querySelector('#nav-favorites')
          : action === 'onboarding'
            ? nav.querySelector('#nav-onboarding')
            : nav.querySelector('.nav-link.active') || nav.querySelector('.nav-link');

      target?.click();
      close();
    });

    document.addEventListener('click', (event) => {
      if (panel.classList.contains('is-open') && !panel.contains(event.target) && event.target !== toggle) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 700) close();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  new MutationObserver(init).observe(document.documentElement, { childList: true, subtree: true });
})();
