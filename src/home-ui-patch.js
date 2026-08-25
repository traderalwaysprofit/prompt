(() => {
  const apply = () => {
    document.title = 'SAMSON PROMPT Library';
    const logoText = document.querySelector('.logo-text');
    const subtitle = logoText?.querySelector('span');
    if (subtitle) subtitle.textContent = 'AI COMMAND LIBRARY';

    // Remove visible Level 4 wording from homepage without touching application logic.
    document.querySelectorAll('body *').forEach((el) => {
      if (el.children.length === 0 && /LEVEL\s*4/i.test(el.textContent || '')) {
        el.textContent = (el.textContent || '').replace(/LEVEL\s*4\s*✓?/gi, '').trim();
      }
    });

    // Add a lightweight onboarding menu once to the existing header.
    const nav = document.querySelector('.site-header nav');
    if (nav && !nav.querySelector('#nav-onboarding')) {
      const button = document.createElement('button');
      button.className = 'nav-link';
      button.id = 'nav-onboarding';
      button.type = 'button';
      button.innerHTML = '<svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4l2.5 2"></path></svg><span>Onboarding AI</span>';
      nav.appendChild(button);
      button.addEventListener('click', () => {
        let modal = document.querySelector('#ai-onboarding-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'ai-onboarding-modal';
          modal.className = 'overlay';
          modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ai-onboarding-title">
            <header><div><span class="eyebrow">GET STARTED</span><h2 id="ai-onboarding-title">AI Model Onboarding</h2><small>Gunakan prompt SAMSON di berbagai model AI</small></div><button class="close" type="button" aria-label="Tutup">×</button></header>
            <div class="modal-body">
              <label>1. PILIH MODEL AI</label>
              <div class="smart-panels">
                <div class="smart-panel"><div class="smart-panel-head"><span>CHATGPT</span><small>OpenAI</small></div><p>Salin prompt → buka ChatGPT → tempel prompt → sesuaikan variabel → kirim.</p></div>
                <div class="smart-panel"><div class="smart-panel-head"><span>GEMINI</span><small>Google</small></div><p>Salin prompt → buka Gemini → tempel → tambahkan konteks atau file bila diperlukan → kirim.</p></div>
                <div class="smart-panel"><div class="smart-panel-head"><span>CLAUDE</span><small>Anthropic</small></div><p>Salin prompt → buka Claude → tempel → berikan konteks → kirim dan iterasikan hasilnya.</p></div>
                <div class="smart-panel"><div class="smart-panel-head"><span>OTHER AI</span><small>Universal</small></div><p>Gunakan prompt yang sama pada model AI lain. Jika hasil berbeda, tambahkan konteks, format output, dan contoh.</p></div>
              </div>
              <label>2. TIPS PROMPT</label><div class="codebox">Ganti bagian [VARIABEL] sesuai kebutuhan. Tambahkan tujuan, konteks, batasan, dan format output untuk hasil yang lebih konsisten.</div>
            </div>
          </div>`;
          document.body.appendChild(modal);
          modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.close')) modal.remove(); });
        }
      });
    }

    const stats = document.querySelector('.hero-stats');
    if (stats) {
      const spans = stats.querySelectorAll('span');
      if (spans[1]) {
        const value = spans[1].querySelector('b');
        if (value) value.textContent = '20';
      }
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  window.__samsonApplyHomePatch = apply;
})();
