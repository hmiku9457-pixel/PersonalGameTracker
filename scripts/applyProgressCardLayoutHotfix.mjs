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

await injectIntoHtml('index.html');
await injectIntoHtml('404.html', { optional: true });

console.log('Progress-Card-Layout-Hotfix erfolgreich angewendet.');

async function injectIntoHtml(relativePath, { optional = false } = {}) {
  const absolutePath = path.join(repoRoot, relativePath);
  let source;

  try {
    source = await fs.readFile(absolutePath, 'utf8');
  } catch (error) {
    if (optional && error.code === 'ENOENT') {
      console.log(`Optionale Datei nicht gefunden: ${relativePath}`);
      return;
    }
    throw error;
  }

  const stylesheetTag =
    '    <link rel="stylesheet" href="assets/css/progress-card-layout-hotfix.css">';
  const scriptTag =
    '    <script type="module" src="assets/js/progressCardLayoutHotfix.js"></script>';

  let updated = source;

  if (!updated.includes('progress-card-layout-hotfix.css')) {
    updated = insertBeforeClosingTag(updated, '</head>', stylesheetTag);
  }

  if (!updated.includes('progressCardLayoutHotfix.js')) {
    updated = insertBeforeClosingTag(updated, '</body>', scriptTag);
  }

  await writeNormalized(absolutePath, updated);
}

function insertBeforeClosingTag(source, closingTag, insertion) {
  const index = source.lastIndexOf(closingTag);
  if (index === -1) {
    throw new Error(`Schließendes Tag ${closingTag} nicht gefunden.`);
  }

  const needsLineBreak = !source.slice(0, index).endsWith('\n');
  const prefix = needsLineBreak ? '\n' : '';

  return (
    source.slice(0, index) +
    prefix +
    insertion +
    '\n' +
    source.slice(index)
  );
}

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

  const hasProgressLabel = /(^|\\s)Fortschritt(\\s|$)/i.test(card.textContent || '');
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

  const match = countElement.textContent.match(/^(\\d+)\\s*\\/\\s*(\\d+)$/);
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
    return /^\\d+\\s*\\/\\s*\\d+$/.test(text);
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
`;
}

function buildProgressCardHotfixCss() {
  return `
.pgt-progress-card-section {
  margin-top: 1rem;
  display: grid;
  gap: 0.5rem;
  width: 100%;
}

.pgt-progress-card-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f8fafc;
  text-align: left;
}

.pgt-progress-card-bar {
  position: relative;
  overflow: hidden;
  min-height: 1.2rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  border: 1px solid rgba(148, 163, 184, 0.18);
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
  min-height: 1.2rem;
  padding: 0.15rem 0.7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #eff6ff;
}

.pgt-progress-card-count,
.pgt-progress-card-percent {
  white-space: nowrap;
}

@media (max-width: 640px) {
  .pgt-progress-card-overlay {
    font-size: 0.78rem;
    padding-inline: 0.55rem;
  }
}
`;
}
