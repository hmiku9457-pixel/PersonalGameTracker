import {
    copyFile,
    mkdir,
    readFile,
    writeFile
} from "node:fs/promises";

import {
    dirname
} from "node:path";


const ROUTER_FILE =
    "assets/js/router.js";

const COMMS_VIEW_FILE =
    "assets/js/views/commsOverviewView.js";

const HELPER_SOURCE =
    "scripts/universal-banner-files/pageBreadcrumbView.js";

const HELPER_TARGET =
    "assets/js/views/pageBreadcrumbView.js";

const CSS_FILE =
    "assets/css/tracker.css";

const CSS_START =
    "/* === UNIVERSAL PAGE BREADCRUMB BANNERS START === */";

const CSS_END =
    "/* === UNIVERSAL PAGE BREADCRUMB BANNERS END === */";


await installHelper();
await patchRouter();
await patchCommsView();
await patchTrackerCss();

console.log(
    "Die universellen Navigationsbanner wurden eingerichtet."
);


/* =========================================================
   Helper installieren
   ========================================================= */

async function installHelper() {
    await mkdir(
        dirname(
            HELPER_TARGET
        ),
        {
            recursive: true
        }
    );

    await copyFile(
        HELPER_SOURCE,
        HELPER_TARGET
    );

    console.log(
        `${HELPER_TARGET} wurde erstellt.`
    );
}


/* =========================================================
   Router
   ========================================================= */

async function patchRouter() {
    let source = await readFile(
        ROUTER_FILE,
        "utf8"
    );

    source = ensureImport(
        source,
        `import {
\tapplyPageBreadcrumbBanner
} from "./views/pageBreadcrumbView.js";`,
        /import\s*\{\s*renderCategory\s*\}\s*from\s*["']\.\/views\/categoryView\.js["'];/
    );

    source = patchRootGameBanner(
        source
    );

    source = patchManifestBanner(
        source
    );

    source = patchCategoryBanner(
        source
    );

    source = patchResolvedBreadcrumbItems(
        source
    );

    await writeFile(
        ROUTER_FILE,
        source,
        "utf8"
    );

    console.log(
        "router.js wurde aktualisiert."
    );
}


function patchRootGameBanner(
    source
) {
    if (
        source.includes(
            "applyPageBreadcrumbBanner(\n\t\t\t\t[game.name]"
        )
    ) {
        return source;
    }

    const pattern =
        /(await\s+renderGame\(\s*game\s*\);)(\s*\r?\n\s*\r?\n\s*return;)/;

    if (!pattern.test(source)) {
        throw new Error(
            "Der Render-Aufruf der Spielübersicht konnte in router.js nicht gefunden werden."
        );
    }

    return source.replace(
        pattern,
        `$1


			applyPageBreadcrumbBanner(
				[game.name]
			);$2`
    );
}


function patchManifestBanner(
    source
) {
    if (
        source.includes(
            "applyPageBreadcrumbBanner(\n\t\t\t\t\tresolvedRoute.breadcrumbItems"
        )
    ) {
        return source;
    }

    const pattern =
        /(if\s*\(\s*resolvedRoute\.type\s*===\s*["']manifest["']\s*\)\s*\{[\s\S]*?await\s+renderGame\(\s*game,\s*\{[\s\S]*?\}\s*\);)(\s*\r?\n\s*\r?\n\s*return;)/;

    if (!pattern.test(source)) {
        throw new Error(
            "Der Render-Aufruf einer Manifestseite konnte in router.js nicht gefunden werden."
        );
    }

    return source.replace(
        pattern,
        `$1


				applyPageBreadcrumbBanner(
					resolvedRoute.breadcrumbItems
				);$2`
    );
}


function patchCategoryBanner(
    source
) {
    if (
        source.includes(
            "applyPageBreadcrumbBanner(\n\t\t\tresolvedRoute.breadcrumbItems"
        )
    ) {
        return source;
    }

    const pattern =
        /(await\s+renderCategory\(\s*game,\s*category\s*\);)/;

    if (!pattern.test(source)) {
        throw new Error(
            "Der Render-Aufruf einer Tracking-Kategorie konnte in router.js nicht gefunden werden."
        );
    }

    return source.replace(
        pattern,
        `$1


		applyPageBreadcrumbBanner(
			resolvedRoute.breadcrumbItems
		);`
    );
}


function patchResolvedBreadcrumbItems(
    source
) {
    if (
        !source.includes(
            "const breadcrumbItems ="
        )
    ) {
        const declarationPattern =
            /(let\s+lastEntry\s*=\s*null\s*;)/;

        if (!declarationPattern.test(source)) {
            throw new Error(
                "Die Route-Initialisierung konnte in router.js nicht gefunden werden."
            );
        }

        source = source.replace(
            declarationPattern,
            `$1


	const breadcrumbItems = [
		game.name
	];`
        );
    }

    if (
        !source.includes(
            "breadcrumbItems.push("
        )
    ) {
        const entryPattern =
            /(lastEntry\s*=\s*entry\s*;)/;

        if (!entryPattern.test(source)) {
            throw new Error(
                "Die Verarbeitung eines Route-Eintrags konnte in router.js nicht gefunden werden."
            );
        }

        source = source.replace(
            entryPattern,
            `$1


		breadcrumbItems.push(
			entry.name ??
			entry.id
		);`
        );
    }

    const manifestReturnPattern =
        /(return\s*\{\s*type:\s*["']manifest["'][\s\S]*?\n\s*entry)(\s*\n\s*\};)/;

    if (
        manifestReturnPattern.test(
            source
        ) &&
        !/return\s*\{\s*type:\s*["']manifest["'][\s\S]*?breadcrumbItems[\s\S]*?\};/
            .test(source)
    ) {
        source = source.replace(
            manifestReturnPattern,
            `$1,


					breadcrumbItems$2`
        );
    }

    const categoryReturnPattern =
        /(return\s*\{\s*type:\s*["']category["'][\s\S]*?entry:\s*lastEntry)(\s*\n\s*\};)/;

    if (
        categoryReturnPattern.test(
            source
        ) &&
        !/return\s*\{\s*type:\s*["']category["'][\s\S]*?breadcrumbItems[\s\S]*?\};/
            .test(source)
    ) {
        source = source.replace(
            categoryReturnPattern,
            `$1,


			breadcrumbItems$2`
        );
    }

    if (
        !/return\s*\{\s*type:\s*["']manifest["'][\s\S]*?breadcrumbItems[\s\S]*?\};/
            .test(source)
    ) {
        throw new Error(
            "breadcrumbItems konnte dem Manifest-Ergebnis nicht hinzugefügt werden."
        );
    }

    if (
        !/return\s*\{\s*type:\s*["']category["'][\s\S]*?breadcrumbItems[\s\S]*?\};/
            .test(source)
    ) {
        throw new Error(
            "breadcrumbItems konnte dem Kategorie-Ergebnis nicht hinzugefügt werden."
        );
    }

    return source;
}


/* =========================================================
   Spezielle Comms-Routen
   ========================================================= */

async function patchCommsView() {
    let source = await readFile(
        COMMS_VIEW_FILE,
        "utf8"
    );

    source = ensureImport(
        source,
        `import {
    applyPageBreadcrumbBanner
} from "./pageBreadcrumbView.js";`,
        /import\s*\{\s*updateActiveGameNavigation\s*\}\s*from\s*["']\.\/navigationView\.js["'];/
    );

    if (
        !source.includes(
            "const commsBreadcrumbItems ="
        )
    ) {
        const manifestPattern =
            /(const\s+commsManifest\s*=\s*await\s+loadManifest\(\s*game\.id,\s*COMMS_MANIFEST_FILE\s*\);)/;

        if (!manifestPattern.test(source)) {
            throw new Error(
                "Das Laden des Comms-Manifests konnte nicht gefunden werden."
            );
        }

        source = source.replace(
            manifestPattern,
            `$1


    const collectiblesEntry =
        Array.isArray(
            game.categories
        )
            ? game.categories.find(
                entry =>
                    entry.id ===
                    COMMS_ROUTE_PREFIX[0]
            )
            : null;

    const commsBreadcrumbItems = [
        game.name,
        collectiblesEntry?.name ??
        "Collectibles",
        commsManifest.name ??
        "Comms"
    ];`
        );
    }

    source = patchCommsOverviewBanner(
        source
    );

    source = patchCommsListBanner(
        source
    );

    source = patchCommsMapBanner(
        source
    );

    await writeFile(
        COMMS_VIEW_FILE,
        source,
        "utf8"
    );

    console.log(
        "commsOverviewView.js wurde aktualisiert."
    );
}


function patchCommsOverviewBanner(
    source
) {
    if (
        source.includes(
            "applyPageBreadcrumbBanner(\n            commsBreadcrumbItems"
        )
    ) {
        return source;
    }

    const pattern =
        /(if\s*\(\s*routeIds\.length\s*===\s*2\s*\)\s*\{[\s\S]*?await\s+renderCommsOverview\([\s\S]*?\);)(\s*\r?\n\s*\r?\n\s*return\s+true;)/;

    if (!pattern.test(source)) {
        throw new Error(
            "Der Render-Aufruf der Comms-Übersicht konnte nicht gefunden werden."
        );
    }

    return source.replace(
        pattern,
        `$1


        applyPageBreadcrumbBanner(
            commsBreadcrumbItems,
            {
                removeDescriptions: true
            }
        );$2`
    );
}


function patchCommsListBanner(
    source
) {
    if (
        source.includes(
            "...commsBreadcrumbItems,\n                section.name"
        )
    ) {
        return source;
    }

    const pattern =
        /(if\s*\(\s*section\.view\s*===\s*["']list["']\s*\)\s*\{[\s\S]*?await\s+renderCategory\([\s\S]*?\);)(\s*\r?\n\s*return\s+true;)/;

    if (!pattern.test(source)) {
        throw new Error(
            "Der Render-Aufruf der Comms-Missionsliste konnte nicht gefunden werden."
        );
    }

    return source.replace(
        pattern,
        `$1


        applyPageBreadcrumbBanner(
            [
                ...commsBreadcrumbItems,
                section.name
            ],
            {
                removeDescriptions: true
            }
        );$2`
    );
}


function patchCommsMapBanner(
    source
) {
    if (
        source.includes(
            "applyPageBreadcrumbBanner(\n        [\n            ...commsBreadcrumbItems"
        )
    ) {
        return source;
    }

    const pattern =
        /(await\s+renderCommsMapView\([\s\S]*?\);)(\s*\r?\n\s*\r?\n\s*return\s+true;)/;

    if (!pattern.test(source)) {
        throw new Error(
            "Der Render-Aufruf der Comms-Karte konnte nicht gefunden werden."
        );
    }

    return source.replace(
        pattern,
        `$1


    applyPageBreadcrumbBanner(
        [
            ...commsBreadcrumbItems,
            section.name
        ],
        {
            removeDescriptions: true
        }
    );$2`
    );
}


/* =========================================================
   CSS
   ========================================================= */

async function patchTrackerCss() {
    let source = await readFile(
        CSS_FILE,
        "utf8"
    );

    const cssBlock = `
${CSS_START}
/* =========================================================
   Einheitliche Navigationsbanner
   ========================================================= */

.game-page .page-breadcrumb-banner {
    display: block;
    grid-template-columns: none;
    align-items: initial;

    width: 100%;
    min-height: 0;
    margin: 0 0 1rem;
    padding: 0.95rem 1.15rem;

    color: #f3f4f6;
    background-color: #1f2937;

    border: 1px solid #374151;
    border-radius: 10px;

    text-align: center;

    box-shadow:
        0 4px 12px
        rgb(0 0 0 / 15%);
}

.game-page .page-breadcrumb-title {
    width: 100%;
    max-width: none;
    margin: 0;

    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;

    font-size: clamp(
        1.05rem,
        1.25vw,
        1.45rem
    );
    font-weight: 700;
    line-height: 1.35;

    color: #f3f4f6;

    text-align: center;
}

.game-page .page-breadcrumb-segment {
    white-space: nowrap;
}

.game-page .page-breadcrumb-separator {
    flex: 0 0 auto;

    padding:
        0
        0.28rem;

    color: #9ca3af;

    white-space: pre;
}

/*
 * Alte, nur für Comms erzeugte Präfixe dürfen den jetzt
 * vollständig in JavaScript erzeugten Pfad nicht verdoppeln.
 */
.game-page .page-breadcrumb-title::before,
.game-page .page-breadcrumb-title::after,
.game-page .page-breadcrumb-title *::before,
.game-page .page-breadcrumb-title *::after {
    content: none !important;
}

/*
 * Die alten Überschriften werden durch JavaScript entfernt.
 * Diese Regeln verhindern einen kurzen sichtbaren Doppelzustand.
 */
.game-page.has-page-breadcrumb-banner
> .game-header,

.game-page.has-page-breadcrumb-banner
> .game-title,

.game-page.has-page-breadcrumb-banner
> .comms-map-header,

.game-page.has-page-breadcrumb-banner
> .category-content
> .category-content-header {
    display: none;
}

@media (max-width: 600px) {
    .game-page .page-breadcrumb-banner {
        padding:
            0.85rem
            0.8rem;
    }

    .game-page .page-breadcrumb-title {
        font-size: 1rem;
    }

    .game-page .page-breadcrumb-separator {
        padding:
            0
            0.2rem;
    }
}
${CSS_END}
`;

    const existingPattern =
        new RegExp(
            `${escapeRegExp(CSS_START)}[\\s\\S]*?${escapeRegExp(CSS_END)}\\s*`,
            "m"
        );

    if (
        existingPattern.test(
            source
        )
    ) {
        source = source.replace(
            existingPattern,
            cssBlock.trim() + "\n"
        );
    }
    else {
        source =
            source.trimEnd() +
            "\n\n" +
            cssBlock.trim() +
            "\n";
    }

    await writeFile(
        CSS_FILE,
        source,
        "utf8"
    );

    console.log(
        "tracker.css wurde aktualisiert."
    );
}


/* =========================================================
   Hilfsfunktionen
   ========================================================= */

function ensureImport(
    source,
    importText,
    anchorPattern
) {
    if (
        source.includes(
            importText
                .split("\n")
                .at(-1)
                .replace(
                    /^}\s*from\s*/,
                    ""
                )
        ) ||
        source.includes(
            "pageBreadcrumbView.js"
        )
    ) {
        return source;
    }

    const match =
        source.match(
            anchorPattern
        );

    if (!match) {
        throw new Error(
            "Der Import-Anker für pageBreadcrumbView.js konnte nicht gefunden werden."
        );
    }

    return source.replace(
        match[0],
        `${match[0]}


${importText}`
    );
}


function escapeRegExp(
    value
) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}
