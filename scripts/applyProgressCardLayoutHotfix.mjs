import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

await writeFile(
    "assets/js/views/overviewCardView.js",
    createOverviewCardModule()
);

await writeFile(
    "assets/css/progress-card-layout-hotfix.css",
    createOverviewCardCss()
);

await patchGameView();
await patchCommsOverviewView();
await patchProgressSummaryTest();
await removeRuntimeHotfix();
await verifyResult();

console.log("Native Übersichtskarten wurden erfolgreich eingerichtet.");

async function patchGameView() {
    const relativePath = "assets/js/views/gameView.js";
    let source = await readFile(relativePath);

    source = insertImportOnce(
        source,
        /import\s*\{\s*getCurrentLanguage,\s*getLocalizedText\s*\}\s*from\s*"\.\.\/services\/languageService\.js";/,
        `import {
\tcreateOverviewProgress,
\tupdateOverviewProgress
} from "./overviewCardView.js";`,
        "Overview-Card-Import in gameView.js"
    );

    const section = extractFunctionSection(
        source,
        "function createCategoryCard(",
        "/* ---------------------------------------------------------\n   3. Gesamtfortschritt"
    );

    let updatedSection = section;

    updatedSection = replaceRequired(
        updatedSection,
        /button\.className\s*=\s*"category-card";/,
        `button.className =
\t\t"category-card overview-card";`,
        "gemeinsame Kartenklasse in gameView.js"
    );

    updatedSection = replaceRequired(
        updatedSection,
        /button\.append\(\s*title\s*\);/,
        `const top =
\t\tdocument.createElement(
\t\t\t"div"
\t\t);

\ttop.className =
\t\t"overview-card-top";

\tconst arrow =
\t\tdocument.createElement(
\t\t\t"span"
\t\t);

\tarrow.className =
\t\t"overview-card-arrow";
\tarrow.textContent =
\t\t"→";
\tarrow.setAttribute(
\t\t"aria-hidden",
\t\t"true"
\t);

\ttop.append(
\t\ttitle,
\t\tarrow
\t);

\tbutton.append(
\t\ttop
\t);`,
        "nativer Kartenkopf in gameView.js"
    );

    updatedSection = replaceRequired(
        updatedSection,
        /description\.className\s*=\s*"category-description";/,
        `description.className =
\t\t\t"category-description overview-card-description";`,
        "gemeinsame Beschreibungsklasse in gameView.js"
    );

    updatedSection = replaceRequired(
        updatedSection,
        /const progress\s*=\s*document\.createElement\(\s*"span"\s*\);[\s\S]*?button\.append\(\s*progress\s*\);/,
        `const progress =
\t\tcreateOverviewProgress({
\t\t\thidden: true
\t\t});

\tprogress.element.dataset.categoryProgress =
\t\tcategory.id;

\tbutton.append(
\t\tprogress.element
\t);`,
        "native Fortschrittskomponente in gameView.js"
    );

    source = source.replace(section, updatedSection);

    source = replaceRequired(
        source,
        /element\.textContent\s*=\s*`\$\{progress\.completed\}\s*\/\s*\$\{progress\.total\}`;/,
        `updateOverviewProgress(
\t\telement,
\t\tprogress
\t);`,
        "Fortschrittsaktualisierung in gameView.js"
    );

    source = replaceRequired(
        source,
        /container\.querySelectorAll\(\s*"\.category-progress"\s*\)/,
        `container.querySelectorAll(
\t\t\t".overview-card-progress[data-category-progress]"
\t\t)`,
        "Fortschritt ausblenden in gameView.js"
    );

    await writeFile(relativePath, source);
}

async function patchCommsOverviewView() {
    const relativePath = "assets/js/views/commsOverviewView.js";
    let source = await readFile(relativePath);

    source = insertImportOnce(
        source,
        /import\s*\{\s*applyPageBreadcrumbBanner\s*\}\s*from\s*"\.\/pageBreadcrumbView\.js";/,
        `import {
    createOverviewProgress,
    updateOverviewProgress
} from "./overviewCardView.js";`,
        "Overview-Card-Import in commsOverviewView.js"
    );

    source = replaceRequired(
        source,
        /target\.progressElement\.hidden\s*=\s*false;[\s\S]*?target\.progressFill\.style\.width\s*=\s*`\$\{progress\.percentage\}%`;/,
        `updateOverviewProgress(
            target.progress,
            progress
        );`,
        "Comms-Fortschrittsaktualisierung"
    );

    const section = extractFunctionSection(
        source,
        "function createSectionCard(",
        "/**\n * Berechnet den Fortschritt eines Comms-Bereichs."
    );

    let updatedSection = section;

    updatedSection = replaceRequired(
        updatedSection,
        /link\.className\s*=\s*"comms-section-card";/,
        `link.className =
        "comms-section-card overview-card";`,
        "gemeinsame Kartenklasse in commsOverviewView.js"
    );

    updatedSection = replaceRequired(
        updatedSection,
        /top\.className\s*=\s*"comms-section-card-top";/,
        `top.className =
        "comms-section-card-top overview-card-top";`,
        "gemeinsamer Kartenkopf in commsOverviewView.js"
    );

    updatedSection = replaceRequired(
        updatedSection,
        /arrow\.className\s*=\s*"comms-section-card-arrow";/,
        `arrow.className =
        "comms-section-card-arrow overview-card-arrow";`,
        "gemeinsamer Kartenpfeil in commsOverviewView.js"
    );

    updatedSection = replaceRequired(
        updatedSection,
        /(const description\s*=\s*document\.createElement\(\s*"p"\s*\);)/,
        `$1

    description.className =
        "overview-card-description";`,
        "gemeinsame Beschreibungsklasse in commsOverviewView.js"
    );

    updatedSection = replaceRequired(
        updatedSection,
        /counts\.className\s*=\s*"comms-section-card-counts";/,
        `counts.className =
        "comms-section-card-counts overview-card-meta";`,
        "gemeinsame Metaklasse in commsOverviewView.js"
    );

    updatedSection = replaceRequired(
        updatedSection,
        /const progressElement\s*=[\s\S]*?return\s*\{\s*element:\s*link,\s*section,\s*progressElement,\s*progressText,\s*progressFill\s*\};/,
        `const progress =
        createOverviewProgress({
            label: uiText.progress,
            hidden: true
        });

    link.append(
        top,
        description,
        counts,
        progress.element
    );

    return {
        element: link,
        section,
        progress
    };`,
        "native Fortschrittskomponente in commsOverviewView.js"
    );

    source = source.replace(section, updatedSection);
    await writeFile(relativePath, source);
}

async function patchProgressSummaryTest() {
    const relativePath =
        "tests/e2e/progress-summary.spec.mjs";

    let source =
        await readFile(relativePath);

    source = source
        .replaceAll(
            ".pgt-progress-card-count",
            ".overview-card-progress-count"
        )
        .replaceAll(
            ".pgt-progress-card-percent",
            ".overview-card-progress-percent"
        );

    if (
        source.includes(
            ".pgt-progress-card-count"
        ) ||
        source.includes(
            ".pgt-progress-card-percent"
        )
    ) {
        throw new Error(
            "Veraltete Progress-Card-Selektoren im Browser-Test konnten nicht vollständig ersetzt werden."
        );
    }

    if (
        !source.includes(
            ".overview-card-progress-count"
        ) ||
        !source.includes(
            ".overview-card-progress-percent"
        )
    ) {
        throw new Error(
            "Native Progress-Card-Selektoren fehlen im Browser-Test."
        );
    }

    await writeFile(
        relativePath,
        source
    );
}

async function removeRuntimeHotfix() {
    for (const relativePath of ["index.html", "404.html"]) {
        let source = await readFile(relativePath);

        source = source.replace(
            /<script\b[^>]*src=["'](?:\.\/)?assets\/js\/progressCardLayoutHotfix\.js["'][^>]*><\/script>/g,
            ""
        );

        if (relativePath === "404.html") {
            source = source.replace(
                /<link\b[^>]*href=["'](?:\.\/)?assets\/css\/progress-card-layout-hotfix\.css["'][^>]*>/g,
                ""
            );
        }

        await writeFile(relativePath, source);
    }

    await deleteIfExists(
        "assets/js/progressCardLayoutHotfix.js"
    );
}

async function verifyResult() {
    const gameView = await readFile(
        "assets/js/views/gameView.js"
    );
    const commsView = await readFile(
        "assets/js/views/commsOverviewView.js"
    );
    const index = await readFile("index.html");
    const html404 = await readFile("404.html");
    const sharedModule = await readFile(
        "assets/js/views/overviewCardView.js"
    );
    const progressSummaryTest = await readFile(
        "tests/e2e/progress-summary.spec.mjs"
    );

    const checks = [
        [gameView.includes("category-card overview-card"), "gameView nutzt keine gemeinsame Kartenklasse"],
        [gameView.includes("createOverviewProgress"), "gameView nutzt keine native Fortschrittskomponente"],
        [commsView.includes("comms-section-card overview-card"), "Comms nutzt keine gemeinsame Kartenklasse"],
        [commsView.includes("updateOverviewProgress"), "Comms nutzt keine gemeinsame Fortschrittsaktualisierung"],
        [!index.includes("progressCardLayoutHotfix.js"), "index.html lädt noch den Observer-Hotfix"],
        [!html404.includes("progressCardLayoutHotfix.js"), "404.html lädt noch den Observer-Hotfix"],
        [!sharedModule.includes("new MutationObserver"), "Die native Kartenkomponente enthält noch einen aktiven DOM-Observer"],
        [progressSummaryTest.includes(".overview-card-progress-count"), "Der Fortschritts-Test verwendet nicht den nativen Zähler-Selektor"],
        [progressSummaryTest.includes(".overview-card-progress-percent"), "Der Fortschritts-Test verwendet nicht den nativen Prozent-Selektor"],
        [!progressSummaryTest.includes(".pgt-progress-card-"), "Der Fortschritts-Test enthält noch Selektoren des entfernten Observer-Hotfixes"]
    ];

    for (const [condition, message] of checks) {
        if (!condition) {
            throw new Error(message);
        }
    }
}

function createOverviewCardModule() {
    return `/* =========================================================
   Personal Game Tracker
   Shared Overview Card View
   ========================================================= */

import {
    getCurrentLanguage
} from "../services/languageService.js";

/**
 * Erstellt die gemeinsame Fortschrittsanzeige aller Übersichtskarten.
 *
 * Die Komponente wird direkt beim Rendern erzeugt. Es gibt bewusst
 * keine DOM-Beobachtung und keine nachträgliche DOM-Transformation.
 *
 * @param {{label?:string,hidden?:boolean}} options
 * @returns {{element:HTMLElement,bar:HTMLElement,fill:HTMLElement,count:HTMLElement,percent:HTMLElement}}
 */
export function createOverviewProgress(options = {}) {
    const element = document.createElement("div");
    element.className = "overview-card-progress";
    element.hidden = options.hidden ?? true;

    const label = document.createElement("div");
    label.className = "overview-card-progress-label";
    label.textContent = options.label || getProgressLabel();

    const bar = document.createElement("div");
    bar.className = "overview-card-progress-bar";
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", label.textContent);
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "0");
    bar.setAttribute("aria-valuenow", "0");

    const fill = document.createElement("div");
    fill.className = "overview-card-progress-fill";
    fill.style.width = "0%";

    const overlay = document.createElement("div");
    overlay.className = "overview-card-progress-overlay";

    const count = document.createElement("span");
    count.className = "overview-card-progress-count";
    count.textContent = "0 / 0";

    const percent = document.createElement("span");
    percent.className = "overview-card-progress-percent";
    percent.textContent = "0 %";

    overlay.append(count, percent);
    bar.append(fill, overlay);
    element.append(label, bar);

    return {
        element,
        bar,
        fill,
        count,
        percent
    };
}

/**
 * Aktualisiert eine bereits gerenderte Fortschrittskomponente.
 *
 * @param {HTMLElement|object} target
 * @param {{completed?:number,total?:number,percentage?:number}} progress
 */
export function updateOverviewProgress(target, progress = {}) {
    const component = resolveComponent(target);
    if (!component) {
        return;
    }

    const completed = Math.max(0, Number(progress.completed) || 0);
    const total = Math.max(0, Number(progress.total) || 0);
    const calculatedPercentage =
        total > 0
            ? Math.round((completed / total) * 100)
            : 0;
    const percentage = Number.isFinite(Number(progress.percentage))
        ? Math.max(0, Math.min(100, Math.round(Number(progress.percentage))))
        : calculatedPercentage;

    component.element.hidden = false;
    component.count.textContent = completed + " / " + total;
    component.percent.textContent = percentage + " %";
    component.fill.style.width = percentage + "%";
    component.bar.setAttribute("aria-valuemin", "0");
    component.bar.setAttribute("aria-valuemax", String(total));
    component.bar.setAttribute("aria-valuenow", String(completed));
}

function resolveComponent(target) {
    const element = target?.element instanceof HTMLElement
        ? target.element
        : target instanceof HTMLElement
            ? target
            : null;

    if (!element) {
        return null;
    }

    const bar = target?.bar || element.querySelector(".overview-card-progress-bar");
    const fill = target?.fill || element.querySelector(".overview-card-progress-fill");
    const count = target?.count || element.querySelector(".overview-card-progress-count");
    const percent = target?.percent || element.querySelector(".overview-card-progress-percent");

    if (!bar || !fill || !count || !percent) {
        return null;
    }

    return {
        element,
        bar,
        fill,
        count,
        percent
    };
}

function getProgressLabel() {
    return getCurrentLanguage() === "en"
        ? "Progress"
        : "Fortschritt";
}
`;
}

function createOverviewCardCss() {
    return `/* =========================================================
   Personal Game Tracker
   Unified Overview Cards
   ========================================================= */

/* Beide Übersichtsraster verwenden dasselbe zweispaltige Layout. */
.game-page .category-grid,
.game-page .comms-section-grid {
    width: 100%;
    max-width: 1200px;
    margin: 1.5rem auto 60px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}

/* Eine gemeinsame Kartenbasis für normale und Comms-Übersichten. */
.game-page .overview-card {
    appearance: none;
    width: 100%;
    max-width: none;
    min-height: 16rem;
    margin: 0;
    padding: 1.25rem;
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 0.85rem;
    position: relative;
    overflow: hidden;
    color: #e5e7eb;
    background:
        linear-gradient(
            145deg,
            rgb(255 255 255 / 5.5%),
            rgb(255 255 255 / 1.5%)
        );
    border: 1px solid rgb(255 255 255 / 11%);
    border-radius: 0.9rem;
    box-shadow: none;
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition:
        background-color 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease,
        transform 160ms ease;
}

.game-page .overview-card:hover,
.game-page .overview-card:focus-visible {
    color: #e5e7eb;
    background: #273449;
    border-color: #60a5fa;
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgb(0 0 0 / 25%);
}

.game-page .overview-card:focus-visible {
    outline: 2px solid #60a5fa;
    outline-offset: 3px;
}

.game-page .overview-card:active {
    transform: translateY(-1px);
}

.game-page .overview-card-top {
    min-width: 0;
    min-height: 2rem;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.65rem;
}

.game-page .overview-card h2,
.game-page .overview-card h3 {
    min-width: 0;
    margin: 0;
    color: #f3f4f6;
    font-size: clamp(1.25rem, 2vw, 1.65rem);
    font-weight: 700;
    line-height: 1.25;
}

.game-page .overview-card-arrow {
    flex-shrink: 0;
    margin-left: auto;
    color: inherit;
    font-size: 1.35rem;
    opacity: 0.7;
    transition:
        color 160ms ease,
        transform 160ms ease;
}

.game-page .overview-card:hover .overview-card-arrow,
.game-page .overview-card:focus-visible .overview-card-arrow {
    color: #93c5fd;
    transform: translateX(0.25rem);
}

.game-page .overview-card-description {
    max-width: none;
    margin: 0;
    color: #e5e7eb;
    font-size: 0.95rem;
    line-height: 1.55;
    text-align: left;
}

.game-page .overview-card-meta {
    margin: auto 0 0;
    color: #9ca3af;
    font-size: 0.9rem;
    opacity: 0.8;
}

/* Gemeinsame native Fortschrittskomponente. */
.game-page .overview-card-progress {
    width: 100%;
    margin-top: auto;
    display: grid;
    gap: 0.6rem;
}

.game-page .overview-card-progress[hidden] {
    display: none !important;
}

.game-page .overview-card-progress-label {
    color: #f8fafc;
    font-size: 1rem;
    font-weight: 700;
    text-align: left;
}

.game-page .overview-card-progress-bar {
    min-height: 1.72rem;
    position: relative;
    overflow: hidden;
    background: rgba(148, 163, 184, 0.18);
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 999px;
}

.game-page .overview-card-progress-fill {
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    background: linear-gradient(90deg, #2563eb 0%, #60a5fa 100%);
    border-radius: inherit;
    transition: width 180ms ease;
}

.game-page .overview-card-progress-overlay {
    min-height: 1.72rem;
    padding: 0.22rem 0.82rem;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    color: #eff6ff;
    font-size: 0.93rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.game-page .overview-card-progress-count,
.game-page .overview-card-progress-percent {
    white-space: nowrap;
}

@media (max-width: 780px) {
    .game-page .category-grid,
    .game-page .comms-section-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
        margin-top: 1rem;
    }

    .game-page .overview-card {
        min-height: 13rem;
        padding: 1.1rem;
    }
}

@media (max-width: 640px) {
    .game-page .overview-card-progress-bar,
    .game-page .overview-card-progress-overlay {
        min-height: 1.58rem;
    }

    .game-page .overview-card-progress-overlay {
        padding-inline: 0.65rem;
        font-size: 0.84rem;
    }
}
`;
}

function insertImportOnce(source, anchorRegex, importBlock, label) {
    if (source.includes("./overviewCardView.js")) {
        return source;
    }

    const match = source.match(anchorRegex);
    if (!match) {
        throw new Error("Erwartete Codepassage nicht gefunden: " + label);
    }

    return source.replace(
        anchorRegex,
        match[0] + "\n\n" + importBlock
    );
}

function extractFunctionSection(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);

    if (start < 0 || end < 0 || end <= start) {
        throw new Error(
            "Funktionsbereich konnte nicht ermittelt werden: " + startMarker
        );
    }

    return source.slice(start, end);
}

function replaceRequired(source, pattern, replacement, label) {
    const matches = source.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"));
    const count = matches?.length ?? 0;

    if (count !== 1) {
        throw new Error(
            `Erwartet wurde genau eine Codepassage für "${label}", gefunden: ${count}`
        );
    }

    return source.replace(pattern, replacement);
}

async function readFile(relativePath) {
    return fs.readFile(
        path.join(root, relativePath),
        "utf8"
    );
}

async function writeFile(relativePath, content) {
    const absolutePath = path.join(root, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

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

async function deleteIfExists(relativePath) {
    try {
        await fs.unlink(
            path.join(root, relativePath)
        );
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
}
