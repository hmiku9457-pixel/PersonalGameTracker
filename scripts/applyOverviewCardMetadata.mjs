import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataRoot = path.join(root, "data");

const DESCRIPTIONS = {
    achievements: {
        de: "Erfolge und Herausforderungen, die den vollständigen Spielfortschritt und besondere Aufgaben dokumentieren.",
        en: "Achievements and challenges that document full game completion and special objectives."
    },
    quests: {
        de: "Haupt-, Neben- und optionale Quests mit ihren Aufgaben, Voraussetzungen und Abschlusszielen.",
        en: "Main, side and optional quests with their objectives, requirements and completion goals."
    },
    equipmentsets: {
        de: "Ausrüstungssets und ihre Bestandteile für die gezielte Planung einer vollständigen Sammlung.",
        en: "Equipment sets and their individual pieces for planning and completing the full collection."
    },
    collectibles: {
        de: "Sammelobjekte, Aufzeichnungen und ergänzende Hintergrundinformationen aus der Spielwelt.",
        en: "Collectibles, recordings and additional background information found throughout the game world."
    },
    exotics: {
        de: "Exotische Waffen und Ausrüstungsteile mit besonderen Talenten und eigenen Freischaltbedingungen.",
        en: "Exotic weapons and gear pieces with unique talents and individual unlock requirements."
    },
    blueprints: {
        de: "Blaupausen für Waffen, Ausrüstung und Mods sowie die jeweiligen Wege zu ihrer Freischaltung.",
        en: "Blueprints for weapons, gear and mods together with their respective unlock methods."
    },
    foundfootage: {
        de: "Gefundene Videoaufzeichnungen aus der offenen Welt, Missionen und Erweiterungsgebieten.",
        en: "Recovered video recordings from the open world, missions and expansion areas."
    },
    comms: {
        de: "Audioprotokolle und Kommunikationsaufzeichnungen aus Regionen, Missionen und saisonalen Inhalten.",
        en: "Audio logs and communication recordings from regions, missions and seasonal content."
    },
    artifacts: {
        de: "Kunstwerke, Relikte und weitere Artefakte, die über die verschiedenen Spielgebiete verteilt sind.",
        en: "Artwork, relics and other artifacts distributed throughout the different game areas."
    },
    echos: {
        de: "Rekonstruierte Szenen und holografische Momentaufnahmen wichtiger Ereignisse und Begegnungen.",
        en: "Reconstructed scenes and holographic snapshots of important events and encounters."
    },
    fielddata: {
        de: "Feldberichte, Profile und Dokumente mit zusätzlichen Informationen zu Personen und Fraktionen.",
        en: "Field reports, profiles and documents with additional information about people and factions."
    },
    database: {
        de: "Datenbankeinträge, Dossiers und Informationssammlungen aus unterschiedlichen Themenbereichen.",
        en: "Database entries, dossiers and information collections covering a range of subjects."
    }
};

const ITEM_LABELS = {
    achievements: { de: "Erfolge", en: "achievements" },
    quests: { de: "Quests", en: "quests" },
    equipmentsets: { de: "Ausrüstungssets", en: "equipment sets" },
    collectibles: { de: "Einträge", en: "items" },
    exotics: { de: "Exotics", en: "exotics" },
    blueprints: { de: "Blaupausen", en: "blueprints" },
    foundfootage: { de: "Videos", en: "videos" },
    comms: { de: "Aufzeichnungen", en: "recordings" },
    artifacts: { de: "Artefakte", en: "artifacts" },
    echos: { de: "ECHOs", en: "ECHOs" },
    fielddata: { de: "Datensätze", en: "records" },
    database: { de: "Einträge", en: "entries" }
};

const GROUP_LABELS = {
    achievements: { de: "Kategorien", en: "categories" },
    quests: { de: "Questgruppen", en: "quest groups" },
    equipmentsets: { de: "Set-Gruppen", en: "set groups" },
    exotics: { de: "Kategorien", en: "categories" },
    blueprints: { de: "Kategorien", en: "categories" },
    foundfootage: { de: "Sammlungen", en: "collections" },
    comms: { de: "Gruppen", en: "groups" },
    artifacts: { de: "Gruppen", en: "groups" },
    echos: { de: "Gruppen", en: "groups" },
    fielddata: { de: "Gruppen", en: "groups" },
    database: { de: "Gruppen", en: "groups" }
};

await writeText(
    "assets/js/views/overviewCardView.js",
    createOverviewCardModule()
);

await patchGameView();
await enrichAllManifests();
await writeMetadataValidator();
await connectMetadataValidator();
await writeBrowserTest();
await verifyResult();

console.log("Übersichtskarten-Metadaten wurden erfolgreich ergänzt.");

async function patchGameView() {
    const relativePath = "assets/js/views/gameView.js";
    let source = await readText(relativePath);

    source = mergeOverviewCardImports(
        source,
        [
            "createOverviewMeta",
            "createOverviewProgress",
            "updateOverviewProgress"
        ]
    );

    const range = findFunctionRange(
        source,
        "function createCategoryCard("
    );

    let section = source.slice(
        range.start,
        range.end
    );

    if (!section.includes("createOverviewMeta(category)")) {
        const progressIndex = section.indexOf(
            "const progress ="
        );

        if (progressIndex === -1) {
            throw new Error(
                "Die native Fortschrittskomponente in createCategoryCard() wurde nicht gefunden."
            );
        }

        const metaCode = `const meta =\n\t\tcreateOverviewMeta(\n\t\t\tcategory\n\t\t);\n\n\tif (meta) {\n\t\tbutton.append(\n\t\t\tmeta\n\t\t);\n\t}\n\n\t`;

        section =
            section.slice(0, progressIndex) +
            metaCode +
            section.slice(progressIndex);
    }

    source =
        source.slice(0, range.start) +
        section +
        source.slice(range.end);

    await writeText(relativePath, source);
}

async function enrichAllManifests() {
    const manifestPaths = (
        await findFiles(dataRoot, "manifest.json")
    ).sort((left, right) =>
        right.split(path.sep).length -
        left.split(path.sep).length
    );

    for (const manifestPath of manifestPaths) {
        const manifest = await readJsonAbsolute(manifestPath);
        const categories = Array.isArray(manifest.categories)
            ? manifest.categories
            : [];

        for (const entry of categories) {
            await enrichEntry(entry, manifestPath);
        }

        await writeJsonAbsolute(manifestPath, manifest);
    }
}

async function enrichEntry(entry, manifestPath) {
    const key = normalizeKey(entry.id || localizedText(entry.name));
    const targetPath = entry.file
        ? path.resolve(path.dirname(manifestPath), entry.file)
        : null;

    entry.description = createDescription(entry, key);

    if (!Number.isInteger(entry.itemCount) || entry.itemCount < 0) {
        entry.itemCount = await calculateItemCount(
            entry,
            targetPath
        );
    }

    entry.itemLabel =
        ITEM_LABELS[key] ||
        defaultItemLabel(entry);

    const calculatedGroupCount =
        await calculateGroupCount(
            entry,
            targetPath
        );

    const groupCount =
        Number.isInteger(entry.groupCount) &&
        entry.groupCount > 0
            ? entry.groupCount
            : calculatedGroupCount;

    if (groupCount > 0) {
        entry.groupCount = groupCount;
        entry.groupLabel =
            entry.type === "manifest"
                ? {
                    de: "Kategorien",
                    en: "categories"
                }
                : GROUP_LABELS[key] || {
                    de: "Gruppen",
                    en: "groups"
                };
    }
}

function createDescription(entry, key) {
    if (DESCRIPTIONS[key]) {
        return DESCRIPTIONS[key];
    }

    if (isLocalizedPair(entry.description)) {
        return entry.description;
    }

    const name = localizedText(entry.name) || entry.id || "Inhalte";
    const existing = typeof entry.description === "string"
        ? entry.description.trim()
        : "";

    const isUsefulExistingDescription =
        existing.length >= 35 &&
        !isGenericDescription(existing, name);

    return {
        de: isUsefulExistingDescription
            ? existing
            : `Verfolge alle Inhalte und Einträge im Bereich ${name}.`,
        en: `Track every item and entry in the ${name} section.`
    };
}

function isGenericDescription(description, name) {
    const normalized = normalizeKey(description);
    const genericValues = new Set([
        "collectibles",
        "achievements",
        "quests",
        "category",
        "categories",
        normalizeKey(name)
    ]);

    return genericValues.has(normalized);
}

function defaultItemLabel(entry) {
    if (entry.type === "manifest") {
        return {
            de: "Einträge",
            en: "items"
        };
    }

    return {
        de: "Einträge",
        en: "entries"
    };
}

async function calculateItemCount(entry, targetPath) {
    if (!targetPath) {
        return 0;
    }

    const target = await readJsonAbsolute(targetPath);

    if (entry.type === "manifest") {
        if (
            Number.isInteger(target.itemCount) &&
            target.itemCount >= 0
        ) {
            return target.itemCount;
        }

        return (target.categories || []).reduce(
            (sum, child) =>
                sum +
                (Number.isInteger(child.itemCount)
                    ? child.itemCount
                    : 0),
            0
        );
    }

    return countItems(target);
}

async function calculateGroupCount(entry, targetPath) {
    if (!targetPath) {
        return 0;
    }

    const target = await readJsonAbsolute(targetPath);

    if (entry.type === "manifest") {
        return Array.isArray(target.categories)
            ? target.categories.length
            : 0;
    }

    return detectGroupCount(target);
}

function countItems(value) {
    if (Array.isArray(value)) {
        return value.reduce(
            (sum, item) => sum + countItems(item),
            0
        );
    }

    if (!value || typeof value !== "object") {
        return 0;
    }

    if (
        typeof value.id === "string" &&
        !Array.isArray(value.items) &&
        !Array.isArray(value.groups) &&
        !Array.isArray(value.categories)
    ) {
        return 1;
    }

    return Object.values(value).reduce(
        (sum, item) => sum + countItems(item),
        0
    );
}

function detectGroupCount(data) {
    if (!data) {
        return 0;
    }

    for (const key of [
        "groups",
        "sections",
        "collections",
        "categories"
    ]) {
        if (Array.isArray(data[key])) {
            return data[key].length;
        }
    }

    if (
        Array.isArray(data) &&
        data.some(item =>
            item &&
            typeof item === "object" &&
            Array.isArray(item.items)
        )
    ) {
        return data.length;
    }

    return 0;
}

async function writeMetadataValidator() {
    await writeText(
        "scripts/validateOverviewCardMetadata.mjs",
        createMetadataValidator()
    );
}

async function connectMetadataValidator() {
    const relativePath =
        "scripts/validateRepository.mjs";
    let source = await readText(relativePath);

    if (!source.includes("validateOverviewCardMetadata.mjs")) {
        source += `\n\nawait import(\n    "./validateOverviewCardMetadata.mjs"\n);\n`;
    }

    await writeText(relativePath, source);
}

async function writeBrowserTest() {
    await writeText(
        "tests/e2e/overview-card-metadata.spec.mjs",
        createBrowserTest()
    );
}

async function verifyResult() {
    const gameView = await readText(
        "assets/js/views/gameView.js"
    );
    const overviewView = await readText(
        "assets/js/views/overviewCardView.js"
    );
    const gamesData = await readText(
        "data/games.json"
    );

    const checks = [
        [gameView.includes("createOverviewMeta"), "gameView.js rendert keine Kartenmetadaten"],
        [countOverviewCardImports(gameView) === 1, "gameView.js enthält nicht genau einen Overview-Card-Import"],
        [countImportedBinding(gameView, "createOverviewProgress") === 1, "createOverviewProgress ist in gameView.js nicht genau einmal importiert"],
        [overviewView.includes("overview-card-meta"), "Die gemeinsame Kartenkomponente enthält keine Metazeile"],
        [!overviewView.includes("MutationObserver"), "Die Kartenkomponente enthält unerwartet einen MutationObserver"],
        [!gamesData.includes("itemLabel"), "data/games.json wurde unerwartet verändert"],
        [!gamesData.includes("groupLabel"), "Die Spielkarten erhielten unerwartet Gruppenmetadaten"]
    ];

    for (const [condition, message] of checks) {
        if (!condition) {
            throw new Error(message);
        }
    }

    await import(
        pathToFileUrl(
            path.join(
                root,
                "scripts/validateOverviewCardMetadata.mjs"
            )
        )
    );
}

function createOverviewCardModule() {
    return `/* =========================================================
   Personal Game Tracker
   Shared Overview Card View
   ========================================================= */

import {
    getCurrentLanguage,
    getLocalizedText
} from "../services/languageService.js";

/**
 * Erstellt die gemeinsame Metazeile einer Übersichtskarte.
 *
 * Beispiel:
 * 13 Videos · 3 Sammlungen
 *
 * @param {Object} entry
 * @returns {HTMLElement|null}
 */
export function createOverviewMeta(entry = {}) {
    const itemCount = Number(entry.itemCount);

    if (!Number.isInteger(itemCount) || itemCount < 0) {
        return null;
    }

    const language = getCurrentLanguage();
    const locale = language === "en"
        ? "en-US"
        : "de-DE";
    const numberFormatter = new Intl.NumberFormat(locale);

    const itemLabel = getLocalizedText(
        entry.itemLabel,
        language === "en" ? "items" : "Einträge"
    );

    const parts = [
        numberFormatter.format(itemCount) + " " + itemLabel
    ];

    const groupCount = Number(entry.groupCount);

    if (Number.isInteger(groupCount) && groupCount > 0) {
        const groupLabel = getLocalizedText(
            entry.groupLabel,
            language === "en" ? "groups" : "Gruppen"
        );

        parts.push(
            numberFormatter.format(groupCount) + " " + groupLabel
        );
    }

    const element = document.createElement("p");
    element.className = "overview-card-meta";
    element.textContent = parts.join(" · ");

    return element;
}

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

function createMetadataValidator() {
    return `import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataRoot = path.join(root, "data");
const manifestPaths = await findFiles(dataRoot, "manifest.json");
const errors = [];

for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(
        await fs.readFile(manifestPath, "utf8")
    );

    for (const entry of manifest.categories || []) {
        const label = path.relative(root, manifestPath) + " -> " + entry.id;

        if (!isLocalizedPair(entry.description)) {
            errors.push(label + ": description muss de und en enthalten");
        }

        if (!Number.isInteger(entry.itemCount) || entry.itemCount < 0) {
            errors.push(label + ": itemCount fehlt oder ist ungültig");
        }

        if (!isLocalizedPair(entry.itemLabel)) {
            errors.push(label + ": itemLabel muss de und en enthalten");
        }

        if (entry.type === "manifest") {
            if (!Number.isInteger(entry.groupCount) || entry.groupCount <= 0) {
                errors.push(label + ": Manifestkarte benötigt groupCount");
            }
        }

        if (entry.groupCount !== undefined) {
            if (!Number.isInteger(entry.groupCount) || entry.groupCount <= 0) {
                errors.push(label + ": groupCount ist ungültig");
            }

            if (!isLocalizedPair(entry.groupLabel)) {
                errors.push(label + ": groupLabel muss de und en enthalten");
            }
        }
    }
}

if (errors.length > 0) {
    throw new Error(
        "Ungültige Übersichtskarten-Metadaten:\\n- " +
        errors.join("\\n- ")
    );
}

console.log(
    "Übersichtskarten-Metadaten geprüft: " +
    manifestPaths.length +
    " Manifeste."
);

function isLocalizedPair(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        typeof value.de === "string" &&
        value.de.trim() &&
        typeof value.en === "string" &&
        value.en.trim()
    );
}

async function findFiles(directory, fileName) {
    const results = [];
    const entries = await fs.readdir(directory, {
        withFileTypes: true
    });

    for (const entry of entries) {
        const absolutePath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            results.push(...await findFiles(absolutePath, fileName));
        } else if (entry.name === fileName) {
            results.push(absolutePath);
        }
    }

    return results;
}
`;
}

function createBrowserTest() {
    return `import {
    expect,
    test
} from "@playwright/test";

test.beforeEach(async ({ page }) => {
    await installSupabaseMock(page);
});

test("Übersichtskarten zeigen Manifest-Metadaten, Spielkarten bleiben unverändert", async ({ page }) => {
    await page.goto("/#game/theDivision2");

    const collectibles = page.locator(
        '.category-card[data-category-id="collectibles"]'
    );

    await expect(collectibles).toBeVisible();
    await expect(
        collectibles.locator(".overview-card-meta")
    ).toContainText("1.233 Einträge");
    await expect(
        collectibles.locator(".overview-card-meta")
    ).toContainText("6 Kategorien");

    await page.goto("/#game/theDivision2/collectibles");

    const foundFootage = page.locator(
        '.category-card[data-category-id="foundFootage"]'
    );

    await expect(foundFootage).toBeVisible();
    await expect(
        foundFootage.locator(".overview-card-meta")
    ).toContainText("13 Videos");

    await page.goto("/#games");

    await expect(
        page.locator(".game-card.overview-card")
    ).toHaveCount(0);
    await expect(
        page.locator(".game-card .overview-card-meta")
    ).toHaveCount(0);
});

async function installSupabaseMock(page) {
    await page.addInitScript(() => {
        function result(data = []) {
            const query = {
                select() { return query; },
                eq() { return query; },
                order() { return query; },
                range() { return query; },
                insert() { return query; },
                delete() { return query; },
                maybeSingle() {
                    return Promise.resolve({
                        data: data[0] ?? null,
                        error: null
                    });
                },
                then(resolve) {
                    return Promise.resolve({
                        data,
                        error: null
                    }).then(resolve);
                }
            };

            return query;
        }

        window.supabase = {
            createClient() {
                return {
                    auth: {
                        async getSession() {
                            return {
                                data: { session: null },
                                error: null
                            };
                        },
                        onAuthStateChange() {
                            return {
                                data: {
                                    subscription: {
                                        unsubscribe() {}
                                    }
                                }
                            };
                        },
                        async signInWithPassword() {
                            return { data: {}, error: null };
                        },
                        async signUp() {
                            return { data: {}, error: null };
                        },
                        async signOut() {
                            return { error: null };
                        }
                    },
                    from() {
                        return result([]);
                    }
                };
            }
        };
    });

    await page.route(
        "https://cdn.jsdelivr.net/**",
        route => route.abort()
    );
}
`;
}

function getOverviewCardImportMatches(source) {
    const importPattern =
        /^[ \t]*import\s*\{([^}]*)\}\s*from\s*["']\.\/overviewCardView\.js["'];?[ \t]*$/gm;

    return [
        ...source.matchAll(importPattern)
    ];
}

function parseImportEntries(specifierBlock) {
    return String(specifierBlock)
        .split(",")
        .map(value =>
            value
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/\/\/.*$/gm, "")
                .replace(/\s+/g, " ")
                .trim()
        )
        .filter(Boolean);
}

function getLocalImportBinding(entry) {
    const aliasMatch = entry.match(
        /\bas\s+([A-Za-z_$][\w$]*)$/
    );

    if (aliasMatch) {
        return aliasMatch[1];
    }

    const identifierMatch = entry.match(
        /^([A-Za-z_$][\w$]*)$/
    );

    return identifierMatch
        ? identifierMatch[1]
        : null;
}

function countOverviewCardImports(source) {
    return getOverviewCardImportMatches(source).length;
}

function countImportedBinding(source, bindingName) {
    let count = 0;

    for (const match of getOverviewCardImportMatches(source)) {
        const entries = parseImportEntries(match[1]);

        for (const entry of entries) {
            if (getLocalImportBinding(entry) === bindingName) {
                count += 1;
            }
        }
    }

    return count;
}

function mergeOverviewCardImports(source, requiredNames) {
    const matches = getOverviewCardImportMatches(source);
    const importEntries = [];
    const localBindings = new Set();

    for (const match of matches) {
        for (const entry of parseImportEntries(match[1])) {
            const localBinding = getLocalImportBinding(entry);

            if (!localBinding) {
                throw new Error(
                    `Nicht unterstützter Overview-Card-Import: ${entry}`
                );
            }

            if (localBindings.has(localBinding)) {
                continue;
            }

            localBindings.add(localBinding);
            importEntries.push(entry);
        }
    }

    for (const requiredName of requiredNames) {
        if (localBindings.has(requiredName)) {
            continue;
        }

        localBindings.add(requiredName);
        importEntries.push(requiredName);
    }

    const importBlock =
        `import {\n\t${importEntries.join(",\n\t")}\n} from "./overviewCardView.js";`;

    if (matches.length === 0) {
        const languageImportPattern =
            /import\s*\{[^}]*\}\s*from\s*["']\.\.\/services\/languageService\.js["'];?/;
        const languageImport = source.match(
            languageImportPattern
        );

        if (!languageImport) {
            throw new Error(
                "Kein geeigneter Import-Anker in gameView.js gefunden."
            );
        }

        return source.replace(
            languageImportPattern,
            languageImport[0] + "\n\n" + importBlock
        );
    }

    const firstImportIndex = matches[0].index;
    let updatedSource = source;

    for (const match of [...matches].reverse()) {
        const start = match.index;
        const end = start + match[0].length;

        updatedSource =
            updatedSource.slice(0, start) +
            updatedSource.slice(end);
    }

    updatedSource =
        updatedSource.slice(0, firstImportIndex) +
        importBlock +
        updatedSource.slice(firstImportIndex);

    return updatedSource;
}

function findFunctionRange(source, signature) {
    const start = source.indexOf(signature);

    if (start === -1) {
        throw new Error(
            `Funktion nicht gefunden: ${signature}`
        );
    }

    const openBrace = source.indexOf("{", start);
    let depth = 0;

    for (let index = openBrace; index < source.length; index += 1) {
        const character = source[index];

        if (character === "{") {
            depth += 1;
        } else if (character === "}") {
            depth -= 1;

            if (depth === 0) {
                return {
                    start,
                    end: index + 1
                };
            }
        }
    }

    throw new Error(
        `Funktionsende nicht gefunden: ${signature}`
    );
}

async function findFiles(directory, fileName) {
    const results = [];
    const entries = await fs.readdir(directory, {
        withFileTypes: true
    });

    for (const entry of entries) {
        const absolutePath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            results.push(
                ...await findFiles(
                    absolutePath,
                    fileName
                )
            );
        } else if (entry.name === fileName) {
            results.push(absolutePath);
        }
    }

    return results;
}

function normalizeKey(value) {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
}

function localizedText(value) {
    if (typeof value === "string") {
        return value;
    }

    if (value && typeof value === "object") {
        return value.de || value.en || "";
    }

    return "";
}

function isLocalizedPair(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        typeof value.de === "string" &&
        value.de.trim() &&
        typeof value.en === "string" &&
        value.en.trim()
    );
}

async function readJsonAbsolute(absolutePath) {
    const source = await fs.readFile(
        absolutePath,
        "utf8"
    );

    return JSON.parse(source);
}

async function writeJsonAbsolute(absolutePath, value) {
    await fs.writeFile(
        absolutePath,
        JSON.stringify(value, null, 2) + "\n",
        "utf8"
    );
}

async function readText(relativePath) {
    return fs.readFile(
        path.join(root, relativePath),
        "utf8"
    );
}

async function writeText(relativePath, content) {
    const absolutePath = path.join(root, relativePath);

    await fs.mkdir(
        path.dirname(absolutePath),
        { recursive: true }
    );

    const normalized = String(content)
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .replace(/^[ \t]+$/gm, "")
        .replace(/\n{3,}/g, "\n\n");

    await fs.writeFile(
        absolutePath,
        normalized,
        "utf8"
    );
}

function pathToFileUrl(absolutePath) {
    return new URL(
        `file://${absolutePath.replaceAll("\\\\", "/")}`
    ).href + `?cache=${Date.now()}`;
}
