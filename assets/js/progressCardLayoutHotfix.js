
const MAIN_CONTENT_SELECTOR = '#main-content';
const CARD_SELECTOR = '.category-card, .manifest-card, .comms-section-card';
const ENHANCED_ATTRIBUTE = 'data-progress-card-enhanced';
const OBSERVED_ATTRIBUTE = 'data-progress-card-observed';
const SOURCE_HIDDEN_CLASS = 'pgt-progress-card-source-hidden';
const UNIFIED_CARD_CLASS = 'pgt-overview-card-unified';
let mainObserver = null;
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
    enhanceNewProgressCards();
  });
}

function enhanceNewProgressCards() {
  const mainContent = document.querySelector(MAIN_CONTENT_SELECTOR);
  if (!mainContent) {
    return;
  }

  const cards = mainContent.querySelectorAll(
    CARD_SELECTOR + ':not([' + ENHANCED_ATTRIBUTE + '="true"])'
  );

  for (const card of cards) {
    enhanceProgressCard(card);
  }
}

function enhanceProgressCard(card) {
  if (card.closest('.tracker-item')) {
    card.setAttribute(ENHANCED_ATTRIBUTE, 'true');
    return;
  }

  card.classList.add(UNIFIED_CARD_CLASS);

  const section = ensureUnifiedSection(card);
  const state = getCardState(card);

  if (state) {
    updateSection(section, state);
    hideLegacyProgressUi(card, state);
    attachSourceObservers(card, section);
  }

  card.setAttribute(ENHANCED_ATTRIBUTE, 'true');
}

function getCardState(card) {
  const sourceElements = findCountSourceElements(card);
  const sourceElement = sourceElements[0] || null;

  if (sourceElement) {
    const parsedState = parseProgressText(sourceElement.textContent);
    if (parsedState) {
      return {
        ...parsedState,
        sourceElement,
        sourceElements
      };
    }
  }

  const completed = Number(card.dataset.progressCompleted);
  const total = Number(card.dataset.progressTotal);

  if (
    Number.isFinite(completed) &&
    Number.isFinite(total) &&
    total >= 0
  ) {
    return {
      completed,
      total,
      percent: calculatePercent(completed, total),
      sourceElement,
      sourceElements
    };
  }

  return null;
}

function parseProgressText(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d+)\s*\/\s*(\d+)$/);

  if (!match) {
    return null;
  }

  const completed = Number(match[1]);
  const total = Number(match[2]);

  return {
    completed,
    total,
    percent: calculatePercent(completed, total)
  };
}

function findCountSourceElements(card) {
  const candidates = Array.from(
    card.querySelectorAll(
      '[data-category-progress], ' +
      '[data-manifest-progress], ' +
      '[data-comms-progress], ' +
      '.comms-section-progress strong, ' +
      '.section-progress strong, ' +
      'strong, p, span, small'
    )
  );

  return candidates.filter((element) => {
    if (element.closest('.pgt-progress-card-section')) {
      return false;
    }

    return /^\d+\s*\/\s*\d+$/.test(
      (element.textContent || '').trim()
    );
  });
}

function calculatePercent(completed, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, (completed / total) * 100)
  );
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

  findSectionInsertionTarget(card).append(section);

  return section;
}

function findSectionInsertionTarget(card) {
  return (
    card.querySelector(
      '.category-card-content, ' +
      '.manifest-card-content, ' +
      '.comms-section-card-content'
    ) || card
  );
}

function updateSection(section, state) {
  const count = section.querySelector('.pgt-progress-card-count');
  const percentage = section.querySelector('.pgt-progress-card-percent');
  const fill = section.querySelector('.pgt-progress-card-fill');
  const bar = section.querySelector('.pgt-progress-card-bar');

  if (!count || !percentage || !fill || !bar) {
    return;
  }

  const percent = calculatePercent(state.completed, state.total);
  const nextCount = state.completed + ' / ' + state.total;
  const nextPercentage = Math.round(percent) + ' %';
  const nextWidth = percent.toFixed(2) + '%';

  if (count.textContent !== nextCount) {
    count.textContent = nextCount;
  }

  if (percentage.textContent !== nextPercentage) {
    percentage.textContent = nextPercentage;
  }

  if (fill.style.width !== nextWidth) {
    fill.style.width = nextWidth;
  }

  setAttributeIfChanged(bar, 'aria-valuemin', '0');
  setAttributeIfChanged(bar, 'aria-valuemax', String(state.total));
  setAttributeIfChanged(bar, 'aria-valuenow', String(state.completed));

  section.classList.toggle('is-empty', state.total <= 0);
}

function setAttributeIfChanged(element, name, value) {
  if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}

function hideLegacyProgressUi(card, state) {
  for (const container of findLegacyProgressContainers(state.sourceElements)) {
    container.classList.add(SOURCE_HIDDEN_CLASS);
    container.setAttribute('aria-hidden', 'true');
  }
}

function findLegacyProgressContainers(sourceElements) {
  const containers = new Set();

  for (const element of sourceElements || []) {
    if (!element) {
      continue;
    }

    const nearbyContainer = element.closest(
      '.category-progress-wrapper, ' +
      '.manifest-progress-wrapper, ' +
      '.comms-section-progress, ' +
      '.progress-container, ' +
      '.progress-wrapper, ' +
      '.card-progress, ' +
      '.section-progress'
    );

    if (nearbyContainer) {
      containers.add(nearbyContainer);
      continue;
    }

    containers.add(element);
  }

  return Array.from(containers);
}

function attachSourceObservers(card, section) {
  if (card.getAttribute(OBSERVED_ATTRIBUTE) === 'true') {
    return;
  }

  const targets = findCountSourceElements(card);

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
      subtree: true
    });
  }

  card.setAttribute(OBSERVED_ATTRIBUTE, 'true');
}

function mutationContainsNewCard(mutation) {
  for (const node of mutation.addedNodes) {
    if (!(node instanceof Element)) {
      continue;
    }

    if (node.matches(CARD_SELECTOR)) {
      return true;
    }

    if (node.querySelector(CARD_SELECTOR)) {
      return true;
    }
  }

  return false;
}

function setupMainObserver() {
  const mainContent = document.querySelector(MAIN_CONTENT_SELECTOR);

  if (!mainContent) {
    return;
  }

  mainObserver?.disconnect();

  mainObserver = new MutationObserver((mutations) => {
    if (mutations.some(mutationContainsNewCard)) {
      scheduleEnhancement();
    }
  });

  mainObserver.observe(mainContent, {
    childList: true,
    subtree: true
  });
}

function initialize() {
  setupMainObserver();
  scheduleEnhancement();
}

window.addEventListener('DOMContentLoaded', initialize);
window.addEventListener('load', scheduleEnhancement);
window.addEventListener('hashchange', () => {
  setupMainObserver();
  scheduleEnhancement();
});
