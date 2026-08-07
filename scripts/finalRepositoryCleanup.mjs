import {
    access,
    readFile,
    rm,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    resolve
} from "node:path";


const ROOT =
    process.cwd();

const NOT_FOUND_FILE =
    resolve(
        ROOT,
        "404.html"
    );

const GITIGNORE_FILE =
    resolve(
        ROOT,
        ".gitignore"
    );

const UNUSED_CONFIG_FILE =
    resolve(
        ROOT,
        "config/supabase-config.js"
    );

const UNUSED_TEST_FILE =
    resolve(
        ROOT,
        "assets/js/supabase/supabaseTest.js"
    );

const COMMS_VIEW_FILE =
    resolve(
        ROOT,
        "assets/js/views/commsOverviewView.js"
    );

const GITIGNORE_START =
    "# === FINAL REPOSITORY GITIGNORE START ===";

const GITIGNORE_END =
    "# === FINAL REPOSITORY GITIGNORE END ===";


await validateUnusedFiles();
await createNotFoundPage();
await updateGitignore();
await formatCommsOverviewView();
await removeUnusedFiles();
await removeEmptyConfigDirectory();
await validateResult();

console.log(
    "Der letzte dateibasierte Repository-Cleanup wurde erfolgreich abgeschlossen."
);


/* =========================================================
   Sicherheitsprüfungen
   ========================================================= */

async function validateUnusedFiles() {
    await assertExists(
        UNUSED_CONFIG_FILE,
        "config/supabase-config.js wurde nicht gefunden."
    );

    await assertExists(
        UNUSED_TEST_FILE,
        "assets/js/supabase/supabaseTest.js wurde nicht gefunden."
    );

    const configContent =
        (
            await readFile(
                UNUSED_CONFIG_FILE,
                "utf8"
            )
        ).trim();

    assert(
        configContent === "Placeholder",
        "supabase-config.js enthält inzwischen produktiven Inhalt und wird deshalb nicht automatisch gelöscht."
    );

    const repositoryFiles =
        await collectTextFiles(
            ROOT
        );

    const configReferences =
        repositoryFiles.filter(
            entry =>
                entry.path !==
                    UNUSED_CONFIG_FILE &&
                !isTemporaryCleanupFile(
                    entry.path
                ) &&
                entry.content.includes(
                    "supabase-config.js"
                )
        );

    assert(
        configReferences.length === 0,
        [
            "supabase-config.js wird noch referenziert:",
            ...configReferences.map(
                entry =>
                    `- ${relativePath(entry.path)}`
            )
        ].join(
            "\n"
        )
    );

    const testReferences =
        repositoryFiles.filter(
            entry =>
                entry.path !==
                    UNUSED_TEST_FILE &&
                !isTemporaryCleanupFile(
                    entry.path
                ) &&
                entry.content.includes(
                    "supabaseTest.js"
                )
        );

    assert(
        testReferences.length === 0,
        [
            "supabaseTest.js wird noch referenziert:",
            ...testReferences.map(
                entry =>
                    `- ${relativePath(entry.path)}`
            )
        ].join(
            "\n"
        )
    );

    console.log(
        "Die beiden Supabase-Dateien sind ungenutzt und können sicher entfernt werden."
    );
}


/* =========================================================
   404-Seite
   ========================================================= */

async function createNotFoundPage() {
    const html = `<!DOCTYPE html>
<html lang="de">
    <head>
        <meta charset="UTF-8">
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
        >

        <meta
            name="robots"
            content="noindex"
        >

        <title>
            Seite nicht gefunden | Personal Game Tracker
        </title>

        <style>
            :root {
                color-scheme: dark;

                font-family:
                    Inter,
                    system-ui,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;
            }

            * {
                box-sizing: border-box;
            }

            body {
                min-height: 100vh;
                margin: 0;
                padding: 1.5rem;

                display: grid;
                place-items: center;

                color: #f3f4f6;
                background:
                    radial-gradient(
                        circle at top,
                        #1f2937,
                        #0f172a 58%,
                        #090f1c
                    );
            }

            main {
                width:
                    min(
                        100%,
                        38rem
                    );

                padding:
                    clamp(
                        1.5rem,
                        5vw,
                        2.75rem
                    );

                text-align: center;

                background:
                    rgb(31 41 55 / 88%);

                border:
                    1px
                    solid
                    #374151;

                border-radius: 1rem;

                box-shadow:
                    0 1.25rem 3.5rem
                    rgb(0 0 0 / 35%);
            }

            .error-code {
                margin: 0 0 0.35rem;

                color: #60a5fa;

                font-size:
                    clamp(
                        3rem,
                        12vw,
                        5.5rem
                    );

                font-weight: 800;
                line-height: 1;
            }

            h1 {
                margin:
                    0
                    0
                    0.8rem;

                font-size:
                    clamp(
                        1.45rem,
                        4vw,
                        2rem
                    );
            }

            p {
                margin:
                    0
                    auto
                    1.5rem;

                max-width: 31rem;

                color: #cbd5e1;
                line-height: 1.6;
            }

            a {
                min-height: 2.75rem;
                padding:
                    0.65rem
                    1.1rem;

                display: inline-flex;
                align-items: center;
                justify-content: center;

                color: #ffffff;
                background: #2563eb;

                border:
                    1px
                    solid
                    #60a5fa;

                border-radius: 0.55rem;

                font-weight: 700;
                text-decoration: none;

                transition:
                    background-color 160ms ease,
                    transform 160ms ease;
            }

            a:hover,
            a:focus-visible {
                background: #1d4ed8;

                transform:
                    translateY(
                        -2px
                    );
            }

            a:focus-visible {
                outline:
                    3px
                    solid
                    rgb(147 197 253 / 55%);

                outline-offset: 3px;
            }

            .redirect-note {
                margin:
                    1rem
                    0
                    0;

                color: #94a3b8;

                font-size: 0.85rem;
            }
        </style>
    </head>

    <body>
        <main>
            <p
                class="error-code"
                aria-hidden="true"
            >
                404
            </p>

            <h1>
                Seite nicht gefunden
            </h1>

            <p>
                Die angeforderte Seite existiert nicht oder wurde verschoben.
                Du wirst automatisch zum Personal Game Tracker weitergeleitet.
            </p>

            <a
                id="home-link"
                href="/"
            >
                Zum Personal Game Tracker
            </a>

            <p class="redirect-note">
                Automatische Weiterleitung in wenigen Sekunden …
            </p>
        </main>

        <script>
            (function redirectToTracker() {
                const pathParts =
                    window.location.pathname
                        .split("/")
                        .filter(Boolean);

                const runsOnProjectPages =
                    window.location.hostname
                        .endsWith(
                            ".github.io"
                        ) &&
                    pathParts.length > 0;

                const basePath =
                    runsOnProjectPages
                        ? \`/\${pathParts[0]}/\`
                        : "/";

                const homeUrl =
                    new URL(
                        basePath,
                        window.location.origin
                    );

                const homeLink =
                    document.getElementById(
                        "home-link"
                    );

                if (homeLink) {
                    homeLink.href =
                        homeUrl.href;
                }

                window.setTimeout(
                    () => {
                        window.location.replace(
                            homeUrl.href
                        );
                    },
                    2500
                );
            }());
        </script>
    </body>
</html>
`;

    await writeFile(
        NOT_FOUND_FILE,
        html,
        "utf8"
    );

    console.log(
        "404.html wurde durch eine funktionsfähige Fehlerseite ersetzt."
    );
}


/* =========================================================
   .gitignore
   ========================================================= */

async function updateGitignore() {
    const current =
        await readOptionalFile(
            GITIGNORE_FILE
        );

    const managedBlock = `${GITIGNORE_START}
# Betriebssysteme
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

# Abhängigkeiten, Builds und temporäre Dateien
node_modules/
dist/
coverage/
.tmp/
temp/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
${GITIGNORE_END}`;

    const blockPattern =
        new RegExp(
            `${escapeRegExp(GITIGNORE_START)}[\\s\\S]*?${escapeRegExp(GITIGNORE_END)}\\s*`,
            "m"
        );

    let updated;

    if (
        blockPattern.test(
            current
        )
    ) {
        updated =
            current.replace(
                blockPattern,
                `${managedBlock}\n`
            );
    }
    else {
        updated =
            [
                current.trim(),
                managedBlock
            ]
                .filter(Boolean)
                .join(
                    "\n\n"
                ) +
            "\n";
    }

    await writeFile(
        GITIGNORE_FILE,
        updated,
        "utf8"
    );

    console.log(
        ".gitignore wurde sinnvoll befüllt."
    );
}


/* =========================================================
   Kleine Codeformatierung
   ========================================================= */

async function formatCommsOverviewView() {
    let source =
        await readFile(
            COMMS_VIEW_FILE,
            "utf8"
        );

    source =
        source
            .replace(
                /}\r?\n\/\*\*/g,
                "}\n\n\n/**"
            )
            .trimEnd() +
        "\n";

    await writeFile(
        COMMS_VIEW_FILE,
        source,
        "utf8"
    );

    console.log(
        "Die verbliebenen JSDoc-Abstände in commsOverviewView.js wurden geglättet."
    );
}


/* =========================================================
   Entfernen der Altdateien
   ========================================================= */

async function removeUnusedFiles() {
    await rm(
        UNUSED_CONFIG_FILE,
        {
            force: true
        }
    );

    await rm(
        UNUSED_TEST_FILE,
        {
            force: true
        }
    );

    console.log(
        "Ungenutzte Supabase-Platzhalter und der manuelle Verbindungstest wurden entfernt."
    );
}


async function removeEmptyConfigDirectory() {
    try {
        await rm(
            dirname(
                UNUSED_CONFIG_FILE
            )
        );
    }
    catch {
        /*
         * Der Ordner enthält weitere Dateien und bleibt deshalb
         * bewusst bestehen.
         */
    }
}


/* =========================================================
   Abschlussprüfung
   ========================================================= */

async function validateResult() {
    assert(
        await exists(
            NOT_FOUND_FILE
        ),
        "404.html fehlt nach dem Cleanup."
    );

    assert(
        !(await exists(
            UNUSED_CONFIG_FILE
        )),
        "supabase-config.js wurde nicht entfernt."
    );

    assert(
        !(await exists(
            UNUSED_TEST_FILE
        )),
        "supabaseTest.js wurde nicht entfernt."
    );

    const notFound =
        await readFile(
            NOT_FOUND_FILE,
            "utf8"
        );

    assert(
        notFound.includes(
            "Personal Game Tracker"
        ) &&
        notFound.includes(
            "redirectToTracker"
        ),
        "Die neue 404-Seite ist unvollständig."
    );

    const gitignore =
        await readFile(
            GITIGNORE_FILE,
            "utf8"
        );

    assert(
        gitignore.includes(
            GITIGNORE_START
        ) &&
        gitignore.includes(
            GITIGNORE_END
        ),
        ".gitignore enthält den verwalteten Block nicht."
    );
}


/* =========================================================
   Dateisuche
   ========================================================= */

async function collectTextFiles(
    directory
) {
    const {
        readdir
    } = await import(
        "node:fs/promises"
    );

    const {
        join
    } = await import(
        "node:path"
    );

    const ignoredDirectories =
        new Set([
            ".git",
            "node_modules"
        ]);

    const textExtensions =
        new Set([
            ".css",
            ".html",
            ".js",
            ".json",
            ".md",
            ".mjs",
            ".txt",
            ".yml",
            ".yaml"
        ]);

    const {
        extname
    } = await import(
        "node:path"
    );

    const results = [];

    async function visit(
        currentDirectory
    ) {
        const entries =
            await readdir(
                currentDirectory,
                {
                    withFileTypes: true
                }
            );

        for (
            const entry
            of entries
        ) {
            if (
                entry.isDirectory() &&
                ignoredDirectories.has(
                    entry.name
                )
            ) {
                continue;
            }

            const path =
                join(
                    currentDirectory,
                    entry.name
                );

            if (
                entry.isDirectory()
            ) {
                await visit(
                    path
                );

                continue;
            }

            if (
                !textExtensions.has(
                    extname(
                        entry.name
                    ).toLowerCase()
                )
            ) {
                continue;
            }

            results.push({
                path,
                content:
                    await readFile(
                        path,
                        "utf8"
                    )
            });
        }
    }

    await visit(
        directory
    );

    return results;
}


/* =========================================================
   Allgemeine Hilfsfunktionen
   ========================================================= */

async function readOptionalFile(
    file
) {
    try {
        return await readFile(
            file,
            "utf8"
        );
    }
    catch {
        return "";
    }
}


async function assertExists(
    path,
    message
) {
    assert(
        await exists(
            path
        ),
        message
    );
}


async function exists(
    path
) {
    try {
        await access(
            path
        );

        return true;
    }
    catch {
        return false;
    }
}


function relativePath(
    path
) {
    return path
        .replace(
            `${ROOT}/`,
            ""
        );
}


/**
 * Das Cleanup-Skript und sein einmaliger Workflow enthalten
 * absichtlich die Namen der zu entfernenden Dateien. Sie dürfen
 * deshalb nicht als produktive Referenzen gewertet werden.
 */
function isTemporaryCleanupFile(
    path
) {
    return [
        resolve(
            ROOT,
            "scripts/finalRepositoryCleanup.mjs"
        ),
        resolve(
            ROOT,
            ".github/workflows/final-repository-cleanup.yml"
        )
    ].includes(
        path
    );
}


function assert(
    condition,
    message
) {
    if (!condition) {
        throw new Error(
            message
        );
    }
}


function escapeRegExp(
    value
) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}
