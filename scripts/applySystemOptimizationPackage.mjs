import {
    createHash
} from "node:crypto";

import {
    access,
    mkdir,
    readFile,
    readdir,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    join,
    relative,
    resolve
} from "node:path";

const ROOT = process.cwd();
const UTF8 = "utf8";

const REQUIRED_FILES = [
    "index.html",
    "assets/js/router.js",
    "assets/js/services/dataService.js",
    "assets/js/services/progressService.js",
    "assets/js/views/gameView.js",
    "assets/js/views/gamesView.js",
    "assets/js/views/categoryView.js",
    "assets/js/views/categoryControlsView.js",
    "assets/js/views/commsOverviewView.js",
    "assets/js/views/commsMapView.js",
    "data/theDivision2/collectibles/comms/manifest.json"
];

await assertRepositoryRoot();

await createSystemModules();
await patchProgressService();
await patchGamesView();
await patchGameView();
await patchCommsOverviewView();
await patchRouter();
await patchAsyncViewLifecycle();
await patchCategoryControlsLifecycle();
await patchDataService();
await patchCommsManifests();
await addSupabaseIntegrity();
await createTestingInfrastructure();
await createPerformanceMeasurement();
await patchGitignore();

console.info("\nSystemoptimierung wurde vollständig angewendet.");
console.info("Der Workflow führt jetzt Validierung und Browser-Smoke-Tests aus.");

async function assertRepositoryRoot() {
    for (const file of REQUIRED_FILES) {
        try {
            await access(resolve(ROOT, file));
        }
        catch {
            throw new Error(
                `Repository-Datei fehlt: ${file}. ` +
                "Das Skript muss im Root des aktuellen PersonalGameTracker-Repositories laufen."
            );
        }
    }
}

async function createSystemModules() {
    await writeText(
        "assets/js/services/viewScopeService.js",
        `/* =========================================================
   Personal Game Tracker
   View Scope Service
   ========================================================= */

let activeScope = null;
let nextScopeId = 0;

/**
 * Startet einen neuen Lebenszyklus für die aktuelle Route.
 * Der vorherige Scope wird vollständig beendet.
 *
 * @returns {object}
 */
export function beginViewScope() {
    activeScope?.dispose();

    const controller =
        new AbortController();

    const cleanupCallbacks =
        new Set();

    const scope = {
        id: ++nextScopeId,
        signal: controller.signal,

        isCurrent() {
            return (
                activeScope === scope &&
                !controller.signal.aborted
            );
        },

        onDispose(callback) {
            if (
                typeof callback !== "function"
            ) {
                return () => {};
            }

            if (controller.signal.aborted) {
                callback();
                return () => {};
            }

            cleanupCallbacks.add(callback);

            return () => {
                cleanupCallbacks.delete(callback);
            };
        },

        dispose() {
            if (controller.signal.aborted) {
                return;
            }

            controller.abort();

            for (
                const callback
                of cleanupCallbacks
            ) {
                try {
                    callback();
                }
                catch (error) {
                    console.error(
                        "View-Cleanup ist fehlgeschlagen:",
                        error
                    );
                }
            }

            cleanupCallbacks.clear();
        }
    };

    activeScope = scope;

    return scope;
}

/**
 * Gibt den aktiven View-Scope zurück.
 *
 * @returns {object|null}
 */
export function getActiveViewScope() {
    return activeScope;
}

/**
 * Prüft, ob ein Scope weiterhin zur sichtbaren Route gehört.
 *
 * @param {object|null} scope
 * @returns {boolean}
 */
export function isViewScopeCurrent(scope) {
    return Boolean(
        scope &&
        scope === activeScope &&
        typeof scope.isCurrent === "function" &&
        scope.isCurrent()
    );
}

/**
 * Registriert eine Aufräumfunktion im aktiven View-Scope.
 *
 * @param {Function} callback
 * @param {object|null} scope
 * @returns {Function}
 */
export function registerViewCleanup(
    callback,
    scope = activeScope
) {
    if (
        !scope ||
        typeof scope.onDispose !== "function"
    ) {
        return () => {};
    }

    return scope.onDispose(callback);
}

/**
 * Schließt einen erfolgreichen Routenwechsel ab und setzt den
 * Tastaturfokus auf die Überschrift des neuen Hauptinhalts.
 *
 * @param {object} scope
 * @returns {boolean}
 */
export function completeViewRender(scope) {
    if (!isViewScopeCurrent(scope)) {
        return false;
    }

    queueMicrotask(() => {
        if (!isViewScopeCurrent(scope)) {
            return;
        }

        focusMainHeading();
    });

    return true;
}

/**
 * Setzt den Fokus auf die erste Überschrift im Hauptinhalt.
 */
function focusMainHeading() {
    const mainContent =
        document.getElementById(
            "main-content"
        );

    const heading =
        mainContent?.querySelector(
            "h1, h2"
        );

    if (!heading) {
        return;
    }

    const hadTabIndex =
        heading.hasAttribute(
            "tabindex"
        );

    if (!hadTabIndex) {
        heading.setAttribute(
            "tabindex",
            "-1"
        );
    }

    heading.focus({
        preventScroll: true
    });

    if (!hadTabIndex) {
        heading.addEventListener(
            "blur",
            () => {
                heading.removeAttribute(
                    "tabindex"
                );
            },
            {
                once: true
            }
        );
    }
}
`
    );

    await writeText(
        "assets/js/services/progressSummaryService.js",
        `/* =========================================================
   Personal Game Tracker
   Progress Summary Service
   ========================================================= */

import {
    loadManifest,
    resolveRelativeFile
} from "./dataService.js";

import {
    getCompletedCountForCategory
} from "./progressService.js";

/**
 * Berechnet den Fortschritt eines Manifest-Eintrags ausschließlich
 * aus Manifest-Metadaten und dem Kategorieindex des Fortschritts.
 * Vollständige Item-JSON-Dateien werden dafür nicht geladen.
 *
 * @param {string} gameId
 * @param {object} entry
 * @param {string} parentManifestFile
 * @param {object|null} progressData
 * @returns {Promise<{completed:number,total:number}>}
 */
export async function calculateManifestEntryProgress(
    gameId,
    entry,
    parentManifestFile,
    progressData
) {
    if (!entry || typeof entry !== "object") {
        return emptyProgress();
    }

    if (entry.type === "manifest") {
        const manifestFile =
            resolveRelativeFile(
                parentManifestFile,
                entry.file
            );

        const manifest =
            await loadManifest(
                gameId,
                manifestFile
            );

        return calculateManifestProgressFromMetadata(
            gameId,
            manifest,
            manifestFile,
            progressData
        );
    }

    const total =
        normalizeCount(
            entry.itemCount
        );

    const completed =
        Math.min(
            total,
            getCompletedCountForCategory(
                progressData,
                entry.id
            )
        );

    return {
        completed,
        total
    };
}

/**
 * Berechnet den Fortschritt eines vollständigen Manifests rekursiv.
 * Es werden nur weitere Manifeste geladen.
 *
 * @param {string} gameId
 * @param {object} manifest
 * @param {string} manifestFile
 * @param {object|null} progressData
 * @returns {Promise<{completed:number,total:number}>}
 */
export async function calculateManifestProgressFromMetadata(
    gameId,
    manifest,
    manifestFile,
    progressData
) {
    const categories =
        Array.isArray(
            manifest?.categories
        )
            ? manifest.categories
            : [];

    const results =
        await Promise.all(
            categories.map(
                entry =>
                    calculateManifestEntryProgress(
                        gameId,
                        entry,
                        manifestFile,
                        progressData
                    )
            )
        );

    return results.reduce(
        (summary, progress) => ({
            completed:
                summary.completed +
                progress.completed,

            total:
                summary.total +
                progress.total
        }),
        emptyProgress()
    );
}

function normalizeCount(value) {
    const count =
        Number(value);

    return Number.isInteger(count) &&
        count >= 0
            ? count
            : 0;
}

function emptyProgress() {
    return {
        completed: 0,
        total: 0
    };
}
`
    );

    await writeText(
        "assets/js/views/manifestViewRegistry.js",
        `/* =========================================================
   Personal Game Tracker
   Manifest View Registry
   ========================================================= */

const rendererLoaders =
    new Map([
        [
            "comms",
            async () => {
                const module =
                    await import(
                        "./commsOverviewView.js"
                    );

                return module.renderConfiguredCommsView;
            }
        ]
    ]);

/**
 * Rendert eine über Manifest-Metadaten konfigurierte Spezialansicht.
 * Der Router kennt dadurch keine konkreten Comms-Pfade mehr.
 *
 * @param {object} context
 * @returns {Promise<boolean>}
 */
export async function tryRenderManifestView(
    context
) {
    const rendererName =
        context?.resolvedRoute?.entry?.renderer ??
        context?.resolvedRoute?.manifest?.renderer;

    if (
        typeof rendererName !== "string" ||
        !rendererLoaders.has(rendererName)
    ) {
        return false;
    }

    const loadRenderer =
        rendererLoaders.get(
            rendererName
        );

    const renderer =
        await loadRenderer();

    await renderer(context);

    return true;
}
`
    );
}

async function patchProgressService() {
    const path =
        "assets/js/services/progressService.js";

    let source =
        await readText(path);

    if (!source.includes("const progressRequestCache")) {
        source = replaceOnce(
            source,
            /const progressCache\s*=\s*\n?\s*new Map\(\);/,
            match =>
                `${match}\n\n\n/* Laufende Requests desselben Spiels teilen sich ein Promise. */\nconst progressRequestCache =\n\tnew Map();`,
            "Progress-Request-Cache"
        );
    }

    if (!source.includes("let progressCacheGeneration")) {
        source = replaceOnce(
            source,
            /const progressRequestCache\s*=\s*\n?\s*new Map\(\);/,
            match =>
                `${match}\n\n\n/* Verhindert, dass alte Requests einen geleerten Cache erneut füllen. */\nlet progressCacheGeneration =\n\t0;`,
            "Progress-Cache-Generation"
        );
    }

    if (!source.includes("completedByCategory")) {
        source = replaceOnce(
            source,
            /progress:\s*\{\}/,
            `progress: {},\n\n\t\tcompletedByCategory: {}`,
            "Kategorie-Fortschrittsindex"
        );

        source = replaceOnce(
            source,
            /(progressData\.progress\[\s*row\.item_id\s*\]\s*=\s*true;)/,
            `$1\n\n\n\t\tconst categoryId =\n\t\t\ttypeof row.category_id === "string"\n\t\t\t\t? row.category_id.trim()\n\t\t\t\t: "";\n\n\n\t\tif (categoryId) {\n\t\t\tprogressData.completedByCategory[\n\t\t\t\tcategoryId\n\t\t\t] =\n\t\t\t\t(progressData.completedByCategory[categoryId] ?? 0) +\n\t\t\t\t1;\n\t\t}`,
            "Kategorieindex beim Laden"
        );
    }

    source = replaceFunction(
        source,
        "export async function loadGameProgressData",
        `export async function loadGameProgressData(
\tgameId,
\t{
\t\tforce = false
\t} = {}
) {
\tif (
\t\ttypeof gameId !== "string" ||
\t\tgameId.trim() === ""
\t) {
\t\tconst error =
\t\t\tnew Error(
\t\t\t\tgetUiText(
\t\t\t\t\t"invalidGameId"
\t\t\t\t)
\t\t\t);

\t\terror.code =
\t\t\t"INVALID_GAME_ID";

\t\tthrow error;
\t}

\tif (
\t\t!force &&
\t\tprogressCache.has(gameId)
\t) {
\t\treturn progressCache.get(
\t\t\tgameId
\t\t);
\t}

\tif (
\t\t!force &&
\t\tprogressRequestCache.has(gameId)
\t) {
\t\treturn progressRequestCache.get(
\t\t\tgameId
\t\t);
\t}

\tconst requestGeneration =
\t\tprogressCacheGeneration;

\tconst request =
\t\t(async () => {
\t\t\ttry {
\t\t\t\tconst {
\t\t\t\t\tauthenticated,
\t\t\t\t\trows
\t\t\t\t} = await fetchGameProgressRows(
\t\t\t\t\tgameId
\t\t\t\t);

\t\t\t\tconst progressData =
\t\t\t\t\tconvertRowsToProgressData(
\t\t\t\t\t\tgameId,
\t\t\t\t\t\trows,
\t\t\t\t\t\tauthenticated
\t\t\t\t\t);

\t\t\t\tif (
\t\t\t\t\trequestGeneration ===
\t\t\t\t\tprogressCacheGeneration &&
\t\t\t\t\tprogressRequestCache.get(gameId) ===
\t\t\t\t\trequest
\t\t\t\t) {
\t\t\t\t\tprogressCache.set(
\t\t\t\t\t\tgameId,
\t\t\t\t\t\tprogressData
\t\t\t\t\t);
\t\t\t\t}

\t\t\t\tconsole.info(
\t\t\t\t\t\`[Progress] \${rows.length} Einträge für "\${gameId}" geladen.\`
\t\t\t\t);

\t\t\t\treturn progressData;
\t\t\t}
\t\t\tcatch (error) {
\t\t\t\tconsole.error(
\t\t\t\t\t\`[Progress] Fortschritt für "\${gameId}" konnte nicht geladen werden:\`,
\t\t\t\t\terror
\t\t\t\t);

\t\t\t\treturn {
\t\t\t\t\t...createEmptyProgressData(
\t\t\t\t\t\tgameId,
\t\t\t\t\t\tfalse,
\t\t\t\t\t\tfalse
\t\t\t\t\t),
\t\t\t\t\terror
\t\t\t\t};
\t\t\t}
\t\t})();

\tprogressRequestCache.set(
\t\tgameId,
\t\trequest
\t);

\ttry {
\t\treturn await request;
\t}
\tfinally {
\t\tif (
\t\t\tprogressRequestCache.get(gameId) ===
\t\t\trequest
\t\t) {
\t\t\tprogressRequestCache.delete(
\t\t\t\tgameId
\t\t\t);
\t\t}
\t}
}`
    );

    source = replaceFunction(
        source,
        "export function clearProgressCache",
        `export function clearProgressCache(
\tgameId = null
) {
\tprogressCacheGeneration++;

\tif (gameId) {
\t\tprogressCache.delete(
\t\t\tgameId
\t\t);

\t\tprogressRequestCache.delete(
\t\t\tgameId
\t\t);

\t\treturn;
\t}

\tprogressCache.clear();
\tprogressRequestCache.clear();
}`
    );

    if (!source.includes("export function getCompletedCountForCategory")) {
        source = insertBefore(
            source,
            "/* ---------------------------------------------------------\n   6. Item-Status",
            `/**
 * Gibt die Anzahl erledigter Items einer Kategorie zurück.
 * Dieser zusätzliche Index ändert weder Datenbank noch bisherigen
 * item_id-basierten Statuscache.
 *
 * @param {object|null} progressData
 * @param {string} categoryId
 * @returns {number}
 */
export function getCompletedCountForCategory(
\tprogressData,
\tcategoryId
) {
\tif (
\t\ttypeof categoryId !== "string" ||
\t\t!progressData?.completedByCategory
\t) {
\t\treturn 0;
\t}

\tconst value =
\t\tNumber(
\t\t\tprogressData.completedByCategory[
\t\t\t\tcategoryId
\t\t\t]
\t\t);

\treturn Number.isInteger(value) &&
\t\tvalue > 0
\t\t\t? value
\t\t\t: 0;
}


`
        );
    }

    if (!source.includes("Kategorieindex nach erfolgreichem Request")) {
        source = insertBefore(
            source,
            "\t/*\n\t * Cache aktualisieren.",
            `\t/*
\t * Kategorieindex nach erfolgreichem Request aktualisieren.
\t */
\tprogressData.completedByCategory ??= {};

\tconst previousCategoryCount =
\t\tgetCompletedCountForCategory(
\t\t\tprogressData,
\t\t\tcategoryId
\t\t);

\t/*
\t * currentState wurde vor dem erfolgreichen Supabase-Request ermittelt.
\t * Nach dem Early Return oben ist sicher, dass sich der Zustand ändert.
\t */
\tprogressData.completedByCategory[
\t\tcategoryId
\t] = targetState
\t\t? previousCategoryCount + 1
\t\t: Math.max(
\t\t\t0,
\t\t\tpreviousCategoryCount - 1
\t\t);


`
        );
    }

    /*
     * Frühere Vorabstände dieses Pakets haben den alten Itemzustand
     * irrtümlich erst nach der lokalen Änderung ausgelesen. Dieser
     * normalisierende Ersatz macht auch solche Zwischenstände korrekt.
     */
    source = source.replace(
        /\tconst previousItemState =[\s\S]*?\n\t\}\n/,
        `\t/*
\t * currentState wurde vor dem erfolgreichen Supabase-Request ermittelt.
\t * Nach dem Early Return oben ist sicher, dass sich der Zustand ändert.
\t */
\tprogressData.completedByCategory[
\t\tcategoryId
\t] = targetState
\t\t? previousCategoryCount + 1
\t\t: Math.max(
\t\t\t0,
\t\t\tpreviousCategoryCount - 1
\t\t);\n\n`
    );

    /*
     * Normalisiert Zwischenstände, in denen der folgende Cache-Kommentar
     * versehentlich noch an derselben Zeile wie die Zuweisung hängt.
     */
    source = source.replace(
        /;[\t ]*\/\*\n(\t \* Cache aktualisieren\.)/,
        `;\n\n\t/*\n$1`
    );

    await writeText(path, source);
}

async function patchGamesView() {
    const path =
        "assets/js/views/gamesView.js";

    let source =
        await readText(path);

    if (
        source.includes(
            "async function calculateManifestProgress"
        )
    ) {
        source = ensureImport(
            source,
            `import {
\tcalculateManifestProgressFromMetadata
} from "../services/progressSummaryService.js";`
        );

        source = replaceFunction(
            source,
            "async function calculateManifestProgress",
            `async function calculateManifestProgress(
\tgameId,
\tmanifest,
\tmanifestFile,
\tprogressData
) {
\treturn calculateManifestProgressFromMetadata(
\t\tgameId,
\t\tmanifest,
\t\tmanifestFile,
\t\tprogressData
\t);
}`
        );
    }
    else {
        console.info(
            "[Games] Keine veraltete rekursive Fortschrittsfunktion gefunden; bestehende Optimierung bleibt erhalten."
        );
    }

    await writeText(path, source);
}


async function patchGameView() {
    const path =
        "assets/js/views/gameView.js";

    let source =
        await readText(path);

    source = ensureImport(
        source,
        `import {
\tcalculateManifestEntryProgress
} from "../services/progressSummaryService.js";

import {
\tgetActiveViewScope,
\tisViewScopeCurrent
} from "../services/viewScopeService.js";`
    );

    if (!source.includes("const viewScope =\n\t\tgetActiveViewScope();")) {
        source = insertIntoFunction(
            source,
            "export async function renderGame",
            `
\tconst viewScope =
\t\tgetActiveViewScope();

\tif (
\t\tviewScope &&
\t\t!isViewScopeCurrent(viewScope)
\t) {
\t\treturn;
\t}
`
        );
    }

    source = replaceFunction(
        source,
        "async function calculateEntryProgress",
        `async function calculateEntryProgress(
\tgameId,
\tentry,
\tparentManifestFile,
\tprogressData
) {
\treturn calculateManifestEntryProgress(
\t\tgameId,
\t\tentry,
\t\tparentManifestFile,
\t\tprogressData
\t);
}`
    );

    source = replaceFunction(
        source,
        "async function loadManifestProgress",
        `async function loadManifestProgress(
\tgame,
\tmanifest,
\tmanifestFile,
\tprogressData
) {
\tconst viewScope =
\t\tgetActiveViewScope();

\tconst categories =
\t\tArray.isArray(
\t\t\tmanifest.categories
\t\t)
\t\t\t? manifest.categories
\t\t\t: [];

\tconst results =
\t\tawait Promise.all(
\t\t\tcategories.map(
\t\t\t\tasync (category) => {
\t\t\t\t\ttry {
\t\t\t\t\t\tconst progress =
\t\t\t\t\t\t\tawait calculateEntryProgress(
\t\t\t\t\t\t\t\tgame.id,
\t\t\t\t\t\t\t\tcategory,
\t\t\t\t\t\t\t\tmanifestFile,
\t\t\t\t\t\t\t\tprogressData
\t\t\t\t\t\t\t);

\t\t\t\t\t\tif (
\t\t\t\t\t\t\tviewScope &&
\t\t\t\t\t\t\t!isViewScopeCurrent(
\t\t\t\t\t\t\t\tviewScope
\t\t\t\t\t\t\t)
\t\t\t\t\t\t) {
\t\t\t\t\t\t\treturn progress;
\t\t\t\t\t\t}

\t\t\t\t\t\tupdateCategoryProgress(
\t\t\t\t\t\t\tcategory.id,
\t\t\t\t\t\t\tprogress
\t\t\t\t\t\t);

\t\t\t\t\t\treturn progress;
\t\t\t\t\t}
\t\t\t\t\tcatch (error) {
\t\t\t\t\t\tif (
\t\t\t\t\t\t\terror?.name ===
\t\t\t\t\t\t\t\t"AbortError" ||
\t\t\t\t\t\t\t(viewScope &&
\t\t\t\t\t\t\t\t!isViewScopeCurrent(
\t\t\t\t\t\t\t\t\tviewScope
\t\t\t\t\t\t\t\t))
\t\t\t\t\t\t) {
\t\t\t\t\t\t\treturn {
\t\t\t\t\t\t\t\tcompleted: 0,
\t\t\t\t\t\t\t\ttotal: 0
\t\t\t\t\t\t\t};
\t\t\t\t\t\t}

\t\t\t\t\t\tconsole.error(
\t\t\t\t\t\t\t\`Fortschritt für Kategorie "\${category.id}" konnte nicht geladen werden.\`,
\t\t\t\t\t\t\terror
\t\t\t\t\t\t);

\t\t\t\t\t\tconst progress = {
\t\t\t\t\t\t\tcompleted: 0,
\t\t\t\t\t\t\ttotal: 0
\t\t\t\t\t\t};

\t\t\t\t\t\tupdateCategoryProgress(
\t\t\t\t\t\t\tcategory.id,
\t\t\t\t\t\t\tprogress
\t\t\t\t\t\t);

\t\t\t\t\t\treturn progress;
\t\t\t\t\t}
\t\t\t\t}
\t\t\t)
\t\t);

\tif (
\t\tviewScope &&
\t\t!isViewScopeCurrent(viewScope)
\t) {
\t\treturn;
\t}

\tupdateTotalProgress(
\t\tresults
\t);
}`
    );

    await writeText(path, source);
}


async function patchCommsOverviewView() {
    const path =
        "assets/js/views/commsOverviewView.js";

    let source =
        await readText(path);

    source = source.replace(
        /const COMMS_ROUTE_PREFIX[\s\S]*?const COMMS_MANIFEST_FILE\s*=\s*[^;]+;\s*/,
        ""
    );

    source = ensureImport(
        source,
        `import {
    calculateManifestProgressFromMetadata
} from "../services/progressSummaryService.js";

import {
    getActiveViewScope,
    isViewScopeCurrent
} from "../services/viewScopeService.js";`
    );

    source = replaceFunction(
        source,
        "export async function tryRenderCommsRoute",
        `export async function renderConfiguredCommsView({
    game,
    resolvedRoute,
    routeIds
}) {
    const view =
        resolvedRoute.entry?.view ??
        resolvedRoute.manifest?.view;

    const breadcrumbItems =
        resolvedRoute.breadcrumbItems;

    if (view === "comms-overview") {
        await renderCommsOverview(
            game,
            resolvedRoute.manifest,
            routeIds,
            resolvedRoute.manifestFile
        );

        applyPageBreadcrumbBanner(
            breadcrumbItems,
            {
                removeDescriptions: true
            }
        );

        return;
    }

    const section =
        resolvedRoute.entry ?? {};

    const sectionManifest =
        resolvedRoute.manifest;

    const sectionManifestFile =
        resolvedRoute.manifestFile;

    if (view === "list") {
        await renderCategory(
            game,
            {
                id: section.id,
                name: section.name,
                description:
                    sectionManifest.description ??
                    section.description,
                file: resolveRelativeFile(
                    sectionManifestFile,
                    sectionManifest.dataFile ??
                    section.dataFile ??
                    "allMissions.json"
                ),
                parentHash: buildGameHash(
                    game.id,
                    routeIds.slice(0, -1)
                )
            }
        );

        applyPageBreadcrumbBanner(
            breadcrumbItems,
            {
                removeDescriptions: true
            }
        );

        return;
    }

    if (view === "map") {
        await renderCommsMapView(
            game,
            resolvedRoute.parentManifest ??
            sectionManifest,
            section,
            sectionManifest,
            sectionManifestFile,
            routeIds
        );

        applyPageBreadcrumbBanner(
            breadcrumbItems,
            {
                removeDescriptions: true
            }
        );

        return;
    }

    throw new Error(
        "Unbekannte Comms-Ansicht: " + view
    );
}`
    );

    source = replaceFunction(
        source,
        "function isCommsRoute",
        ""
    );

    source = source.replace(
        /async function renderCommsOverview\(\s*game,\s*commsManifest,\s*routeIds\s*\)/,
        `async function renderCommsOverview(
    game,
    commsManifest,
    routeIds,
    manifestFile
)`
    );

    source = source.replace(
        /section\.dataFile\s*\?\?\s*\n\s*sectionManifest\.dataFile\s*\?\?/,
        `sectionManifest.dataFile ??
                    section.dataFile ??`
    );

    /*
     * Unterstützt sowohl den bereits konsolidierten Stand als auch
     * ältere Zwischenstände der Comms-Migration.
     */
    source = source.replaceAll(
        "commsManifest.sections",
        "commsManifest.categories"
    );

    source = source.replaceAll(
        "section.manifest",
        "section.file"
    );

    source = source.replaceAll(
        "sectionManifest.files",
        "sectionManifest.categories"
    );

    if (!source.includes("const viewScope =\n        getActiveViewScope();")) {
        source = insertIntoFunction(
            source,
            "async function renderCommsOverview",
            `
    const viewScope =
        getActiveViewScope();
`
        );
    }

    if (!source.includes("parentManifestFile:\n                        manifestFile")) {
        source = replaceOnce(
            source,
            /const sections\s*=\s*Array\.isArray\(\s*commsManifest\.categories\s*\)\s*\?\s*commsManifest\.categories\s*:\s*\[\s*\]\s*;/,
            `const sections =
        Array.isArray(
            commsManifest.categories
        )
            ? commsManifest.categories.map(
                section => ({
                    ...section,
                    parentManifestFile:
                        manifestFile
                })
            )
            : [];`,
            "Comms-Sektionen mit Manifestkontext"
        );
    }

    source =
        insertGuardBeforeFirstDomReplacement(
            source,
            "async function renderCommsOverview",
            "viewScope"
        );

    source =
        insertGuardAfterPromiseAll(
            source,
            "async function renderCommsOverview",
            "results",
            "viewScope",
            "Comms-Fortschritt nach Promise.all"
        );

    source = replaceFunction(
        source,
        "async function calculateSectionProgress",
        `async function calculateSectionProgress(
    gameId,
    section,
    progressData,
    suppliedManifest = null,
    suppliedManifestFile = null
) {
    const parentManifestFile =
        section.parentManifestFile;

    if (
        !suppliedManifestFile &&
        typeof parentManifestFile !== "string"
    ) {
        throw new Error(
            "Kein Parent-Manifest für Comms-Bereich '" + section.id + "' vorhanden."
        );
    }

    const sectionManifestFile =
        suppliedManifestFile ??
        resolveRelativeFile(
            parentManifestFile,
            section.file
        );

    const sectionManifest =
        suppliedManifest ??
        await loadManifest(
            gameId,
            sectionManifestFile
        );

    const progress =
        await calculateManifestProgressFromMetadata(
            gameId,
            sectionManifest,
            sectionManifestFile,
            progressData
        );

    return {
        ...progress,
        percentage:
            progress.total > 0
                ? Math.round(
                    (progress.completed /
                        progress.total) *
                    100
                )
                : 0
    };
}`
    );

    source = source.replaceAll(
        "COMMS_MANIFEST_FILE",
        "manifestFile"
    );

    await writeText(path, source);
}

async function patchRouter() {
    const path =
        "assets/js/router.js";

    let source =
        await readText(path);

    source = source.replace(
        /\s*beginJsonRequestScope,\s*/,
        "\n"
    );

    source = source.replace(
        /\s*beginJsonRequestScope\(\);\s*/,
        "\n"
    );

    source = source.replace(
        /import \{\s*tryRenderCommsRoute\s*\} from "\.\/views\/commsOverviewView\.js";\s*/,
        ""
    );

    source = ensureImport(
        source,
        `import {
\ttryRenderManifestView
} from "./views/manifestViewRegistry.js";

import {
\tbeginViewScope,
\tcompleteViewRender,
\tisViewScopeCurrent
} from "./services/viewScopeService.js";`
    );

    if (!source.includes("const viewScope =\n\t\tbeginViewScope();")) {
        source = insertIntoFunction(
            source,
            "export async function loadPageFromHash",
            `
\tconst viewScope =
\t\tbeginViewScope();
`
        );
    }

    source = source.replace(
        /const\s+commsRouteHandled\s*=\s*await\s+tryRenderCommsRoute\([\s\S]*?if\s*\(\s*commsRouteHandled\s*\)\s*\{[\s\S]*?\}\s*/,
        "\n"
    );

    if (!source.includes("const configuredViewHandled")) {
        source = replaceOnce(
            source,
            /(const resolvedRoute\s*=\s*await resolveGameRoute\([\s\S]*?\);)/,
            `$1


\t\tconst configuredViewHandled =
\t\t\tawait tryRenderManifestView({
\t\t\t\tgame,
\t\t\t\tresolvedRoute,
\t\t\t\trouteIds:
\t\t\t\t\tcategoryRoute,
\t\t\t\tviewScope
\t\t\t});

\t\tif (configuredViewHandled) {
\t\t\tif (!isViewScopeCurrent(viewScope)) {
\t\t\t\treturn;
\t\t\t}

\t\t\tcompleteViewRender(
\t\t\t\tviewScope
\t\t\t);

\t\t\treturn;
\t\t}`,
            "datengetriebene Manifestansicht"
        );
    }

    source = source.replace(
        /await renderHomePage\(\);\s*\n\s*return;/g,
        `await renderHomePage();

\t\tcompleteViewRender(
\t\t\tviewScope
\t\t);

\t\treturn;`
    );

    source = source.replace(
        /(applyPageBreadcrumbBanner\([\s\S]*?\);\s*\n\s*)(?!completeViewRender\s*\()(return;)/g,
        `$1completeViewRender(
\t\t\t\tviewScope
\t\t\t);

\t\t\t$2`
    );

    if (!source.includes("/* Finaler Kategorie-Render abgeschlossen. */")) {
        source = replaceOnce(
            source,
            /(await\s+renderCategory\([\s\S]*?applyPageBreadcrumbBanner\([\s\S]*?\);)/,
            `$1

\t\t/* Finaler Kategorie-Render abgeschlossen. */
\t\tcompleteViewRender(
\t\t\tviewScope
\t\t);`,
            "Renderabschluss der Item-Kategorie"
        );
    }

    source =
        insertAbortGuardIntoFunction(
            source,
            "export async function loadPageFromHash",
            "Router-Abbruch durch Routenwechsel"
        );

    if (!source.includes("let parentManifest =")) {
        source = replaceOnce(
            source,
            /let currentManifestFile\s*=\s*"manifest\.json";/,
            `let currentManifestFile =
\t\t"manifest.json";

\tlet parentManifest =
\t\tnull;

\tlet parentManifestFile =
\t\tnull;`,
            "Parent-Manifest-Deklaration"
        );
    }

    if (!source.includes("parentManifest =\n\t\t\t\tcurrentManifest;")) {
        source = replaceOnce(
            source,
            /const childManifest\s*=\s*await loadManifest\([\s\S]*?\);/,
            match =>
                `parentManifest =\n\t\t\t\tcurrentManifest;\n\n\t\t\tparentManifestFile =\n\t\t\t\tcurrentManifestFile;\n\n\n\t\t\t${match}`,
            "Parent-Manifest im Router"
        );
    }

    if (!source.includes("parentManifestFile,")) {
        source = replaceOnce(
            source,
            /(manifestFile:\s*resolvedFile,\s*entry,)/,
            `$1

\t\t\t\t\tparentManifest,

\t\t\t\t\tparentManifestFile,`,
            "Parent-Manifest im Routenergebnis"
        );
    }


    /*
     * Frühere Zwischenstände des Pakets konnten bei erneutem Lauf
     * denselben Renderabschluss doppelt einfügen. Mehrfach direkt
     * aufeinanderfolgende Aufrufe werden deshalb auf einen reduziert.
     */
    source = source.replace(
        /([\t ]*completeViewRender\(\s*viewScope\s*\);)(?:\s*[\t ]*completeViewRender\(\s*viewScope\s*\);)+/g,
        "$1"
    );

    source = replaceFunction(
        source,
        "function getRouteParts",
        `function getRouteParts() {
\tconst hash =
\t\twindow.location.hash
\t\t\t.replace(/^#/, "");

\tif (!hash) {
\t\treturn [];
\t}

\treturn hash
\t\t.split("/")
\t\t.filter(Boolean)
\t\t.map(part => {
\t\t\ttry {
\t\t\t\treturn decodeURIComponent(
\t\t\t\t\tpart
\t\t\t\t);
\t\t\t}
\t\t\tcatch {
\t\t\t\treturn part;
\t\t\t}
\t\t});
}`
    );

    await writeText(path, source);
}

async function patchAsyncViewLifecycle() {
    const targets = [
        {
            path: "assets/js/views/gamesView.js",
            signature: "export async function renderGamesOverview"
        },
        {
            path: "assets/js/views/categoryView.js",
            signature: "export async function renderCategory"
        },
        {
            path: "assets/js/views/commsMapView.js",
            signature: "export async function renderCommsMapView"
        }
    ];

    for (const target of targets) {
        let source =
            await readText(target.path);

        source = ensureImport(
            source,
            `import {
\tgetActiveViewScope,
\tisViewScopeCurrent,
\tregisterViewCleanup
} from "../services/viewScopeService.js";`
        );

        const functionText =
            extractFunction(
                source,
                target.signature
            );

        if (!functionText.includes("getActiveViewScope()")) {
            source = insertIntoFunction(
                source,
                target.signature,
                `
\tconst viewScope =
\t\tgetActiveViewScope();

\tconst fallbackController =
\t\tnew AbortController();

\tconst signal =
\t\tviewScope?.signal ??
\t\tfallbackController.signal;

\tregisterViewCleanup(
\t\t() => fallbackController.abort(),
\t\tviewScope
\t);
`
            );
        }

        if (target.path.endsWith("gamesView.js")) {
            source = insertGuardBeforeFirstDomReplacement(
                source,
                target.signature,
                "viewScope"
            );
        }

        if (target.path.endsWith("categoryView.js")) {
            source = insertGuardBeforeFirstDomReplacement(
                source,
                target.signature,
                "viewScope"
            );
        }

        if (target.path.endsWith("commsMapView.js")) {
            source = source.replace(
                /let activeViewController\s*=\s*null;\s*/,
                ""
            );

            source = source.replace(
                /activeViewController\?\.abort\(\);[\s\S]*?activeViewController\s*=\s*new AbortController\(\);/,
                ""
            );

            source = source.replaceAll(
                "activeViewController.signal",
                "signal"
            );

            /*
             * Regionale Comms-Manifeste verwenden categories als
             * verbindliche Dateiliste. Der Ersatz ist absichtlich
             * wiederholbar und repariert auch ältere Hotfix-Stände.
             */
            source = source.replaceAll(
                "sectionManifest.files",
                "sectionManifest.categories"
            );

            source = insertGuardBeforeFirstDomReplacement(
                source,
                target.signature,
                "viewScope"
            );

            if (!source.includes("Map-Ressourcen beim Routenwechsel freigeben")) {
                const cleanupCode = `
\t/* Map-Ressourcen beim Routenwechsel freigeben. */
\tregisterViewCleanup(
\t\t() => {
\t\t\tif (activeMapObjectUrl) {
\t\t\t\tURL.revokeObjectURL(
\t\t\t\t\tactiveMapObjectUrl
\t\t\t\t);

\t\t\t\tactiveMapObjectUrl =
\t\t\t\t\tnull;
\t\t\t}
\t\t},
\t\tgetActiveViewScope()
\t);
`;

                source = insertIntoFunction(
                    source,
                    target.signature,
                    cleanupCode
                );
            }
        }

        source = insertAbortGuardIntoFunction(
            source,
            target.signature,
            "View-Abbruch durch Routenwechsel"
        );

        await writeText(
            target.path,
            source
        );
    }
}

async function patchCategoryControlsLifecycle() {
    const path =
        "assets/js/views/categoryControlsView.js";

    let source =
        await readText(path);

    source = ensureImport(
        source,
        `import {
\tgetActiveViewScope,
\tregisterViewCleanup
} from "../services/viewScopeService.js";`
    );

    if (!source.includes("observerForViewScope")) {
        const observerPattern =
            /activeItemStateObserver\.observe\([\s\S]*?\);/;

        source = replaceOnce(
            source,
            observerPattern,
            match =>
                `${match}

\tconst observerForViewScope =
\t\tactiveItemStateObserver;

\tregisterViewCleanup(
\t\t() => {
\t\t\tobserverForViewScope.disconnect();

\t\t\tif (
\t\t\t\tactiveItemStateObserver ===
\t\t\t\tobserverForViewScope
\t\t\t) {
\t\t\t\tactiveItemStateObserver =
\t\t\t\t\tnull;
\t\t\t}
\t\t},
\t\tgetActiveViewScope()
\t);`,
            "MutationObserver-Cleanup"
        );
    }

    await writeText(path, source);
}

async function patchDataService() {
    const path =
        "assets/js/services/dataService.js";

    let source =
        await readText(path);

    /*
     * Der vorherige, ausschließlich auf JSON-Requests begrenzte
     * Abort-Scope wird durch den zentralen View-Scope ersetzt.
     */
    source = source.replace(
        /const jsonRequestCache\s*=\s*new Map\(\);\s*/,
        ""
    );

    source = source.replace(
        /let activeJsonRequestController\s*=\s*null;\s*/,
        ""
    );

    if (source.includes("export function beginJsonRequestScope")) {
        source = replaceFunction(
            source,
            "export function beginJsonRequestScope",
            ""
        );
    }

    if (source.includes("function getActiveJsonRequestSignal")) {
        source = replaceFunction(
            source,
            "function getActiveJsonRequestSignal",
            ""
        );
    }

    if (source.includes("function getPendingJsonRequest")) {
        source = replaceFunction(
            source,
            "function getPendingJsonRequest",
            ""
        );
    }

    source = ensureImport(
        source,
        `import {
\tgetActiveViewScope
} from "./viewScopeService.js";`
    );

    if (!/const jsonCache\s*=/.test(source)) {
        const modulePathIndex =
            source.indexOf(
                "from \"./viewScopeService.js\""
            );

        const importEnd =
            source.indexOf(
                ";",
                modulePathIndex
            );

        source =
            source.slice(0, importEnd + 1) +
            "\n\n\nconst jsonCache =\n\tnew Map();" +
            source.slice(importEnd + 1);
    }

    if (!source.includes("const viewJsonRequestCache")) {
        source = replaceOnce(
            source,
            /const jsonCache\s*=\s*new Map\(\);/,
            match =>
                `${match}\n\n/* Laufende JSON-Requests werden pro View-Scope geteilt. */\nconst viewJsonRequestCache =\n\tnew Map();`,
            "View-JSON-Request-Cache"
        );
    }

    let firstSection =
        source.indexOf(
            "/**"
        );

    if (firstSection < 0) {
        firstSection =
            source.indexOf(
                "export async function loadJson"
            );
    }

    if (firstSection < 0) {
        throw new Error(
            "Einfügepunkt im Data Service nicht gefunden."
        );
    }

    if (!source.includes("function prepareJsonForCache")) {
        const cacheHelper = `const DEVELOPMENT_HOSTS =
\tnew Set([
\t\t"localhost",
\t\t"127.0.0.1",
\t\t"[::1]"
\t]);

/**
 * Friert geladene JSON-Daten nur in der lokalen Entwicklung ein.
 * Dadurch werden unbeabsichtigte Mutationen gecachter Daten sichtbar.
 *
 * @param {*} value
 * @returns {*}
 */
function prepareJsonForCache(value) {
\tconst hostname =
\t\tglobalThis.location?.hostname ??
\t\t"";

\treturn DEVELOPMENT_HOSTS.has(hostname)
\t\t? deepFreeze(value)
\t\t: value;
}

function deepFreeze(value, visited = new WeakSet()) {
\tif (
\t\t!value ||
\t\ttypeof value !== "object" ||
\t\tvisited.has(value)
\t) {
\t\treturn value;
\t}

\tvisited.add(value);

\tfor (
\t\tconst nestedValue
\t\tof Object.values(value)
\t) {
\t\tdeepFreeze(
\t\t\tnestedValue,
\t\t\tvisited
\t\t);
\t}

\treturn Object.freeze(value);
}


`;

        source =
            source.slice(0, firstSection) +
            cacheHelper +
            source.slice(firstSection);
    }

    if (!source.includes("async function requestJson")) {
        const requestInsertPoint =
            source.indexOf(
                "export async function loadJson"
            );

        if (requestInsertPoint < 0) {
            throw new Error(
                "loadJson-Einfügepunkt im Data Service nicht gefunden."
            );
        }

        const requestHelper = `/**
 * Führt einen JSON-Request im aktuellen View-Scope aus.
 * Ein Routenwechsel bricht noch laufende Fetches ab.
 *
 * @param {string} path
 * @param {object} options
 * @param {boolean} options.optional
 * @returns {Promise<any|null>}
 */
async function requestJson(
\tpath,
\t{
\t\toptional = false
\t} = {}
) {
\tconst viewScope =
\t\tgetActiveViewScope();

\tconst requestKey =
\t\t\`\${optional ? "optional" : "required"}:\${viewScope?.id ?? "global"}:\${path}\`;

\tif (
\t\tviewJsonRequestCache.has(
\t\t\trequestKey
\t\t)
\t) {
\t\treturn viewJsonRequestCache.get(
\t\t\trequestKey
\t\t);
\t}

\tconst request =
\t\t(async () => {
\t\t\tconst response =
\t\t\t\tawait fetch(
\t\t\t\t\tpath,
\t\t\t\t\t{
\t\t\t\t\t\tsignal:
\t\t\t\t\t\t\tviewScope?.signal
\t\t\t\t\t}
\t\t\t\t);

\t\t\tif (
\t\t\t\toptional &&
\t\t\t\tresponse.status === 404
\t\t\t) {
\t\t\t\treturn null;
\t\t\t}

\t\t\tif (!response.ok) {
\t\t\t\tthrow new Error(
\t\t\t\t\t\`JSON konnte nicht geladen werden: \${path} (\${response.status})\`
\t\t\t\t);
\t\t\t}

\t\t\treturn prepareJsonForCache(
\t\t\t\tawait response.json()
\t\t\t);
\t\t})();

\tviewJsonRequestCache.set(
\t\trequestKey,
\t\trequest
\t);

\ttry {
\t\treturn await request;
\t}
\tfinally {
\t\tif (
\t\t\tviewJsonRequestCache.get(
\t\t\t\trequestKey
\t\t\t) === request
\t\t) {
\t\t\tviewJsonRequestCache.delete(
\t\t\t\trequestKey
\t\t\t);
\t\t}
\t}
}


`;

        source =
            source.slice(0, requestInsertPoint) +
            requestHelper +
            source.slice(requestInsertPoint);
    }

    source = replaceFunction(
        source,
        "export async function loadJson",
        `export async function loadJson(path) {
\tif (jsonCache.has(path)) {
\t\treturn jsonCache.get(path);
\t}

\tconst data =
\t\tawait requestJson(path);

\tjsonCache.set(path, data);

\treturn data;
}`
    );

    source = replaceFunction(
        source,
        "export async function loadOptionalJson",
        `export async function loadOptionalJson(path) {
\tif (jsonCache.has(path)) {
\t\treturn jsonCache.get(path);
\t}

\tconst data =
\t\tawait requestJson(
\t\t\tpath,
\t\t\t{
\t\t\t\toptional: true
\t\t\t}
\t\t);

\tif (data !== null) {
\t\tjsonCache.set(path, data);
\t}

\treturn data;
}`
    );

    await writeText(path, source);
}


async function patchCommsManifests() {
    const root =
        resolve(
            ROOT,
            "data/theDivision2/collectibles/comms"
        );

    const files =
        await collectFiles(
            root,
            file =>
                file.endsWith("manifest.json")
        );

    for (const file of files) {
        const data =
            JSON.parse(
                await readFile(file, UTF8)
            );

        const commsViews =
            new Set([
                "comms-overview",
                "map",
                "list"
            ]);

        /*
         * Frühere Comms-Manifeste verwendeten sections/files sowie
         * manifest. categories/file ist jetzt die einzige Quelle.
         */
        if (!Array.isArray(data.categories)) {
            if (Array.isArray(data.sections)) {
                data.categories =
                    data.sections;
            }
            else if (Array.isArray(data.files)) {
                data.categories =
                    data.files;
            }
        }

        delete data.sections;
        delete data.files;

        if (commsViews.has(data.view)) {
            data.renderer =
                "comms";
        }

        if (Array.isArray(data.categories)) {
            data.categories =
                data.categories.map(
                    originalEntry => {
                        const entry = {
                            ...originalEntry
                        };

                        if (
                            !entry.file &&
                            typeof entry.manifest === "string"
                        ) {
                            entry.file =
                                entry.manifest;
                        }

                        delete entry.manifest;

                        if (commsViews.has(entry?.view)) {
                            entry.renderer =
                                "comms";
                        }

                        return entry;
                    }
                );
        }

        await writeTextAbsolute(
            file,
            JSON.stringify(
                data,
                null,
                2
            ) + "\n"
        );
    }
}

async function addSupabaseIntegrity() {
    const htmlFiles = [
        "index.html",
        "404.html"
    ];

    for (const path of htmlFiles) {
        let source =
            await readText(path);

        const urlMatch =
            source.match(
                /<script\s+src="(https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^\"]+)"[^>]*><\/script>/
            );

        if (!urlMatch) {
            console.info(
                `[SRI] Kein Supabase-CDN-Script in ${path} gefunden.`
            );
            continue;
        }

        const scriptUrl =
            urlMatch[1];

        const response =
            await fetch(scriptUrl);

        if (!response.ok) {
            throw new Error(
                `Supabase-Script für SRI konnte nicht geladen werden: ${response.status}`
            );
        }

        const bytes =
            Buffer.from(
                await response.arrayBuffer()
            );

        const integrity =
            `sha384-${createHash("sha384")
                .update(bytes)
                .digest("base64")}`;

        const replacement =
            `<script src="${scriptUrl}" integrity="${integrity}" crossorigin="anonymous"></script>`;

        source = source.replace(
            urlMatch[0],
            replacement
        );

        await writeText(path, source);
    }
}

async function createTestingInfrastructure() {
    await writeText(
        "package.json",
        JSON.stringify(
            {
                private: true,
                type: "module",
                scripts: {
                    "validate:data":
                        "node scripts/validateRepository.mjs",
                    "test:e2e":
                        "playwright test",
                    "measure:performance":
                        "node scripts/measurePerformance.mjs"
                },
                devDependencies: {
                    "@playwright/test":
                        "1.62.1"
                }
            },
            null,
            2
        ) + "\n"
    );

    await writeText(
        "playwright.config.mjs",
        `import {
    defineConfig
} from "@playwright/test";

export default defineConfig({
    testDir:
        "./tests/e2e",

    timeout:
        30_000,

    fullyParallel:
        false,

    retries:
        process.env.CI
            ? 1
            : 0,

    expect: {
        timeout:
            10_000
    },

    reporter:
        process.env.CI
            ? [
                ["line"],
                [
                    "html",
                    {
                        open: "never"
                    }
                ]
            ]
            : "list",

    use: {
        baseURL:
            "http://127.0.0.1:4173",

        browserName:
            "chromium",

        trace:
            "retain-on-failure",

        screenshot:
            "only-on-failure"
    },

    webServer: {
        command:
            "node scripts/serveStatic.mjs",

        url:
            "http://127.0.0.1:4173",

        reuseExistingServer:
            !process.env.CI,

        timeout:
            15_000
    }
});
`
    );

    await writeText(
        "scripts/serveStatic.mjs",
        `import {
    createReadStream
} from "node:fs";

import {
    stat
} from "node:fs/promises";

import {
    createServer
} from "node:http";

import {
    extname,
    resolve,
    sep
} from "node:path";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 4173;
const HOST = "127.0.0.1";

const MIME_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".webm": "video/webm"
};

const server = createServer(
    async (request, response) => {
        try {
            const requestUrl =
                new URL(
                    request.url ?? "/",
                    \`http://\${HOST}:\${PORT}\`
                );

            const pathname =
                decodeURIComponent(
                    requestUrl.pathname
                );

            const relativePath =
                pathname === "/"
                    ? "index.html"
                    : pathname.replace(/^\\/+/, "");

            const filePath =
                resolve(
                    ROOT,
                    relativePath
                );

            if (
                filePath !== ROOT &&
                !filePath.startsWith(
                    \`\${ROOT}\${sep}\`
                )
            ) {
                response.writeHead(403);
                response.end("Forbidden");
                return;
            }

            const fileStat =
                await stat(filePath);

            if (!fileStat.isFile()) {
                throw new Error("Not a file");
            }

            response.writeHead(
                200,
                {
                    "content-type":
                        MIME_TYPES[extname(filePath)] ??
                        "application/octet-stream",

                    "cache-control":
                        "no-store"
                }
            );

            createReadStream(filePath)
                .pipe(response);
        }
        catch {
            response.writeHead(
                404,
                {
                    "content-type":
                        "text/plain; charset=utf-8"
                }
            );
            response.end("Not found");
        }
    }
);

server.listen(
    PORT,
    HOST,
    () => {
        console.info(
            \`Static server: http://\${HOST}:\${PORT}\`
        );
    }
);
`
    );

    await writeText(
        "tests/e2e/tracker.smoke.spec.mjs",
        `import {
    expect,
    test
} from "@playwright/test";

const ROUTES = {
    games:
        "#games",

    division:
        "#game/theDivision2",

    collectibles:
        "#game/theDivision2/collectibles",

    comms:
        "#game/theDivision2/collectibles/comms",

    washington:
        "#game/theDivision2/collectibles/comms/washington",

    missions:
        "#game/theDivision2/collectibles/comms/missions"
};

test.beforeEach(async ({ page }) => {
    await installSupabaseMock(page);
});

test("wichtigste Routen rendern erwartete Inhalte", async ({ page }) => {
    const mainContent =
        page.locator("#main-content");

    await page.goto(\`/\${ROUTES.games}\`);
    await expect(
        mainContent.locator(
            '.game-card[data-game-id="theDivision2"]'
        )
    ).toBeVisible();

    await navigate(page, ROUTES.division);
    await expect(
        mainContent.locator(
            '.category-card[data-category-id="collectibles"]'
        )
    ).toBeVisible();

    await navigate(page, ROUTES.collectibles);
    await expect(
        mainContent.locator(
            '.category-card[data-category-id="comms"]'
        )
    ).toBeVisible();

    await navigate(page, ROUTES.comms);
    await expect(
        mainContent.locator(
            ".comms-section-card"
        )
    ).toHaveCount(4);
});

test("Washington-Map lädt alle Tracking-Einträge", async ({ page }) => {
    await page.goto(\`/\${ROUTES.washington}\`);

    await expect(
        page.locator(
            ".comms-map-page"
        )
    ).toBeVisible();

    await expect(
        page.locator(
            ".tracker-item"
        )
    ).toHaveCount(181);
});

test("Missionsliste lädt alle kombinierten Einträge", async ({ page }) => {
    await page.goto(\`/\${ROUTES.missions}\`);

    await expect(
        page.locator(
            ".tracker-item"
        )
    ).toHaveCount(515);
});

test("schneller Routenwechsel lässt nur die letzte Route sichtbar", async ({ page }) => {
    await page.goto(\`/\${ROUTES.games}\`);

    await page.evaluate(
        ({ washington, games }) => {
            window.location.hash =
                washington;

            queueMicrotask(() => {
                window.location.hash =
                    games;
            });
        },
        ROUTES
    );

    await expect(
        page
    ).toHaveURL(/#games$/);

    await expect(
        page.locator(
            ".games-page"
        )
    ).toBeVisible();

    await expect(
        page.locator(
            ".comms-map-page"
        )
    ).toHaveCount(0);
});

test("Routenwechsel setzt Fokus in den neuen Hauptinhalt", async ({ page }) => {
    await page.goto(\`/\${ROUTES.games}\`);
    await navigate(page, ROUTES.division);

    await expect.poll(
        async () =>
            page.evaluate(() => {
                const active =
                    document.activeElement;

                return Boolean(
                    active &&
                    active.closest(
                        "#main-content"
                    ) &&
                    /H1|H2/.test(
                        active.tagName
                    )
                );
            })
    ).toBe(true);
});

async function navigate(page, hash) {
    await page.evaluate(
        targetHash => {
            window.location.hash =
                targetHash;
        },
        hash
    );

    await expect(page)
        .toHaveURL(
            url =>
                url.hash === hash
        );
}

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
                                data: {
                                    session: null
                                },
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

`
    );
}

async function createPerformanceMeasurement() {
    await writeText(
        "scripts/measurePerformance.mjs",
        `import {
    chromium
} from "@playwright/test";

import {
    spawn
} from "node:child_process";

import {
    mkdir,
    writeFile
} from "node:fs/promises";

const server = spawn(
    process.execPath,
    ["scripts/serveStatic.mjs"],
    {
        stdio: "inherit"
    }
);

const routes = [
    "#games",
    "#game/theDivision2",
    "#game/theDivision2/collectibles",
    "#game/theDivision2/collectibles/comms",
    "#game/theDivision2/collectibles/comms/washington",
    "#game/theDivision2/collectibles/comms/missions"
];

try {
    await waitForServer();

    const browser =
        await chromium.launch();

    const page =
        await browser.newPage();

    await page.addInitScript(() => {
        window.supabase = {
            createClient() {
                const result = () => {
                    const query = {
                        select() { return query; },
                        eq() { return query; },
                        order() { return query; },
                        range() { return query; },
                        then(resolve) {
                            return Promise.resolve({
                                data: [],
                                error: null
                            }).then(resolve);
                        }
                    };

                    return query;
                };

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
                        }
                    },
                    from: result
                };
            }
        };
    });

    await page.route(
        "https://cdn.jsdelivr.net/**",
        route => route.abort()
    );

    const results = [];

    for (const hash of routes) {
        const started =
            Date.now();

        await page.goto(
            \`http://127.0.0.1:4173/\${hash}\`,
            {
                waitUntil:
                    "networkidle"
            }
        );

        const metrics =
            await page.evaluate(() => {
                const resources =
                    performance.getEntriesByType(
                        "resource"
                    );

                return {
                    requestCount:
                        resources.length,

                    jsonRequestCount:
                        resources.filter(
                            entry =>
                                entry.name.includes(
                                    ".json"
                                )
                        ).length,

                    transferSize:
                        resources.reduce(
                            (sum, entry) =>
                                sum +
                                (entry.transferSize ?? 0),
                            0
                        ),

                    domElements:
                        document.querySelectorAll(
                            "*"
                        ).length
                };
            });

        results.push({
            route: hash,
            renderTimeMs:
                Date.now() - started,
            ...metrics
        });
    }

    await browser.close();

    await mkdir(
        "artifacts",
        {
            recursive: true
        }
    );

    await writeFile(
        "artifacts/performance-baseline.json",
        JSON.stringify(
            {
                createdAt:
                    new Date().toISOString(),
                results
            },
            null,
            2
        ) + "\\n"
    );

    console.table(results);
}
finally {
    server.kill("SIGTERM");
}

async function waitForServer() {
    for (let attempt = 0; attempt < 50; attempt++) {
        try {
            const response =
                await fetch(
                    "http://127.0.0.1:4173"
                );

            if (response.ok) {
                return;
            }
        }
        catch {
            // Server startet noch.
        }

        await new Promise(
            resolvePromise =>
                setTimeout(
                    resolvePromise,
                    100
                )
        );
    }

    throw new Error(
        "Lokaler Testserver ist nicht gestartet."
    );
}
`
    );
}

async function patchGitignore() {
    const path =
        ".gitignore";

    let source = "";

    try {
        source =
            await readText(path);
    }
    catch {
        // Eine fehlende .gitignore wird neu angelegt.
    }

    const entries = [
        "node_modules/",
        "playwright-report/",
        "test-results/",
        "artifacts/"
    ];

    let normalizedSource =
        normalizeText(source)
            .replace(/\n+$/, "");

    const existingLines =
        new Set(
            normalizedSource
                .split("\n")
                .map(line => line.trim())
        );

    for (const entry of entries) {
        if (existingLines.has(entry)) {
            continue;
        }

        normalizedSource +=
            `${normalizedSource ? "\n" : ""}${entry}`;

        existingLines.add(entry);
    }

    await writeText(
        path,
        normalizedSource + "\n"
    );
}


function ensureImport(source, importBlock) {
    const normalizedBlock =
        normalizeText(importBlock).trim();

    const modulePathMatch =
        normalizedBlock.match(
            /from\s+"([^"]+)";/
        );

    if (
        modulePathMatch &&
        source.includes(
            `from "${modulePathMatch[1]}";`
        )
    ) {
        return source;
    }

    const firstImport =
        source.indexOf("import {");

    if (firstImport < 0) {
        return (
            normalizedBlock +
            "\n\n\n" +
            source
        );
    }

    return (
        source.slice(0, firstImport) +
        normalizedBlock +
        "\n\n\n" +
        source.slice(firstImport)
    );
}

function replaceFunction(
    source,
    signature,
    replacement
) {
    if (!source.includes(signature)) {
        if (String(replacement).trim() === "") {
            return source;
        }

        const replacementName =
            String(replacement).match(
                /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/
            )?.[1];

        if (
            replacementName &&
            source.includes(
                `function ${replacementName}`
            )
        ) {
            return source;
        }

        throw new Error(
            `Funktion nicht gefunden: ${signature}`
        );
    }

    const extracted =
        extractFunction(source, signature);

    if (
        normalizeText(extracted).trim() ===
        normalizeText(replacement).trim()
    ) {
        return source;
    }

    return (
        source.slice(
            0,
            source.indexOf(extracted)
        ) +
        normalizeText(replacement).trimEnd() +
        source.slice(
            source.indexOf(extracted) +
            extracted.length
        )
    );
}

function extractFunction(source, signature) {
    const start =
        source.indexOf(signature);

    if (start < 0) {
        throw new Error(
            `Funktion nicht gefunden: ${signature}`
        );
    }

    const braceStart =
        findFunctionBodyBrace(
            source,
            start
        );

    let depth = 0;
    let state = "code";
    let quote = "";
    let escaped = false;

    for (
        let index = braceStart;
        index < source.length;
        index++
    ) {
        const character =
            source[index];

        const nextCharacter =
            source[index + 1];

        if (state === "line-comment") {
            if (character === "\n") {
                state = "code";
            }
            continue;
        }

        if (state === "block-comment") {
            if (
                character === "*" &&
                nextCharacter === "/"
            ) {
                state = "code";
                index++;
            }
            continue;
        }

        if (state === "string") {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (character === "\\") {
                escaped = true;
                continue;
            }

            if (character === quote) {
                state = "code";
                quote = "";
            }
            continue;
        }

        if (
            character === "/" &&
            nextCharacter === "/"
        ) {
            state = "line-comment";
            index++;
            continue;
        }

        if (
            character === "/" &&
            nextCharacter === "*"
        ) {
            state = "block-comment";
            index++;
            continue;
        }

        if (
            character === "\"" ||
            character === "'" ||
            character === "`"
        ) {
            state = "string";
            quote = character;
            continue;
        }

        if (character === "{") {
            depth++;
        }
        else if (character === "}") {
            depth--;

            if (depth === 0) {
                return source.slice(
                    start,
                    index + 1
                );
            }
        }
    }

    throw new Error(
        `Funktionsende nicht gefunden: ${signature}`
    );
}

function insertIntoFunction(
    source,
    signature,
    insertion
) {
    const start =
        source.indexOf(signature);

    if (start < 0) {
        throw new Error(
            `Funktion nicht gefunden: ${signature}`
        );
    }

    const brace =
        findFunctionBodyBrace(
            source,
            start
        );

    return (
        source.slice(0, brace + 1) +
        normalizeText(insertion) +
        source.slice(brace + 1)
    );
}

function findFunctionBodyBrace(source, functionStart) {
    const parameterStart =
        source.indexOf("(", functionStart);

    if (parameterStart < 0) {
        throw new Error(
            "Funktionsparameter konnten nicht gelesen werden."
        );
    }

    let depth = 0;
    let state = "code";
    let quote = "";
    let escaped = false;

    for (
        let index = parameterStart;
        index < source.length;
        index++
    ) {
        const character = source[index];
        const nextCharacter = source[index + 1];

        if (state === "line-comment") {
            if (character === "\n") {
                state = "code";
            }
            continue;
        }

        if (state === "block-comment") {
            if (character === "*" && nextCharacter === "/") {
                state = "code";
                index++;
            }
            continue;
        }

        if (state === "string") {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (character === "\\") {
                escaped = true;
                continue;
            }

            if (character === quote) {
                state = "code";
                quote = "";
            }
            continue;
        }

        if (character === "/" && nextCharacter === "/") {
            state = "line-comment";
            index++;
            continue;
        }

        if (character === "/" && nextCharacter === "*") {
            state = "block-comment";
            index++;
            continue;
        }

        if (
            character === "\"" ||
            character === "'" ||
            character === "`"
        ) {
            state = "string";
            quote = character;
            continue;
        }

        if (character === "(") {
            depth++;
            continue;
        }

        if (character === ")") {
            depth--;
            continue;
        }

        if (character === "{" && depth === 0) {
            return index;
        }
    }

    throw new Error(
        "Funktionskörper konnte nicht gefunden werden."
    );
}

function insertAbortGuardIntoFunction(
    source,
    signature,
    marker
) {
    const functionText =
        extractFunction(
            source,
            signature
        );

    if (functionText.includes(marker)) {
        return source;
    }

    const matches = [
        ...functionText.matchAll(
            /catch\s*\(error\)\s*\{/g
        )
    ];

    if (matches.length === 0) {
        console.info(
            `[Lifecycle] Kein Catch-Block in ${signature}; Router-Scope übernimmt die Abbruchbehandlung.`
        );
        return source;
    }

    const match =
        matches[matches.length - 1];

    const insertAt =
        match.index +
        match[0].length;

    const guard =
        `\n\t\t/* ${marker} */\n\t\tif (\n\t\t\terror?.name === "AbortError" ||\n\t\t\t(viewScope &&\n\t\t\t\t!isViewScopeCurrent(viewScope))\n\t\t) {\n\t\t\treturn;\n\t\t}\n`;

    const guardedFunction =
        functionText.slice(0, insertAt) +
        guard +
        functionText.slice(insertAt);

    return source.replace(
        functionText,
        guardedFunction
    );
}


function insertGuardAfterPromiseAll(
    source,
    signature,
    variableName,
    scopeName,
    marker
) {
    const functionText =
        extractFunction(
            source,
            signature
        );

    if (functionText.includes(marker)) {
        return source;
    }

    const assignmentPattern =
        new RegExp(
            `const\\s+${variableName}\\s*=\\s*await\\s+Promise\\.all\\s*\\(`
        );

    const assignmentMatch =
        functionText.match(
            assignmentPattern
        );

    if (!assignmentMatch) {
        console.warn(
            `[Lifecycle] Promise.all-Zuweisung "${variableName}" in ${signature} nicht gefunden.`
        );

        return source;
    }

    const openParenthesis =
        functionText.indexOf(
            "(",
            assignmentMatch.index +
            assignmentMatch[0].length - 1
        );

    let depth = 0;
    let state = "code";
    let quote = "";
    let escaped = false;
    let closeParenthesis = -1;

    for (
        let index = openParenthesis;
        index < functionText.length;
        index++
    ) {
        const character =
            functionText[index];

        const nextCharacter =
            functionText[index + 1];

        if (state === "line-comment") {
            if (character === "\n") {
                state = "code";
            }
            continue;
        }

        if (state === "block-comment") {
            if (
                character === "*" &&
                nextCharacter === "/"
            ) {
                state = "code";
                index++;
            }
            continue;
        }

        if (state === "string") {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (character === "\\") {
                escaped = true;
                continue;
            }

            if (character === quote) {
                state = "code";
                quote = "";
            }
            continue;
        }

        if (
            character === "/" &&
            nextCharacter === "/"
        ) {
            state = "line-comment";
            index++;
            continue;
        }

        if (
            character === "/" &&
            nextCharacter === "*"
        ) {
            state = "block-comment";
            index++;
            continue;
        }

        if (
            character === "\"" ||
            character === "'" ||
            character === "`"
        ) {
            state = "string";
            quote = character;
            continue;
        }

        if (character === "(") {
            depth++;
            continue;
        }

        if (character === ")") {
            depth--;

            if (depth === 0) {
                closeParenthesis = index;
                break;
            }
        }
    }

    if (closeParenthesis < 0) {
        throw new Error(
            `Promise.all-Ende in ${signature} nicht gefunden.`
        );
    }

    let statementEnd =
        closeParenthesis + 1;

    while (
        statementEnd < functionText.length &&
        /\\s/.test(functionText[statementEnd])
    ) {
        statementEnd++;
    }

    if (functionText[statementEnd] === ";") {
        statementEnd++;
    }

    const guard = `

    /* ${marker} */
    if (
        ${scopeName} &&
        !isViewScopeCurrent(${scopeName})
    ) {
        return;
    }`;

    const newFunction =
        functionText.slice(0, statementEnd) +
        guard +
        functionText.slice(statementEnd);

    return source.replace(
        functionText,
        newFunction
    );
}


function insertGuardBeforeFirstDomReplacement(
    source,
    signature,
    scopeName
) {
    const functionText =
        extractFunction(source, signature);

    if (
        functionText.includes(
            "!isViewScopeCurrent(viewScope)"
        )
    ) {
        return source;
    }

    const patterns = [
        /mainContent\.replaceChildren\([^;]*\);/,
        /mainContent\.innerHTML\s*=\s*"";/
    ];

    for (const pattern of patterns) {
        const match =
            functionText.match(pattern);

        if (!match) {
            continue;
        }

        const replacement =
            `if (\n\t\t${scopeName} &&\n\t\t!isViewScopeCurrent(${scopeName})\n\t) {\n\t\treturn;\n\t}\n\n\t${match[0]}`;

        const newFunction =
            functionText.replace(
                pattern,
                replacement
            );

        return source.replace(
            functionText,
            newFunction
        );
    }

    console.warn(
        `[Lifecycle] Kein DOM-Ersetzungspunkt in ${signature} gefunden.`
    );

    return source;
}

function replaceOnce(
    source,
    pattern,
    replacement,
    label
) {
    const matches =
        source.match(
            new RegExp(
                pattern.source,
                pattern.flags.includes("g")
                    ? pattern.flags
                    : `${pattern.flags}g`
            )
        ) ?? [];

    if (matches.length !== 1) {
        throw new Error(
            `Erwartet wurde genau eine Codepassage für "${label}", gefunden: ${matches.length}`
        );
    }

    return source.replace(
        pattern,
        replacement
    );
}

function insertBefore(
    source,
    marker,
    insertion
) {
    const index =
        source.indexOf(marker);

    if (index < 0) {
        throw new Error(
            `Einfügemarke nicht gefunden: ${marker}`
        );
    }

    return (
        source.slice(0, index) +
        normalizeText(insertion) +
        source.slice(index)
    );
}

async function collectFiles(directory, predicate) {
    const result = [];

    const entries =
        await readdir(
            directory,
            {
                withFileTypes: true
            }
        );

    for (const entry of entries) {
        const fullPath =
            join(
                directory,
                entry.name
            );

        if (entry.isDirectory()) {
            result.push(
                ...await collectFiles(
                    fullPath,
                    predicate
                )
            );
        }
        else if (predicate(fullPath)) {
            result.push(fullPath);
        }
    }

    return result;
}

async function readText(path) {
    return normalizeText(
        await readFile(
            resolve(ROOT, path),
            UTF8
        )
    );
}

async function writeText(path, content) {
    const absolute =
        resolve(ROOT, path);

    await mkdir(
        dirname(absolute),
        {
            recursive: true
        }
    );

    await writeTextAbsolute(
        absolute,
        content
    );

    console.info(
        `[Update] ${relative(ROOT, absolute)}`
    );
}

async function writeTextAbsolute(
    absolute,
    content
) {
    await writeFile(
        absolute,
        normalizeText(content),
        UTF8
    );
}

function normalizeText(content) {
    return String(content)
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map(line =>
            line.replace(/[\t ]+$/g, "")
        )
        .join("\n")
        .replace(/\n*$/, "\n");
}
