import {
    access,
    mkdir,
    readFile,
    readdir,
    rename,
    rm,
    writeFile
} from "node:fs/promises";

import {
    basename,
    dirname,
    join,
    relative,
    resolve
} from "node:path";

const ROOT = process.cwd();
const changes = [];

await renameOverviewCardStylesheet();
await updateHtmlStylesheetReferences();
await removeTemporaryFiles();
await writeFinalGitignore();
await writeCurrentReadme();
await validateCleanupResult();

console.info("Finales Repository-Cleanup abgeschlossen.");
for (const change of changes) {
    console.info(`- ${change}`);
}

async function renameOverviewCardStylesheet() {
    const source = resolve(
        ROOT,
        "assets/css/progress-card-layout-hotfix.css"
    );
    const target = resolve(
        ROOT,
        "assets/css/overview-cards.css"
    );

    const sourceExists = await exists(source);
    const targetExists = await exists(target);

    if (sourceExists && targetExists) {
        const sourceContent = normalize(
            await readFile(source, "utf8")
        );
        const targetContent = normalize(
            await readFile(target, "utf8")
        );

        if (sourceContent !== targetContent) {
            throw new Error(
                "Beide Übersichtskarten-Stylesheets existieren mit unterschiedlichem Inhalt."
            );
        }

        await rm(source);
        changes.push(
            "Doppeltes altes Übersichtskarten-Stylesheet entfernt."
        );
        return;
    }

    if (sourceExists) {
        await mkdir(dirname(target), { recursive: true });
        await rename(source, target);
        changes.push(
            "progress-card-layout-hotfix.css in overview-cards.css umbenannt."
        );
        return;
    }

    if (!targetExists) {
        throw new Error(
            "Weder das alte noch das neue Übersichtskarten-Stylesheet wurde gefunden."
        );
    }
}

async function updateHtmlStylesheetReferences() {
    const htmlFiles = await collectFiles(
        ROOT,
        file => file.endsWith(".html")
    );

    for (const file of htmlFiles) {
        const source = await readFile(file, "utf8");
        const updated = source.replaceAll(
            "assets/css/progress-card-layout-hotfix.css",
            "assets/css/overview-cards.css"
        );

        if (updated !== source) {
            await writeNormalized(file, updated);
            changes.push(
                `${display(file)} auf overview-cards.css aktualisiert.`
            );
        }
    }
}

async function removeTemporaryFiles() {
    const explicitFiles = [
        "README-PACKAGE.md",
        "scripts/applyOptimizationPackage.mjs",
        "scripts/applySystemOptimizationPackage.mjs",
        "scripts/applyProgressSummaryFix.mjs",
        "scripts/applyProgressCardLayoutHotfix.mjs",
        "scripts/applyOverviewCardMetadata.mjs"
    ];

    for (const relativePath of explicitFiles) {
        await removeIfPresent(relativePath);
    }

    const scriptsDirectory = resolve(ROOT, "scripts");
    const entries = await readdir(
        scriptsDirectory,
        { withFileTypes: true }
    );

    for (const entry of entries) {
        if (
            entry.isFile() &&
            /^apply.*\.mjs$/i.test(entry.name) &&
            entry.name !== "applyFinalRepositoryCleanup.mjs"
        ) {
            await removeIfPresent(
                join("scripts", entry.name)
            );
        }
    }
}

async function writeFinalGitignore() {
    const content = `# Betriebssysteme
.DS_Store
Thumbs.db
Desktop.ini

# Entwicklungsumgebungen
.vscode/
.idea/
*.swp
*.swo

# Lokale Umgebungsvariablen und Zugangsdaten
.env
.env.*
!.env.example

# Node.js und Entwicklungsartefakte
node_modules/
coverage/
dist/
.tmp/
temp/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Playwright und Performance-Messungen
playwright-report/
test-results/
artifacts/
`;

    await writeNormalized(
        resolve(ROOT, ".gitignore"),
        content
    );
    changes.push(".gitignore konsolidiert.");
}

async function writeCurrentReadme() {
    const content = `# Personal Game Tracker

Ein statischer, zweisprachiger Web-Tracker für Achievements, Collectibles, Ausrüstung und weitere Spielinhalte. Die Anwendung läuft ohne Produktions-Build direkt auf GitHub Pages und verwendet Vanilla JavaScript, JSON-Manifeste und optional Supabase für den persönlichen Fortschritt.

## Funktionen

- Spieleübersicht mit Gesamtfortschritt
- beliebig tiefe Manifest- und Kategorienavigation
- einheitliche Übersichtskarten mit Inhaltsmetadaten und Fortschrittsbalken
- deutsche und englische Inhalte
- Suche, Statusfilter und Sortierung innerhalb großer Listen
- persönliche Fortschrittsspeicherung über Supabase
- spezielle Karten- und Listenansichten für die Comms aus *The Division 2*
- responsive Darstellung für Desktop und Mobilgeräte
- automatisierte Daten-, Syntax- und Browserprüfung über GitHub Actions

## Projektstruktur

\`\`\`text
assets/
  css/                    allgemeine und komponentenspezifische Stylesheets
  js/                     Router, Views und Services
  maps/                   Karten für spezielle Tracker-Ansichten
  thumbnails/             Spielkacheln
data/
  games.json              globale Spieleliste
  <gameId>/               Manifest, Fortschrittsindex und Kategoriedaten
scripts/
  generateProgressIndex.mjs
  measurePerformance.mjs
  serveStatic.mjs
  validateOverviewCardMetadata.mjs
  validateRepository.mjs
tests/e2e/                Playwright-Smoke- und Regressionstests
package.json              Entwicklungs- und Prüfkommandos
playwright.config.mjs     Browser-Testkonfiguration
index.html
404.html
\`\`\`

## Lokal starten

Nach der Installation der Entwicklungsabhängigkeiten:

\`\`\`bash
npm ci
node scripts/serveStatic.mjs
\`\`\`

Danach ist die Anwendung unter \`http://127.0.0.1:4173\` erreichbar.

Alternativ kann für einen einfachen manuellen Test auch ein anderer statischer Webserver verwendet werden.

## Datenmodell

Jedes Spiel besitzt ein \`manifest.json\`. Ein Manifest-Eintrag verweist entweder auf ein weiteres Manifest oder auf eine konkrete Kategoriedatei.

\`\`\`json
{
  "id": "achievements",
  "name": {
    "de": "Erfolge",
    "en": "Achievements"
  },
  "description": {
    "de": "Alle im Spiel verfügbaren Erfolge.",
    "en": "All achievements available in the game."
  },
  "type": "category",
  "file": "achievements.json",
  "itemCount": 41,
  "itemLabel": {
    "de": "Erfolge",
    "en": "achievements"
  }
}
\`\`\`

\`itemCount\` wird automatisch geprüft. Die Übersichtskarten verwenden zusätzliche Metadaten wie \`itemLabel\`, \`groupCount\` und \`groupLabel\`.

## Entwicklungs- und Prüfkommandos

\`\`\`bash
npm run generate:progress-index
npm run check:progress-index
npm run validate:data
npm run test:e2e
npm run measure:performance
\`\`\`

Die Repository-Prüfung kontrolliert unter anderem:

- gültige JSON-Syntax
- vorhandene und sichere Manifestreferenzen
- korrekte \`itemCount\`-Werte
- aktuelle Fortschrittsindizes
- zweisprachige Übersichtskarten-Metadaten
- die vereinheitlichte Comms-Manifeststruktur
- lokale HTML- und Assetreferenzen
- doppelte Item-IDs
- verwaiste JSON-Dateien und Assets als Warnung

Der Workflow **Repository quality** läuft automatisch bei Pushes und Pull Requests und kann zusätzlich manuell gestartet werden.

## Fortschritt und Supabase

Die Supabase-Integration speichert den persönlichen Fortschritt angemeldeter Benutzer. Der öffentliche Browser-Key ist kein Service-Role-Key; der Zugriff auf Benutzerdaten muss weiterhin durch korrekt konfigurierte Row-Level-Security-Regeln abgesichert sein.

## Deployment

Die Seite wird direkt aus dem \`main\`-Branch über GitHub Pages ausgeliefert. npm und Playwright werden nur für Entwicklung und Qualitätssicherung verwendet; für das Deployment ist kein Bundler erforderlich.
`;

    await writeNormalized(
        resolve(ROOT, "README.md"),
        content
    );
    changes.push("README an den aktuellen Projektstand angepasst.");
}

async function validateCleanupResult() {
    const oldStylesheet = resolve(
        ROOT,
        "assets/css/progress-card-layout-hotfix.css"
    );
    const newStylesheet = resolve(
        ROOT,
        "assets/css/overview-cards.css"
    );

    if (await exists(oldStylesheet)) {
        throw new Error(
            "Das alte Übersichtskarten-Stylesheet existiert weiterhin."
        );
    }

    if (!await exists(newStylesheet)) {
        throw new Error(
            "Das neue Übersichtskarten-Stylesheet fehlt."
        );
    }

    const htmlFiles = await collectFiles(
        ROOT,
        file => file.endsWith(".html")
    );

    for (const file of htmlFiles) {
        const source = await readFile(file, "utf8");
        if (
            source.includes(
                "progress-card-layout-hotfix.css"
            )
        ) {
            throw new Error(
                `${display(file)} referenziert weiterhin den alten CSS-Namen.`
            );
        }
    }

    const scriptsDirectory = resolve(ROOT, "scripts");
    const scripts = await readdir(
        scriptsDirectory,
        { withFileTypes: true }
    );

    const obsolete = scripts.filter(entry =>
        entry.isFile() &&
        /^apply.*\.mjs$/i.test(entry.name) &&
        entry.name !== "applyFinalRepositoryCleanup.mjs"
    );

    if (obsolete.length > 0) {
        throw new Error(
            `Temporäre Apply-Skripte verblieben: ${obsolete.map(entry => entry.name).join(", ")}`
        );
    }
}

async function removeIfPresent(relativePath) {
    const target = resolve(ROOT, relativePath);

    if (!await exists(target)) {
        return;
    }

    await rm(target, {
        recursive: true,
        force: true
    });
    changes.push(`${relativePath} entfernt.`);
}

async function collectFiles(directory, predicate) {
    const results = [];
    const entries = await readdir(
        directory,
        { withFileTypes: true }
    );

    for (const entry of entries) {
        const target = join(directory, entry.name);

        if (
            entry.isDirectory() &&
            ![".git", "node_modules"].includes(entry.name)
        ) {
            results.push(
                ...await collectFiles(target, predicate)
            );
        }
        else if (
            entry.isFile() &&
            predicate(target)
        ) {
            results.push(target);
        }
    }

    return results;
}

async function writeNormalized(file, content) {
    await mkdir(dirname(file), { recursive: true });

    const normalized = normalize(content) + "\n";
    const current = await exists(file)
        ? normalize(await readFile(file, "utf8")) + "\n"
        : null;

    if (current === normalized) {
        return;
    }

    await writeFile(file, normalized, "utf8");
}

function normalize(value) {
    return String(value)
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .trimEnd();
}

async function exists(file) {
    try {
        await access(file);
        return true;
    }
    catch {
        return false;
    }
}

function display(file) {
    return relative(ROOT, file)
        .replaceAll("\\", "/");
}
