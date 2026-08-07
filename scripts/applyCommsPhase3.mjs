import {
    access,
    copyFile,
    mkdir,
    readFile,
    writeFile
} from "node:fs/promises";
import path from "node:path";
import {
    fileURLToPath
} from "node:url";


const SCRIPT_DIR = path.dirname(
    fileURLToPath(import.meta.url)
);
const REPOSITORY_ROOT = process.cwd();
const FILES_DIR = path.join(
    SCRIPT_DIR,
    "phase3-files"
);

const PATHS = {
    categoryView: path.join(
        REPOSITORY_ROOT,
        "assets/js/views/categoryView.js"
    ),
    commsOverviewView: path.join(
        REPOSITORY_ROOT,
        "assets/js/views/commsOverviewView.js"
    ),
    commsMapView: path.join(
        REPOSITORY_ROOT,
        "assets/js/views/commsMapView.js"
    ),
    trackerCss: path.join(
        REPOSITORY_ROOT,
        "assets/css/tracker.css"
    ),
    rootManifest: path.join(
        REPOSITORY_ROOT,
        "data/theDivision2/collectibles/commsV2/manifest.json"
    ),
    mapsDirectory: path.join(
        REPOSITORY_ROOT,
        "assets/maps/theDivision2"
    )
};

const REGION_CONFIG = {
    washington: {
        image: "assets/maps/theDivision2/washington.svg",
        description: {
            de: "Comms der offenen Welt in Washington, D.C. mit Gebietskarte und einklappbarer Tracking-Liste.",
            en: "Open-world Comms in Washington, D.C. with an area map and collapsible tracking list."
        },
        alt: {
            de: "Gebietskarte von Washington, D.C.",
            en: "Area map of Washington, D.C."
        }
    },
    newYork: {
        image: "assets/maps/theDivision2/newYork.svg",
        description: {
            de: "Comms der offenen Welt in Lower Manhattan mit Gebietskarte und einklappbarer Tracking-Liste.",
            en: "Open-world Comms in Lower Manhattan with an area map and collapsible tracking list."
        },
        alt: {
            de: "Gebietskarte von Lower Manhattan",
            en: "Area map of Lower Manhattan"
        }
    },
    brooklyn: {
        image: "assets/maps/theDivision2/brooklyn.svg",
        description: {
            de: "Comms der offenen Welt in Brooklyn mit Gebietskarte und einklappbarer Tracking-Liste.",
            en: "Open-world Comms in Brooklyn with an area map and collapsible tracking list."
        },
        alt: {
            de: "Gebietskarte von Brooklyn",
            en: "Area map of Brooklyn"
        }
    }
};

const CSS_START =
    "/* BEGIN COMMS PHASE 3 */";
const CSS_END =
    "/* END COMMS PHASE 3 */";


await main();


async function main() {
    console.log(
        "[Phase 3] Prüfe Repository-Struktur ..."
    );

    await Promise.all([
        ensureExists(PATHS.categoryView),
        ensureExists(PATHS.commsOverviewView),
        ensureExists(PATHS.trackerCss),
        ensureExists(PATHS.rootManifest),
        ensureExists(
            path.join(
                FILES_DIR,
                "commsMapView.js"
            )
        ),
        ensureExists(
            path.join(
                FILES_DIR,
                "comms-phase3.css"
            )
        )
    ]);

    await patchCategoryView();
    await installCommsMapView();
    await patchCommsOverviewView();
    await installCss();
    await installMapPlaceholders();
    await updateManifests();
    await validateInstallation();

    console.log(
        "[Phase 3] Kartenlayout erfolgreich installiert."
    );
}


async function patchCategoryView() {
    let source = await readFile(
        PATHS.categoryView,
        "utf8"
    );

    source = ensureExportedFunction(
        source,
        "renderCategoryData"
    );
    source = ensureExportedFunction(
        source,
        "registerProgressToggleHandler"
    );

    await writeFile(
        PATHS.categoryView,
        source,
        "utf8"
    );

    console.log(
        "[Phase 3] categoryView.js für Wiederverwendung vorbereitet."
    );
}


function ensureExportedFunction(
    source,
    functionName
) {
    const exportedPattern = new RegExp(
        `export\\s+function\\s+${functionName}\\s*\\(`
    );

    if (exportedPattern.test(source)) {
        return source;
    }

    const normalPattern = new RegExp(
        `function\\s+${functionName}\\s*\\(`
    );

    if (!normalPattern.test(source)) {
        throw new Error(
            `Funktion ${functionName} wurde in categoryView.js nicht gefunden.`
        );
    }

    return source.replace(
        normalPattern,
        `export function ${functionName}(`
    );
}


async function installCommsMapView() {
    await mkdir(
        path.dirname(PATHS.commsMapView),
        { recursive: true }
    );

    await copyFile(
        path.join(
            FILES_DIR,
            "commsMapView.js"
        ),
        PATHS.commsMapView
    );

    console.log(
        "[Phase 3] commsMapView.js installiert."
    );
}


async function patchCommsOverviewView() {
    let source = await readFile(
        PATHS.commsOverviewView,
        "utf8"
    );

    const importStatement = [
        "import {",
        "    renderCommsMapView",
        "} from \"./commsMapView.js\";"
    ].join("\n");

    if (!source.includes(
        'from "./commsMapView.js"'
    )) {
        const navigationImport =
            'import {\n    updateActiveGameNavigation\n} from "./navigationView.js";';

        if (!source.includes(navigationImport)) {
            throw new Error(
                "Importposition in commsOverviewView.js wurde nicht gefunden."
            );
        }

        source = source.replace(
            navigationImport,
            `${importStatement}\n\n${navigationImport}`
        );
    }

    if (
        source.includes(
            "await renderCommsMapPlaceholder("
        )
    ) {
        source = source.replace(
            "await renderCommsMapPlaceholder(",
            "await renderCommsMapView("
        );
    }

    if (!source.includes(
        "await renderCommsMapView("
    )) {
        throw new Error(
            "Aufruf der Kartenansicht konnte nicht gesetzt werden."
        );
    }

    await writeFile(
        PATHS.commsOverviewView,
        source,
        "utf8"
    );

    console.log(
        "[Phase 3] Comms-Routing auf Kartenansicht umgestellt."
    );
}


async function installCss() {
    const phaseCss = (
        await readFile(
            path.join(
                FILES_DIR,
                "comms-phase3.css"
            ),
            "utf8"
        )
    ).trim();

    let trackerCss = await readFile(
        PATHS.trackerCss,
        "utf8"
    );

    const block = [
        CSS_START,
        phaseCss,
        CSS_END
    ].join("\n");

    const existingBlock = new RegExp(
        `${escapeRegExp(CSS_START)}[\\s\\S]*?${escapeRegExp(CSS_END)}`,
        "m"
    );

    if (existingBlock.test(trackerCss)) {
        trackerCss = trackerCss.replace(
            existingBlock,
            block
        );
    }
    else {
        trackerCss =
            `${trackerCss.trimEnd()}\n\n\n${block}\n`;
    }

    await writeFile(
        PATHS.trackerCss,
        trackerCss,
        "utf8"
    );

    console.log(
        "[Phase 3] Karten-CSS ergänzt."
    );
}


async function installMapPlaceholders() {
    await mkdir(
        PATHS.mapsDirectory,
        { recursive: true }
    );

    for (const regionId of Object.keys(
        REGION_CONFIG
    )) {
        await copyFile(
            path.join(
                FILES_DIR,
                "maps",
                `${regionId}.svg`
            ),
            path.join(
                PATHS.mapsDirectory,
                `${regionId}.svg`
            )
        );
    }

    console.log(
        "[Phase 3] Austauschbare Kartenplatzhalter installiert."
    );
}


async function updateManifests() {
    const rootManifest = await readJson(
        PATHS.rootManifest
    );

    rootManifest.lastUpdated = "2026-08-07";

    for (const collectionName of [
        "sections",
        "categories"
    ]) {
        const entries = Array.isArray(
            rootManifest[collectionName]
        )
            ? rootManifest[collectionName]
            : [];

        for (const entry of entries) {
            const config = REGION_CONFIG[entry.id];

            if (!config) {
                continue;
            }

            entry.description = config.description;
            entry.mapImage = config.image;
            entry.mapImageAlt = config.alt;
        }
    }

    await writeJson(
        PATHS.rootManifest,
        rootManifest
    );

    for (const [
        regionId,
        config
    ] of Object.entries(REGION_CONFIG)) {
        const manifestPath = path.join(
            REPOSITORY_ROOT,
            "data/theDivision2/collectibles/commsV2",
            regionId,
            "manifest.json"
        );

        const manifest = await readJson(
            manifestPath
        );

        manifest.lastUpdated = "2026-08-07";
        manifest.description = config.description;
        manifest.mapImage = config.image;
        manifest.mapImageAlt = config.alt;
        manifest.panelDefaultOpen = true;

        await writeJson(
            manifestPath,
            manifest
        );
    }

    console.log(
        "[Phase 3] Kartenpfade und Beschreibungen in Manifesten ergänzt."
    );
}


async function validateInstallation() {
    const categoryView = await readFile(
        PATHS.categoryView,
        "utf8"
    );
    const overviewView = await readFile(
        PATHS.commsOverviewView,
        "utf8"
    );
    const mapView = await readFile(
        PATHS.commsMapView,
        "utf8"
    );
    const trackerCss = await readFile(
        PATHS.trackerCss,
        "utf8"
    );

    const checks = [
        [
            categoryView.includes(
                "export function renderCategoryData("
            ),
            "renderCategoryData ist nicht exportiert."
        ],
        [
            categoryView.includes(
                "export function registerProgressToggleHandler("
            ),
            "registerProgressToggleHandler ist nicht exportiert."
        ],
        [
            overviewView.includes(
                'from "./commsMapView.js"'
            ),
            "commsMapView-Import fehlt."
        ],
        [
            overviewView.includes(
                "await renderCommsMapView("
            ),
            "Kartenansicht wird nicht aufgerufen."
        ],
        [
            mapView.includes(
                "export async function renderCommsMapView("
            ),
            "Kartenrenderer fehlt."
        ],
        [
            trackerCss.includes(CSS_START) &&
            trackerCss.includes(CSS_END),
            "Phase-3-CSS fehlt."
        ]
    ];

    for (const [valid, message] of checks) {
        if (!valid) {
            throw new Error(message);
        }
    }

    for (const [regionId, config] of Object.entries(
        REGION_CONFIG
    )) {
        const manifestPath = path.join(
            REPOSITORY_ROOT,
            "data/theDivision2/collectibles/commsV2",
            regionId,
            "manifest.json"
        );
        const manifest = await readJson(
            manifestPath
        );

        if (manifest.mapImage !== config.image) {
            throw new Error(
                `mapImage für ${regionId} wurde nicht korrekt gesetzt.`
            );
        }

        await ensureExists(
            path.join(
                REPOSITORY_ROOT,
                config.image
            )
        );
    }

    console.log(
        "[Phase 3] Validierung erfolgreich."
    );
}


async function ensureExists(filePath) {
    try {
        await access(filePath);
    }
    catch {
        throw new Error(
            `Benötigte Datei fehlt: ${path.relative(REPOSITORY_ROOT, filePath)}`
        );
    }
}


async function readJson(filePath) {
    return JSON.parse(
        await readFile(
            filePath,
            "utf8"
        )
    );
}


async function writeJson(
    filePath,
    value
) {
    await writeFile(
        filePath,
        `${JSON.stringify(value, null, 2)}\n`,
        "utf8"
    );
}


function escapeRegExp(value) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}
