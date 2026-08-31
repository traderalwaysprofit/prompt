(() => {
  'use strict';

  const ONBOARDING_ID = 'ai-onboarding-modal';
  const COMPLETE_KEY = 'samsonOnboardingCompleted';
  const AUTO_DELAY_MS = 800;
  let autoTimer = null;

  const isComplete = () => {
    try {
      return localStorage.getItem(COMPLETE_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const markComplete = () => {
    try {
      localStorage.setItem(COMPLETE_KEY, 'true');
    } catch {
      // Onboarding remains usable even when storage is unavailable.
    }
  };

  const closeUtilitySurfaces = () => {
    const more = document.querySelector('#nav-more');
    const moreMenu = document.querySelector('#nav-more-menu');
    if (more && moreMenu) {
      more.setAttribute('aria-expanded', 'false');
      moreMenu.setAttribute('aria-hidden', 'true');
      moreMenu.classList.remove('is-open');
    }

    const mobileToggle = document.querySelector('#mobile-menu-toggle');
    const mobilePanel = document.querySelector('#mobile-menu-panel');
    if (mobileToggle && mobilePanel) {
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.setAttribute('aria-label', 'Buka menu');
      mobilePanel.setAttribute('aria-hidden', 'true');
      mobilePanel.classList.remove('is-open');
    }
  };

  const routeTo = (target) => {
    if (target === 'workflows') {
      const workflowAction = document.querySelector('#workflow-choice [data-show-workflows], [data-show-workflows]');
      if (workflowAction instanceof HTMLElement) {
        workflowAction.click();
        return;
      }
      location.hash = '#workflows';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }

    if (target === 'prompts') {
      const promptAction = document.querySelector('#nav-recent, [data-route-prompts]');
      if (promptAction instanceof HTMLElement) {
        promptAction.click();
        return;
      }
      location.hash = '#prompts';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  const onboardingMarkup = () => `
    <div class="modal onboarding-modal onboarding-v2" role="dialog" aria-modal="true" aria-labelledby="samson-onboarding-title" aria-describedby="samson-onboarding-description">
      <header class="onboarding-header onboarding-v2-header">
        <div>
          <span class="eyebrow">GET STARTED</span>
          <h2 id="samson-onboarding-title">Cara Menggunakan SAMSON</h2>
          <small id="samson-onboarding-description">Tiga langkah singkat untuk memilih prompt atau menyelesaikan pekerjaan dengan workflow.</small>
        </div>
        <button class="close onboarding-close" type="button" aria-label="Tutup onboarding">×</button>
      </header>

      <div class="modal-body onboarding-body onboarding-v2-body">
        <section class="onboarding-step" aria-labelledby="samson-step-choose">
          <div class="onboarding-step-head">
            <span class="onboarding-step-number">01</span>
            <div>
              <h3 id="samson-step-choose">Pilih jalur kerja</h3>
              <p>Mulai dari tujuan kerja atau langsung gunakan satu kemampuan AI tertentu.</p>
            </div>
          </div>
          <div class="onboarding-path-grid">
            <article class="onboarding-path-card">
              <span class="onboarding-path-label">WORKFLOWS</span>
              <strong>Selesaikan pekerjaan bertahap</strong>
              <p>Cocok untuk Build Website, WordPress Audit, SEO, marketing campaign, research, dan pekerjaan multi-step.</p>
            </article>
            <article class="onboarding-path-card">
              <span class="onboarding-path-label">PROMPTS</span>
              <strong>Gunakan satu kemampuan AI</strong>
              <p>Cocok jika Anda sudah tahu instruksi yang dibutuhkan, misalnya /poster, /github, /wpaudit, atau /antislopui.</p>
            </article>
          </div>
        </section>

        <section class="onboarding-step" aria-labelledby="samson-step-run">
          <div class="onboarding-step-head">
            <span class="onboarding-step-number">02</span>
            <div>
              <h3 id="samson-step-run">Jalankan dengan AI pilihan Anda</h3>
              <p>SAMSON menyiapkan instruksi dan alur kerja. Eksekusi AI tetap dilakukan di model yang Anda gunakan.</p>
            </div>
          </div>
          <div class="onboarding-models" aria-label="Model AI yang dapat digunakan">
            <span>ChatGPT</span><span>Gemini</span><span>Claude</span><span>Other AI</span>
          </div>
          <div class="onboarding-flow" aria-label="Copy prompt, buka AI, tambah context, generate">
            <span>Copy prompt</span><b aria-hidden="true">→</b><span>Buka AI</span><b aria-hidden="true">→</b><span>Tambah context</span><b aria-hidden="true">→</b><span>Generate</span>
          </div>
          <div class="onboarding-context-tip">
            <strong>Context yang baik</strong>
            <span>Tujuan · Audience · Batasan · Format output</span>
          </div>
        </section>

        <section class="onboarding-step" aria-labelledby="samson-step-continue">
          <div class="onboarding-step-head">
            <span class="onboarding-step-number">03</span>
            <div>
              <h3 id="samson-step-continue">Kembali dan lanjutkan pekerjaan</h3>
              <p>Untuk workflow, review hasil AI lalu tandai langkah selesai sebelum berpindah ke langkah berikutnya.</p>
            </div>
          </div>
          <div class="onboarding-flow onboarding-flow-secondary" aria-label="Review result, complete step, next step, finish workflow">
            <span>Review</span><b aria-hidden="true">→</b><span>Complete Step</span><b aria-hidden="true">→</b><span>Next Step</span><b aria-hidden="true">→</b><span>Finish</span>
          </div>
          <p class="onboarding-saved-note"><strong>Tip:</strong> gunakan <em>Saved</em> untuk menyimpan prompt yang sering dipakai. Tampilan dapat diubah dari <em>More → Appearance</em>.</p>
        </section>
      </div>

      <footer class="onboarding-actions">
        <div class="onboarding-primary-actions">
          <button type="button" class="onboarding-action onboarding-action-primary" data-onboarding-route="workflows">Mulai dengan Workflow</button>
          <button type="button" class="onboarding-action onboarding-action-secondary" data-onboarding-route="prompts">Cari Prompt</button>
        </div>
        <button type="button" class="onboarding-skip" data-onboarding-skip>Lewati onboarding</button>
      </footer>
    </div>`;

  const openOnboarding = ({ trigger = null, auto = false } = {}) => {
    if (document.getElementById(ONBOARDING_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = ONBOARDING_ID;
    overlay.className = 'overlay onboarding-overlay onboarding-v2-overlay';
    overlay.dataset.source = auto ? 'auto' : 'manual';
    overlay.innerHTML = onboardingMarkup();

    let closed = false;
    const close = ({ restoreFocus = !auto } = {}) => {
      if (closed) return;
      closed = true;
      markComplete();
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
      if (restoreFocus && trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...overlay.querySelectorAll('button:not([disabled]), a[href], select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element instanceof HTMLElement && element.offsetParent !== null);
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.closest('.onboarding-close') || event.target.closest('[data-onboarding-skip]')) {
        close();
        return;
      }

      const route = event.target.closest('[data-onboarding-route]');
      if (!route) return;
      const target = route.getAttribute('data-onboarding-route');
      close({ restoreFocus: false });
      requestAnimationFrame(() => routeTo(target));
    });

    document.addEventListener('keydown', onKeyDown, true);
    document.body.appendChild(overlay);
    overlay.querySelector('.onboarding-close')?.focus();
  };

  const updateMenuLabels = () => {
    const desktop = document.querySelector('#nav-onboarding');
    if (desktop) {
      desktop.setAttribute('aria-label', 'Cara Menggunakan SAMSON');
      const label = desktop.querySelector('span');
      if (label) label.textContent = 'Cara Menggunakan SAMSON';
    }

    const mobile = document.querySelector('[data-mobile-nav="onboarding"]');
    if (mobile) mobile.textContent = 'Cara Menggunakan SAMSON';
  };

  const scheduleMenuLabelSync = () => {
    const sync = () => updateMenuLabels();
    sync();
    requestAnimationFrame(sync);
    window.setTimeout(sync, 100);
    window.setTimeout(sync, 360);
    window.setTimeout(sync, 780);
  };

  const scheduleAutoOnboarding = () => {
    if (autoTimer !== null || isComplete() || location.hash) return;
    autoTimer = window.setTimeout(() => {
      autoTimer = null;
      if (isComplete() || location.hash || document.getElementById(ONBOARDING_ID)) return;
      if ((document.documentElement.dataset.entryMode || 'chooser') !== 'chooser') return;
      openOnboarding({ auto: true });
    }, AUTO_DELAY_MS);
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest('#nav-onboarding, [data-mobile-nav="onboarding"]')
      : null;
    if (!trigger) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    closeUtilitySurfaces();
    openOnboarding({ trigger, auto: false });
  }, true);

  document.addEventListener('samson:shell-ready', () => {
    scheduleMenuLabelSync();
    scheduleAutoOnboarding();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scheduleMenuLabelSync();
      scheduleAutoOnboarding();
    }, { once: true });
  } else {
    scheduleMenuLabelSync();
    scheduleAutoOnboarding();
  }
})();
