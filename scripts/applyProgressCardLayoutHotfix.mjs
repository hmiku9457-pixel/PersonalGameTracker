import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();

await ensureFile(
  'assets/js/progressCardLayoutHotfix.js',
  buildProgressCardHotfixScript()
);

await ensureFile(
  'assets/css/progress-card-layout-hotfix.css',
  buildProgressCardHotfixCss()
);

console.log('Progress-Card-Layout-Hotfix aktualisiert.');

async function ensureFile(relativePath, content) {
  const absolutePath = path.join(repoRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await writeNormalized(absolutePath, content);
}

async function writeNormalized(absolutePath, content) {
  const normalized = String(content)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/^[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');

  await fs.writeFile(absolutePath, normalized, 'utf8');
}

function buildProgressCardHotfixScript() {
  return `
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

  const match = (bestSource.textContent || '').trim().match(/^(\\d+)\\s*\\/\\s*(\\d+)$/);
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
    return /^\\d+\\s*\\/\\s*\\d+$/.test(text);
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
`;
}

function buildProgressCardHotfixCss() {
  return `
.pgt-overview-card-unified {
  position: relative;
  overflow: hidden;
  border-radius: 1.15rem;
  border: 1px solid rgba(96, 165, 250, 0.18);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 32%),
    linear-gradient(135deg, rgba(28, 40, 66, 0.96), rgba(16, 24, 43, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 38px rgba(0, 0, 0, 0.22);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.pgt-overview-card-unified:hover,
.pgt-overview-card-unified:focus-within {
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 22px 44px rgba(0, 0, 0, 0.26);
}

.pgt-overview-card-unified::after {
  content: '→';
  position: absolute;
  top: 1.15rem;
  right: 1.2rem;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.82);
  pointer-events: none;
}

.pgt-overview-card-unified::before {
  content: '';
  position: absolute;
  top: 1.18rem;
  right: 2.6rem;
  width: 0.58rem;
  height: 0.58rem;
  border-radius: 999px;
  background: #d97706;
  box-shadow: 0 0 0 0.18rem rgba(217, 119, 6, 0.14);
  pointer-events: none;
}

.pgt-progress-card-source-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  margin: -1px !important;
  padding: 0 !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.pgt-progress-card-section {
  margin-top: 1.15rem;
  display: grid;
  gap: 0.6rem;
  width: 100%;
}

.pgt-progress-card-label {
  font-size: 1rem;
  font-weight: 700;
  color: #f8fafc;
  text-align: left;
}

.pgt-progress-card-bar {
  position: relative;
  overflow: hidden;
  min-height: 1.7rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.pgt-progress-card-fill {
  position: absolute;
  inset: 0 auto 0 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb 0%, #60a5fa 100%);
}

.pgt-progress-card-overlay {
  position: relative;
  z-index: 1;
  min-height: 1.7rem;
  padding: 0.22rem 0.8rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  font-size: 0.92rem;
  font-weight: 700;
  color: #eff6ff;
}

.pgt-progress-card-count,
.pgt-progress-card-percent {
  white-space: nowrap;
}

.pgt-progress-card-section.is-empty {
  opacity: 0.92;
}

@media (max-width: 640px) {
  .pgt-overview-card-unified::after {
    top: 1rem;
    right: 1rem;
  }

  .pgt-overview-card-unified::before {
    top: 1.03rem;
    right: 2.35rem;
  }

  .pgt-progress-card-overlay {
    font-size: 0.84rem;
    padding-inline: 0.65rem;
  }

  .pgt-progress-card-bar {
    min-height: 1.55rem;
  }

  .pgt-progress-card-overlay {
    min-height: 1.55rem;
  }
}
`;
}
