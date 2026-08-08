import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const progressScript = "const MAIN_CONTENT_SELECTOR = '#main-content';\nconst CARD_SELECTOR = '.category-card, .manifest-card';\nconst SOURCE_SELECTOR = '[data-category-progress], .category-progress';\nconst ENHANCED_ATTRIBUTE = 'data-progress-card-enhanced';\nconst STYLE_CLASS = 'pgt-progress-card';\nlet observer = null;\nlet scheduled = false;\n\nfunction scheduleEnhancement() {\n  if (scheduled) {\n    return;\n  }\n\n  scheduled = true;\n\n  requestAnimationFrame(() => {\n    scheduled = false;\n    enhanceProgressCards();\n  });\n}\n\nfunction enhanceProgressCards() {\n  const mainContent = document.querySelector(MAIN_CONTENT_SELECTOR);\n\n  if (!mainContent) {\n    return;\n  }\n\n  const cards = mainContent.querySelectorAll(CARD_SELECTOR);\n\n  for (const card of cards) {\n    if (hasNativeDetailedProgress(card)) {\n      card.setAttribute(ENHANCED_ATTRIBUTE, 'native');\n      continue;\n    }\n\n    const sourceElement = findProgressSource(card);\n\n    if (!sourceElement) {\n      continue;\n    }\n\n    let progressSection = card.querySelector('.pgt-progress-card-section');\n\n    if (!progressSection) {\n      progressSection = createProgressSection();\n      sourceElement.insertAdjacentElement('afterend', progressSection);\n\n      sourceElement.classList.add('pgt-progress-card-source');\n      sourceElement.setAttribute('aria-hidden', 'true');\n\n      card.classList.add(STYLE_CLASS);\n      card.setAttribute(ENHANCED_ATTRIBUTE, 'true');\n    }\n\n    syncProgressCard(\n      card,\n      sourceElement,\n      progressSection\n    );\n  }\n}\n\nfunction hasNativeDetailedProgress(card) {\n  if (card.querySelector('.pgt-progress-card-section')) {\n    return false;\n  }\n\n  const hasProgressLabel =\n    /(^|\\s)(Fortschritt|Progress)(\\s|$)/i.test(card.textContent || '');\n\n  const hasProgressBar = Boolean(\n    card.querySelector(\n      '[role=\"progressbar\"], progress, .progress-bar, .tracker-progress-bar, .category-card-progress, .card-progress-bar'\n    )\n  );\n\n  return hasProgressLabel && hasProgressBar;\n}\n\nfunction findProgressSource(card) {\n  const explicitSource = card.querySelector(SOURCE_SELECTOR);\n\n  if (explicitSource) {\n    return explicitSource;\n  }\n\n  const candidates = Array.from(\n    card.querySelectorAll('p, span, div, strong, small')\n  );\n\n  return candidates.find((element) => {\n    if (element.closest('.pgt-progress-card-section')) {\n      return false;\n    }\n\n    if (element.children.length > 0) {\n      return false;\n    }\n\n    return parseProgressText(element.textContent) !== null;\n  }) ?? null;\n}\n\nfunction syncProgressCard(\n  card,\n  sourceElement,\n  progressSection\n) {\n  const progress = parseProgressText(sourceElement.textContent);\n\n  if (!progress) {\n    setHidden(progressSection, true);\n    return;\n  }\n\n  const { completed, total } = progress;\n  const percent = calculatePercent(completed, total);\n\n  const countElement = progressSection.querySelector(\n    '.pgt-progress-card-count'\n  );\n\n  const percentElement = progressSection.querySelector(\n    '.pgt-progress-card-percent'\n  );\n\n  const fillElement = progressSection.querySelector(\n    '.pgt-progress-card-fill'\n  );\n\n  const barElement = progressSection.querySelector(\n    '.pgt-progress-card-bar'\n  );\n\n  const labelElement = progressSection.querySelector(\n    '.pgt-progress-card-label'\n  );\n\n  const progressLabel = getProgressLabel();\n  const countText = `${completed} / ${total}`;\n  const percentText = `${Math.round(percent)} %`;\n  const fillWidth = `${percent.toFixed(2)}%`;\n\n  setText(labelElement, progressLabel);\n  setText(countElement, countText);\n  setText(percentElement, percentText);\n  setStyleWidth(fillElement, fillWidth);\n\n  setAttribute(barElement, 'aria-label', progressLabel);\n  setAttribute(barElement, 'aria-valuemin', '0');\n  setAttribute(barElement, 'aria-valuemax', String(total));\n  setAttribute(barElement, 'aria-valuenow', String(completed));\n  setAttribute(\n    barElement,\n    'aria-valuetext',\n    `${completed} / ${total}, ${Math.round(percent)} %`\n  );\n\n  const sourceIsHidden =\n    sourceElement.hidden ||\n    sourceElement.closest('[hidden]') !== null;\n\n  /*\n   * 0 / 0 ist in gameView.js zunächst nur ein Ladeplatzhalter.\n   * Die sichtbare Anzeige erscheint erst, wenn eine echte Gesamtzahl\n   * berechnet wurde.\n   */\n  setHidden(\n    progressSection,\n    sourceIsHidden || total <= 0\n  );\n\n  card.dataset.progressCompleted = String(completed);\n  card.dataset.progressTotal = String(total);\n  card.dataset.progressPercent = String(Math.round(percent));\n}\n\nfunction parseProgressText(value) {\n  const match = String(value ?? '')\n    .trim()\n    .match(/^(\\d+)\\s*\\/\\s*(\\d+)$/);\n\n  if (!match) {\n    return null;\n  }\n\n  return {\n    completed: Number(match[1]),\n    total: Number(match[2])\n  };\n}\n\nfunction calculatePercent(completed, total) {\n  if (!Number.isFinite(total) || total <= 0) {\n    return 0;\n  }\n\n  const rawPercent = (completed / total) * 100;\n\n  return Math.max(\n    0,\n    Math.min(100, rawPercent)\n  );\n}\n\nfunction createProgressSection() {\n  const section = document.createElement('div');\n  section.className = 'pgt-progress-card-section';\n  section.hidden = true;\n\n  const label = document.createElement('div');\n  label.className = 'pgt-progress-card-label';\n\n  const bar = document.createElement('div');\n  bar.className = 'pgt-progress-card-bar';\n  bar.setAttribute('role', 'progressbar');\n\n  const fill = document.createElement('div');\n  fill.className = 'pgt-progress-card-fill';\n\n  const overlay = document.createElement('div');\n  overlay.className = 'pgt-progress-card-overlay';\n\n  const count = document.createElement('span');\n  count.className = 'pgt-progress-card-count';\n\n  const percentage = document.createElement('span');\n  percentage.className = 'pgt-progress-card-percent';\n\n  overlay.append(\n    count,\n    percentage\n  );\n\n  bar.append(\n    fill,\n    overlay\n  );\n\n  section.append(\n    label,\n    bar\n  );\n\n  return section;\n}\n\nfunction getProgressLabel() {\n  const languageSelect = document.getElementById('language-select');\n  const language = languageSelect?.value || document.documentElement.lang;\n\n  return language === 'en'\n    ? 'Progress'\n    : 'Fortschritt';\n}\n\nfunction setText(element, value) {\n  if (element && element.textContent !== value) {\n    element.textContent = value;\n  }\n}\n\nfunction setAttribute(element, name, value) {\n  if (element && element.getAttribute(name) !== value) {\n    element.setAttribute(name, value);\n  }\n}\n\nfunction setStyleWidth(element, value) {\n  if (element && element.style.width !== value) {\n    element.style.width = value;\n  }\n}\n\nfunction setHidden(element, hidden) {\n  if (element && element.hidden !== hidden) {\n    element.hidden = hidden;\n  }\n}\n\nfunction setupObserver() {\n  const mainContent = document.querySelector(MAIN_CONTENT_SELECTOR);\n\n  if (!mainContent) {\n    return;\n  }\n\n  observer?.disconnect();\n\n  observer = new MutationObserver(() => {\n    scheduleEnhancement();\n  });\n\n  observer.observe(mainContent, {\n    childList: true,\n    subtree: true,\n    characterData: true,\n    attributes: true,\n    attributeFilter: ['hidden']\n  });\n}\n\nfunction initialize() {\n  setupObserver();\n  scheduleEnhancement();\n\n  document\n    .getElementById('language-select')\n    ?.addEventListener(\n      'change',\n      scheduleEnhancement\n    );\n}\n\nif (document.readyState === 'loading') {\n  window.addEventListener(\n    'DOMContentLoaded',\n    initialize,\n    { once: true }\n  );\n} else {\n  initialize();\n}\n\nwindow.addEventListener(\n  'hashchange',\n  scheduleEnhancement\n);\n\nwindow.addEventListener(\n  'load',\n  scheduleEnhancement\n);\n";
const progressCss = ".pgt-progress-card-source {\n  position: absolute !important;\n  width: 1px !important;\n  height: 1px !important;\n  padding: 0 !important;\n  margin: -1px !important;\n  overflow: hidden !important;\n  clip: rect(0, 0, 0, 0) !important;\n  white-space: nowrap !important;\n  border: 0 !important;\n}\n\n.pgt-progress-card-section {\n  margin-top: 1rem;\n  display: grid;\n  gap: 0.5rem;\n  width: 100%;\n}\n\n.pgt-progress-card-section[hidden] {\n  display: none !important;\n}\n\n.pgt-progress-card-label {\n  font-size: 0.95rem;\n  font-weight: 700;\n  color: #f8fafc;\n  text-align: left;\n}\n\n.pgt-progress-card-bar {\n  position: relative;\n  overflow: hidden;\n  min-height: 1.2rem;\n  border-radius: 999px;\n  background: rgba(148, 163, 184, 0.18);\n  border: 1px solid rgba(148, 163, 184, 0.18);\n}\n\n.pgt-progress-card-fill {\n  position: absolute;\n  inset: 0 auto 0 0;\n  height: 100%;\n  border-radius: inherit;\n  background: linear-gradient(90deg, #2563eb 0%, #60a5fa 100%);\n  transition: width 180ms ease;\n}\n\n.pgt-progress-card-overlay {\n  position: relative;\n  z-index: 1;\n  min-height: 1.2rem;\n  padding: 0.15rem 0.7rem;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 0.75rem;\n  font-size: 0.85rem;\n  font-weight: 700;\n  color: #eff6ff;\n}\n\n.pgt-progress-card-count,\n.pgt-progress-card-percent {\n  white-space: nowrap;\n}\n\n@media (max-width: 640px) {\n  .pgt-progress-card-overlay {\n    font-size: 0.78rem;\n    padding-inline: 0.55rem;\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .pgt-progress-card-fill {\n    transition: none;\n  }\n}\n";

await ensureFile(
  "assets/js/progressCardLayoutHotfix.js",
  progressScript
);

await ensureFile(
  "assets/css/progress-card-layout-hotfix.css",
  progressCss
);

await injectIntoHtml("index.html");

console.log("Progress-Card-Synchronisationsfix erfolgreich angewendet.");

async function injectIntoHtml(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = await fs.readFile(absolutePath, "utf8");

  const stylesheetTag =
    "\t\t<link rel=\"stylesheet\" href=\"assets/css/progress-card-layout-hotfix.css\">";
  const scriptTag =
    "\t\t<script type=\"module\" src=\"./assets/js/progressCardLayoutHotfix.js\"></script>";

  let updated = source;

  if (!updated.includes("progress-card-layout-hotfix.css")) {
    updated = insertBeforeClosingTag(
      updated,
      "</head>",
      stylesheetTag
    );
  }

  if (!updated.includes("progressCardLayoutHotfix.js")) {
    updated = insertBeforeClosingTag(
      updated,
      "</body>",
      scriptTag
    );
  }

  await writeNormalized(
    absolutePath,
    updated
  );
}

function insertBeforeClosingTag(source, closingTag, insertion) {
  const index = source.lastIndexOf(closingTag);

  if (index === -1) {
    throw new Error(
      `Schließendes Tag ${closingTag} nicht gefunden.`
    );
  }

  const lineStart = source.lastIndexOf("\n", index - 1) + 1;
  const indentation =
    source.slice(lineStart, index).match(/^\s*/)?.[0] ?? "";

  return (
    source.slice(0, lineStart) +
    insertion +
    "\n" +
    indentation +
    source.slice(index)
  );
}

async function ensureFile(relativePath, content) {
  const absolutePath = path.join(repoRoot, relativePath);

  await fs.mkdir(
    path.dirname(absolutePath),
    { recursive: true }
  );

  await writeNormalized(
    absolutePath,
    content
  );
}

async function writeNormalized(absolutePath, content) {
  const normalized = String(content)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/^[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";

  await fs.writeFile(
    absolutePath,
    normalized,
    "utf8"
  );
}
