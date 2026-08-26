(()=>{
 const init=()=>{
  const header=document.querySelector('.site-header');if(!header)return;
  const nav=header.querySelector('nav');if(!nav)return;
  let toggle=header.querySelector('#mobile-menu-toggle');
  if(!toggle){toggle=document.createElement('button');toggle.id='mobile-menu-toggle';toggle.className='mobile-menu-toggle';toggle.type='button';toggle.setAttribute('aria-label','Buka menu');toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span></span><span></span><span></span>';header.appendChild(toggle);}
  let onboarding=nav.querySelector('[data-action="onboarding"]');
  if(!onboarding){onboarding=document.createElement('button');onboarding.type='button';onboarding.className='nav-link nav-onboarding';onboarding.textContent='Onboarding AI';onboarding.dataset.action='onboarding';nav.appendChild(onboarding);}
  let panel=document.querySelector('.mobile-menu-panel');
  if(!panel){panel=document.createElement('div');panel.className='mobile-menu-panel';panel.innerHTML='<div class="mobile-menu-title">SAMSON PROMPT</div><button data-mobile-nav="explore">Explore</button><button data-mobile-nav="recent">Recently Used</button><button data-mobile-nav="favorites">Favorites</button><button data-mobile-nav="onboarding">Onboarding AI</button>';header.insertAdjacentElement('afterend',panel);}
  if(toggle.dataset.bound==='1')return;toggle.dataset.bound='1';
  const close=()=>{panel.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Buka menu')};
  toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=!panel.classList.contains('is-open');panel.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Tutup menu':'Buka menu')});
  panel.addEventListener('click',e=>{const b=e.target.closest('[data-mobile-nav]');if(!b)return;e.preventDefault();e.stopPropagation();const action=b.dataset.mobileNav;if(action==='onboarding'){window.dispatchEvent(new CustomEvent('samson:onboarding'));close();return}const target=action==='recent'?nav.querySelector('#nav-recent'):action==='favorites'?nav.querySelector('#nav-favorites'):nav.querySelector('.nav-link:not([data-action="onboarding"])');if(target){target.click();}close()});
  onboarding.addEventListener('click',e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('samson:onboarding'));close()});
  document.addEventListener('click',e=>{if(panel.classList.contains('is-open')&&!panel.contains(e.target)&&e.target!==toggle)close()});
  window.addEventListener('resize',()=>{if(window.innerWidth>700)close()});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 new MutationObserver(init).observe(document.documentElement,{childList:true,subtree:true});
})();
