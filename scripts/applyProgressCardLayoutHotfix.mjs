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

console.log('Unified overview card style applied.');

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
const OBSERVED_ATTRIBUTE = 'data-progress-card-observed';
const SOURCE_HIDDEN_CLASS = 'pgt-progress-card-source-hidden';
const UNIFIED_CARD_CLASS = 'pgt-overview-card-unified';
const APPLIED_TO_LAYOUT_CLASS = 'pgt-overview-layout-unified';
let layoutObserver = null;
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

function enhanceProgressCards(root = document) {
  const cards = root.querySelectorAll(CARD_SELECTOR);

  for (const card of cards) {
    enhanceCard(card);
  }
}

function enhanceCard(card) {
  if (!card || card.closest('.tracker-item')) {
    return;
  }

  card.classList.add(UNIFIED_CARD_CLASS, APPLIED_TO_LAYOUT_CLASS);

  const state = getCardState(card);
  if (!state) {
    return;
  }

  const section = ensureUnifiedSection(card);
  updateSection(section, state);
  hideLegacyProgressUi(card, state);
  observeStateSources(card, section);
  card.setAttribute(ENHANCED_ATTRIBUTE, 'true');
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

  const sourceElements = findCountSourceElements(card);

  return {
    completed,
    total,
    sourceElements,
    percent: calculatePercent(completed, total)
  };
}

function extractStateFromText(card) {
  const sourceElements = findCountSourceElements(card);
  const source = sourceElements[0] || null;

  if (!source) {
    return null;
  }

  const match = normalizeCountText(source.textContent).match(/^(\\d+)\\s*\\/\\s*(\\d+)$/);
  if (!match) {
    return null;
  }

  const completed = Number(match[1]);
  const total = Number(match[2]);

  return {
    completed,
    total,
    sourceElements,
    percent: calculatePercent(completed, total)
  };
}

function normalizeCountText(text) {
  return String(text || '').replace(/\u00a0/g, ' ').trim();
}

function findCountSourceElements(card) {
  const candidates = Array.from(
    card.querySelectorAll(
      '[data-category-progress], [data-manifest-progress], .comms-section-card-progress strong, strong, p, span, div, small'
    )
  );

  return candidates.filter((element) => {
    if (!element || element.closest('.pgt-progress-card-section')) {
      return false;
    }

    const text = normalizeCountText(element.textContent);
    return /^\\d+\\s*\\/\\s*\\d+$/.test(text);
  });
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

  const insertionTarget = findInsertionTarget(card);
  insertionTarget.append(section);

  return section;
}

function findInsertionTarget(card) {
  return (
    card.querySelector(
      '.category-card-content, .manifest-card-content, .comms-section-card-content, .card-content'
    ) || card
  );
}

function updateSection(section, state) {
  const count = section.querySelector('.pgt-progress-card-count');
  const percentage = section.querySelector('.pgt-progress-card-percent');
  const fill = section.querySelector('.pgt-progress-card-fill');
  const bar = section.querySelector('.pgt-progress-card-bar');
  const label = section.querySelector('.pgt-progress-card-label');

  const percent = calculatePercent(state.completed, state.total);
  const countText = state.completed + ' / ' + state.total;
  const percentageText = Math.round(percent) + ' %';

  if (label && label.textContent !== getProgressLabel()) {
    label.textContent = getProgressLabel();
    bar.setAttribute('aria-label', getProgressLabel());
  }

  if (count.textContent !== countText) {
    count.textContent = countText;
  }

  if (percentage.textContent !== percentageText) {
    percentage.textContent = percentageText;
  }

  const widthValue = percent.toFixed(2) + '%';
  if (fill.style.width !== widthValue) {
    fill.style.width = widthValue;
  }

  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(state.total));
  bar.setAttribute('aria-valuenow', String(state.completed));
}

function hideLegacyProgressUi(card, state) {
  const sourceElements = state?.sourceElements || [];
  const containers = new Set();

  for (const element of sourceElements) {
    if (!element) {
      continue;
    }

    if (element.matches('[data-category-progress], [data-manifest-progress]')) {
      containers.add(element);
      continue;
    }

    const container = element.closest(
      '.category-progress-wrapper, .manifest-progress-wrapper, .comms-section-card-progress, .comms-section-card-progress strong, .progress-container, .progress-wrapper, .card-progress, .section-progress'
    );

    if (container) {
      containers.add(container);
    }
  }

  for (const container of containers) {
    container.classList.add(SOURCE_HIDDEN_CLASS);
    container.setAttribute('aria-hidden', 'true');
  }
}

function observeStateSources(card, section) {
  if (card.getAttribute(OBSERVED_ATTRIBUTE) === 'true') {
    return;
  }

  const sourceElements = findCountSourceElements(card);
  if (sourceElements.length === 0) {
    return;
  }

  const observer = new MutationObserver(() => {
    const nextState = getCardState(card);
    if (!nextState) {
      return;
    }

    updateSection(section, nextState);
    hideLegacyProgressUi(card, nextState);
  });

  for (const sourceElement of sourceElements) {
    observer.observe(sourceElement, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true
    });
  }

  card.setAttribute(OBSERVED_ATTRIBUTE, 'true');
}

function setupLayoutObserver() {
  const mainContent = document.querySelector(MAIN_CONTENT_SELECTOR);
  if (!mainContent) {
    return;
  }

  layoutObserver?.disconnect();
  layoutObserver = new MutationObserver((mutationList) => {
    let shouldRun = false;

    for (const mutation of mutationList) {
      for (const addedNode of mutation.addedNodes) {
        if (!(addedNode instanceof HTMLElement)) {
          continue;
        }

        if (addedNode.matches?.(CARD_SELECTOR) || addedNode.querySelector?.(CARD_SELECTOR)) {
          shouldRun = true;
          break;
        }
      }

      if (shouldRun) {
        break;
      }
    }

    if (shouldRun) {
      scheduleEnhancement();
    }
  });

  layoutObserver.observe(mainContent, {
    childList: true,
    subtree: true
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupLayoutObserver();
  scheduleEnhancement();
});

window.addEventListener('hashchange', () => {
  setupLayoutObserver();
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
  border: 1px solid rgba(59, 130, 246, 0.28);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.10), transparent 34%),
    linear-gradient(120deg, rgba(26, 38, 64, 0.98), rgba(16, 24, 43, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 16px 34px rgba(0, 0, 0, 0.20);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.pgt-overview-card-unified:hover,
.pgt-overview-card-unified:focus-within {
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 22px 42px rgba(0, 0, 0, 0.25);
}

.pgt-overview-card-unified:not(.comms-section-card)::before {
  content: '';
  position: absolute;
  top: 1.08rem;
  right: 2.45rem;
  width: 0.56rem;
  height: 0.56rem;
  border-radius: 999px;
  background: #d97706;
  box-shadow: 0 0 0 0.18rem rgba(217, 119, 6, 0.15);
  pointer-events: none;
}

.pgt-overview-card-unified:not(.comms-section-card)::after {
  content: '→';
  position: absolute;
  top: 0.92rem;
  right: 1.05rem;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.78);
  pointer-events: none;
}

.pgt-overview-card-unified .category-card-title,
.pgt-overview-card-unified .manifest-card-title,
.pgt-overview-card-unified .comms-section-card-title,
.pgt-overview-card-unified h2,
.pgt-overview-card-unified h3 {
  color: #f8fafc;
}

.pgt-overview-card-unified .category-card-description,
.pgt-overview-card-unified .manifest-card-description,
.pgt-overview-card-unified .comms-section-card-description,
.pgt-overview-card-unified p {
  color: rgba(248, 250, 252, 0.96);
}

.pgt-overview-card-unified .category-card-meta,
.pgt-overview-card-unified .manifest-card-meta,
.pgt-overview-card-unified .comms-section-meta,
.pgt-overview-card-unified .category-card-subtitle,
.pgt-overview-card-unified .manifest-card-subtitle,
.pgt-overview-card-unified small {
  color: rgba(203, 213, 225, 0.78);
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
  margin-top: 1.2rem;
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
  min-height: 1.72rem;
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
  min-height: 1.72rem;
  padding: 0.22rem 0.82rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  font-size: 0.93rem;
  font-weight: 700;
  color: #eff6ff;
}

.pgt-progress-card-count,
.pgt-progress-card-percent {
  white-space: nowrap;
}

@media (max-width: 640px) {
  .pgt-overview-card-unified:not(.comms-section-card)::before {
    top: 0.98rem;
    right: 2.2rem;
  }

  .pgt-overview-card-unified:not(.comms-section-card)::after {
    top: 0.83rem;
    right: 0.9rem;
  }

  .pgt-progress-card-bar,
  .pgt-progress-card-overlay {
    min-height: 1.58rem;
  }

  .pgt-progress-card-overlay {
    font-size: 0.84rem;
    padding-inline: 0.65rem;
  }
}
`;
}
