(() => {
  const init = () => {
    const nav = document.querySelector('.site-header nav');
    if (!nav) return;
    const header = nav.closest('.site-header') || nav.parentElement;
    if (!header) return;

    // Keep one canonical mobile navigation. Older UI patches may have created a second menu.
    document.querySelector('#mobile-menu-toggle')?.remove();
    document.querySelector('#mobile-nav-menu')?.remove();
    document.querySelector('#samson-mobile-nav')?.remove();
    document.querySelector('#samson-mobile-nav-toggle')?.remove();

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

    const rebuild = () => {
      menu.innerHTML = '<div class="samson-mobile-nav-title"><strong>SAMSON PROMPT</strong><span>MENU</span></div>';
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
          if (original.tagName.toLowerCase() === 'a' && original.href) window.location.href = original.href;
          else original.click();
          close();
        });
        menu.appendChild(item);
      });
    };

    const close = () => {
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Buka menu');
      menu.setAttribute('aria-hidden', 'true');
    };
    const open = () => {
      rebuild();
      menu.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Tutup menu');
      menu.setAttribute('aria-hidden', 'false');
    };

    rebuild();
    header.appendChild(toggle);
    header.appendChild(menu);

    toggle.addEventListener('click', e => {
      e.stopPropagation();
      menu.classList.contains('is-open') ? close() : open();
    });
    document.addEventListener('click', e => {
      if (menu.classList.contains('is-open') && !menu.contains(e.target) && e.target !== toggle) close();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    // If another patch adds a header item later (e.g. Onboarding AI), it appears automatically.
    const observer = new MutationObserver(() => { if (!menu.classList.contains('is-open')) rebuild(); });
    observer.observe(nav, { childList: true });

    const style = document.createElement('style');
    style.id = 'samson-mobile-nav-style';
    style.textContent = `
      .samson-mobile-nav-toggle,.samson-mobile-nav{display:none}
      @media(max-width:700px){
        .site-header{position:sticky;z-index:100}
        .site-header nav{display:none!important}
        .samson-mobile-nav-toggle{display:flex;position:absolute;right:14px;top:50%;transform:translateY(-50%);width:42px;height:42px;align-items:center;justify-content:center;flex-direction:column;gap:4px;padding:0;border:1px solid #dfe3e8;border-radius:10px;background:#fff;color:#18202b;box-shadow:0 5px 16px rgba(24,32,43,.08);z-index:110;cursor:pointer;transition:.18s}
        .samson-mobile-nav-toggle:hover,.samson-mobile-nav-toggle.is-open{background:#18202b;color:#fff;border-color:#18202b}
        .samson-mobile-nav-toggle span{width:18px;height:1.5px;background:currentColor;border-radius:3px;transition:transform .2s,opacity .2s}
        .samson-mobile-nav-toggle.is-open span:nth-child(1){transform:translateY(5.5px) rotate(45deg)}
        .samson-mobile-nav-toggle.is-open span:nth-child(2){opacity:0}
        .samson-mobile-nav-toggle.is-open span:nth-child(3){transform:translateY(-5.5px) rotate(-45deg)}
        .samson-mobile-nav{display:block;position:absolute;top:calc(100% + 8px);right:12px;width:min(300px,calc(100vw - 24px));max-height:calc(100dvh - 86px);overflow-y:auto;padding:10px;border:1px solid #dfe3e8;border-radius:16px;background:rgba(255,255,255,.98);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 20px 55px rgba(24,32,43,.16);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-8px) scale(.98);transition:opacity .18s,transform .18s,visibility .18s;z-index:105}
        .samson-mobile-nav.is-open{opacity:1;visibility:visible;pointer-events:auto;transform:none}
        .samson-mobile-nav-title{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 10px;border-bottom:1px solid #edf0f3;margin-bottom:4px}
        .samson-mobile-nav-title strong{font-size:10px;letter-spacing:.11em;color:#18202b}.samson-mobile-nav-title span{font:800 8px ui-monospace,monospace;letter-spacing:.12em;color:#98a0ad}
        .samson-mobile-nav-item{width:100%;display:flex;align-items:center;gap:10px;min-height:46px;padding:10px 11px;border:0;border-radius:10px;background:transparent;color:#596371;text-align:left;font:600 13px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;transition:.16s}
        .samson-mobile-nav-item:hover,.samson-mobile-nav-item:active,.samson-mobile-nav-item:focus-visible{background:#f0f2f5;color:#18202b;outline:none}
        .samson-mobile-nav-item .svg-icon{width:18px;height:18px;flex:0 0 18px;color:#7c8795}
        .samson-mobile-nav-item:hover .svg-icon,.samson-mobile-nav-item:active .svg-icon{color:#18202b}
      }
      @media(max-width:380px){.samson-mobile-nav-toggle{right:10px;width:40px;height:40px}.samson-mobile-nav{right:10px;width:calc(100vw - 20px)}.samson-mobile-nav-item{min-height:44px;font-size:12px}}
    `;
    document.head.appendChild(style);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0), { once: true });
  else setTimeout(init, 0);
})();
