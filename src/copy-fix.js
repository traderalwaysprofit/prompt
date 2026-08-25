(() => {
  'use strict';

  function getPromptText() {
    const box = document.querySelector('.promptbox');
    if (!box) return '';
    const clone = box.cloneNode(true);
    clone.querySelectorAll('button,svg').forEach(el => el.remove());
    return clone.textContent.trim();
  }

  function legacyCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.width = '1px';
    area.style.height = '1px';
    area.style.padding = '0';
    area.style.border = '0';
    area.style.opacity = '0.01';
    area.style.pointerEvents = 'none';
    document.body.appendChild(area);
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, area.value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    area.remove();
    return copied;
  }

  function feedback(button, success) {
    if (!button) return;
    const label = button.querySelector('[data-copy-label]');
    if (success) {
      button.classList.add('copied');
      if (label) label.textContent = 'Tersalin';
      setTimeout(() => {
        button.classList.remove('copied');
        if (label) label.textContent = 'Salin Prompt';
      }, 2500);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.dataset.ok = success ? '1' : '0';
    toast.innerHTML = `<span class="toast-dot">${success ? '✓' : '×'}</span><span>${success ? 'Prompt berhasil disalin!' : 'Copy gagal — tekan lama teks untuk menyalin'}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade'); setTimeout(() => toast.remove(), 300); }, 2400);
  }

  async function copyPrompt(button) {
    const text = getPromptText();
    if (!text) return feedback(button, false);

    let success = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch (_) {}

    if (!success) success = legacyCopy(text);
    feedback(button, success);
  }

  // Capture phase prevents the modal/card handlers from swallowing the copy click.
  document.addEventListener('click', event => {
    const button = event.target.closest('#copy-main, #copy-inline');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    copyPrompt(button);
  }, true);
})();
