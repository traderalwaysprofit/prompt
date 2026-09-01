(() => {
  'use strict';

  const ensureEntry = () => {
    const card = document.querySelector('#workflow-choice');
    if (!card || card.querySelector('[data-direct-work-assistant]')) return;

    const guidedAction = card.querySelector('[data-show-workflows]');
    if (!guidedAction) return;

    const entry = document.createElement('div');
    entry.className = 'workflow-assistant-entry';
    entry.innerHTML = `
      <div class="workflow-assistant-entry-copy">
        <span>WORK ASSISTANT</span>
        <small>WhatsApp · Email · Social · SEO · Website · Support · Custom</small>
      </div>
      <a class="choice-action choice-action-assistant" href="#work-assistant" data-direct-work-assistant>
        Buka Work Assistant <span aria-hidden="true">→</span>
      </a>`;

    guidedAction.insertAdjacentElement('afterend', entry);
  };

  const scheduleEntry = () => {
    [0, 80, 240, 720, 1600].forEach((delay) => setTimeout(ensureEntry, delay));
  };

  document.addEventListener('samson:shell-ready', scheduleEntry, { once: true });
  document.addEventListener('click', () => setTimeout(ensureEntry, 0), true);
  window.addEventListener('hashchange', ensureEntry);

  if (document.querySelector('.site-header')) scheduleEntry();
})();
