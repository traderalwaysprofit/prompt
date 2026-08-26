document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.site-header');
  if(!header)return;
  const nav=header.querySelector('nav');
  if(!nav)return;
  let toggle=header.querySelector('#mobile-menu-toggle');
  if(!toggle){
    toggle=document.createElement('button');
    toggle.id='mobile-menu-toggle';
    toggle.className='mobile-menu-toggle';
    toggle.type='button';
    toggle.setAttribute('aria-label','Buka menu');
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<span></span><span></span><span></span>';
    header.appendChild(toggle);
  }
  const onboarding=document.createElement('button');
  onboarding.type='button';
  onboarding.className='nav-link nav-onboarding';
  onboarding.textContent='Onboarding AI';
  onboarding.dataset.action='onboarding';
  if(!nav.querySelector('[data-action="onboarding"]'))nav.appendChild(onboarding);
  const panel=document.createElement('div');
  panel.className='mobile-menu-panel';
  panel.innerHTML='<div class="mobile-menu-title">SAMSON PROMPT</div><button data-mobile-nav="explore">Explore</button><button data-mobile-nav="recent">Recently Used</button><button data-mobile-nav="favorites">Favorites</button><button data-mobile-nav="onboarding">Onboarding AI</button>';
  header.parentElement.insertBefore(panel,header.nextSibling);
  const close=()=>{panel.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Buka menu')};
  toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=!panel.classList.contains('is-open');panel.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Tutup menu':'Buka menu')});
  panel.addEventListener('click',e=>{const b=e.target.closest('[data-mobile-nav]');if(!b)return;e.preventDefault();e.stopPropagation();const action=b.dataset.mobileNav;if(action==='onboarding'){window.dispatchEvent(new CustomEvent('samson:onboarding'));close();return}const target=action==='recent'?nav.querySelector('#nav-recent'):action==='favorites'?nav.querySelector('#nav-favorites'):nav.querySelector('.nav-link');if(target)target.click();close()});
  onboarding.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('samson:onboarding')));
  document.addEventListener('click',e=>{if(panel.classList.contains('is-open')&&!panel.contains(e.target)&&e.target!==toggle)close()});
  window.addEventListener('resize',()=>{if(window.innerWidth>700)close()});
  window.addEventListener('samson:onboarding',()=>{let modal=document.querySelector('#onboarding-panel');if(!modal){modal=document.createElement('div');modal.id='onboarding-panel';modal.className='onboarding-overlay';modal.innerHTML='<div class="onboarding-card"><button class="onboarding-close" aria-label="Tutup">×</button><span class="eyebrow">AI ONBOARDING</span><h2>Cara menggunakan SAMSON PROMPT</h2><p>Pilih kategori atau gunakan pencarian, buka prompt, lalu tekan <b>Copy</b> pada prompt atau example. Setelah tersalin, tempelkan ke ChatGPT, Gemini, Claude, atau model AI pilihan Anda.</p><div class="onboarding-steps"><div><b>01</b><span>Explore prompt</span></div><div><b>02</b><span>Open & review</span></div><div><b>03</b><span>Copy & use</span></div></div></div>';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.onboarding-close'))modal.remove()})}});
});
