#!/usr/bin/env node

/* =========================================================
   Personal Game Tracker
   Apply The Division 2 Comms Phase 2
   ========================================================= */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";


const SCRIPT_FILE = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY = path.dirname(SCRIPT_FILE);
const TEMPLATE_DIRECTORY = path.join(
    SCRIPT_DIRECTORY,
    "phase2-files"
);
const REPOSITORY_ROOT = process.cwd();

const ROUTER_FILE = "assets/js/router.js";
const CATEGORY_VIEW_FILE =
    "assets/js/views/categoryView.js";
const COMMS_VIEW_FILE =
    "assets/js/views/commsOverviewView.js";
const TRACKER_CSS_FILE = "assets/css/tracker.css";

const COLLECTIBLES_MANIFEST_FILE =
    "data/theDivision2/collectibles/manifest.json";
const COMMS_MANIFEST_FILE =
    "data/theDivision2/collectibles/commsV2/manifest.json";

const CSS_MARKER = "Comms Phase 2";
const ROUTER_IMPORT_MARKER = "tryRenderCommsRoute";
const ROUTER_CALL_MARKER =
    "const commsRouteHandled =";
const PROGRESS_ID_MARKER =
    "item.progressCategoryId";

const SECTION_DESCRIPTIONS = {
    washington: {
        de: "Comms der offenen Welt in Washington, D.C. Die Kartenansicht wird in Phase 3 ergänzt.",
        en: "Open-world Comms in Washington, D.C. The map view will be added in Phase 3."
    },
    newYork: {
        de: "Comms der offenen Welt in Lower Manhattan. Die Kartenansicht wird in Phase 3 ergänzt.",
        en: "Open-world Comms in Lower Manhattan. The map view will be added in Phase 3."
    },
    brooklyn: {
        de: "Comms der offenen Welt in Brooklyn. Die Kartenansicht wird in Phase 3 ergänzt.",
        en: "Open-world Comms in Brooklyn. The map view will be added in Phase 3."
    },
    missions: {
        de: "Missions- und aktivitätsgebundene Comms in einer gemeinsamen Tracking-Liste.",
        en: "Mission- and activity-bound Comms in one combined tracking list."
    }
};


await main();


async function main() {
    console.log("Comms Phase 2 wird angewendet ...");

    await assertRepositoryStructure();
    await installCommsView();
    await appendCommsStyles();
    await patchRouter();
    await patchCategoryProgressId();

    const commsManifest = await updateCommsManifests();
    const missionResult = await createCombinedMissionFile(
        commsManifest
    );

    await activateCommsV2();
    await verifyResult(
        commsManifest,
        missionResult
    );

    console.log("");
    console.log("Comms Phase 2 wurde erfolgreich angewendet.");
    console.log(
        `Missionsliste: ${missionResult.itemCount} Items in ` +
        `${missionResult.groupCount} Gruppen.`
    );
    console.log(
        "Die drei Kartenbereiche sind als vorbereitete " +
        "Zielseiten verfügbar."
    );
}


/**
 * Prüft, ob das Skript im Repository-Hauptverzeichnis läuft.
 */
async function assertRepositoryStructure() {
    const requiredFiles = [
        ROUTER_FILE,
        CATEGORY_VIEW_FILE,
        TRACKER_CSS_FILE,
        COLLECTIBLES_MANIFEST_FILE,
        COMMS_MANIFEST_FILE,
        path.join(
            "data/theDivision2/collectibles/commsV2",
            "missions/manifest.json"
        ),
        path.join(
            TEMPLATE_DIRECTORY,
            "commsOverviewView.js"
        ),
        path.join(
            TEMPLATE_DIRECTORY,
            "comms-phase2.css"
        )
    ];

    const missing = [];

    for (const file of requiredFiles) {
        const absoluteFile = path.isAbsolute(file)
            ? file
            : repositoryPath(file);

        if (!(await exists(absoluteFile))) {
            missing.push(file);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            "Notwendige Dateien fehlen:\n- " +
            missing.join("\n- ") +
            "\n\nDas Skript muss im Hauptverzeichnis " +
            "des PersonalGameTracker-Repositories laufen."
        );
    }
}


/**
 * Kopiert die neue View in das Projekt.
 */
async function installCommsView() {
    const source = path.join(
        TEMPLATE_DIRECTORY,
        "commsOverviewView.js"
    );

    const target = repositoryPath(COMMS_VIEW_FILE);

    await fs.mkdir(path.dirname(target), {
        recursive: true
    });

    await fs.copyFile(source, target);

    console.log(`✓ ${COMMS_VIEW_FILE} installiert`);
}


/**
 * Ergänzt die Phase-2-Styles idempotent.
 */
async function appendCommsStyles() {
    const target = repositoryPath(TRACKER_CSS_FILE);
    const currentCss = await fs.readFile(
        target,
        "utf8"
    );

    if (currentCss.includes(CSS_MARKER)) {
        console.log("✓ Comms-Styles bereits vorhanden");
        return;
    }

    const additionalCss = await fs.readFile(
        path.join(
            TEMPLATE_DIRECTORY,
            "comms-phase2.css"
        ),
        "utf8"
    );

    const nextCss =
        currentCss.trimEnd() +
        "\n\n\n" +
        additionalCss.trim() +
        "\n";

    await fs.writeFile(target, nextCss, "utf8");

    console.log(`✓ ${TRACKER_CSS_FILE} erweitert`);
}


/**
 * Ergänzt den spezialisierten Comms-Routenhandler.
 */
async function patchRouter() {
    const target = repositoryPath(ROUTER_FILE);
    let source = await fs.readFile(target, "utf8");

    if (!source.includes(ROUTER_IMPORT_MARKER)) {
        const categoryImportPattern =
            /import\s*\{\s*renderCategory\s*\}\s*from\s*["']\.\/views\/categoryView\.js["'];/;

        const categoryImport = source.match(
            categoryImportPattern
        );

        if (!categoryImport) {
            throw new Error(
                "Der renderCategory-Import in router.js " +
                "konnte nicht gefunden werden."
            );
        }

        const commsImport = [
            "import {",
            "    tryRenderCommsRoute",
            "} from \"./views/commsOverviewView.js\";"
        ].join("\n");

        source = source.replace(
            categoryImportPattern,
            `${categoryImport[0]}\n\n${commsImport}`
        );
    }

    if (!source.includes(ROUTER_CALL_MARKER)) {
        const resolverPattern =
            /^([ \t]*)const resolvedRoute\s*=\s*\n[ \t]*await resolveGameRoute\(/m;

        const resolverMatch = source.match(
            resolverPattern
        );

        if (!resolverMatch) {
            throw new Error(
                "Der Aufruf von resolveGameRoute in " +
                "router.js konnte nicht gefunden werden."
            );
        }

        const indentation = resolverMatch[1];

        const routeBlock = [
            `${indentation}const commsRouteHandled =`,
            `${indentation}    await tryRenderCommsRoute(`,
            `${indentation}        game,`,
            `${indentation}        categoryRoute`,
            `${indentation}    );`,
            "",
            `${indentation}if (commsRouteHandled) {`,
            `${indentation}    return;`,
            `${indentation}}`,
            "",
            `${indentation}const resolvedRoute =`,
            `${indentation}    await resolveGameRoute(`
        ].join("\n");

        source = source.replace(
            resolverPattern,
            routeBlock
        );
    }

    await fs.writeFile(target, source, "utf8");

    console.log(`✓ ${ROUTER_FILE} erweitert`);
}


/**
 * Sorgt dafür, dass Items aus der kombinierten Missionsdatei
 * weiterhin ihre ursprüngliche Supabase-category_id verwenden.
 */
async function patchCategoryProgressId() {
    const target = repositoryPath(CATEGORY_VIEW_FILE);
    let source = await fs.readFile(target, "utf8");

    if (source.includes(PROGRESS_ID_MARKER)) {
        console.log(
            "✓ Fortschritts-Kompatibilität bereits vorhanden"
        );
        return;
    }

    const progressCallPattern =
        /await\s+setItemCompleted\(\s*gameId,\s*categoryId,\s*item,/;

    const match = source.match(progressCallPattern);

    if (!match) {
        throw new Error(
            "Der Aufruf von setItemCompleted in " +
            "categoryView.js konnte nicht gefunden werden."
        );
    }

    const replacement = [
        "await setItemCompleted(",
        "                    gameId,",
        "                    (",
        "                        typeof item.progressCategoryId === \"string\" &&",
        "                        item.progressCategoryId.trim() !== \"\"",
        "                            ? item.progressCategoryId",
        "                            : categoryId",
        "                    ),",
        "                    item,"
    ].join("\n");

    source = source.replace(
        progressCallPattern,
        replacement
    );

    await fs.writeFile(target, source, "utf8");

    console.log(
        `✓ ${CATEGORY_VIEW_FILE} für alte Fortschritts-IDs erweitert`
    );
}


/**
 * Ergänzt die V2-Manifeste um Beschreibungen und generische
 * categories-Felder. Die ursprünglichen sections/files-Felder
 * bleiben erhalten.
 *
 * @returns {Promise<object>}
 */
async function updateCommsManifests() {
    const topManifest = await readJson(
        COMMS_MANIFEST_FILE
    );

    if (!Array.isArray(topManifest.sections)) {
        throw new Error(
            "commsV2/manifest.json enthält kein sections-Array."
        );
    }

    const expectedSectionIds = [
        "washington",
        "newYork",
        "brooklyn",
        "missions"
    ];

    for (const sectionId of expectedSectionIds) {
        if (!topManifest.sections.some(
            (section) => section.id === sectionId
        )) {
            throw new Error(
                `Comms-Bereich fehlt: ${sectionId}`
            );
        }
    }

    topManifest.description = {
        de: "Comms nach Washington, New York, Brooklyn und Missionen geordnet.",
        en: "Comms organized by Washington, New York, Brooklyn and missions."
    };

    for (const section of topManifest.sections) {
        section.description =
            SECTION_DESCRIPTIONS[section.id] ??
            section.description;

        const sectionManifestFile = resolveDataFile(
            COMMS_MANIFEST_FILE,
            section.manifest
        );

        const sectionManifest = await readJson(
            sectionManifestFile
        );

        if (!Array.isArray(sectionManifest.files)) {
            throw new Error(
                `${sectionManifestFile} enthält kein files-Array.`
            );
        }

        sectionManifest.description =
            section.description;

        sectionManifest.categories =
            sectionManifest.files.map((file) => ({
                id: file.id,
                name: file.name,
                description: file.description ?? {
                    de: `${Number(file.itemCount) || 0} Comms in dieser Sammlung.`,
                    en: `${Number(file.itemCount) || 0} Comms in this collection.`
                },
                type: "category",
                file: file.file,
                itemCount: Number(file.itemCount) || 0,
                groupCount: Number(file.groupCount) || 0
            }));

        await writeJson(
            sectionManifestFile,
            sectionManifest
        );
    }

    topManifest.categories =
        topManifest.sections.map((section) => {
            const isMissionList =
                section.id === "missions" ||
                section.view === "list";

            return {
                id: section.id,
                name: section.name,
                description: section.description,
                type: isMissionList
                    ? "category"
                    : "manifest",
                file: isMissionList
                    ? "missions/allMissions.json"
                    : section.manifest,
                view: section.view,
                map: section.map,
                itemCount: Number(section.itemCount) || 0,
                groupCount: Number(section.groupCount) || 0
            };
        });

    await writeJson(
        COMMS_MANIFEST_FILE,
        topManifest
    );

    console.log("✓ Comms-V2-Manifeste kompatibel erweitert");

    return topManifest;
}


/**
 * Erzeugt eine gemeinsame Missionsdatei. Jedes Item erhält
 * progressCategoryId mit der ursprünglichen Datei-ID.
 *
 * @param {object} commsManifest
 * @returns {Promise<object>}
 */
async function createCombinedMissionFile(
    commsManifest
) {
    const missionSection = commsManifest.sections.find(
        (section) => section.id === "missions"
    );

    if (!missionSection) {
        throw new Error("Der Missionsbereich fehlt.");
    }

    const missionManifestFile = resolveDataFile(
        COMMS_MANIFEST_FILE,
        missionSection.manifest
    );

    const missionManifest = await readJson(
        missionManifestFile
    );

    if (!Array.isArray(missionManifest.files)) {
        throw new Error(
            "Das Missionsmanifest enthält kein files-Array."
        );
    }

    const combinedGroups = [];
    const itemIds = new Set();
    let itemCount = 0;

    for (const fileEntry of missionManifest.files) {
        const categoryFile = resolveDataFile(
            missionManifestFile,
            fileEntry.file
        );

        const categoryData = await readJson(categoryFile);
        const groups = Array.isArray(categoryData.groups)
            ? categoryData.groups
            : [];

        for (const group of groups) {
            const items = Array.isArray(group.items)
                ? group.items
                : [];

            const migratedItems = items.map((item) => {
                if (!item.id) {
                    throw new Error(
                        `Item ohne ID in ${categoryFile}`
                    );
                }

                if (itemIds.has(item.id)) {
                    throw new Error(
                        `Doppelte Missions-Item-ID: ${item.id}`
                    );
                }

                itemIds.add(item.id);
                itemCount += 1;

                return {
                    ...item,
                    progressCategoryId: fileEntry.id
                };
            });

            combinedGroups.push({
                ...group,
                sourceCategoryId: fileEntry.id,
                sourceCategoryName: fileEntry.name,
                items: migratedItems
            });
        }
    }

    const expectedItemCount =
        Number(missionSection.itemCount) || 0;

    if (itemCount !== expectedItemCount) {
        throw new Error(
            "Die kombinierte Missionsdatei enthält " +
            `${itemCount} statt ${expectedItemCount} Items.`
        );
    }

    const combinedFile = {
        id: "comms-missions-all",
        name: {
            de: "Missionen",
            en: "Missions"
        },
        description: SECTION_DESCRIPTIONS.missions,
        dataStatus: {
            phase: 2,
            combinedFromFiles:
                missionManifest.files.length,
            itemCount,
            groupCount: combinedGroups.length,
            generatedAt: new Date().toISOString()
        },
        groups: combinedGroups
    };

    const outputFile = resolveDataFile(
        missionManifestFile,
        "allMissions.json"
    );

    await writeJson(outputFile, combinedFile);

    console.log(
        "✓ Gemeinsame Missions-Tracking-Liste erzeugt"
    );

    return {
        outputFile,
        itemCount,
        groupCount: combinedGroups.length,
        itemIds
    };
}


/**
 * Aktiviert commsV2 im Collectibles-Manifest.
 */
async function activateCommsV2() {
    const manifest = await readJson(
        COLLECTIBLES_MANIFEST_FILE
    );

    if (!Array.isArray(manifest.categories)) {
        throw new Error(
            "Das Collectibles-Manifest enthält kein " +
            "categories-Array."
        );
    }

    const commsEntry = manifest.categories.find(
        (category) => category.id === "comms"
    );

    if (!commsEntry) {
        throw new Error(
            "Der Comms-Eintrag im Collectibles-Manifest fehlt."
        );
    }

    if (!commsEntry.legacyFile) {
        commsEntry.legacyFile = commsEntry.file;
    }

    commsEntry.type = "manifest";
    commsEntry.file = "commsV2/manifest.json";

    await writeJson(
        COLLECTIBLES_MANIFEST_FILE,
        manifest
    );

    console.log("✓ commsV2 im Collectibles-Manifest aktiviert");
}


/**
 * Abschließende Konsistenzprüfung.
 *
 * @param {object} commsManifest
 * @param {object} missionResult
 */
async function verifyResult(
    commsManifest,
    missionResult
) {
    const router = await fs.readFile(
        repositoryPath(ROUTER_FILE),
        "utf8"
    );

    const categoryView = await fs.readFile(
        repositoryPath(CATEGORY_VIEW_FILE),
        "utf8"
    );

    const commsView = await fs.readFile(
        repositoryPath(COMMS_VIEW_FILE),
        "utf8"
    );

    const css = await fs.readFile(
        repositoryPath(TRACKER_CSS_FILE),
        "utf8"
    );

    if (
        !router.includes(ROUTER_IMPORT_MARKER) ||
        !router.includes(ROUTER_CALL_MARKER)
    ) {
        throw new Error(
            "Die Comms-Route wurde nicht vollständig eingebunden."
        );
    }

    if (!categoryView.includes(PROGRESS_ID_MARKER)) {
        throw new Error(
            "Die Fortschritts-ID-Kompatibilität fehlt."
        );
    }

    if (!commsView.includes("renderCommsOverview")) {
        throw new Error(
            "Die neue Comms-View ist unvollständig."
        );
    }

    if (!css.includes(CSS_MARKER)) {
        throw new Error(
            "Die Comms-Styles fehlen."
        );
    }

    if (
        !Array.isArray(commsManifest.categories) ||
        commsManifest.categories.length !== 4
    ) {
        throw new Error(
            "Das Comms-Manifest besitzt nicht vier " +
            "Kompatibilitätskategorien."
        );
    }

    const combinedFile = await readJson(
        relativeRepositoryFile(missionResult.outputFile)
    );

    const combinedItems = collectItems(combinedFile);

    if (combinedItems.length !== missionResult.itemCount) {
        throw new Error(
            "Die Missionsdatei konnte nicht vollständig " +
            "verifiziert werden."
        );
    }

    if (combinedItems.some(
        (item) => !item.progressCategoryId
    )) {
        throw new Error(
            "Mindestens einem Missions-Item fehlt " +
            "progressCategoryId."
        );
    }

    const activeManifest = await readJson(
        COLLECTIBLES_MANIFEST_FILE
    );

    const activeComms = activeManifest.categories.find(
        (category) => category.id === "comms"
    );

    if (
        !activeComms ||
        activeComms.file !== "commsV2/manifest.json"
    ) {
        throw new Error(
            "commsV2 wurde nicht erfolgreich aktiviert."
        );
    }

    console.log("✓ Abschlussprüfung erfolgreich");
}


/**
 * Liest eine JSON-Datei relativ zum Repository.
 *
 * @param {string} relativeFile
 * @returns {Promise<object>}
 */
async function readJson(relativeFile) {
    const content = await fs.readFile(
        repositoryPath(relativeFile),
        "utf8"
    );

    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(
            `Ungültiges JSON in ${relativeFile}: ` +
            error.message
        );
    }
}


/**
 * Schreibt eine JSON-Datei formatiert.
 *
 * @param {string} relativeFile
 * @param {object} data
 */
async function writeJson(relativeFile, data) {
    const target = repositoryPath(relativeFile);

    await fs.mkdir(path.dirname(target), {
        recursive: true
    });

    await fs.writeFile(
        target,
        JSON.stringify(data, null, 2) + "\n",
        "utf8"
    );
}


/**
 * Sammelt alle Items aus einer Category-Datei.
 *
 * @param {object} categoryData
 * @returns {object[]}
 */
function collectItems(categoryData) {
    const groups = Array.isArray(categoryData.groups)
        ? categoryData.groups
        : [];

    return groups.flatMap((group) =>
        Array.isArray(group.items)
            ? group.items
            : []
    );
}


/**
 * Löst einen relativen Datenpfad analog zum Frontend auf.
 *
 * @param {string} parentFile
 * @param {string} childFile
 * @returns {string}
 */
function resolveDataFile(parentFile, childFile) {
    const parentDirectory = path.posix.dirname(
        parentFile.replaceAll("\\", "/")
    );

    return path.posix.normalize(
        path.posix.join(
            parentDirectory,
            childFile.replaceAll("\\", "/")
        )
    );
}


/**
 * Erstellt einen absoluten Repository-Pfad.
 *
 * @param {string} relativeFile
 * @returns {string}
 */
function repositoryPath(relativeFile) {
    return path.join(
        REPOSITORY_ROOT,
        ...relativeFile
            .replaceAll("\\", "/")
            .split("/")
    );
}


/**
 * Wandelt einen absoluten Pfad in einen Repository-Pfad um.
 *
 * @param {string} absoluteFile
 * @returns {string}
 */
function relativeRepositoryFile(absoluteFile) {
    return path.relative(
        REPOSITORY_ROOT,
        absoluteFile
    ).replaceAll("\\", "/");
}


/**
 * Prüft, ob eine Datei existiert.
 *
 * @param {string} file
 * @returns {Promise<boolean>}
 */
async function exists(file) {
    try {
        await fs.access(file);
        return true;
    } catch {
        return false;
    }
}
