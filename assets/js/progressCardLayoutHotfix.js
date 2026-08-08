const MAIN_CONTENT_SELECTOR = '#main-content';
const CARD_SELECTOR = '.category-card, .manifest-card';
const SOURCE_SELECTOR = '[data-category-progress], .category-progress';
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
    if (hasNativeDetailedProgress(card)) {
      card.setAttribute(ENHANCED_ATTRIBUTE, 'native');
      continue;
    }

    const sourceElement = findProgressSource(card);

    if (!sourceElement) {
      continue;
    }

    let progressSection = card.querySelector('.pgt-progress-card-section');

    if (!progressSection) {
      progressSection = createProgressSection();
      sourceElement.insertAdjacentElement('afterend', progressSection);

      sourceElement.classList.add('pgt-progress-card-source');
      sourceElement.setAttribute('aria-hidden', 'true');

      card.classList.add(STYLE_CLASS);
      card.setAttribute(ENHANCED_ATTRIBUTE, 'true');
    }

    syncProgressCard(
      card,
      sourceElement,
      progressSection
    );
  }
}

function hasNativeDetailedProgress(card) {
  if (card.querySelector('.pgt-progress-card-section')) {
    return false;
  }

  const hasProgressLabel =
    /(^|\s)(Fortschritt|Progress)(\s|$)/i.test(card.textContent || '');

  const hasProgressBar = Boolean(
    card.querySelector(
      '[role="progressbar"], progress, .progress-bar, .tracker-progress-bar, .category-card-progress, .card-progress-bar'
    )
  );

  return hasProgressLabel && hasProgressBar;
}

function findProgressSource(card) {
  const explicitSource = card.querySelector(SOURCE_SELECTOR);

  if (explicitSource) {
    return explicitSource;
  }

  const candidates = Array.from(
    card.querySelectorAll('p, span, div, strong, small')
  );

  return candidates.find((element) => {
    if (element.closest('.pgt-progress-card-section')) {
      return false;
    }

    if (element.children.length > 0) {
      return false;
    }

    return parseProgressText(element.textContent) !== null;
  }) ?? null;
}

function syncProgressCard(
  card,
  sourceElement,
  progressSection
) {
  const progress = parseProgressText(sourceElement.textContent);

  if (!progress) {
    setHidden(progressSection, true);
    return;
  }

  const { completed, total } = progress;
  const percent = calculatePercent(completed, total);

  const countElement = progressSection.querySelector(
    '.pgt-progress-card-count'
  );

  const percentElement = progressSection.querySelector(
    '.pgt-progress-card-percent'
  );

  const fillElement = progressSection.querySelector(
    '.pgt-progress-card-fill'
  );

  const barElement = progressSection.querySelector(
    '.pgt-progress-card-bar'
  );

  const labelElement = progressSection.querySelector(
    '.pgt-progress-card-label'
  );

  const progressLabel = getProgressLabel();
  const countText = `${completed} / ${total}`;
  const percentText = `${Math.round(percent)} %`;
  const fillWidth = `${percent.toFixed(2)}%`;

  setText(labelElement, progressLabel);
  setText(countElement, countText);
  setText(percentElement, percentText);
  setStyleWidth(fillElement, fillWidth);

  setAttribute(barElement, 'aria-label', progressLabel);
  setAttribute(barElement, 'aria-valuemin', '0');
  setAttribute(barElement, 'aria-valuemax', String(total));
  setAttribute(barElement, 'aria-valuenow', String(completed));
  setAttribute(
    barElement,
    'aria-valuetext',
    `${completed} / ${total}, ${Math.round(percent)} %`
  );

  const sourceIsHidden =
    sourceElement.hidden ||
    sourceElement.closest('[hidden]') !== null;

  /*
   * 0 / 0 ist in gameView.js zunächst nur ein Ladeplatzhalter.
   * Die sichtbare Anzeige erscheint erst, wenn eine echte Gesamtzahl
   * berechnet wurde.
   */
  setHidden(
    progressSection,
    sourceIsHidden || total <= 0
  );

  card.dataset.progressCompleted = String(completed);
  card.dataset.progressTotal = String(total);
  card.dataset.progressPercent = String(Math.round(percent));
}

function parseProgressText(value) {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d+)\s*\/\s*(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    completed: Number(match[1]),
    total: Number(match[2])
  };
}

function calculatePercent(completed, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  const rawPercent = (completed / total) * 100;

  return Math.max(
    0,
    Math.min(100, rawPercent)
  );
}

function createProgressSection() {
  const section = document.createElement('div');
  section.className = 'pgt-progress-card-section';
  section.hidden = true;

  const label = document.createElement('div');
  label.className = 'pgt-progress-card-label';

  const bar = document.createElement('div');
  bar.className = 'pgt-progress-card-bar';
  bar.setAttribute('role', 'progressbar');

  const fill = document.createElement('div');
  fill.className = 'pgt-progress-card-fill';

  const overlay = document.createElement('div');
  overlay.className = 'pgt-progress-card-overlay';

  const count = document.createElement('span');
  count.className = 'pgt-progress-card-count';

  const percentage = document.createElement('span');
  percentage.className = 'pgt-progress-card-percent';

  overlay.append(
    count,
    percentage
  );

  bar.append(
    fill,
    overlay
  );

  section.append(
    label,
    bar
  );

  return section;
}

function getProgressLabel() {
  const languageSelect = document.getElementById('language-select');
  const language = languageSelect?.value || document.documentElement.lang;

  return language === 'en'
    ? 'Progress'
    : 'Fortschritt';
}

function setText(element, value) {
  if (element && element.textContent !== value) {
    element.textContent = value;
  }
}

function setAttribute(element, name, value) {
  if (element && element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}

function setStyleWidth(element, value) {
  if (element && element.style.width !== value) {
    element.style.width = value;
  }
}

function setHidden(element, hidden) {
  if (element && element.hidden !== hidden) {
    element.hidden = hidden;
  }
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
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['hidden']
  });
}

function initialize() {
  setupObserver();
  scheduleEnhancement();

  document
    .getElementById('language-select')
    ?.addEventListener(
      'change',
      scheduleEnhancement
    );
}

if (document.readyState === 'loading') {
  window.addEventListener(
    'DOMContentLoaded',
    initialize,
    { once: true }
  );
} else {
  initialize();
}

window.addEventListener(
  'hashchange',
  scheduleEnhancement
);

window.addEventListener(
  'load',
  scheduleEnhancement
);
