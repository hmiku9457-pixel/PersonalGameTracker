
const MAIN_CONTENT_SELECTOR = '#main-content';
const CARD_SELECTOR = '.category-card, .manifest-card';
const ENHANCED_ATTRIBUTE = 'data-progress-card-enhanced';
const STYLE_CLASS = 'pgt-progress-card';
let observer = null;
let scheduled = false;

function scheduleEnhancement() {
  if (scheduled) {
    return;
  }

  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    enhanceProgressCards();
  });
}

function enhanceProgressCards() {
  const mainContent = document.querySelector(MAIN_CONTENT_SELECTOR);
  if (!mainContent) {
    return;
  }

  const cards = mainContent.querySelectorAll(CARD_SELECTOR);

  for (const card of cards) {
    if (card.getAttribute(ENHANCED_ATTRIBUTE) === 'true') {
      continue;
    }

    if (hasDetailedProgressAlready(card)) {
      card.setAttribute(ENHANCED_ATTRIBUTE, 'true');
      continue;
    }

    const progressInfo = extractProgressInfo(card);
    if (!progressInfo) {
      continue;
    }

    const { countElement, completed, total, percent } = progressInfo;
    const progressSection = createProgressSection({ completed, total, percent });

    countElement.replaceWith(progressSection);
    card.classList.add(STYLE_CLASS);
    card.setAttribute(ENHANCED_ATTRIBUTE, 'true');
  }
}

function hasDetailedProgressAlready(card) {
  if (card.querySelector('.pgt-progress-card-section')) {
    return true;
  }

  const hasProgressLabel = /(^|\s)Fortschritt(\s|$)/i.test(card.textContent || '');
  const hasProgressBar = Boolean(
    card.querySelector(
      '[role="progressbar"], progress, .progress-bar, .tracker-progress-bar, .category-card-progress, .card-progress-bar'
    )
  );

  return hasProgressLabel && hasProgressBar;
}

function extractProgressInfo(card) {
  const fromDataset = extractProgressFromDataset(card);
  if (fromDataset) {
    return fromDataset;
  }

  const countElement = findProgressCountElement(card);
  if (!countElement) {
    return null;
  }

  const match = countElement.textContent.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) {
    return null;
  }

  const completed = Number(match[1]);
  const total = Number(match[2]);
  const percent = calculatePercent(completed, total);

  return { countElement, completed, total, percent };
}

function extractProgressFromDataset(card) {
  const completed = Number(card.dataset.progressCompleted);
  const total = Number(card.dataset.progressTotal);

  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  const fallbackElement = findProgressCountElement(card);
  if (!fallbackElement) {
    return null;
  }

  return {
    countElement: fallbackElement,
    completed,
    total,
    percent: calculatePercent(completed, total)
  };
}

function findProgressCountElement(card) {
  const candidates = Array.from(card.querySelectorAll('p, span, div, strong, small'));

  return candidates.find((element) => {
    if (element.closest('.pgt-progress-card-section')) {
      return false;
    }

    if (element.children.length > 0) {
      return false;
    }

    const text = (element.textContent || '').trim();
    return /^\d+\s*\/\s*\d+$/.test(text);
  }) || null;
}

function calculatePercent(completed, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  const rawPercent = (completed / total) * 100;
  return Math.max(0, Math.min(100, rawPercent));
}

function createProgressSection({ completed, total, percent }) {
  const section = document.createElement('div');
  section.className = 'pgt-progress-card-section';

  const label = document.createElement('div');
  label.className = 'pgt-progress-card-label';
  label.textContent = 'Fortschritt';

  const bar = document.createElement('div');
  bar.className = 'pgt-progress-card-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', 'Fortschritt');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(total));
  bar.setAttribute('aria-valuenow', String(completed));

  const fill = document.createElement('div');
  fill.className = 'pgt-progress-card-fill';
  fill.style.width = percent.toFixed(2) + '%';

  const overlay = document.createElement('div');
  overlay.className = 'pgt-progress-card-overlay';

  const count = document.createElement('span');
  count.className = 'pgt-progress-card-count';
  count.textContent = completed + ' / ' + total;

  const percentage = document.createElement('span');
  percentage.className = 'pgt-progress-card-percent';
  percentage.textContent = Math.round(percent) + ' %';

  overlay.append(count, percentage);
  bar.append(fill, overlay);
  section.append(label, bar);

  return section;
}

function setupObserver() {
  const mainContent = document.querySelector(MAIN_CONTENT_SELECTOR);
  if (!mainContent) {
    return;
  }

  observer?.disconnect();

  observer = new MutationObserver(() => {
    scheduleEnhancement();
  });

  observer.observe(mainContent, {
    childList: true,
    subtree: true
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupObserver();
  scheduleEnhancement();
});

window.addEventListener('hashchange', scheduleEnhancement);
window.addEventListener('load', scheduleEnhancement);
