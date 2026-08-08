import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PACKAGE_VERSION = "2026-08-08.4";
const APPLY_WORKFLOW = ".github/workflows/apply-site-optimizations.yml";
const APPLY_SCRIPT = "scripts/applyOptimizationPackage.mjs";
const touchedFiles = new Set();

await assertRepositoryRoot();
await patchDataService();
await patchBreadcrumbView();
await patchRouter();
await patchGamesView();
await consolidateCommsManifests();
await patchCommsOverviewView();
await enrichAllManifestCounts();
await writePermanentValidation();
await writeReadme();
await removeTemporaryPackageFiles();

console.log(`\nOptimierungspaket ${PACKAGE_VERSION} erfolgreich angewendet.`);
console.log(`Geänderte oder erzeugte Dateien: ${touchedFiles.size}`);
for (const file of [...touchedFiles].sort()) {
    console.log(`- ${file}`);
}

async function assertRepositoryRoot() {
    for (const required of ["index.html", "assets/js", "data/games.json"]) {
        try {
            await fs.access(resolvePath(required));
        }
        catch {
            throw new Error(
                `Das Skript muss im Root des PersonalGameTracker-Repositories laufen. Fehlend: ${required}`
            );
        }
    }
}

async function patchDataService() {
    const file = "assets/js/services/dataService.js";
    let source = await readText(file);

    source = replaceOnce(
        source,
        "const jsonCache = new Map();",
        `const jsonCache = new Map();
const jsonRequestCache = new Map();

let activeJsonRequestController = null;

/**
 * Beginnt einen neuen Request-Bereich für die aktuelle Route.
 * Noch laufende JSON-Requests der vorherigen Route werden abgebrochen.
 *
 * @returns {AbortSignal}
 */
export function beginJsonRequestScope() {
\tif (activeJsonRequestController) {
\t\tactiveJsonRequestController.abort();
\t}

\tactiveJsonRequestController =
\t\tnew AbortController();

\treturn activeJsonRequestController.signal;
}

function getActiveJsonRequestSignal() {
\treturn activeJsonRequestController?.signal ?? null;
}

function getPendingJsonRequest(cacheKey, signal) {
\tconst entry = jsonRequestCache.get(cacheKey);

\tif (!entry) {
\t\treturn null;
\t}

\tif (
\t\tentry.signal === signal &&
\t\t!entry.signal?.aborted
\t) {
\t\treturn entry.promise;
\t}

\tjsonRequestCache.delete(cacheKey);
\treturn null;
}`,
        "JSON-Cache-Grundstruktur"
    );

    source = replaceRegexOnce(
        source,
        /export async function loadJson\(path\) \{[\s\S]*?\n\}\n\n\n\/\*\*\n \* Lädt eine optionale JSON-Datei\./,
        `export async function loadJson(path) {
\tif (jsonCache.has(path)) {
\t\treturn jsonCache.get(path);
\t}

\tconst signal =
\t\tgetActiveJsonRequestSignal();

\tconst cacheKey =
\t\t\`required:\${path}\`;

\tconst pendingRequest =
\t\tgetPendingJsonRequest(
\t\t\tcacheKey,
\t\t\tsignal
\t\t);

\tif (pendingRequest) {
\t\treturn pendingRequest;
\t}

\tconst request = (async () => {
\t\tconst response = await fetch(
\t\t\tpath,
\t\t\tsignal
\t\t\t\t? { signal }
\t\t\t\t: undefined
\t\t);

\t\tif (!response.ok) {
\t\t\tthrow new Error(
\t\t\t\t\`JSON konnte nicht geladen werden: \${path} (\${response.status})\`
\t\t\t);
\t\t}

\t\tconst data =
\t\t\tawait response.json();

\t\tjsonCache.set(path, data);
\t\treturn data;
\t})();

\tjsonRequestCache.set(
\t\tcacheKey,
\t\t{
\t\t\tpromise: request,
\t\t\tsignal
\t\t}
\t);

\ttry {
\t\treturn await request;
\t}
\tfinally {
\t\tconst entry =
\t\t\tjsonRequestCache.get(
\t\t\t\tcacheKey
\t\t\t);

\t\tif (entry?.promise === request) {
\t\t\tjsonRequestCache.delete(
\t\t\t\tcacheKey
\t\t\t);
\t\t}
\t}
}


/**
 * Lädt eine optionale JSON-Datei.`,
        "loadJson"
    );

    source = replaceRegexOnce(
        source,
        /export async function loadOptionalJson\(path\) \{[\s\S]*?\n\}\n\n\n\/\*\*\n \* Gibt den Datenpfad eines Spiels zurück\./,
        `export async function loadOptionalJson(path) {
\tif (jsonCache.has(path)) {
\t\treturn jsonCache.get(path);
\t}

\tconst signal =
\t\tgetActiveJsonRequestSignal();

\tconst cacheKey =
\t\t\`optional:\${path}\`;

\tconst pendingRequest =
\t\tgetPendingJsonRequest(
\t\t\tcacheKey,
\t\t\tsignal
\t\t);

\tif (pendingRequest) {
\t\treturn pendingRequest;
\t}

\tconst request = (async () => {
\t\tconst response = await fetch(
\t\t\tpath,
\t\t\tsignal
\t\t\t\t? { signal }
\t\t\t\t: undefined
\t\t);

\t\tif (response.status === 404) {
\t\t\treturn null;
\t\t}

\t\tif (!response.ok) {
\t\t\tthrow new Error(
\t\t\t\t\`JSON konnte nicht geladen werden: \${path} (\${response.status})\`
\t\t\t);
\t\t}

\t\tconst data =
\t\t\tawait response.json();

\t\tjsonCache.set(path, data);
\t\treturn data;
\t})();

\tjsonRequestCache.set(
\t\tcacheKey,
\t\t{
\t\t\tpromise: request,
\t\t\tsignal
\t\t}
\t);

\ttry {
\t\treturn await request;
\t}
\tfinally {
\t\tconst entry =
\t\t\tjsonRequestCache.get(
\t\t\t\tcacheKey
\t\t\t);

\t\tif (entry?.promise === request) {
\t\t\tjsonRequestCache.delete(
\t\t\t\tcacheKey
\t\t\t);
\t\t}
\t}
}


/**
 * Gibt den Datenpfad eines Spiels zurück.`,
        "loadOptionalJson"
    );

    await writeText(file, source);
}

async function patchBreadcrumbView() {
    const file = "assets/js/views/pageBreadcrumbView.js";
    let source = await readText(file);

    source = replaceRegexOnce(
        source,
        /    \/\*\n     \* Die Option bleibt aus Kompatibilitätsgründen erhalten\.[\s\S]*?    \}\n\n    const toolbar =/,
        `    if (removeDescriptions) {
        removePageDescriptions(
            page
        );
    }

    const toolbar =`,
        "Breadcrumb removeDescriptions"
    );

    await writeText(file, source);
}

async function patchRouter() {
    const file = "assets/js/router.js";
    let source = await readText(file);

    source = replaceOnce(
        source,
        `import {
\tloadGameManifest,
\tloadManifest,
\tresolveRelativeFile
} from "./services/dataService.js";`,
        `import {
\tbeginJsonRequestScope,
\tloadGameManifest,
\tloadManifest,
\tresolveRelativeFile
} from "./services/dataService.js";`,
        "Router Data-Service-Import"
    );

    source = replaceOnce(
        source,
        `\t\tpageLoadFailed:
\t\t\t"Die Seite konnte nicht geladen werden."`,
        `\t\tpageLoadFailed:
\t\t\t"Die Seite konnte nicht geladen werden.",

\t\trouteNotFound:
\t\t\t"Die angeforderte Seite wurde nicht gefunden."`,
        "deutscher 404-Text"
    );

    source = replaceOnce(
        source,
        `\t\tpageLoadFailed:
\t\t\t"The page could not be loaded."`,
        `\t\tpageLoadFailed:
\t\t\t"The page could not be loaded.",

\t\trouteNotFound:
\t\t\t"The requested page was not found."`,
        "englischer 404-Text"
    );

    source = replaceOnce(
        source,
        `export async function loadPageFromHash() {

\tconst routeParts =`,
        `export async function loadPageFromHash() {

\tbeginJsonRequestScope();

\tconst routeParts =`,
        "Router Request-Scope"
    );

    source = replaceRegexOnce(
        source,
        /\t\/\*\n\t \* Unbekannte Route:[\s\S]*?\t\treturn;\n\t\}/,
        `\t/*
\t * Unbekannte Route:
\t * kontrollierte In-App-404 anzeigen.
\t */
\tif (
\t\trouteParts[0] !==
\t\t"game"
\t) {
\t\tupdateActiveGameNavigation(
\t\t\tnull
\t\t);

\t\tshowError(
\t\t\tgetUiText(
\t\t\t\t"routeNotFound"
\t\t\t)
\t\t);

\t\treturn;
\t}`,
        "unbekannte Route"
    );

    source = insertAbortErrorHandling(
        source
    );

    source = replaceRegexOnce(
        source,
        /\treturn hash\n\t\t\.split\("\/"\)\n\t\t\.filter\(Boolean\)\n\t\t\.map\(\n\t\t\tpart =>\n\t\t\t\tdecodeURIComponent\(\n\t\t\t\t\tpart\n\t\t\t\t\)\n\t\t\);/,
        `\treturn hash
\t\t.split("/")
\t\t.filter(Boolean)
\t\t.map(
\t\t\tpart => {
\t\t\t\ttry {
\t\t\t\t\treturn decodeURIComponent(
\t\t\t\t\t\tpart
\t\t\t\t\t);
\t\t\t\t}
\t\t\t\tcatch {
\t\t\t\t\treturn part;
\t\t\t\t}
\t\t\t}
\t\t);`,
        "sichere Hash-Dekodierung"
    );

    await writeText(file, source);
}

async function patchGamesView() {
    const file = "assets/js/views/gamesView.js";
    let source = await readText(file);

    source = replaceRegexOnce(
        source,
        /async function loadGameCardProgress\([\s\S]*?\n\}\n\n\n\/\* ---------------------------------------------------------\n   8\. Fortschrittsberechnung/,
        `async function loadGameCardProgress(
\tgame,
\tcard
) {
\ttry {
\t\tconst [
\t\t\tprogressData,
\t\t\tmanifest
\t\t] = await Promise.all([
\t\t\tloadGameProgressData(
\t\t\t\tgame.id
\t\t\t),
\t\t\tloadGameManifest(
\t\t\t\tgame.id
\t\t\t)
\t\t]);

\t\tif (
\t\t\t!progressData ||
\t\t\t!progressData.available
\t\t) {
\t\t\treturn;
\t\t}

\t\tconst manifestItemCount =
\t\t\tNumber(
\t\t\t\tmanifest?.itemCount
\t\t\t);

\t\tlet progress;

\t\tif (
\t\t\tNumber.isFinite(
\t\t\t\tmanifestItemCount
\t\t\t) &&
\t\t\tmanifestItemCount >= 0
\t\t) {
\t\t\tconst completed =
\t\t\t\tObject.values(
\t\t\t\t\tprogressData.progress ?? {}
\t\t\t\t).filter(Boolean).length;

\t\t\tprogress = {
\t\t\t\tcompleted:
\t\t\t\t\tMath.min(
\t\t\t\t\t\tcompleted,
\t\t\t\t\t\tmanifestItemCount
\t\t\t\t\t),
\t\t\t\ttotal:
\t\t\t\t\tmanifestItemCount
\t\t\t};
\t\t}
\t\telse {
\t\t\t/*
\t\t\t * Rückwärtskompatibler Fallback für noch nicht
\t\t\t * angereicherte Manifeste.
\t\t\t */
\t\t\tprogress =
\t\t\t\tawait calculateManifestProgress(
\t\t\t\t\tgame.id,
\t\t\t\t\tmanifest,
\t\t\t\t\t"manifest.json",
\t\t\t\t\tprogressData
\t\t\t\t);
\t\t}

\t\tupdateGameCardProgress(
\t\t\tcard,
\t\t\tgame,
\t\t\tprogress
\t\t);
\t}
\tcatch (error) {
\t\tif (error?.name === "AbortError") {
\t\t\treturn;
\t\t}

\t\tconsole.error(
\t\t\t\`Gesamtfortschritt für Spiel "\${game.id}" konnte nicht geladen werden.\`,
\t\t\terror
\t\t);
\t}
}


/* ---------------------------------------------------------
   8. Fortschrittsberechnung`,
        "optimierte Spielkarten-Fortschrittsberechnung"
    );

    await writeText(file, source);
}

async function consolidateCommsManifests() {
    const topFile =
        "data/theDivision2/collectibles/comms/manifest.json";

    const topManifest =
        await readJson(topFile);

    if (
        Array.isArray(topManifest.sections) &&
        Array.isArray(topManifest.categories)
    ) {
        const sections = new Map(
            topManifest.sections.map(
                section => [section.id, section]
            )
        );

        topManifest.categories =
            topManifest.categories.map(
                category => {
                    const section =
                        sections.get(category.id) ?? {};

                    const result = {
                        ...section,
                        ...category
                    };

                    if (section.manifest) {
                        result.type = "manifest";
                        result.file = section.manifest;
                    }

                    if (result.id === "missions") {
                        result.type = "manifest";
                        result.dataFile =
                            result.dataFile ??
                            "allMissions.json";
                    }

                    delete result.manifest;
                    return result;
                }
            );

        delete topManifest.sections;
    }

    topManifest.view =
        topManifest.view ??
        "comms-overview";

    if (topManifest.dataStatus) {
        topManifest.dataStatus.scope =
            "category-manifest";
        topManifest.dataStatus.migrationVersion =
            "comms-phase2-v1";
    }

    await writeJson(topFile, topManifest);

    const manifestFiles = await listFiles(
        "data/theDivision2/collectibles/comms",
        file => path.basename(file) === "manifest.json"
    );

    for (const absoluteFile of manifestFiles) {
        const relativeFile = relativePath(absoluteFile);

        if (relativeFile === topFile) {
            continue;
        }

        const manifest =
            await readJson(relativeFile);

        if (Array.isArray(manifest.files)) {
            if (!Array.isArray(manifest.categories)) {
                manifest.categories =
                    manifest.files.map(
                        entry => ({
                            ...entry,
                            type:
                                entry.type ??
                                "category"
                        })
                    );
            }

            delete manifest.files;
            await writeJson(
                relativeFile,
                manifest
            );
        }
    }
}

async function patchCommsOverviewView() {
    const file = "assets/js/views/commsOverviewView.js";
    let source = await readText(file);

    /*
     * Diese Migration arbeitet absichtlich ohne feste Trefferzahlen.
     * Die View hat während der Entwicklung mehrere nahezu identische
     * Zugriffsstellen erhalten. Entscheidend ist nur, dass nach dem
     * Patch keine veralteten Manifestfelder mehr verwendet werden.
     */
    source = replaceLegacyToken(
        source,
        "commsManifest.sections",
        "commsManifest.categories",
        "Comms-Kategorien"
    );

    source = replaceLegacyToken(
        source,
        "section.manifest",
        "section.file",
        "Comms-Manifestpfade"
    );

    source = ensureMissionsDataFileFallback(
        source
    );

    source = replaceLegacyToken(
        source,
        "sectionManifest.files",
        "sectionManifest.categories",
        "Comms-Unterkategorien"
    );

    assertMissingLegacyToken(
        source,
        "commsManifest.sections",
        "Comms-Kategorien"
    );

    assertMissingLegacyToken(
        source,
        "section.manifest",
        "Comms-Manifestpfade"
    );

    assertMissingLegacyToken(
        source,
        "sectionManifest.files",
        "Comms-Unterkategorien"
    );

    await writeText(file, source);
}

async function enrichAllManifestCounts() {
    const manifestFiles = await listFiles(
        "data",
        file => path.basename(file) === "manifest.json"
    );

    const memo = new Map();

    for (const absoluteFile of manifestFiles) {
        await calculateAndWriteManifestCount(
            absoluteFile,
            memo,
            new Set()
        );
    }
}

async function calculateAndWriteManifestCount(
    absoluteManifestFile,
    memo,
    stack
) {
    const normalized =
        path.resolve(absoluteManifestFile);

    if (memo.has(normalized)) {
        return memo.get(normalized);
    }

    if (stack.has(normalized)) {
        throw new Error(
            `Manifest-Zyklus erkannt: ${relativePath(normalized)}`
        );
    }

    stack.add(normalized);

    const manifest = JSON.parse(
        await fs.readFile(
            normalized,
            "utf8"
        )
    );

    const categories =
        Array.isArray(manifest.categories)
            ? manifest.categories
            : [];

    let total = 0;

    for (const entry of categories) {
        if (!entry?.file) {
            entry.itemCount = 0;
            continue;
        }

        const target = path.resolve(
            path.dirname(normalized),
            entry.file
        );

        let count = 0;

        if (
            entry.type === "manifest" ||
            path.basename(target) === "manifest.json"
        ) {
            count = await calculateAndWriteManifestCount(
                target,
                memo,
                stack
            );
        }
        else {
            count = await countCategoryFile(target);
        }

        entry.itemCount = count;
        total += count;
    }

    manifest.itemCount = total;

    await fs.writeFile(
        normalized,
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8"
    );

    touchedFiles.add(
        relativePath(normalized)
    );

    stack.delete(normalized);
    memo.set(normalized, total);
    return total;
}

async function countCategoryFile(absoluteFile) {
    const data = JSON.parse(
        await fs.readFile(
            absoluteFile,
            "utf8"
        )
    );

    return countItems(data);
}

function countItems(value) {
    if (Array.isArray(value)) {
        return value.length;
    }

    if (!value || typeof value !== "object") {
        return 0;
    }

    if (Array.isArray(value.items)) {
        return value.items.length;
    }

    if (Array.isArray(value.groups)) {
        return value.groups.reduce(
            (sum, group) =>
                sum + countItems(group),
            0
        );
    }

    if (Array.isArray(value.sections)) {
        return value.sections.reduce(
            (sum, section) =>
                sum + countItems(section),
            0
        );
    }

    return 0;
}

async function writePermanentValidation() {
    const workflowFile =
        ".github/workflows/repository-quality.yml";

    const workflow = `name: Repository quality

on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  validate:
    name: Validate tracker repository
    runs-on: ubuntu-latest

    steps:
      - name: Repository auschecken
        uses: actions/checkout@v4

      - name: Node.js einrichten
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Daten und Referenzen validieren
        run: node scripts/validateRepository.mjs

      - name: JavaScript-Syntax prüfen
        shell: bash
        run: |
          while IFS= read -r -d '' file; do
            node --check "$file"
          done < <(find assets/js scripts -type f \\( -name '*.js' -o -name '*.mjs' \\) -print0)

      - name: Whitespace-Fehler prüfen
        run: git diff --check
`;

    await writeText(workflowFile, workflow);

}

async function writeReadme() {
    const readme = `# Personal Game Tracker

Ein statischer, zweisprachiger Web-Tracker für Achievements, Collectibles, Ausrüstung und weitere Spielinhalte. Die Anwendung läuft ohne Build-Schritt auf GitHub Pages und verwendet Vanilla JavaScript, JSON-Manifeste und optional Supabase für den persönlichen Fortschritt.

## Funktionen

- Spieleübersicht mit Gesamtfortschritt
- beliebig tiefe Manifest- und Kategorienavigation
- deutsche und englische Inhalte
- Suche, Statusfilter und Sortierung innerhalb großer Listen
- persönliche Fortschrittsspeicherung über Supabase
- spezielle Karten- und Listenansichten für die Comms aus *The Division 2*
- responsive Darstellung für Desktop und Mobilgeräte
- automatische Daten- und Referenzprüfung über GitHub Actions

## Projektstruktur

\`\`\`text
assets/
  css/                 Stylesheets
  js/                  Router, Views und Services
  maps/                Karten für spezielle Tracker-Ansichten
  thumbnails/          Spielkacheln
data/
  games.json           globale Spieleliste
  <gameId>/            Manifest und Kategoriedaten eines Spiels
scripts/
  validateRepository.mjs
index.html
404.html
\`\`\`

## Lokal starten

Da die Anwendung JSON-Dateien mit \`fetch()\` lädt, sollte sie über einen lokalen Webserver geöffnet werden.

\`\`\`bash
python -m http.server 8000
\`\`\`

Danach: \`http://localhost:8000\`

## Datenmodell

Jedes Spiel besitzt ein \`manifest.json\`. Ein Manifest-Eintrag verweist entweder auf ein weiteres Manifest oder auf eine konkrete Kategoriedatei.

\`\`\`json
{
  "id": "achievements",
  "name": "Achievements",
  "type": "category",
  "file": "achievements.json",
  "itemCount": 41
}
\`\`\`

\`itemCount\` wird durch das Repository-Prüfskript verifiziert und dient der schnellen Fortschrittsberechnung auf der Spieleübersicht. Die eigentlichen Itemdateien müssen dafür nicht vollständig in den Browser geladen werden.

## Prüfung ausführen

\`\`\`bash
node scripts/validateRepository.mjs
\`\`\`

Die Prüfung kontrolliert unter anderem:

- gültige JSON-Syntax
- vorhandene Manifest-Referenzen
- korrekte \`itemCount\`-Werte
- die vereinheitlichte Comms-Manifeststruktur
- lokale Datei-Referenzen aus \`index.html\` und \`404.html\`
- doppelte Item-IDs als Warnung

Der Workflow \`Repository quality\` läuft automatisch bei Pushes und Pull Requests.

## Fortschritt und Supabase

Die bestehende Supabase-Integration und das Datenbankmodell werden durch die Repository-Optimierung nicht verändert. Der öffentliche Browser-Key ist kein Service-Role-Key; der Zugriff auf Benutzerdaten muss weiterhin über korrekt konfigurierte Row-Level-Security-Regeln abgesichert sein.

## Deployment

Die Seite kann direkt über GitHub Pages aus dem \`main\`-Branch ausgeliefert werden. Es ist kein npm-Build und kein Bundler erforderlich.
`;

    await writeText("README.md", readme);
}

async function removeTemporaryPackageFiles() {
    for (const file of [APPLY_WORKFLOW, APPLY_SCRIPT]) {
        try {
            await fs.rm(resolvePath(file));
            touchedFiles.add(file);
        }
        catch (error) {
            if (error?.code !== "ENOENT") {
                throw error;
            }
        }
    }
}


function insertAbortErrorHandling(source) {
    if (
        source.includes(
            'error?.name === "AbortError"'
        )
    ) {
        return source;
    }

    const functionStart =
        source.indexOf(
            "export async function loadPageFromHash"
        );

    if (functionStart === -1) {
        throw new Error(
            'Router-Funktion "loadPageFromHash" wurde nicht gefunden.'
        );
    }

    const functionEndCandidates = [
        source.indexOf(
            "async function resolveGameRoute",
            functionStart
        ),
        source.indexOf(
            "function resolveGameRoute",
            functionStart
        )
    ].filter(index => index > functionStart);

    const functionEnd =
        functionEndCandidates.length > 0
            ? Math.min(...functionEndCandidates)
            : source.length;

    const functionSource =
        source.slice(
            functionStart,
            functionEnd
        );

    const catchRegex =
        /catch\s*\(\s*error\s*\)\s*\{/g;

    const matches = [
        ...functionSource.matchAll(
            catchRegex
        )
    ];

    if (matches.length !== 1) {
        throw new Error(
            `Im Funktionsbereich von "loadPageFromHash" wurde genau ein Catch-Block erwartet, gefunden: ${matches.length}`
        );
    }

    const catchMatch =
        matches[0];

    const catchStart =
        functionStart +
        catchMatch.index;

    const catchOpeningEnd =
        catchStart +
        catchMatch[0].length;

    const lineStart =
        source.lastIndexOf(
            "\n",
            catchStart
        ) + 1;

    const catchIndentMatch =
        source.slice(
            lineStart,
            catchStart
        ).match(/^[ \t]*/);

    const catchIndent =
        catchIndentMatch?.[0] ?? "";

    const afterOpening =
        source.slice(
            catchOpeningEnd
        );

    const existingLineStart =
        afterOpening.match(
            /^(\r?\n)([ \t]*)/
        );

    const newline =
        existingLineStart?.[1] ??
        (source.includes("\r\n")
            ? "\r\n"
            : "\n");

    let bodyIndent =
        existingLineStart?.[2] ?? "";

    if (!bodyIndent) {
        const indentUnit =
            catchIndent.includes("\t")
                ? "\t"
                : "    ";

        bodyIndent =
            `${catchIndent}${indentUnit}`;
    }

    const nestedIndent =
        bodyIndent.includes("\t")
            ? `${bodyIndent}\t`
            : `${bodyIndent}    `;

    const replacementPrefix =
        `${newline}${bodyIndent}if (error?.name === "AbortError") {` +
        `${newline}${nestedIndent}return;` +
        `${newline}${bodyIndent}}` +
        `${newline}${newline}${bodyIndent}`;

    const existingPrefixLength =
        existingLineStart?.[0].length ?? 0;

    return (
        source.slice(
            0,
            catchOpeningEnd
        ) +
        replacementPrefix +
        afterOpening.slice(
            existingPrefixLength
        )
    );
}

function replaceOnce(source, search, replacement, label) {
    const index = source.indexOf(search);

    if (index === -1) {
        throw new Error(
            `Erwartete Codepassage nicht gefunden: ${label}`
        );
    }

    if (source.indexOf(search, index + search.length) !== -1) {
        throw new Error(
            `Codepassage ist nicht eindeutig: ${label}`
        );
    }

    return source.slice(0, index) +
        replacement +
        source.slice(index + search.length);
}

function replaceRegexOnce(source, regex, replacement, label) {
    const matches = [...source.matchAll(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`))];

    if (matches.length !== 1) {
        throw new Error(
            `Erwartet wurde genau eine Codepassage für "${label}", gefunden: ${matches.length}`
        );
    }

    return source.replace(regex, replacement);
}

function replaceLegacyToken(
    source,
    legacyToken,
    currentToken,
    label
) {
    const legacyCount =
        source.split(legacyToken).length - 1;

    if (legacyCount > 0) {
        console.log(
            `${label}: ${legacyCount} veraltete Verwendung(en) werden ersetzt.`
        );

        return source
            .split(legacyToken)
            .join(currentToken);
    }

    if (source.includes(currentToken)) {
        console.log(
            `${label}: bereits auf dem aktuellen Stand.`
        );

        return source;
    }

    throw new Error(
        `Weder alte noch neue Codepassage gefunden: ${label}`
    );
}

function ensureMissionsDataFileFallback(source) {
    if (source.includes("section.dataFile ??")) {
        console.log(
            "Missions-Datendatei: bereits auf dem aktuellen Stand."
        );

        return source;
    }

    const standaloneMissionFile =
        /^(\s*)"allMissions\.json"(?=\s*[,)]?\s*$)/gm;

    const matches = [
        ...source.matchAll(
            standaloneMissionFile
        )
    ];

    if (matches.length === 0) {
        throw new Error(
            "Erwartete Codepassage nicht gefunden: Missions-Datendatei"
        );
    }

    console.log(
        `Missions-Datendatei: ${matches.length} Fallback-Stelle(n) werden erweitert.`
    );

    return source.replace(
        standaloneMissionFile,
        (match, indent) =>
            `${indent}section.dataFile ??\n${indent}"allMissions.json"`
    );
}

function assertMissingLegacyToken(
    source,
    legacyToken,
    label
) {
    const remaining =
        source.split(legacyToken).length - 1;

    if (remaining > 0) {
        throw new Error(
            `${label}: nach dem Patch sind noch ${remaining} veraltete Verwendung(en) vorhanden.`
        );
    }
}

async function readText(relativeFile) {
    return fs.readFile(
        resolvePath(relativeFile),
        "utf8"
    );
}

async function writeText(relativeFile, content) {
    const absoluteFile = resolvePath(relativeFile);
    await fs.mkdir(
        path.dirname(absoluteFile),
        { recursive: true }
    );
    await fs.writeFile(
        absoluteFile,
        content.endsWith("\n")
            ? content
            : `${content}\n`,
        "utf8"
    );
    touchedFiles.add(relativeFile);
}

async function readJson(relativeFile) {
    return JSON.parse(
        await readText(relativeFile)
    );
}

async function writeJson(relativeFile, data) {
    await writeText(
        relativeFile,
        `${JSON.stringify(data, null, 2)}\n`
    );
}

async function listFiles(relativeDirectory, predicate = () => true) {
    const root = resolvePath(relativeDirectory);
    const result = [];

    async function walk(directory) {
        const entries = await fs.readdir(
            directory,
            { withFileTypes: true }
        );

        for (const entry of entries) {
            const target = path.join(
                directory,
                entry.name
            );

            if (entry.isDirectory()) {
                await walk(target);
            }
            else if (entry.isFile() && predicate(target)) {
                result.push(target);
            }
        }
    }

    await walk(root);
    return result;
}

function resolvePath(relativeFile) {
    return path.resolve(ROOT, relativeFile);
}

function relativePath(absoluteFile) {
    return path.relative(ROOT, absoluteFile)
        .split(path.sep)
        .join("/");
}
