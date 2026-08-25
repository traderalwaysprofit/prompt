(() => {
  const escape = (v='') => String(v).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const palette = ['#18202b','#4f5968','#697585','#8a96a5'];
  const categoryKey = (name='') => {
    const n = name.toLowerCase();
    if (/copy|writing|content|artikel|caption|script/.test(n)) return 'writing';
    if (/design|visual|graphic|poster|logo|image|gambar/.test(n)) return 'design';
    if (/social|instagram|facebook|tiktok|media/.test(n)) return 'social';
    if (/marketing|ads|iklan|campaign|promotion/.test(n)) return 'marketing';
    if (/code|coding|developer|program|web|software/.test(n)) return 'code';
    if (/seo|search|keyword/.test(n)) return 'seo';
    if (/video|film|reel|youtube/.test(n)) return 'video';
    if (/email|mail|newsletter/.test(n)) return 'email';
    if (/business|bisnis|startup|entrepreneur/.test(n)) return 'business';
    if (/data|analytics|analysis|research/.test(n)) return 'data';
    if (/strategy|strategi|planning|plan/.test(n)) return 'strategy';
    if (/sales|selling|sales/.test(n)) return 'sales';
    if (/education|learning|belajar|course/.test(n)) return 'education';
    if (/finance|financial|keuangan|trading/.test(n)) return 'finance';
    if (/product|produk|ecommerce|shop/.test(n)) return 'product';
    if (/productivity|workflow|automation/.test(n)) return 'workflow';
    if (/hr|human|recruit|career|job/.test(n)) return 'people';
    if (/legal|law|hukum|contract/.test(n)) return 'legal';
    if (/ai|artificial|prompt/.test(n)) return 'ai';
    return 'general';
  };
  const shapes = {
    writing: '<path d="M18 3a3 3 0 0 1 3 3v11l-9 4-9-4V6a3 3 0 0 1 3-3h12Z"/><path d="M7 8h10M7 12h7M7 16h5"/>',
    design: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m6 17 4-4 3 3 2-2 3 3"/>',
    social: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 7h6M8 11h8M8 15h5"/><circle cx="17" cy="17" r="2"/>',
    marketing: '<path d="m4 11 11-5v12L4 14v-3Z"/><path d="M15 9h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3M7 15l1 5"/>',
    code: '<path d="m9 7-5 5 5 5M15 7l5 5-5 5M13 4l-2 16"/>',
    seo: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M7.5 10.5h6M10.5 7.5v6"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 6 3-6 3V9Z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    business: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 12h16"/>',
    data: '<path d="M5 19V9M12 19V5M19 19v-8"/><path d="M3 19h18"/>',
    strategy: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="m10 10-4-3M14 10l4-3M15 14l3 3"/>',
    sales: '<path d="M4 18h16M6 15l4-5 3 3 5-7"/><path d="M15 6h3v3"/>',
    education: '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 11v5c3 3 7 3 10 0v-5M21 9v7"/>',
    finance: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9.5c-.8-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2c-1.3 0-2.2-.3-3-1"/>',
    product: '<path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="M4 8v9l8 4 8-4V8M12 12v9"/>',
    workflow: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/><path d="M10 7h4a3 3 0 0 1 3 3v4M14 17h-4a3 3 0 0 1-3-3v-4"/>',
    people: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.7-4 2.7-6 6-6s5.3 2 6 6M15 14c3 0 5 2 6 6"/>',
    legal: '<path d="M12 3v17M5 7h14M4 7l-3 6h6L4 7ZM20 7l-3 6h6l-3-6ZM8 20h8"/>',
    ai: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="m10 10-4-3M14 10l4-3M10 14l-4 3M14 14l4 3"/>',
    general: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12h8M12 8v8"/>'
  };
  const svg = (category, label) => `<svg class="prompt-visual-svg" viewBox="0 0 120 90" role="img" aria-label="${escape(label)}"><defs><linearGradient id="g-${category}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e7ebf0"/></linearGradient></defs><rect x="5" y="5" width="110" height="80" rx="16" fill="url(#g-${category})"/><circle cx="96" cy="20" r="12" fill="#18202b" opacity=".07"/><path d="M12 68h96" stroke="#18202b" opacity=".08"/><g fill="none" stroke="#18202b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${shapes[category]||shapes.general}</g><circle cx="21" cy="21" r="3" fill="${palette[category.length%palette.length]}"/><text x="21" y="76" fill="#687281" font-family="ui-monospace,monospace" font-size="6" font-weight="700" letter-spacing="1">SAMSON // ${escape(category.toUpperCase())}</text></svg>`;
  const enhance = () => {
    document.querySelectorAll('.nft-card').forEach(card => {
      const art = card.querySelector('.nft-art'); if (!art || art.dataset.visualReady) return;
      const label = art.querySelector('small')?.textContent || 'GENERAL';
      const key = categoryKey(label.replace(/^SP\s*\/\/\s*/i,''));
      art.querySelectorAll(':scope > .svg-icon').forEach(x => x.remove());
      art.insertAdjacentHTML('afterbegin', svg(key, label));
      art.dataset.visualReady='1';
    });
    document.querySelectorAll('.modal-art').forEach(art => {
      if (art.dataset.visualReady) return;
      const label = document.querySelector('.modal header small')?.textContent || 'AI';
      art.innerHTML = svg(categoryKey(label), label) + '<span>SMART COMMAND</span>' + (art.querySelector('.modal-fav')?.outerHTML || '');
      art.dataset.visualReady='1';
    });
  };
  const observer = new MutationObserver(enhance);
  const start = () => { enhance(); observer.observe(document.body,{childList:true,subtree:true}); };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
