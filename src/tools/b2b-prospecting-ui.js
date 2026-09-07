import { mountTool as mountB2BTool } from './b2b-prospecting.js';

const STYLE_ID = 'b2b-prospecting-style';
const STYLE_HREF = '/src/tools/b2b-prospecting.css?v=2';
const COMPACT_MAX = 619;
const MEDIUM_MAX = 959;

const getLayout = (width) => {
  if (width <= COMPACT_MAX) return 'compact';
  if (width <= MEDIUM_MAX) return 'medium';
  return 'wide';
};

const refreshStylesheet = () => {
  const link = document.getElementById(STYLE_ID);
  if (!link || link.tagName !== 'LINK') return;
  if (link.getAttribute('href') !== STYLE_HREF) link.setAttribute('href', STYLE_HREF);
};

const syncContainerLayout = (root) => {
  const width = Math.round(root.getBoundingClientRect().width);
  if (width > 0) root.dataset.b2bLayout = getLayout(width);
};

const keepSelectedTabVisible = (root) => {
  const tabs = root.querySelector('.b2b-tabs');
  const selected = root.querySelector('[data-b2b-tab][aria-selected="true"]');
  if (!tabs || !selected) return;

  const tabLeft = selected.offsetLeft;
  const tabRight = tabLeft + selected.offsetWidth;
  const visibleLeft = tabs.scrollLeft;
  const visibleRight = visibleLeft + tabs.clientWidth;
  const padding = 8;

  let nextLeft = null;
  if (tabLeft < visibleLeft + padding) nextLeft = Math.max(0, tabLeft - padding);
  if (tabRight > visibleRight - padding) nextLeft = Math.max(0, tabRight - tabs.clientWidth + padding);
  if (nextLeft === null) return;

  const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  tabs.scrollTo({ left: nextLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
};

const scheduleTabVisibility = (root) => {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(() => keepSelectedTabVisible(root));
    return;
  }
  globalThis.setTimeout(() => keepSelectedTabVisible(root), 0);
};

export const mountTool = (root, context) => {
  const baseController = mountB2BTool(root, context);
  const uiController = new AbortController();
  let resizeObserver = null;

  refreshStylesheet();
  syncContainerLayout(root);

  if (typeof globalThis.ResizeObserver === 'function') {
    resizeObserver = new globalThis.ResizeObserver(() => syncContainerLayout(root));
    resizeObserver.observe(root);
  } else {
    globalThis.addEventListener('resize', () => syncContainerLayout(root), { signal: uiController.signal });
  }

  const tabList = root.querySelector('.b2b-tabs');
  tabList?.addEventListener('click', (event) => {
    if (event.target.closest('[data-b2b-tab]')) scheduleTabVisibility(root);
  }, { signal: uiController.signal });
  tabList?.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) scheduleTabVisibility(root);
  }, { signal: uiController.signal });

  scheduleTabVisibility(root);

  return {
    destroy() {
      uiController.abort();
      resizeObserver?.disconnect();
      delete root.dataset.b2bLayout;
      baseController?.destroy?.();
    }
  };
};
