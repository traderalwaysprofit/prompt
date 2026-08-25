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
          modal = document.createElement('div');
          modal.id = 'ai-onboarding-modal';
          modal.className = 'overlay onboarding-overlay';
          modal.innerHTML = `<div class="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="ai-onboarding-title"><header class="onboarding-header"><div><span class="eyebrow">GET STARTED</span><h2 id="ai-onboarding-title">AI Model Onboarding</h2><small>Gunakan prompt SAMSON di berbagai model AI</small></div><button class="close onboarding-close" type="button" aria-label="Tutup">×</button></header><div class="modal-body onboarding-body"><label>1. PILIH MODEL AI</label><div class="onboarding-grid"><div class="onboarding-card"><div class="onboarding-card-head"><span>CHATGPT</span><small>OpenAI</small></div><p>Salin prompt → buka ChatGPT → tempel → sesuaikan variabel → kirim.</p></div><div class="onboarding-card"><div class="onboarding-card-head"><span>GEMINI</span><small>Google</small></div><p>Salin prompt → buka Gemini → tempel → tambahkan konteks atau file → kirim.</p></div><div class="onboarding-card"><div class="onboarding-card-head"><span>CLAUDE</span><small>Anthropic</small></div><p>Salin prompt → buka Claude → tempel → berikan konteks → iterasikan.</p></div><div class="onboarding-card"><div class="onboarding-card-head"><span>OTHER AI</span><small>Universal</small></div><p>Gunakan prompt yang sama. Tambahkan konteks, format output, dan contoh bila diperlukan.</p></div></div><label>2. TIPS PROMPT</label><div class="codebox onboarding-tip">Ganti bagian [VARIABEL] sesuai kebutuhan. Tambahkan tujuan, konteks, batasan, dan format output untuk hasil lebih konsisten.</div></div></div>`;
          document.body.appendChild(modal);
          modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.close')) modal.remove(); });
        }
      });
    }
    if (!document.querySelector('#samson-onboarding-style')) {
      const style = document.createElement('style');
      style.id = 'samson-onboarding-style';
      style.textContent = `.onboarding-nav{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;white-space:nowrap;flex:0 0 auto}.onboarding-overlay{padding:20px!important;align-items:center!important;justify-content:center!important}.onboarding-modal{width:min(720px,calc(100vw - 32px));max-height:min(720px,calc(100dvh - 32px));overflow:hidden;border-radius:24px}.onboarding-header{padding:22px 24px 18px!important}.onboarding-body{padding:20px 24px 24px!important;overflow-y:auto;max-height:calc(min(720px,100dvh - 32px) - 92px)}.onboarding-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:10px 0 22px}.onboarding-card{padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.035);min-width:0}.onboarding-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.onboarding-card-head span{font-size:12px;font-weight:800;letter-spacing:.08em}.onboarding-card-head small{opacity:.55;font-size:10px}.onboarding-card p{margin:0;font-size:12px;line-height:1.65;opacity:.72}.onboarding-tip{font-size:12px;line-height:1.65;margin-top:10px}@media(max-width:700px){.site-header nav{display:flex!important;align-items:center;gap:6px;overflow-x:auto;scrollbar-width:none}.site-header nav::-webkit-scrollbar{display:none}.onboarding-nav{display:inline-flex!important;visibility:visible!important;opacity:1!important;padding:9px!important;min-width:38px;min-height:38px}.onboarding-nav span{display:none!important}.onboarding-modal{width:calc(100vw - 20px);max-height:calc(100dvh - 20px);border-radius:20px}.onboarding-header{padding:18px 18px 14px!important}.onboarding-body{padding:16px 18px 20px!important;max-height:calc(100dvh - 100px)}.onboarding-grid{grid-template-columns:1fr;gap:9px;margin-bottom:18px}.onboarding-card{padding:13px}.onboarding-card p{font-size:11px}.onboarding-header h2{font-size:20px}}@media(max-width:380px){.onboarding-overlay{padding:10px!important}.onboarding-modal{width:calc(100vw - 12px)}.onboarding-header{padding:15px 14px 12px!important}.onboarding-body{padding:14px!important}.onboarding-card-head span{font-size:11px}}`;
      document.head.appendChild(style);
    }
    const stats = document.querySelector('.hero-stats');
    if (stats) { const spans = stats.querySelectorAll('span'); if (spans[1]) { const value = spans[1].querySelector('b'); if (value) value.textContent = '20'; } }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true }); else apply();
  window.__samsonApplyHomePatch = apply;
})();
