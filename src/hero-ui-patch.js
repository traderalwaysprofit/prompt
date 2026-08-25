(() => {
  const apply = () => {
    const heroCard = document.querySelector('.hero-card');
    if (heroCard) {
      heroCard.innerHTML = `
        <div class="hero-system-top">
          <span class="tag">AI COMMAND SYSTEM</span>
          <span class="hero-system-status"><i></i> ONLINE</span>
        </div>
        <div class="hero-card-icon">${window.__samsonHeroIcon ? window.__samsonHeroIcon() : '✦'}</div>
        <h3>SMART<br><span>DISCOVERY</span></h3>
        <p>SEARCH <b>•</b> SAVE <b>•</b> REUSE</p>
        <div class="hero-system-meta">
          <span>200 PROMPTS</span>
          <span>20 CATEGORIES</span>
        </div>`;
      heroCard.classList.add('hero-card-modern');
    }

    // Remove every visible legacy Level 4 label without touching functional data.
    document.querySelectorAll('body *').forEach((el) => {
      if (el.children.length === 0 && /LEVEL\s*4/i.test(el.textContent || '')) {
        el.textContent = (el.textContent || '').replace(/LEVEL\s*4\s*✓?/gi, '').trim();
      }
    });

    if (!document.querySelector('#samson-hero-ui-style')) {
      const style = document.createElement('style');
      style.id = 'samson-hero-ui-style';
      style.textContent = `
        .hero-card-modern{position:relative;overflow:hidden;background:#fff!important;border:1px solid rgba(24,32,43,.10)!important;box-shadow:0 24px 60px rgba(24,32,43,.10)!important;border-radius:24px!important;color:#18202b!important;padding:24px!important}
        .hero-card-modern:before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(24,32,43,.035),transparent 55%);pointer-events:none}
        .hero-system-top,.hero-system-meta{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .hero-system-status{font-size:9px;font-weight:800;letter-spacing:.12em;color:#667085;white-space:nowrap}
        .hero-system-status i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#22a06b;margin-right:5px;vertical-align:1px}
        .hero-card-modern .hero-card-icon{position:relative;margin:30px 0 18px;width:48px;height:48px;border-radius:14px;background:#18202b;color:#fff;display:grid;place-items:center}
        .hero-card-modern h3{position:relative;margin:0;font-size:34px;line-height:.95;letter-spacing:-.04em;color:#18202b!important}
        .hero-card-modern h3 span{color:#667085}
        .hero-card-modern p{position:relative;margin:14px 0 28px;color:#667085!important;font-size:10px;letter-spacing:.14em;font-weight:700}
        .hero-card-modern p b{margin:0 5px;color:#a0a6af}
        .hero-system-meta{padding-top:15px;border-top:1px solid rgba(24,32,43,.09);font-size:9px;font-weight:800;letter-spacing:.08em;color:#667085}
        .hero-card-modern .tag{position:relative;color:#667085!important;background:#f3f4f6!important;border:1px solid rgba(24,32,43,.06);border-radius:999px;padding:7px 9px;font-size:9px;font-weight:800;letter-spacing:.08em}
        @media(max-width:700px){.hero-card-modern{padding:20px!important;border-radius:20px!important}.hero-card-modern .hero-card-icon{margin:22px 0 15px;width:42px;height:42px}.hero-card-modern h3{font-size:28px}.hero-system-meta{font-size:8px}.hero-system-status{font-size:8px}}
        @media(max-width:380px){.hero-card-modern{padding:18px!important}.hero-system-meta{flex-direction:column;align-items:flex-start;gap:5px}}
      `;
      document.head.appendChild(style);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once:true }); else apply();
  setTimeout(apply, 250);
})();
