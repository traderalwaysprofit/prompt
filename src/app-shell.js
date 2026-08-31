(() => {
  'use strict';

  const ONBOARDING_ID = 'ai-onboarding-modal';

  const closeMobileMenu = (toggle, panel) => {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Buka menu');
  };

  const openOnboarding = () => {
    if (document.getElementById(ONBOARDING_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = ONBOARDING_ID;
    overlay.className = 'overlay onboarding-overlay';
    overlay.innerHTML = `<div class="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="ai-onboarding-title"><header class="onboarding-header"><div><span class="eyebrow">GET STARTED</span><h2 id="ai-onboarding-title">AI Model Onboarding</h2><small>Gunakan prompt SAMSON di berbagai model AI</small></div><button class="close onboarding-close" type="button" aria-label="Tutup onboarding">×</button></header><div class="modal-body onboarding-body"><label>1. PILIH MODEL AI</label><div class="onboarding-grid"><article class="onboarding-option"><div><strong>CHATGPT</strong><small>OpenAI</small></div><p>Salin prompt → buka ChatGPT → tempel → sesuaikan variabel → kirim.</p></article><article class="onboarding-option"><div><strong>GEMINI</strong><small>Google</small></div><p>Salin prompt → buka Gemini → tempel → tambahkan konteks atau file → kirim.</p></article><article class="onboarding-option"><div><strong>CLAUDE</strong><small>Anthropic</small></div><p>Salin prompt → buka Claude → tempel → berikan konteks → iterasikan.</p></article><article class="onboarding-option"><div><strong>OTHER AI</strong><small>Universal</small></div><p>Gunakan prompt yang sama. Tambahkan konteks, format output, dan contoh bila diperlukan.</p></article></div><label>2. TIPS PROMPT</label><div class="codebox onboarding-tip">Ganti bagian [VARIABEL] sesuai kebutuhan. Tambahkan tujuan, konteks, batasan, dan format output untuk hasil lebih konsisten.</div></div></div>`;

    const close = () => overlay.remove();
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.closest('.onboarding-close')) close();
    });
    document.body.appendChild(overlay);
    overlay.querySelector('.onboarding-close')?.focus();
  };

  const themeOptionsMarkup = () => {
    const themes = window.SamsonTheme?.themes || [
      { id: 'default', label: 'Samson Default' },
      { id: 'developer', label: 'Developer' },
      { id: 'swiss', label: 'Swiss' },
      { id: 'pixel', label: 'Pixel' }
    ];
    return themes.map((theme) => `<option value="${theme.id}">${theme.label}</option>`).join('');
  };

  const bindThemeSelect = (select) => {
    if (!select) return;
    select.value = window.SamsonTheme?.get?.() || document.documentElement.dataset.theme || 'default';
    select.addEventListener('change', () => {
      window.SamsonTheme?.set?.(select.value);
    });
  };

  const setUtilityMenu = (trigger, panel, open) => {
    trigger.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    panel.classList.toggle('is-open', open);
  };

  const createDesktopUtilityMenu = (nav, onboarding) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'nav-more';

    const trigger = document.createElement('button');
    trigger.id = 'nav-more';
    trigger.className = 'nav-link nav-more-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'nav-more-menu');
    trigger.innerHTML = '<span>More</span><svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

    const panel = document.createElement('div');
    panel.id = 'nav-more-menu';
    panel.className = 'nav-more-menu';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'SAMSON utilities');
    panel.innerHTML = '<div class="nav-more-label">UTILITY</div><div class="nav-more-actions"></div><div class="nav-more-divider"></div><label class="theme-picker-wrap utility-theme-picker"><span>APPEARANCE</span><select id="theme-select" class="theme-picker" data-theme-select aria-label="UI Personality"></select></label>';
    panel.querySelector('#theme-select').innerHTML = themeOptionsMarkup();

    onboarding.className = 'nav-utility-action';
    onboarding.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4l2.5 2"></path></svg><span>Onboarding AI</span>';
    panel.querySelector('.nav-more-actions').appendChild(onboarding);

    wrapper.append(trigger, panel);
    nav.appendChild(wrapper);
    bindThemeSelect(panel.querySelector('[data-theme-select]'));

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      setUtilityMenu(trigger, panel, trigger.getAttribute('aria-expanded') !== 'true');
    });

    panel.addEventListener('click', (event) => {
      if (event.target.closest('.nav-utility-action')) setUtilityMenu(trigger, panel, false);
    });

    document.addEventListener('click', (event) => {
      if (!wrapper.contains(event.target)) setUtilityMenu(trigger, panel, false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (trigger.getAttribute('aria-expanded') === 'true') {
        setUtilityMenu(trigger, panel, false);
        trigger.focus();
      }
    });

    return { wrapper, panel, trigger };
  };

  const syncCompactPrimaryNavigation = (nav, utilityPanel) => {
    const workflow = nav.querySelector('#nav-cheatcodes') || nav.querySelector('.nav-link:not(#nav-recent):not(#nav-favorites):not(#nav-more)');
    const prompts = nav.querySelector('#nav-recent');
    const categories = nav.querySelector('#nav-categories');
    const favorites = nav.querySelector('#nav-favorites');
    const actions = utilityPanel.querySelector('.nav-more-actions');

    if (workflow && workflow.textContent.trim() !== 'Workflows') workflow.textContent = 'Workflows';
    if (prompts && prompts.textContent.trim() !== 'Prompts') prompts.textContent = 'Prompts';
    categories?.remove();

    if (favorites && favorites.parentElement !== actions) {
      favorites.textContent = 'Saved';
      favorites.classList.remove('active');
      favorites.classList.add('nav-utility-action');
      actions.prepend(favorites);
    } else if (favorites && favorites.textContent.trim() !== 'Saved') {
      favorites.textContent = 'Saved';
    }
  };

  const scheduleCompactNavigationSync = (nav, utilityPanel) => {
    const sync = () => syncCompactPrimaryNavigation(nav, utilityPanel);
    sync();
    requestAnimationFrame(sync);
    window.setTimeout(sync, 80);
    window.setTimeout(sync, 240);
    window.setTimeout(sync, 720);
  };

  const enhanceShell = () => {
    const header = document.querySelector('.site-header');
    const nav = header?.querySelector('nav');
    if (!header || !nav || header.dataset.enhanced === 'true') return;

    header.dataset.enhanced = 'true';
    document.title = 'SAMSON — AI Cheatcodes for Real Work';

    const subtitle = header.querySelector('.logo-text span');
    if (subtitle) subtitle.textContent = 'AI CHEATCODES & PROMPTS';

    const logoMark = header.querySelector('.logo-mark');
    if (logoMark) {
      logoMark.innerHTML = '<svg class="cloudflare-logo" viewBox="0 0 64 40" role="img" aria-label="Cloudflare" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M48.7 28.2c.4-1.2.6-2.5.6-3.8 0-6.9-5.6-12.5-12.5-12.5-5.2 0-9.7 3.2-11.6 7.8-.7-.2-1.4-.3-2.1-.3-4.2 0-7.6 3.4-7.6 7.6 0 .4 0 .8.1 1.2h33.1Z"/><path fill="currentColor" d="M8.1 28.2h45.7c1.3 0 2.3 1 2.3 2.3s-1 2.3-2.3 2.3H8.1c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3Z"/></svg>';
      logoMark.setAttribute('aria-label', 'Cloudflare');
    }

    const onboarding = document.createElement('button');
    onboarding.id = 'nav-onboarding';
    onboarding.type = 'button';
    onboarding.setAttribute('aria-label', 'Onboarding AI');
    onboarding.addEventListener('click', openOnboarding);

    const utility = createDesktopUtilityMenu(nav, onboarding);
    scheduleCompactNavigationSync(nav, utility.panel);

    const toggle = document.createElement('button');
    toggle.id = 'mobile-menu-toggle';
    toggle.className = 'mobile-menu-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Buka menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mobile-menu-panel');
    toggle.innerHTML = '<span></span><span></span><span></span>';

    const panel = document.createElement('div');
    panel.id = 'mobile-menu-panel';
    panel.className = 'mobile-menu-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `<div class="mobile-menu-title">SAMSON</div><div class="mobile-menu-group-label">WORK</div><button type="button" data-mobile-nav="workflows">Workflows</button><button type="button" data-mobile-nav="prompts">Prompts</button><button type="button" data-mobile-nav="favorites">Saved</button><div class="mobile-menu-divider"></div><div class="mobile-menu-group-label">HELP</div><button type="button" data-mobile-nav="onboarding">Onboarding AI</button><label class="mobile-theme-picker"><span>APPEARANCE</span><select id="mobile-theme-select" class="theme-picker" data-theme-select aria-label="UI Personality mobile">${themeOptionsMarkup()}</select></label>`;

    header.appendChild(toggle);
    header.insertAdjacentElement('afterend', panel);
    bindThemeSelect(panel.querySelector('[data-theme-select]'));

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    });

    panel.addEventListener('click', (event) => {
      const item = event.target.closest('[data-mobile-nav]');
      if (!item) return;

      const targets = {
        workflows: nav.querySelector('#nav-cheatcodes') || nav.querySelector('.nav-link.active'),
        prompts: nav.querySelector('#nav-recent'),
        favorites: nav.querySelector('#nav-favorites'),
        onboarding
      };
      targets[item.dataset.mobileNav]?.click();
      closeMobileMenu(toggle, panel);
    });

    document.addEventListener('click', (event) => {
      if (panel.classList.contains('is-open') && !panel.contains(event.target) && !toggle.contains(event.target)) {
        closeMobileMenu(toggle, panel);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.getElementById(ONBOARDING_ID)?.remove();
        closeMobileMenu(toggle, panel);
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 700) closeMobileMenu(toggle, panel);
    });
  };

  document.addEventListener('samson:shell-ready', enhanceShell);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceShell, { once: true });
  } else {
    enhanceShell();
  }
})();
