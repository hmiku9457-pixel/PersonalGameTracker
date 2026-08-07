import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const overviewPath = path.join(
    root,
    "assets/js/views/commsOverviewView.js"
);
const mapViewPath = path.join(
    root,
    "assets/js/views/commsMapView.js"
);
const trackerCssPath = path.join(
    root,
    "assets/css/tracker.css"
);

await patchOverviewView();
await patchMapView();
await patchTrackerCss();

console.log("Comms Phase 5 wurde erfolgreich angewendet.");

async function patchOverviewView() {
    let source = await fs.readFile(overviewPath, "utf8");

    if (!source.includes("comms-map-indicator")) {
        const badgeBlockPattern = /([ \t]*)const badge = document\.createElement\("span"\);[\s\S]*?\n\1const arrow = document\.createElement\("span"\);/;
        const match = source.match(badgeBlockPattern);

        if (!match) {
            throw new Error(
                "Der Ansichts-Tag in commsOverviewView.js konnte nicht gefunden werden."
            );
        }

        const indent = match[1];
        const replacement = [
            `${indent}if (section.view === "map") {`,
            `${indent}    const mapIndicator = document.createElement("span");`,
            `${indent}    mapIndicator.className = "comms-map-indicator";`,
            `${indent}    mapIndicator.textContent = "⌖";`,
            `${indent}    mapIndicator.setAttribute(`,
            `${indent}        "aria-label",`,
            `${indent}        uiText.containsMap`,
            `${indent}    );`,
            `${indent}    mapIndicator.title = uiText.containsMap;`,
            `${indent}    top.append(mapIndicator);`,
            `${indent}}`,
            "",
            `${indent}const arrow = document.createElement("span");`
        ].join("\n");

        source = source.replace(
            badgeBlockPattern,
            replacement
        );

        const topAppendPattern = /([ \t]*)top\.append\(badge, arrow\);/;
        if (!topAppendPattern.test(source)) {
            throw new Error(
                "Die Ausgabe des Ansichts-Tags konnte nicht gefunden werden."
            );
        }

        source = source.replace(
            topAppendPattern,
            "$1top.append(arrow);"
        );
    }

    if (!source.includes("containsMap:")) {
        source = source.replace(
            /([ \t]*)listView: "List view",/,
            '$&\n$1containsMap: "Contains a map",'
        );
        source = source.replace(
            /([ \t]*)listView: "Listenansicht",/,
            '$&\n$1containsMap: "Enthält eine Karte",'
        );
    }

    if (!source.includes("containsMap:")) {
        throw new Error(
            "Die Texte für den Kartenindikator konnten nicht ergänzt werden."
        );
    }

    await fs.writeFile(overviewPath, source, "utf8");
    console.log("commsOverviewView.js wurde aktualisiert.");
}

async function patchMapView() {
    let source = await fs.readFile(mapViewPath, "utf8");

    const functionPattern = /function createHeader\([\s\S]*?\n}\s*function createMapArea\(/;
    const replacement = `function createHeader(
    commsManifest,
    section,
    sectionManifest,
    language
) {
    const header = document.createElement("header");
    header.className = "game-header comms-map-header";

    const title = document.createElement("h2");
    title.className = "game-title";
    title.textContent = getLocalizedText(
        section.name,
        language
    );

    header.append(title);

    return header;
}

function createMapArea(`;

    if (!functionPattern.test(source)) {
        throw new Error(
            "createHeader() in commsMapView.js konnte nicht gefunden werden."
        );
    }

    source = source.replace(
        functionPattern,
        replacement
    );

    await fs.writeFile(mapViewPath, source, "utf8");
    console.log("commsMapView.js wurde aktualisiert.");
}

async function patchTrackerCss() {
    let source = await fs.readFile(trackerCssPath, "utf8");
    const startMarker = "/* === COMMS PHASE 5 DESIGN START === */";
    const endMarker = "/* === COMMS PHASE 5 DESIGN END === */";

    const cssBlock = `${startMarker}
/* =========================================================
   Comms Phase 5 – Design und Ultrawide-Layout
   ========================================================= */

/* Die Kartenansicht darf die gesamte verfügbare Inhaltsbreite nutzen. */
.game-page.comms-map-page {
    max-width: none;
    margin-right: 0;
    margin-left: 0;
    padding-right: clamp(1rem, 1.5vw, 2.5rem);
    padding-left: clamp(1rem, 1.5vw, 2.5rem);
}

/* Einheitlicher, kompakter Kategorien-Banner ohne Beschreibung. */
.game-page .comms-map-header {
    margin: 0 0 1rem;
    padding: 0.95rem 1.15rem;
    text-align: left;
    background-color: #1f2937;
    border: 1px solid #374151;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

.game-page .comms-map-header .game-title {
    font-size: clamp(1.35rem, 1.5vw, 1.75rem);
    line-height: 1.25;
}

/* Alte Text-Tags ausblenden, falls noch zwischengespeichertes Markup existiert. */
.comms-view-badge {
    display: none;
}

.comms-section-card-top {
    min-height: 2rem;
}

/* Kleine, rein visuelle Kennzeichnung für Kategorien mit Karte. */
.comms-map-indicator {
    align-items: center;
    display: inline-flex;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    color: #ffb45c;
    background: rgb(255 136 0 / 12%);
    border: 1px solid rgb(255 136 0 / 34%);
    border-radius: 50%;
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1;
}

.comms-section-card-arrow {
    margin-left: auto;
}

/* Mehr nutzbare Kartenfläche, ohne andere Kategorien zu verändern. */
.comms-map-layout {
    min-height: clamp(40rem, calc(100dvh - 14rem), 72rem);
}

@media (min-width: 1500px) {
    .game-page.comms-map-page {
        padding-right: clamp(1.25rem, 2vw, 3rem);
        padding-left: clamp(1.25rem, 2vw, 3rem);
    }
}

@media (max-width: 900px) {
    .game-page.comms-map-page {
        padding-right: 1rem;
        padding-left: 1rem;
    }

    .game-page .comms-map-header {
        padding: 0.85rem 1rem;
    }
}
${endMarker}`;

    const existingPattern = new RegExp(
        escapeRegExp(startMarker) + "[\\s\\S]*?" + escapeRegExp(endMarker),
        "m"
    );

    if (existingPattern.test(source)) {
        source = source.replace(existingPattern, cssBlock);
    }
    else {
        source = `${source.trimEnd()}\n\n${cssBlock}\n`;
    }

    await fs.writeFile(trackerCssPath, source, "utf8");
    console.log("tracker.css wurde aktualisiert.");
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
