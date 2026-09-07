import { mountTool as mountB2BTool } from './b2b-prospecting.js';

const STYLE_ID = 'b2b-prospecting-style';
const STYLE_HREF = '/src/tools/b2b-prospecting.css?v=3';
const POLISH_STYLE_ID = 'b2b-prospecting-polish-style';
const POLISH_STYLE_HREF = '/src/tools/b2b-prospecting-polish.css?v=1';
const COMPACT_MAX = 619;
const MEDIUM_MAX = 959;

const getLayout = (width) => {
  if (width <= COMPACT_MAX) return 'compact';
  if (width <= MEDIUM_MAX) return 'medium';
  return 'wide';
};

const ensureStylesheet = (id, href) => {
  let link = document.getElementById(id);
  if (link && link.tagName === 'LINK') {
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    return link;
  }

  link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  return link;
};

const refreshStylesheets = () => {
  ensureStylesheet(STYLE_ID, STYLE_HREF);
  ensureStylesheet(POLISH_STYLE_ID, POLISH_STYLE_HREF);
};

const syncContainerLayout = (root) => {
  const width = Math.round(root.getBoundingClientRect().width);
  if (width > 0) root.dataset.b2bLayout = getLayout(width);
};

const keepSelectedTabVisible = (root) => {
  if (root.dataset.b2bLayout === 'compact') return;

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

  refreshStylesheets();
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
