/* =========================================================
   Personal Game Tracker
   Comms Overview View
   ========================================================= */

import {
    loadCategoryData,
    loadManifest,
    resolveRelativeFile
} from "../services/dataService.js";

import {
    calculateCategoryProgress,
    loadGameProgressData
} from "../services/progressService.js";

import {
    getCurrentLanguage,
    getLocalizedText
} from "../services/languageService.js";

import {
    showLoading
} from "./commonView.js";

import {
    renderCategory
} from "./categoryView.js";

import {
    renderCommsMapView
} from "./commsMapView.js";

import {
    updateActiveGameNavigation
} from "./navigationView.js";


import {
    applyPageBreadcrumbBanner
} from "./pageBreadcrumbView.js";


const COMMS_ROUTE_PREFIX = [
    "collectibles",
    "comms"
];

const COMMS_MANIFEST_FILE =
    "collectibles/commsV2/manifest.json";


/**
 * Übernimmt die speziellen Comms-Routen.
 *
 * Unterstützt:
 *
 * #game/theDivision2/collectibles/comms
 * #game/theDivision2/collectibles/comms/washington
 * #game/theDivision2/collectibles/comms/newYork
 * #game/theDivision2/collectibles/comms/brooklyn
 * #game/theDivision2/collectibles/comms/missions
 *
 * Tiefere Routen werden absichtlich wieder an den generischen
 * Router übergeben.
 *
 * @param {object} game
 * @param {string[]} routeIds
 * @returns {Promise<boolean>}
 */
export async function tryRenderCommsRoute(
    game,
    routeIds
) {
    if (!isCommsRoute(routeIds)) {
        return false;
    }

    const commsManifest = await loadManifest(
        game.id,
        COMMS_MANIFEST_FILE
    );


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
    ];

    if (routeIds.length === 2) {
        await renderCommsOverview(
            game,
            commsManifest,
            routeIds
        );


        applyPageBreadcrumbBanner(
            commsBreadcrumbItems,
            {
                removeDescriptions: true
            }
        );

        return true;
    }

    if (routeIds.length !== 3) {
        return false;
    }

    const sectionId = routeIds[2];

    const section = Array.isArray(
        commsManifest.sections
    )
        ? commsManifest.sections.find(
            (entry) => entry.id === sectionId
        )
        : null;

    if (!section) {
        return false;
    }

    const sectionManifestFile = resolveRelativeFile(
        COMMS_MANIFEST_FILE,
        section.manifest
    );

    const sectionManifest = await loadManifest(
        game.id,
        sectionManifestFile
    );

    if (section.view === "list") {
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
                    "allMissions.json"
                ),
                parentHash: buildGameHash(
                    game.id,
                    routeIds.slice(0, -1)
                )
            }
        );


        applyPageBreadcrumbBanner(
            [
                ...commsBreadcrumbItems,
                section.name
            ],
            {
                removeDescriptions: true
            }
        );

        return true;
    }

    await renderCommsMapView(
        game,
        commsManifest,
        section,
        sectionManifest,
        sectionManifestFile,
        routeIds
    );


    applyPageBreadcrumbBanner(
        [
            ...commsBreadcrumbItems,
            section.name
        ],
        {
            removeDescriptions: true
        }
    );

    return true;
}


/**
 * Rendert die vier Comms-Bereiche.
 *
 * @param {object} game
 * @param {object} commsManifest
 * @param {string[]} routeIds
 */
async function renderCommsOverview(
    game,
    commsManifest,
    routeIds
) {
    showLoading();

   const mainContent = document.getElementById(
       "main-content"
   );

    if (!mainContent) {
        return;
    }

    const language = getCurrentLanguage();
    const uiText = getUiText(language);
    const sections = Array.isArray(commsManifest.sections)
        ? commsManifest.sections
        : [];

    mainContent.replaceChildren();

    const page = document.createElement("section");
    page.className =
        "game-page comms-overview-page";

    page.dataset.gameId = game.id;

    const toolbar = createToolbar(
        buildGameHash(
            game.id,
            routeIds.slice(0, -1)
        ),
        uiText.back
    );

    const header = document.createElement("header");
    header.className = "game-header";

    const title = document.createElement("h2");
    title.className = "game-title";
    title.textContent = getLocalizedText(
        commsManifest.name,
        language
    ) || "Comms";

    const description = document.createElement("p");
    description.className = "game-description";
    description.textContent = getLocalizedText(
        commsManifest.description,
        language
    ) || uiText.overviewDescription;

    header.append(title, description);

    const grid = document.createElement("div");
    grid.className = "comms-section-grid";

    const progressTargets = [];

    for (const section of sections) {
        const card = createSectionCard(
            game,
            section,
            routeIds,
            language,
            uiText
        );

        grid.append(card.element);
        progressTargets.push(card);
    }

    const overallProgress = document.createElement("section");
    overallProgress.className = "comms-overall-progress";
    overallProgress.hidden = true;

    const overallLabel = document.createElement("span");
    overallLabel.textContent = uiText.totalProgress;

    const overallValue = document.createElement("strong");
    overallValue.textContent = "0 / 0";

    const overallTrack = document.createElement("div");
    overallTrack.className = "progress-bar";

    const overallFill = document.createElement("div");
    overallFill.className = "progress-bar-fill";
    overallFill.style.width = "0%";

    overallTrack.append(overallFill);
    overallProgress.append(
        overallLabel,
        overallValue,
        overallTrack
    );

    page.append(
        toolbar,
        header,
        grid,
        overallProgress
    );

    mainContent.append(page);

    updateActiveGameNavigation(game.id);

    const progressData = await loadGameProgressData(
        game.id
    );

    if (!progressData.available) {
        return;
    }

    const results = await Promise.all(
        progressTargets.map(
            async (target) => ({
                target,
                progress: await calculateSectionProgress(
                    game.id,
                    target.section,
                    progressData
                )
            })
        )
    );

    let totalItems = 0;
    let totalCompleted = 0;

    for (const result of results) {
        const {
            target,
            progress
        } = result;

        target.progressElement.hidden = false;
        target.progressText.textContent =
            `${progress.completed} / ${progress.total}`;
        target.progressFill.style.width =
            `${progress.percentage}%`;

        totalItems += progress.total;
        totalCompleted += progress.completed;
    }

    const totalPercentage = totalItems > 0
        ? Math.round(
            (totalCompleted / totalItems) * 100
        )
        : 0;

    overallProgress.hidden = false;
    overallValue.textContent =
        `${totalCompleted} / ${totalItems}`;
    overallFill.style.width =
        `${totalPercentage}%`;
}


/**
 * Rendert für Phase 2 eine vorbereitete Kartenroute.
 * Die eigentliche Karte folgt in Phase 3.
 *
 * @param {object} game
 * @param {object} commsManifest
 * @param {object} section
 * @param {object} sectionManifest
 * @param {string} sectionManifestFile
 * @param {string[]} routeIds
 */
async function renderCommsMapPlaceholder(
    game,
    commsManifest,
    section,
    sectionManifest,
    sectionManifestFile,
    routeIds
) {
    showLoading();

   const mainContent = document.getElementById(
       "main-content"
   );

    if (!mainContent) {
        return;
    }

    const language = getCurrentLanguage();
    const uiText = getUiText(language);
    const files = Array.isArray(sectionManifest.files)
        ? sectionManifest.files
        : [];

    mainContent.replaceChildren();

    const page = document.createElement("section");
    page.className =
        "game-page comms-map-placeholder-page";

    page.dataset.gameId = game.id;
    page.dataset.commsSection = section.id;

    const toolbar = createToolbar(
        buildGameHash(
            game.id,
            routeIds.slice(0, -1)
        ),
        uiText.backToComms
    );

    const progress = document.createElement("div");
    progress.className =
        "category-content-progress comms-section-progress";
    progress.hidden = true;

    const progressText = document.createElement("span");
    progressText.textContent = "0 / 0";

    const progressTrack = document.createElement("div");
    progressTrack.className = "progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "progress-bar-fill";
    progressFill.style.width = "0%";

    progressTrack.append(progressFill);
    progress.append(progressText, progressTrack);
    toolbar.append(progress);

    const header = document.createElement("header");
    header.className = "game-header";

    const eyebrow = document.createElement("p");
    eyebrow.className = "comms-section-eyebrow";
    eyebrow.textContent = getLocalizedText(
        commsManifest.name,
        language
    ) || "Comms";

    const title = document.createElement("h2");
    title.className = "game-title";
    title.textContent = getLocalizedText(
        section.name,
        language
    );

    const description = document.createElement("p");
    description.className = "game-description";
    description.textContent = getLocalizedText(
        section.description ?? sectionManifest.description,
        language
    );

    header.append(eyebrow, title, description);

    const placeholder = document.createElement("section");
    placeholder.className = "comms-map-placeholder";

    const icon = document.createElement("div");
    icon.className = "comms-map-placeholder-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "⌖";

    const placeholderText = document.createElement("div");

    const placeholderTitle = document.createElement("h3");
    placeholderTitle.textContent = uiText.mapPrepared;

    const placeholderDescription =
        document.createElement("p");
    placeholderDescription.textContent =
        uiText.mapPhaseThree;

    placeholderText.append(
        placeholderTitle,
        placeholderDescription
    );

    placeholder.append(icon, placeholderText);

    const summary = document.createElement("section");
    summary.className = "comms-source-summary";

    const summaryHeader = document.createElement("div");
    summaryHeader.className =
        "comms-source-summary-header";

    const summaryTitle = document.createElement("h3");
    summaryTitle.textContent = uiText.includedCollections;

    const summaryCount = document.createElement("span");
    summaryCount.textContent = formatCounts(
        section.itemCount,
        section.groupCount,
        language
    );

    summaryHeader.append(summaryTitle, summaryCount);

    const sourceList = document.createElement("div");
    sourceList.className = "comms-source-list";

    for (const file of files) {
        const item = document.createElement("div");
        item.className = "comms-source-item";

        const itemName = document.createElement("span");
        itemName.textContent = getLocalizedText(
            file.name,
            language
        );

        const itemCount = document.createElement("span");
        itemCount.textContent = formatCounts(
            file.itemCount,
            file.groupCount,
            language
        );

        item.append(itemName, itemCount);
        sourceList.append(item);
    }

    summary.append(summaryHeader, sourceList);

    page.append(
        toolbar,
        header,
        placeholder,
        summary
    );

    mainContent.append(page);

    updateActiveGameNavigation(game.id);

    const progressData = await loadGameProgressData(
        game.id
    );

    if (!progressData.available) {
        return;
    }

    const sectionProgress = await calculateSectionProgress(
        game.id,
        section,
        progressData,
        sectionManifest,
        sectionManifestFile
    );

    progress.hidden = false;
    progressText.textContent =
        `${sectionProgress.completed} / ${sectionProgress.total}`;
    progressFill.style.width =
        `${sectionProgress.percentage}%`;
}


/**
 * Erstellt eine Gebietskarte für die Übersicht.
 *
 * @param {object} game
 * @param {object} section
 * @param {string[]} routeIds
 * @param {string} language
 * @param {object} uiText
 */
function createSectionCard(
    game,
    section,
    routeIds,
    language,
    uiText
) {
    const link = document.createElement("a");
    link.className = "comms-section-card";
    link.href = buildGameHash(
        game.id,
        [
            ...routeIds,
            section.id
        ]
    );

    link.dataset.sectionId = section.id;
    link.dataset.view = section.view;

    const top = document.createElement("div");
    top.className = "comms-section-card-top";

    if (section.view === "map") {
        const mapIndicator = document.createElement("span");
        mapIndicator.className = "comms-map-indicator";
        mapIndicator.textContent = "⌖";
        mapIndicator.setAttribute(
            "aria-label",
            uiText.containsMap
        );
        mapIndicator.title = uiText.containsMap;
        top.append(mapIndicator);
    }

    const arrow = document.createElement("span");
    arrow.className = "comms-section-card-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";

    top.append(arrow);

    const title = document.createElement("h3");
    title.textContent = getLocalizedText(
        section.name,
        language
    );

    const description = document.createElement("p");
    description.textContent = getLocalizedText(
        section.description,
        language
    );

    const counts = document.createElement("p");
    counts.className = "comms-section-card-counts";
    counts.textContent = formatCounts(
        section.itemCount,
        section.groupCount,
        language
    );

    const progressElement = document.createElement("div");
    progressElement.className =
        "comms-section-card-progress";
    progressElement.hidden = true;

    const progressHeader = document.createElement("div");

    const progressLabel = document.createElement("span");
    progressLabel.textContent = uiText.progress;

    const progressText = document.createElement("strong");
    progressText.textContent = "0 / 0";

    progressHeader.append(
        progressLabel,
        progressText
    );

    const progressTrack = document.createElement("div");
    progressTrack.className = "progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "progress-bar-fill";
    progressFill.style.width = "0%";

    progressTrack.append(progressFill);
    progressElement.append(
        progressHeader,
        progressTrack
    );

    link.append(
        top,
        title,
        description,
        counts,
        progressElement
    );

    return {
        element: link,
        section,
        progressElement,
        progressText,
        progressFill
    };
}


/**
 * Berechnet den Fortschritt eines Comms-Bereichs.
 *
 * @param {string} gameId
 * @param {object} section
 * @param {object} progressData
 * @param {object|null} suppliedManifest
 * @param {string|null} suppliedManifestFile
 * @returns {Promise<object>}
 */
async function calculateSectionProgress(
    gameId,
    section,
    progressData,
    suppliedManifest = null,
    suppliedManifestFile = null
) {
    const sectionManifestFile =
        suppliedManifestFile ??
        resolveRelativeFile(
            COMMS_MANIFEST_FILE,
            section.manifest
        );

    const sectionManifest =
        suppliedManifest ??
        await loadManifest(
            gameId,
            sectionManifestFile
        );

    const files = Array.isArray(sectionManifest.files)
        ? sectionManifest.files
        : [];

    const categoryResults = await Promise.all(
        files.map(async (file) => {
            const categoryData = await loadCategoryData(
                gameId,
                {
                    ...file,
                    file: resolveRelativeFile(
                        sectionManifestFile,
                        file.file
                    )
                }
            );

            return calculateCategoryProgress(
                categoryData,
                progressData
            );
        })
    );

    const total = categoryResults.reduce(
        (sum, entry) => sum + entry.total,
        0
    );

    const completed = categoryResults.reduce(
        (sum, entry) => sum + entry.completed,
        0
    );

    return {
        total,
        completed,
        percentage: total > 0
            ? Math.round((completed / total) * 100)
            : 0
    };
}


/**
 * Erstellt die obere Zurück-Navigation.
 *
 * @param {string} href
 * @param {string} label
 * @returns {HTMLElement}
 */
function createToolbar(href, label) {
    const toolbar = document.createElement("div");
    toolbar.className =
        "category-toolbar comms-toolbar";

    const backLink = document.createElement("a");
    backLink.className = "category-back-link";
    backLink.href = href;
    backLink.textContent = `← ${label}`;

    toolbar.append(backLink);

    return toolbar;
}


/**
 * Prüft, ob es sich um eine Comms-Route handelt.
 *
 * @param {string[]} routeIds
 * @returns {boolean}
 */
function isCommsRoute(routeIds) {
    return Array.isArray(routeIds) &&
        routeIds.length >= 2 &&
        routeIds[0] === COMMS_ROUTE_PREFIX[0] &&
        routeIds[1] === COMMS_ROUTE_PREFIX[1];
}


/**
 * Baut einen Hash für eine Spielroute.
 *
 * @param {string} gameId
 * @param {string[]} routeIds
 * @returns {string}
 */
function buildGameHash(gameId, routeIds = []) {
    const encodedGameId = encodeURIComponent(gameId);
    const encodedRoute = routeIds
        .map((part) => encodeURIComponent(part))
        .join("/");

    return encodedRoute
        ? `#game/${encodedGameId}/${encodedRoute}`
        : `#game/${encodedGameId}`;
}


/**
 * Formatiert Item- und Gruppenzahlen.
 *
 * @param {number} itemCount
 * @param {number} groupCount
 * @param {string} language
 * @returns {string}
 */
function formatCounts(
    itemCount,
    groupCount,
    language
) {
    const items = Number(itemCount) || 0;
    const groups = Number(groupCount) || 0;

    if (language === "en") {
        return `${items} Comms · ${groups} collections`;
    }

    return `${items} Comms · ${groups} Sammlungen`;
}


/**
 * UI-Texte der Comms-Ansicht.
 *
 * @param {string} language
 * @returns {object}
 */
function getUiText(language) {
    if (language === "en") {
        return {
            back: "Back",
            backToComms: "Back to Comms",
            overviewDescription:
                "Choose a region or open the mission-only tracking list.",
            mapView: "Map view",
            listView: "List view",
            containsMap: "Contains a map",
            progress: "Progress",
            totalProgress: "Total progress",
            mapPrepared: "Map route prepared",
            mapPhaseThree:
                "The interactive map and the collapsible tracking panel will be added in Phase 3.",
            includedCollections: "Included collections"
        };
    }

    return {
        back: "Zurück",
        backToComms: "Zurück zu Comms",
        overviewDescription:
            "Wähle ein Gebiet oder öffne die reine Missions-Tracking-Liste.",
        mapView: "Kartenansicht",
        listView: "Listenansicht",
        containsMap: "Enthält eine Karte",
        progress: "Fortschritt",
        totalProgress: "Gesamtfortschritt",
        mapPrepared: "Kartenroute vorbereitet",
        mapPhaseThree:
            "Die interaktive Karte und das ein- und ausklappbare Tracking-Panel folgen in Phase 3.",
        includedCollections: "Enthaltene Sammlungen"
    };
}
