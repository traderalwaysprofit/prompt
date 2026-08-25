(() => {
  const apply = () => {
    document.title = 'SAMSON PROMPT Library';
    const logoText = document.querySelector('.logo-text');
    const subtitle = logoText?.querySelector('span');
    if (subtitle) subtitle.textContent = 'AI COMMAND LIBRARY';
    const logoMark = document.querySelector('.logo-mark');
    if (logoMark) {
      logoMark.innerHTML = '<svg class="cloudflare-logo" viewBox="0 0 64 40" role="img" aria-label="Cloudflare" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M48.7 28.2c.4-1.2.6-2.5.6-3.8 0-6.9-5.6-12.5-12.5-12.5-5.2 0-9.7 3.2-11.6 7.8-.7-.2-1.4-.3-2.1-.3-4.2 0-7.6 3.4-7.6 7.6 0 .4 0 .8.1 1.2h33.1Z"/><path fill="currentColor" d="M8.1 28.2h45.7c1.3 0 2.3 1 2.3 2.3s-1 2.3-2.3 2.3H8.1c-1.3 0-2.3-1-2.3-2.3s1-2.3-2.3-2.3Z"/></svg>';
      logoMark.setAttribute('aria-label', 'Cloudflare');
    }
    document.querySelectorAll('body *').forEach((el) => {
      if (el.children.length === 0 && /LEVEL\s*4/i.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/LEVEL\s*4\s*✓?/gi, '').trim();
    });
    const nav = document.querySelector('.site-header nav');
    if (nav && !nav.querySelector('#nav-onboarding')) {
      const button = document.createElement('button');
      button.className = 'nav-link onboarding-nav';
      button.id = 'nav-onboarding';
      button.type = 'button';
      button.setAttribute('aria-label', 'Onboarding AI');
      button.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4l2.5 2"></path></svg><span>Onboarding AI</span>';
      nav.appendChild(button);
      button.addEventListener('click', () => {
        let modal = document.querySelector('#ai-onboarding-modal');
        if (!modal) {
          modal = document.createElement('div'); modal.id = 'ai-onboarding-modal'; modal.className = 'overlay onboarding-overlay';
          modal.innerHTML = `<div class="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="ai-onboarding-title"><header class="onboarding-header"><div><span class="eyebrow">GET STARTED</span><h2 id="ai-onboarding-title">AI Model Onboarding</h2><small>Gunakan prompt SAMSON di berbagai model AI</small></div><button class="close onboarding-close" type="button" aria-label="Tutup">×</button></header><div class="modal-body onboarding-body"><label>1. PILIH MODEL AI</label><div class="onboarding-grid"><div class="onboarding-card"><div class="onboarding-card-head"><span>CHATGPT</span><small>OpenAI</small></div><p>Salin prompt → buka ChatGPT → tempel → sesuaikan variabel → kirim.</p></div><div class="onboarding-card"><div class="onboarding-card-head"><span>GEMINI</span><small>Google</small></div><p>Salin prompt → buka Gemini → tempel → tambahkan konteks atau file → kirim.</p></div><div class="onboarding-card"><div class="onboarding-card-head"><span>CLAUDE</span><small>Anthropic</small></div><p>Salin prompt → buka Claude → tempel → berikan konteks → iterasikan.</p></div><div class="onboarding-card"><div class="onboarding-card-head"><span>OTHER AI</span><small>Universal</small></div><p>Gunakan prompt yang sama. Tambahkan konteks, format output, dan contoh bila diperlukan.</p></div></div><label>2. TIPS PROMPT</label><div class="codebox onboarding-tip">Ganti bagian [VARIABEL] sesuai kebutuhan. Tambahkan tujuan, konteks, batasan, dan format output untuk hasil lebih konsisten.</div></div></div>`;
          document.body.appendChild(modal); modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.close')) modal.remove(); });
        }
      });
    }
    if (nav && !nav.querySelector('#mobile-menu-toggle')) {
      const toggle = document.createElement('button'); toggle.id = 'mobile-menu-toggle'; toggle.className = 'mobile-menu-toggle'; toggle.type = 'button'; toggle.setAttribute('aria-label','Buka menu'); toggle.setAttribute('aria-expanded','false');
      toggle.innerHTML = '<span></span><span></span><span></span>';
      const menu = document.createElement('div'); menu.id = 'mobile-nav-menu'; menu.className = 'mobile-nav-menu';
      menu.innerHTML = '<div class="mobile-menu-title">SAMSON PROMPT</div><button type="button" class="mobile-menu-item" data-action="onboarding">⌁ <span>Onboarding AI</span></button>';
      document.body.appendChild(menu); nav.parentElement?.appendChild(toggle);
      const open = () => { menu.classList.add('is-open'); toggle.classList.add('is-open'); toggle.setAttribute('aria-expanded','true'); toggle.setAttribute('aria-label','Tutup menu'); };
      const close = () => { menu.classList.remove('is-open'); toggle.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Buka menu'); };
      toggle.addEventListener('click', () => menu.classList.contains('is-open') ? close() : open());
      menu.addEventListener('click', (e) => { if (e.target.closest('[data-action="onboarding"]')) { close(); button?.click(); } });
      document.addEventListener('click', (e) => { if (menu.classList.contains('is-open') && !menu.contains(e.target) && e.target !== toggle) close(); });
    }
    if (!document.querySelector('#samson-onboarding-style')) {
      const style = document.createElement('style'); style.id = 'samson-onboarding-style'; style.textContent = `
        .onboarding-nav{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;white-space:nowrap;flex:0 0 auto}
        .mobile-menu-toggle,.mobile-nav-menu{display:none}
        .onboarding-overlay{padding:20px!important;align-items:center!important;justify-content:center!important}.onboarding-modal{width:min(720px,calc(100vw - 32px));max-height:min(720px,calc(100dvh - 32px));overflow:hidden;border-radius:24px}.onboarding-header{padding:22px 24px 18px!important}.onboarding-body{padding:20px 24px 24px!important;overflow-y:auto;max-height:calc(min(720px,100dvh - 32px) - 92px)}.onboarding-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:10px 0 22px}.onboarding-card{padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.035);min-width:0}.onboarding-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.onboarding-card-head span{font-size:12px;font-weight:800;letter-spacing:.08em}.onboarding-card-head small{opacity:.55;font-size:10px}.onboarding-card p{margin:0;font-size:12px;line-height:1.65;opacity:.72}.onboarding-tip{font-size:12px;line-height:1.65;margin-top:10px}
        @media(max-width:700px){.site-header nav{display:none!important}.mobile-menu-toggle{display:flex;position:absolute;right:14px;top:50%;transform:translateY(-50%);width:42px;height:42px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.04);align-items:center;justify-content:center;flex-direction:column;gap:4px;color:inherit;z-index:20}.mobile-menu-toggle span{width:17px;height:1.5px;background:currentColor;border-radius:2px;transition:.2s}.mobile-menu-toggle.is-open span:nth-child(1){transform:translateY(5.5px) rotate(45deg)}.mobile-menu-toggle.is-open span:nth-child(2){opacity:0}.mobile-menu-toggle.is-open span:nth-child(3){transform:translateY(-5.5px) rotate(-45deg)}.mobile-nav-menu{display:block;position:absolute;top:calc(100% + 8px);right:12px;width:min(250px,calc(100vw - 24px));padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(18,18,20,.96);backdrop-filter:blur(18px);box-shadow:0 18px 50px rgba(0,0,0,.28);opacity:0;visibility:hidden;transform:translateY(-8px) scale(.98);transition:.2s;z-index:30}.mobile-nav-menu.is-open{opacity:1;visibility:visible;transform:none}.mobile-menu-title{padding:8px 10px 10px;font-size:10px;font-weight:800;letter-spacing:.12em;opacity:.45}.mobile-menu-item{width:100%;display:flex;align-items:center;gap:10px;padding:12px 10px;border:0;border-radius:10px;background:transparent;color:inherit;text-align:left;font-size:13px}.mobile-menu-item:active{background:rgba(255,255,255,.08)}.onboarding-modal{width:calc(100vw - 20px);max-height:calc(100dvh - 20px);border-radius:20px}.onboarding-header{padding:18px 18px 14px!important}.onboarding-body{padding:16px 18px 20px!important;max-height:calc(100dvh - 100px)}.onboarding-grid{grid-template-columns:1fr;gap:9px;margin-bottom:18px}.onboarding-card{padding:13px}.onboarding-card p{font-size:11px}.onboarding-header h2{font-size:20px}}
        @media(max-width:380px){.mobile-menu-toggle{right:10px;width:40px;height:40px}.mobile-nav-menu{right:10px;width:calc(100vw - 20px)}.onboarding-overlay{padding:10px!important}.onboarding-modal{width:calc(100vw - 12px)}.onboarding-header{padding:15px 14px 12px!important}.onboarding-body{padding:14px!important}.onboarding-card-head span{font-size:11px}}
      `; document.head.appendChild(style);
    }
    const stats = document.querySelector('.hero-stats'); if (stats) { const spans = stats.querySelectorAll('span'); if (spans[1]) { const value = spans[1].querySelector('b'); if (value) value.textContent = '20'; } }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true }); else apply(); window.__samsonApplyHomePatch = apply;
})();
