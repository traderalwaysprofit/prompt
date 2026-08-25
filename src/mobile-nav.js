(() => {
  const init = () => {
    const nav = document.querySelector('.site-header nav');
    if (!nav || document.querySelector('#samson-mobile-nav')) return;

    const header = nav.closest('.site-header') || nav.parentElement;
    const toggle = document.createElement('button');
    toggle.id = 'samson-mobile-nav-toggle';
    toggle.className = 'samson-mobile-nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Buka menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span></span><span></span><span></span>';

    const menu = document.createElement('div');
    menu.id = 'samson-mobile-nav';
    menu.className = 'samson-mobile-nav';
    menu.setAttribute('aria-hidden', 'true');

    const title = document.createElement('div');
    title.className = 'samson-mobile-nav-title';
    title.textContent = 'SAMSON PROMPT';
    menu.appendChild(title);

    const items = Array.from(nav.children).filter(el => {
      const tag = el.tagName.toLowerCase();
      return tag === 'a' || tag === 'button' || el.getAttribute('role') === 'button';
    });

    items.forEach((original, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'samson-mobile-nav-item';
      item.innerHTML = original.innerHTML;
      const label = (original.textContent || '').trim();
      item.setAttribute('aria-label', label || `Menu ${index + 1}`);
      item.addEventListener('click', () => {
        if (original.tagName.toLowerCase() === 'a' && original.href) {
          window.location.href = original.href;
        } else {
          original.click();
        }
        close();
      });
      menu.appendChild(item);
    });

    if (!items.length) {
      const onboarding = document.querySelector('#nav-onboarding');
      if (onboarding) {
        const item = document.createElement('button');
        item.type = 'button'; item.className = 'samson-mobile-nav-item';
        item.innerHTML = onboarding.innerHTML; item.textContent = 'Onboarding AI';
        item.addEventListener('click', () => { onboarding.click(); close(); });
        menu.appendChild(item);
      }
    }

    const close = () => {
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Buka menu');
      menu.setAttribute('aria-hidden', 'true');
    };
    const open = () => {
      menu.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Tutup menu');
      menu.setAttribute('aria-hidden', 'false');
    };

    toggle.addEventListener('click', e => { e.stopPropagation(); menu.classList.contains('is-open') ? close() : open(); });
    document.addEventListener('click', e => {
      if (menu.classList.contains('is-open') && !menu.contains(e.target) && e.target !== toggle) close();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    header.appendChild(toggle);
    header.appendChild(menu);

    const style = document.createElement('style');
    style.textContent = `
      .samson-mobile-nav-toggle,.samson-mobile-nav{display:none}
      @media(max-width:700px){
        .site-header nav{display:none!important}
        .samson-mobile-nav-toggle{display:flex;position:absolute;right:14px;top:50%;transform:translateY(-50%);width:42px;height:42px;align-items:center;justify-content:center;flex-direction:column;gap:4px;padding:0;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.045);color:inherit;z-index:100;cursor:pointer}
        .samson-mobile-nav-toggle span{width:18px;height:1.5px;background:currentColor;border-radius:3px;transition:transform .2s,opacity .2s}
        .samson-mobile-nav-toggle.is-open span:nth-child(1){transform:translateY(5.5px) rotate(45deg)}
        .samson-mobile-nav-toggle.is-open span:nth-child(2){opacity:0}
        .samson-mobile-nav-toggle.is-open span:nth-child(3){transform:translateY(-5.5px) rotate(-45deg)}
        .samson-mobile-nav{display:block;position:absolute;top:calc(100% + 8px);right:12px;width:min(280px,calc(100vw - 24px));max-height:calc(100dvh - 90px);overflow-y:auto;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(20,22,26,.97);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 20px 60px rgba(0,0,0,.35);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-8px) scale(.98);transition:opacity .18s,transform .18s,visibility .18s;z-index:99}
        .samson-mobile-nav.is-open{opacity:1;visibility:visible;pointer-events:auto;transform:none}
        .samson-mobile-nav-title{padding:8px 10px 10px;font-size:10px;font-weight:800;letter-spacing:.13em;opacity:.45}
        .samson-mobile-nav-item{width:100%;display:flex;align-items:center;gap:9px;min-height:44px;padding:10px 11px;border:0;border-radius:11px;background:transparent;color:inherit;text-align:left;font:inherit;font-size:13px;cursor:pointer}
        .samson-mobile-nav-item:hover,.samson-mobile-nav-item:active{background:rgba(255,255,255,.07)}
        .samson-mobile-nav-item .svg-icon{width:18px;height:18px;flex:0 0 18px}
      }
      @media(max-width:380px){.samson-mobile-nav-toggle{right:10px;width:40px;height:40px}.samson-mobile-nav{right:10px;width:calc(100vw - 20px)}}
    `;
    document.head.appendChild(style);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0), { once: true });
  else setTimeout(init, 0);
})();
