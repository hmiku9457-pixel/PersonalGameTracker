
const MAIN_CONTENT_SELECTOR = '#main-content';
const CARD_SELECTOR = '.category-card, .manifest-card, .comms-section-card';
const ENHANCED_ATTRIBUTE = 'data-progress-card-enhanced';
const SOURCE_HIDDEN_CLASS = 'pgt-progress-card-source-hidden';
const UNIFIED_CARD_CLASS = 'pgt-overview-card-unified';
let observer = null;
let scheduled = false;

function getProgressLabel() {
  const language = (document.documentElement.lang || '').toLowerCase();
  return language.startsWith('en') ? 'Progress' : 'Fortschritt';
}

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
    if (!shouldProcessCard(card)) {
      continue;
    }

    card.classList.add(UNIFIED_CARD_CLASS);

    const state = getCardState(card);
    if (!state) {
      continue;
    }

    const section = ensureUnifiedSection(card);
    updateSection(section, state);
    hideLegacyProgressUi(card, state);
    attachSourceObservers(card, state, section);
    card.setAttribute(ENHANCED_ATTRIBUTE, 'true');
  }
}

function shouldProcessCard(card) {
  return !card.closest('.tracker-item');
}

function getCardState(card) {
  const datasetState = extractStateFromDataset(card);
  if (datasetState) {
    return datasetState;
  }

  return extractStateFromText(card);
}

function extractStateFromDataset(card) {
  const completed = Number(card.dataset.progressCompleted);
  const total = Number(card.dataset.progressTotal);
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total < 0) {
    return null;
  }

  const sourceElement = findCountSourceElement(card);
  return {
    completed,
    total,
    sourceElement,
    sourceElements: sourceElement ? [sourceElement] : [],
    percent: calculatePercent(completed, total)
  };
}

function extractStateFromText(card) {
  const sourceElements = findCountSourceElements(card);
  const bestSource = sourceElements[0] || null;
  if (!bestSource) {
    return null;
  }

  const match = (bestSource.textContent || '').trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) {
    return null;
  }

  const completed = Number(match[1]);
  const total = Number(match[2]);

  return {
    completed,
    total,
    sourceElement: bestSource,
    sourceElements,
    percent: calculatePercent(completed, total)
  };
}

function findCountSourceElements(card) {
  const candidates = Array.from(card.querySelectorAll('[data-category-progress], [data-manifest-progress], strong, p, span, div, small'));

  return candidates.filter((element) => {
    if (element.closest('.pgt-progress-card-section')) {
      return false;
    }

    const text = (element.textContent || '').trim();
    return /^\d+\s*\/\s*\d+$/.test(text);
  });
}

function findCountSourceElement(card) {
  return findCountSourceElements(card)[0] || null;
}

function calculatePercent(completed, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (completed / total) * 100));
}

function ensureUnifiedSection(card) {
  let section = card.querySelector('.pgt-progress-card-section');
  if (section) {
    return section;
  }

  section = document.createElement('div');
  section.className = 'pgt-progress-card-section';

  const label = document.createElement('div');
  label.className = 'pgt-progress-card-label';
  label.textContent = getProgressLabel();

  const bar = document.createElement('div');
  bar.className = 'pgt-progress-card-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', getProgressLabel());

  const fill = document.createElement('div');
  fill.className = 'pgt-progress-card-fill';

  const overlay = document.createElement('div');
  overlay.className = 'pgt-progress-card-overlay';

  const count = document.createElement('span');
  count.className = 'pgt-progress-card-count';

  const percentage = document.createElement('span');
  percentage.className = 'pgt-progress-card-percent';

  overlay.append(count, percentage);
  bar.append(fill, overlay);
  section.append(label, bar);

  const insertionTarget = findSectionInsertionTarget(card);
  insertionTarget.append(section);

  return section;
}

function findSectionInsertionTarget(card) {
  const mainContent = card.querySelector('.category-card-content, .manifest-card-content, .comms-section-card-content');
  if (mainContent) {
    return mainContent;
  }

  return card;
}

function updateSection(section, state) {
  const count = section.querySelector('.pgt-progress-card-count');
  const percentage = section.querySelector('.pgt-progress-card-percent');
  const fill = section.querySelector('.pgt-progress-card-fill');
  const bar = section.querySelector('.pgt-progress-card-bar');

  const percent = calculatePercent(state.completed, state.total);
  count.textContent = state.completed + ' / ' + state.total;
  percentage.textContent = Math.round(percent) + ' %';
  fill.style.width = percent.toFixed(2) + '%';
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(state.total));
  bar.setAttribute('aria-valuenow', String(state.completed));

  if (state.total <= 0) {
    section.classList.add('is-empty');
  } else {
    section.classList.remove('is-empty');
  }
}

function hideLegacyProgressUi(card, state) {
  const legacyContainers = findLegacyProgressContainers(card, state.sourceElements);
  for (const container of legacyContainers) {
    container.classList.add(SOURCE_HIDDEN_CLASS);
    container.setAttribute('aria-hidden', 'true');
  }
}

function findLegacyProgressContainers(card, sourceElements) {
  const containers = new Set();

  for (const element of sourceElements || []) {
    if (!element) {
      continue;
    }

    if (element.matches('[data-category-progress], [data-manifest-progress]')) {
      containers.add(element);
      continue;
    }

    const nearbyContainer = element.closest('.category-progress-wrapper, .manifest-progress-wrapper, .comms-section-progress, .progress-container, .progress-wrapper, .card-progress, .section-progress');
    if (nearbyContainer) {
      containers.add(nearbyContainer);
      continue;
    }

    if (element.tagName.toLowerCase() === 'strong') {
      containers.add(element);
    }
  }

  return Array.from(containers);
}

function attachSourceObservers(card, state, section) {
  if (card.dataset.progressCardObserved === 'true') {
    return;
  }

  const targets = (state.sourceElements || []).filter(Boolean);
  if (targets.length === 0) {
    return;
  }

  const sourceObserver = new MutationObserver(() => {
    const nextState = getCardState(card);
    if (!nextState) {
      return;
    }
    updateSection(section, nextState);
    hideLegacyProgressUi(card, nextState);
  });

  for (const target of targets) {
    sourceObserver.observe(target, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true
    });
  }

  card.dataset.progressCardObserved = 'true';
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

window.addEventListener('hashchange', () => {
  setupObserver();
  scheduleEnhancement();
});
window.addEventListener('load', scheduleEnhancement);
