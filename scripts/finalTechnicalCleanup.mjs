import {
    access,
    readFile,
    readdir,
    rename,
    rm,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    join,
    relative,
    resolve
} from "node:path";


const ROOT =
    process.cwd();

const COLLECTIBLES_DIR =
    resolve(
        ROOT,
        "data/theDivision2/collectibles"
    );

const LEGACY_COMMS_DIR =
    join(
        COLLECTIBLES_DIR,
        "comms"
    );

const STAGED_COMMS_DIR =
    join(
        COLLECTIBLES_DIR,
        "commsV2"
    );

const COLLECTIBLES_MANIFEST =
    join(
        COLLECTIBLES_DIR,
        "manifest.json"
    );

const COMMS_VIEW_FILE =
    resolve(
        ROOT,
        "assets/js/views/commsOverviewView.js"
    );

const TRACKER_CSS_FILE =
    resolve(
        ROOT,
        "assets/css/tracker.css"
    );


await validateMigration();
await migrateCommsDirectory();
await patchCollectiblesManifest();
await patchRegionalDescriptions();
await patchCommsOverviewView();
await consolidateTrackerCss();
await validateProductionState();

console.log(
    "Technischer Cleanup erfolgreich abgeschlossen."
);


/* =========================================================
   Datenvalidierung
   ========================================================= */

async function validateMigration() {
    await assertExists(
        LEGACY_COMMS_DIR,
        "Die alte Comms-Struktur fehlt."
    );

    await assertExists(
        STAGED_COMMS_DIR,
        "Die neue CommsV2-Struktur fehlt."
    );

    const legacyCollection =
        await collectLegacyItems(
            LEGACY_COMMS_DIR
        );

    const stagedCollection =
        await collectStagedItems(
            STAGED_COMMS_DIR
        );

    compareIdSets(
        legacyCollection.ids,
        stagedCollection.ids,
        "Alte und neue Comms-Struktur enthalten unterschiedliche Item-IDs."
    );

    assert(
        legacyCollection.itemCount ===
        stagedCollection.itemCount,
        "Die Item-Anzahl der alten und neuen Struktur unterscheidet sich."
    );

    assert(
        stagedCollection.itemCount ===
        stagedCollection.expectedItemCount,
        `Die neue Struktur enthält ${stagedCollection.itemCount} statt der im Manifest erwarteten ${stagedCollection.expectedItemCount} Items.`
    );

    assert(
        stagedCollection.itemCount === 840,
        `Vor dem Cleanup wurden ${stagedCollection.itemCount} statt 840 eindeutige Comms gefunden.`
    );

    console.log(
        `Datenprüfung erfolgreich: ${stagedCollection.itemCount} eindeutige Item-IDs stimmen überein.`
    );
}


async function collectLegacyItems(
    baseDirectory
) {
    const manifest =
        await readJson(
            join(
                baseDirectory,
                "manifest.json"
            )
        );

    const categories =
        Array.isArray(
            manifest.categories
        )
            ? manifest.categories
            : [];

    assert(
        categories.length > 0,
        "Das alte Comms-Manifest enthält keine Kategorien."
    );

    const ids =
        new Set();

    let itemCount = 0;

    for (const category of categories) {
        const file =
            join(
                baseDirectory,
                category.file
            );

        const result =
            await readCategoryCollection(
                file,
                category
            );

        addUniqueIds(
            ids,
            result.ids,
            relative(
                ROOT,
                file
            )
        );

        itemCount +=
            result.itemCount;
    }

    return {
        ids,
        itemCount
    };
}


async function collectStagedItems(
    baseDirectory
) {
    const manifest =
        await readJson(
            join(
                baseDirectory,
                "manifest.json"
            )
        );

    const sections =
        Array.isArray(
            manifest.sections
        )
            ? manifest.sections
            : [];

    assert(
        sections.length === 4,
        `Das neue Comms-Manifest enthält ${sections.length} statt 4 Bereiche.`
    );

    const ids =
        new Set();

    let itemCount = 0;

    const idsBySection =
        new Map();

    for (const section of sections) {
        const sectionManifestFile =
            join(
                baseDirectory,
                section.manifest
            );

        const sectionManifest =
            await readJson(
                sectionManifestFile
            );

        const files =
            Array.isArray(
                sectionManifest.files
            )
                ? sectionManifest.files
                : [];

        assert(
            files.length > 0,
            `Der Bereich ${section.id} enthält keine Datendateien.`
        );

        const sectionIds =
            new Set();

        let sectionItemCount = 0;

        for (const fileEntry of files) {
            const file =
                join(
                    dirname(
                        sectionManifestFile
                    ),
                    fileEntry.file
                );

            const result =
                await readCategoryCollection(
                    file,
                    fileEntry
                );

            addUniqueIds(
                sectionIds,
                result.ids,
                relative(
                    ROOT,
                    file
                )
            );

            addUniqueIds(
                ids,
                result.ids,
                relative(
                    ROOT,
                    file
                )
            );

            sectionItemCount +=
                result.itemCount;
        }

        assert(
            sectionItemCount ===
            Number(
                section.itemCount
            ),
            `Der Bereich ${section.id} enthält ${sectionItemCount} statt ${section.itemCount} Items.`
        );

        assert(
            sectionItemCount ===
            Number(
                sectionManifest.dataStatus?.itemCount ??
                sectionItemCount
            ),
            `Die Item-Anzahl im Manifest von ${section.id} stimmt nicht.`
        );

        idsBySection.set(
            section.id,
            sectionIds
        );

        itemCount +=
            sectionItemCount;
    }

    const missionIds =
        idsBySection.get(
            "missions"
        );

    assert(
        missionIds,
        "Der Missionsbereich fehlt."
    );

    const combinedMissions =
        await readCategoryCollection(
            join(
                baseDirectory,
                "missions/allMissions.json"
            ),
            {
                itemCount:
                    missionIds.size,
                groupCount: 25
            }
        );

    compareIdSets(
        missionIds,
        combinedMissions.ids,
        "allMissions.json enthält nicht dieselben Items wie die Missionsquelldateien."
    );

    const expectedItemCount =
        Number(
            manifest.dataStatus?.itemCount ??
            sections.reduce(
                (
                    sum,
                    section
                ) =>
                    sum +
                    Number(
                        section.itemCount
                    ),
                0
            )
        );

    return {
        ids,
        itemCount,
        expectedItemCount
    };
}


async function readCategoryCollection(
    file,
    declaredEntry = {}
) {
    const data =
        await readJson(
            file
        );

    const groups =
        Array.isArray(
            data.groups
        )
            ? data.groups
            : [];

    const ids =
        [];

    for (const group of groups) {
        const items =
            Array.isArray(
                group.items
            )
                ? group.items
                : [];

        for (const item of items) {
            assert(
                typeof item.id ===
                "string" &&
                item.id.trim(),
                `Ein Item in ${relative(ROOT, file)} besitzt keine gültige ID.`
            );

            ids.push(
                item.id
            );
        }
    }

    const uniqueIds =
        new Set(
            ids
        );

    assert(
        uniqueIds.size ===
        ids.length,
        `Doppelte Item-ID innerhalb von ${relative(ROOT, file)}.`
    );

    if (
        declaredEntry.itemCount !==
        undefined
    ) {
        assert(
            ids.length ===
            Number(
                declaredEntry.itemCount
            ),
            `${relative(ROOT, file)} enthält ${ids.length} statt ${declaredEntry.itemCount} Items.`
        );
    }

    if (
        declaredEntry.groupCount !==
        undefined
    ) {
        assert(
            groups.length ===
            Number(
                declaredEntry.groupCount
            ),
            `${relative(ROOT, file)} enthält ${groups.length} statt ${declaredEntry.groupCount} Gruppen.`
        );
    }

    return {
        ids,
        itemCount:
            ids.length,
        groupCount:
            groups.length
    };
}


function addUniqueIds(
    target,
    ids,
    sourceLabel
) {
    for (const id of ids) {
        assert(
            !target.has(
                id
            ),
            `Die Item-ID ${id} ist in der neuen Struktur mehrfach vorhanden (${sourceLabel}).`
        );

        target.add(
            id
        );
    }
}


function compareIdSets(
    left,
    right,
    message
) {
    if (
        left.size !==
        right.size
    ) {
        throw new Error(
            `${message} Anzahl: ${left.size} / ${right.size}.`
        );
    }

    const missing =
        [
            ...left
        ].filter(
            id =>
                !right.has(
                    id
                )
        );

    const unexpected =
        [
            ...right
        ].filter(
            id =>
                !left.has(
                    id
                )
        );

    if (
        missing.length > 0 ||
        unexpected.length > 0
    ) {
        throw new Error(
            [
                message,
                `Fehlend: ${missing.slice(0, 5).join(", ") || "-"}`,
                `Unerwartet: ${unexpected.slice(0, 5).join(", ") || "-"}`
            ].join(
                "\n"
            )
        );
    }
}


/* =========================================================
   Ordner und Manifeste
   ========================================================= */

async function migrateCommsDirectory() {
    await rm(
        join(
            STAGED_COMMS_DIR,
            "migration-report.json"
        ),
        {
            force: true
        }
    );

    await rm(
        LEGACY_COMMS_DIR,
        {
            recursive: true,
            force: true
        }
    );

    await rename(
        STAGED_COMMS_DIR,
        LEGACY_COMMS_DIR
    );

    console.log(
        "commsV2 wurde zur produktiven comms-Struktur."
    );
}


async function patchCollectiblesManifest() {
    const manifest =
        await readJson(
            COLLECTIBLES_MANIFEST
        );

    const commsEntry =
        manifest.categories?.find(
            entry =>
                entry.id ===
                "comms"
        );

    assert(
        commsEntry,
        "Der Comms-Eintrag im Collectibles-Manifest fehlt."
    );

    commsEntry.file =
        "comms/manifest.json";

    delete commsEntry.legacyFile;

    await writeJson(
        COLLECTIBLES_MANIFEST,
        manifest
    );

    console.log(
        "Collectibles-Manifest wurde aktualisiert."
    );
}


async function patchRegionalDescriptions() {
    const regionManifests = [
        "washington/manifest.json",
        "newYork/manifest.json",
        "brooklyn/manifest.json"
    ];

    for (
        const relativeFile
        of regionManifests
    ) {
        const file =
            join(
                LEGACY_COMMS_DIR,
                relativeFile
            );

        const manifest =
            await readJson(
                file
            );

        manifest.description =
            transformLocalizedValue(
                manifest.description,
                value =>
                    value
                        .replace(
                            /\s*Die Kartenansicht wird in Phase 3 ergänzt\./g,
                            " Die Kartenansicht ist verfügbar."
                        )
                        .replace(
                            /\s*The map view will be added in Phase 3\./g,
                            " The map view is available."
                        )
            );

        await writeJson(
            file,
            manifest
        );
    }

    console.log(
        "Veraltete Phase-3-Beschreibungen wurden entfernt."
    );
}


/* =========================================================
   Comms View
   ========================================================= */

async function patchCommsOverviewView() {
    let source =
        await readFile(
            COMMS_VIEW_FILE,
            "utf8"
        );

    source =
        source.replaceAll(
            "collectibles/commsV2/",
            "collectibles/comms/"
        );

    source =
        removeNamedFunctionWithJsDoc(
            source,
            "renderCommsMapPlaceholder"
        );

    source =
        replaceNamedFunction(
            source,
            "getUiText",
            currentUiTextFunction()
        );

    source =
        source.replace(
            /\n{4,}/g,
            "\n\n\n"
        );

    assert(
        !source.includes(
            "renderCommsMapPlaceholder"
        ),
        "Die alte Karten-Platzhalterfunktion wurde nicht vollständig entfernt."
    );

    assert(
        !source.includes(
            "commsV2"
        ),
        "Die Comms-View enthält weiterhin einen commsV2-Pfad."
    );

    for (
        const obsoleteText
        of [
            "mapPrepared",
            "mapPhaseThree",
            "includedCollections",
            "backToComms",
            "mapView:",
            "listView:",
            "totalProgress:"
        ]
    ) {
        assert(
            !source.includes(
                obsoleteText
            ),
            `Die Comms-View enthält weiterhin den veralteten UI-Text ${obsoleteText}.`
        );
    }

    await writeFile(
        COMMS_VIEW_FILE,
        source,
        "utf8"
    );

    console.log(
        "Toter Phase-2-Code wurde aus commsOverviewView.js entfernt."
    );
}


function currentUiTextFunction() {
    return `function getUiText(language) {
    if (language === "en") {
        return {
            back: "Back",
            overviewDescription:
                "Choose a region or open the mission-only tracking list.",
            containsMap: "Contains a map",
            progress: "Progress"
        };
    }

    return {
        back: "Zurück",
        overviewDescription:
            "Wähle ein Gebiet oder öffne die reine Missions-Tracking-Liste.",
        containsMap: "Enthält eine Karte",
        progress: "Fortschritt"
    };
}`;
}


/* =========================================================
   CSS-Konsolidierung
   ========================================================= */

async function consolidateTrackerCss() {
    let source =
        await readFile(
            TRACKER_CSS_FILE,
            "utf8"
        );

    const beforeLines =
        countLines(
            source
        );

    for (
        const [
            start,
            end
        ]
        of [
            [
                "/* === COMMS BREADCRUMB BANNER START === */",
                "/* === COMMS BREADCRUMB BANNER END === */"
            ],
            [
                "/* === COMMS MAP BANNER ALIGNMENT FIX START === */",
                "/* === COMMS MAP BANNER ALIGNMENT FIX END === */"
            ],
            [
                "/* === UNIVERSAL PAGE BREADCRUMB BANNERS START === */",
                "/* === UNIVERSAL PAGE BREADCRUMB BANNERS END === */"
            ],
            [
                "/* === MERGED NAVIGATION BANNER START === */",
                "/* === MERGED NAVIGATION BANNER END === */"
            ],
            [
                "/* === COMMS OVERVIEW POLISH START === */",
                "/* === COMMS OVERVIEW POLISH END === */"
            ],
            [
                "/* === COMMS CATEGORY BANNER CONSISTENCY START === */",
                "/* === COMMS CATEGORY BANNER CONSISTENCY END === */"
            ]
        ]
    ) {
        source =
            removeMarkedBlock(
                source,
                start,
                end
            );
    }

    source =
        replaceCommsOverviewCss(
            source
        );

    source =
        replaceCommsMapDesignCss(
            source
        );

    source =
        removeObsoleteCompactMapControls(
            source
        );

    source =
        source
            .replaceAll(
                "/* === NAVIGATION BANNER POLISH START === */",
                "/* === NAVIGATION BANNER START === */"
            )
            .replaceAll(
                "/* === NAVIGATION BANNER POLISH END === */",
                "/* === NAVIGATION BANNER END === */"
            )
            .replaceAll(
                "/* === CATEGORY CONTROLS BANNER START === */",
                "/* === CATEGORY CONTROLS START === */"
            )
            .replaceAll(
                "/* === CATEGORY CONTROLS BANNER END === */",
                "/* === CATEGORY CONTROLS END === */"
            )
            .replaceAll(
                "/* === COMMS MAP CONTROLS REFINEMENT START === */",
                "/* === COMMS MAP LIST CONTROLS START === */"
            )
            .replaceAll(
                "/* === COMMS MAP CONTROLS REFINEMENT END === */",
                "/* === COMMS MAP LIST CONTROLS END === */"
            )
            .replaceAll(
                "/* === MANIFEST PROGRESS BANNER START === */",
                "/* === MANIFEST PROGRESS START === */"
            )
            .replaceAll(
                "/* === MANIFEST PROGRESS BANNER END === */",
                "/* === MANIFEST PROGRESS END === */"
            )
            .replaceAll(
                "/* === COMMS PHASE 5 VIEWPORT HEIGHT START === */",
                "/* === COMMS MAP VIEWPORT HEIGHT START === */"
            )
            .replaceAll(
                "/* === COMMS PHASE 5 VIEWPORT HEIGHT END === */",
                "/* === COMMS MAP VIEWPORT HEIGHT END === */"
            )
            .replaceAll(
                "/* BEGIN COMMS PHASE 3 */",
                "/* === COMMS MAP VIEW START === */"
            )
            .replaceAll(
                "/* END COMMS PHASE 3 */",
                "/* === COMMS MAP VIEW END === */"
            )
            .replace(
                /Comms Phase 3 – Kartenansicht mit Tracking-Panel/g,
                "Comms-Kartenansicht mit Tracking-Panel"
            )
            .replace(
                /Comms Phase 5 – vertikale Viewport-Begrenzung/g,
                "Comms-Karte – vertikale Viewport-Begrenzung"
            );

    source =
        source
            .replace(
                /\n{4,}/g,
                "\n\n\n"
            )
            .trimEnd() +
            "\n";

    validateBalancedCss(
        source
    );

    const obsoleteMarkers = [
        "COMMS BREADCRUMB BANNER",
        "COMMS MAP BANNER ALIGNMENT FIX",
        "UNIVERSAL PAGE BREADCRUMB BANNERS",
        "MERGED NAVIGATION BANNER",
        "COMMS OVERVIEW POLISH",
        "Comms-Kartenansicht – kompakter Bedienbereich",
        ".comms-map-placeholder",
        ".comms-source-summary",
        ".comms-source-item",
        ".comms-section-eyebrow",
        ".comms-view-badge"
    ];

    for (
        const marker
        of obsoleteMarkers
    ) {
        assert(
            !source.includes(
                marker
            ),
            `tracker.css enthält weiterhin die Altlast ${marker}.`
        );
    }

    await writeFile(
        TRACKER_CSS_FILE,
        source,
        "utf8"
    );

    console.log(
        `tracker.css wurde von ${beforeLines} auf ${countLines(source)} Zeilen konsolidiert.`
    );
}


function replaceCommsOverviewCss(
    source
) {
    const pattern =
        /\/\* =========================================================\r?\n\s*Comms Phase 2\r?\n\s*========================================================= \*\/[\s\S]*?(?=\/\* (?:BEGIN COMMS PHASE 3|=== COMMS MAP VIEW START ===) \*\/)/;

    assert(
        pattern.test(
            source
        ),
        "Der bisherige Comms-Phase-2-CSS-Bereich wurde nicht gefunden."
    );

    return source.replace(
        pattern,
        `${currentCommsOverviewCss()}\n\n`
    );
}


function currentCommsOverviewCss() {
    return `/* === COMMS OVERVIEW START === */
/* =========================================================
   Comms-Übersicht
   ========================================================= */

.comms-overview-page {
    width: 100%;
}

.comms-toolbar {
    align-items: center;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
}

.comms-section-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns:
        repeat(
            2,
            minmax(0, 1fr)
        );
    margin-top: 1.5rem;
}

.comms-section-card {
    background:
        linear-gradient(
            145deg,
            rgb(255 255 255 / 5.5%),
            rgb(255 255 255 / 1.5%)
        );

    border:
        1px
        solid
        rgb(255 255 255 / 11%);

    border-radius: 0.9rem;

    color: inherit;

    display: flex;
    flex-direction: column;

    gap: 0.85rem;

    min-height: 16rem;

    padding: 1.25rem;

    text-decoration: none;

    transition:
        background-color 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease,
        transform 160ms ease;
}

.comms-section-card:hover,
.comms-section-card:focus-visible {
    background: #273449;
    border-color: #60a5fa;

    transform:
        translateY(
            -4px
        );

    box-shadow:
        0 8px 20px
        rgb(0 0 0 / 25%);
}

.comms-section-card:focus-visible {
    outline:
        2px
        solid
        #60a5fa;

    outline-offset: 3px;
}

.comms-section-card-top {
    display: flex;
    align-items: center;
    justify-content: flex-start;

    gap: 0.65rem;

    min-width: 0;
    min-height: 2rem;
}

.comms-section-card-top h3 {
    min-width: 0;
    margin: 0;
}

.comms-section-card-arrow {
    flex-shrink: 0;

    margin-left: auto;

    font-size: 1.35rem;
    opacity: 0.7;

    transition:
        color 160ms ease,
        transform 160ms ease;
}

.comms-section-card:hover
.comms-section-card-arrow,

.comms-section-card:focus-visible
.comms-section-card-arrow {
    color: #93c5fd;

    transform:
        translateX(
            0.25rem
        );
}

.comms-section-card h3 {
    font-size:
        clamp(
            1.25rem,
            2vw,
            1.65rem
        );
}

.comms-section-card > p {
    line-height: 1.55;
    margin: 0;
}

.comms-section-card-counts {
    margin-top: auto !important;

    font-size: 0.9rem;
    opacity: 0.7;
}

.comms-section-card-progress {
    display: grid;
    gap: 0.5rem;
}

.comms-section-card-progress[hidden],
.comms-overview-progress[hidden] {
    display: none !important;
}

.comms-section-card-progress
> div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.comms-overview-progress {
    flex-shrink: 0;

    min-width: max-content;

    font-variant-numeric:
        tabular-nums;

    text-align: center;
}

.comms-map-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    flex:
        0
        0
        1.75rem;

    width: 1.75rem;
    height: 1.75rem;

    color: #ffb45c;
    background:
        rgb(255 136 0 / 12%);

    border:
        1px
        solid
        rgb(255 136 0 / 34%);

    border-radius: 50%;

    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1;
}

@media (max-width: 780px) {
    .comms-section-grid {
        grid-template-columns: 1fr;
    }

    .comms-section-card {
        min-height: 13rem;
    }

    .comms-toolbar {
        align-items: stretch;
        flex-direction: column;
    }
}
/* === COMMS OVERVIEW END === */`;
}


function replaceCommsMapDesignCss(
    source
) {
    const start =
        "/* === COMMS PHASE 5 DESIGN START === */";

    const end =
        "/* === COMMS PHASE 5 DESIGN END === */";

    if (
        !source.includes(
            start
        )
    ) {
        return source;
    }

    return replaceMarkedBlock(
        source,
        start,
        end,
        currentCommsMapDesignCss()
    );
}


function currentCommsMapDesignCss() {
    return `/* === COMMS MAP LAYOUT DESIGN START === */
/* =========================================================
   Comms-Karte – Breiten- und Höhenlayout
   ========================================================= */

.game-page.comms-map-page {
    max-width: none;

    margin-right: 0;
    margin-left: 0;

    padding-right:
        clamp(
            1rem,
            1.5vw,
            2.5rem
        );

    padding-left:
        clamp(
            1rem,
            1.5vw,
            2.5rem
        );
}

.comms-map-layout {
    min-height:
        clamp(
            40rem,
            calc(100dvh - 14rem),
            72rem
        );
}

@media (min-width: 1500px) {
    .game-page.comms-map-page {
        padding-right:
            clamp(
                1.25rem,
                2vw,
                3rem
            );

        padding-left:
            clamp(
                1.25rem,
                2vw,
                3rem
            );
    }
}

@media (max-width: 900px) {
    .game-page.comms-map-page {
        padding-right: 1rem;
        padding-left: 1rem;
    }
}
/* === COMMS MAP LAYOUT DESIGN END === */`;
}


function removeObsoleteCompactMapControls(
    source
) {
    const startNeedle =
        "/* =========================================================\n   Comms-Kartenansicht – kompakter Bedienbereich";

    const normalizedSource =
        source.replaceAll(
            "\r\n",
            "\n"
        );

    const startIndex =
        normalizedSource.indexOf(
            startNeedle
        );

    if (
        startIndex === -1
    ) {
        return source;
    }

    const endNeedle =
        "/* === COMMS MAP CONTROLS REFINEMENT START === */";

    const endIndex =
        normalizedSource.indexOf(
            endNeedle,
            startIndex
        );

    assert(
        endIndex !== -1,
        "Das Ende des veralteten kompakten Karten-Control-Blocks fehlt."
    );

    const cleaned =
        normalizedSource.slice(
            0,
            startIndex
        ).trimEnd() +
        "\n\n" +
        normalizedSource.slice(
            endIndex
        ).trimStart();

    return cleaned;
}


function removeMarkedBlock(
    source,
    start,
    end
) {
    if (
        !source.includes(
            start
        )
    ) {
        return source;
    }

    const pattern =
        new RegExp(
            `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\s*`,
            "m"
        );

    assert(
        pattern.test(
            source
        ),
        `Der CSS-Block ${start} besitzt kein gültiges Ende.`
    );

    return source.replace(
        pattern,
        ""
    );
}


function replaceMarkedBlock(
    source,
    start,
    end,
    replacement
) {
    const pattern =
        new RegExp(
            `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`,
            "m"
        );

    assert(
        pattern.test(
            source
        ),
        `Der CSS-Block ${start} wurde nicht gefunden.`
    );

    return source.replace(
        pattern,
        replacement
    );
}


function validateBalancedCss(
    source
) {
    let depth = 0;
    let state = "code";
    let escaped = false;

    for (
        let index = 0;
        index < source.length;
        index += 1
    ) {
        const current =
            source[index];

        const next =
            source[index + 1];

        if (
            state === "single" ||
            state === "double"
        ) {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (
                current === "\\"
            ) {
                escaped = true;
                continue;
            }

            if (
                (
                    state === "single" &&
                    current === "'"
                ) ||
                (
                    state === "double" &&
                    current === '"'
                )
            ) {
                state = "code";
            }

            continue;
        }

        if (
            state === "comment"
        ) {
            if (
                current === "*" &&
                next === "/"
            ) {
                state = "code";
                index += 1;
            }

            continue;
        }

        if (
            current === "/" &&
            next === "*"
        ) {
            state = "comment";
            index += 1;
            continue;
        }

        if (
            current === "'"
        ) {
            state = "single";
            continue;
        }

        if (
            current === '"'
        ) {
            state = "double";
            continue;
        }

        if (
            current === "{"
        ) {
            depth += 1;
        }
        else if (
            current === "}"
        ) {
            depth -= 1;

            assert(
                depth >= 0,
                "tracker.css enthält eine unerwartete schließende Klammer."
            );
        }
    }

    assert(
        state === "code",
        "tracker.css enthält einen nicht geschlossenen String oder Kommentar."
    );

    assert(
        depth === 0,
        `tracker.css enthält ${depth} nicht geschlossene CSS-Blöcke.`
    );
}


/* =========================================================
   Abschlussprüfung
   ========================================================= */

async function validateProductionState() {
    await assertExists(
        join(
            LEGACY_COMMS_DIR,
            "manifest.json"
        ),
        "Das produktive Comms-Manifest fehlt nach dem Umbenennen."
    );

    assert(
        !(await exists(
            STAGED_COMMS_DIR
        )),
        "Der Ordner commsV2 existiert nach dem Cleanup weiterhin."
    );

    assert(
        !(await exists(
            join(
                LEGACY_COMMS_DIR,
                "migration-report.json"
            )
        )),
        "migration-report.json wurde nicht entfernt."
    );

    const rootManifest =
        await readJson(
            COLLECTIBLES_MANIFEST
        );

    const commsEntry =
        rootManifest.categories?.find(
            entry =>
                entry.id ===
                "comms"
        );

    assert(
        commsEntry?.file ===
        "comms/manifest.json",
        "Der produktive Comms-Pfad im Collectibles-Manifest ist falsch."
    );

    assert(
        !Object.prototype.hasOwnProperty.call(
            commsEntry,
            "legacyFile"
        ),
        "legacyFile ist weiterhin im Collectibles-Manifest vorhanden."
    );

    const commsView =
        await readFile(
            COMMS_VIEW_FILE,
            "utf8"
        );

    assert(
        commsView.includes(
            '"collectibles/comms/manifest.json"'
        ),
        "Die Comms-View verwendet nicht den produktiven Manifestpfad."
    );

    assert(
        !commsView.includes(
            "renderCommsMapPlaceholder"
        ),
        "Die alte Karten-Platzhalterfunktion ist weiterhin vorhanden."
    );

    const css =
        await readFile(
            TRACKER_CSS_FILE,
            "utf8"
        );

    validateBalancedCss(
        css
    );
}


/* =========================================================
   JavaScript-Funktionsbearbeitung
   ========================================================= */

function removeNamedFunctionWithJsDoc(
    source,
    functionName
) {
    const range =
        findFunctionRange(
            source,
            functionName
        );

    let start =
        range.start;

    const jsDocStart =
        source.lastIndexOf(
            "/**",
            start
        );

    const jsDocEnd =
        source.indexOf(
            "*/",
            jsDocStart
        );

    if (
        jsDocStart !== -1 &&
        jsDocEnd !== -1 &&
        jsDocEnd < start &&
        source.slice(
            jsDocEnd + 2,
            start
        ).trim() === ""
    ) {
        start =
            jsDocStart;
    }

    return (
        source.slice(
            0,
            start
        ).trimEnd() +
        "\n\n" +
        source.slice(
            range.end
        ).trimStart()
    );
}


function replaceNamedFunction(
    source,
    functionName,
    replacement
) {
    const range =
        findFunctionRange(
            source,
            functionName
        );

    return (
        source.slice(
            0,
            range.start
        ) +
        replacement.trimEnd() +
        "\n\n" +
        source.slice(
            range.end
        ).trimStart()
    );
}


function findFunctionRange(
    source,
    functionName
) {
    const declarationPattern =
        new RegExp(
            `(?:export\\s+)?(?:async\\s+)?function\\s+${escapeRegExp(functionName)}\\s*\\(`
        );

    const match =
        declarationPattern.exec(
            source
        );

    assert(
        match,
        `Die Funktion ${functionName}() wurde nicht gefunden.`
    );

    const start =
        match.index;

    const openingBrace =
        source.indexOf(
            "{",
            start
        );

    assert(
        openingBrace !== -1,
        `Die öffnende Klammer von ${functionName}() fehlt.`
    );

    const closingBrace =
        findMatchingClosingBrace(
            source,
            openingBrace
        );

    let end =
        closingBrace + 1;

    while (
        end < source.length &&
        (
            source[end] === "\r" ||
            source[end] === "\n"
        )
    ) {
        end += 1;
    }

    return {
        start,
        end
    };
}


function findMatchingClosingBrace(
    source,
    openingBrace
) {
    let depth = 0;
    let state = "code";
    let escaped = false;

    for (
        let index = openingBrace;
        index < source.length;
        index += 1
    ) {
        const current =
            source[index];

        const next =
            source[index + 1];

        if (
            state === "single" ||
            state === "double" ||
            state === "template"
        ) {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (
                current === "\\"
            ) {
                escaped = true;
                continue;
            }

            if (
                (
                    state === "single" &&
                    current === "'"
                ) ||
                (
                    state === "double" &&
                    current === '"'
                ) ||
                (
                    state === "template" &&
                    current === "`"
                )
            ) {
                state = "code";
            }

            continue;
        }

        if (
            state === "line-comment"
        ) {
            if (
                current === "\n"
            ) {
                state = "code";
            }

            continue;
        }

        if (
            state === "block-comment"
        ) {
            if (
                current === "*" &&
                next === "/"
            ) {
                state = "code";
                index += 1;
            }

            continue;
        }

        if (
            current === "'"
        ) {
            state = "single";
            continue;
        }

        if (
            current === '"'
        ) {
            state = "double";
            continue;
        }

        if (
            current === "`"
        ) {
            state = "template";
            continue;
        }

        if (
            current === "/" &&
            next === "/"
        ) {
            state = "line-comment";
            index += 1;
            continue;
        }

        if (
            current === "/" &&
            next === "*"
        ) {
            state = "block-comment";
            index += 1;
            continue;
        }

        if (
            current === "{"
        ) {
            depth += 1;
        }
        else if (
            current === "}"
        ) {
            depth -= 1;

            if (
                depth === 0
            ) {
                return index;
            }
        }
    }

    throw new Error(
        "Eine JavaScript-Funktion besitzt keine passende schließende Klammer."
    );
}


/* =========================================================
   Allgemeine Hilfsfunktionen
   ========================================================= */

async function readJson(
    file
) {
    return JSON.parse(
        await readFile(
            file,
            "utf8"
        )
    );
}


async function writeJson(
    file,
    value
) {
    await writeFile(
        file,
        `${JSON.stringify(
            value,
            null,
            2
        )}\n`,
        "utf8"
    );
}


function transformLocalizedValue(
    value,
    transformer
) {
    if (
        typeof value ===
        "string"
    ) {
        return transformer(
            value
        );
    }

    if (
        value &&
        typeof value ===
        "object"
    ) {
        return Object.fromEntries(
            Object.entries(
                value
            ).map(
                (
                    [
                        key,
                        entry
                    ]
                ) => [
                    key,
                    typeof entry ===
                    "string"
                        ? transformer(
                            entry
                        )
                        : entry
                ]
            )
        );
    }

    return value;
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


function countLines(
    value
) {
    return value.split(
        /\r?\n/
    ).length;
}
