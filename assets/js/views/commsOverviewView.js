/* =========================================================
   Personal Game Tracker
   Comms Overview View
   ========================================================= */

import {
    calculateManifestProgressFromMetadata
} from "../services/progressSummaryService.js";

import {
    isViewScopeCurrent
} from "../services/viewScopeService.js";

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

import {
    createOverviewProgress,
    updateOverviewProgress
} from "./overviewCardView.js";

/**
 * Rendert eine über renderer "comms" konfigurierte Manifestansicht.
 *
 * Die zulässigen Views und Pflichtfelder werden zentral durch
 * manifestRendererConfig.js definiert und bereits vor diesem
 * Renderer validiert.
 *
 * @param {object} context
 * @returns {Promise<void>}
 */
export async function renderConfiguredCommsView({
    game,
    resolvedRoute,
    routeIds,
    viewScope
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
            resolvedRoute.manifestFile,
            viewScope
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
        const dataFile =
            sectionManifest.dataFile ??
            section.dataFile;

        if (
            typeof dataFile !== "string" ||
            dataFile.trim() === ""
        ) {
            throw new Error(
                `Für die Comms-Listenansicht "${section.id ?? "?"}" fehlt dataFile.`
            );
        }

        await renderCategory(
            game,
            {
                id: section.id,
                name: section.name,
                description:
                    sectionManifest.description ??
                    section.description,
                pageClass:
                    sectionManifest.pageClass ??
                    section.pageClass,
                file: resolveRelativeFile(
                    sectionManifestFile,
                    dataFile
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
            routeIds,
            viewScope
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
    routeIds,
    manifestFile,
    viewScope
) {
    showLoading();

    const mainContent =
        document.getElementById(
            "main-content"
        );

    if (!mainContent) {
        return;
    }

    const language =
        getCurrentLanguage();

    const uiText =
        getUiText(
            language
        );

    const sections =
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
            : [];

    if (
		viewScope &&
		!isViewScopeCurrent(viewScope)
	) {
		return;
	}

	mainContent.replaceChildren();

    const page =
        document.createElement(
            "section"
        );

    page.className =
        "game-page comms-overview-page";

    page.dataset.gameId =
        game.id;

    const toolbar =
        createToolbar(
            buildGameHash(
                game.id,
                routeIds.slice(
                    0,
                    -1
                )
            ),
            uiText.back
        );

    /*
     * pageBreadcrumbView.js verschiebt alle Toolbar-Elemente
     * außer dem Zurück-Button auf die rechte Bannerseite.
     */
    const overallProgress =
        document.createElement(
            "span"
        );

    overallProgress.className =
        "category-content-progress manifest-progress-summary comms-overview-progress";

    overallProgress.hidden =
        true;

    overallProgress.textContent =
        "0 / 0 · 0 %";

    toolbar.append(
        overallProgress
    );

    const header =
        document.createElement(
            "header"
        );

    header.className =
        "game-header";

    const title =
        document.createElement(
            "h2"
        );

    title.className =
        "game-title";

    title.textContent =
        getLocalizedText(
            commsManifest.name,
            language
        ) ||
        "Comms";

    const description =
        document.createElement(
            "p"
        );

    description.className =
        "game-description";

    description.textContent =
        getLocalizedText(
            commsManifest.description,
            language
        ) ||
        uiText.overviewDescription;

    header.append(
        title,
        description
    );

    const grid =
        document.createElement(
            "div"
        );

    grid.className =
        "comms-section-grid";

    const progressTargets = [];

    for (
        const section
        of sections
    ) {
        const card =
            createSectionCard(
                game,
                section,
                routeIds,
                language,
                uiText
            );

        grid.append(
            card.element
        );

        progressTargets.push(
            card
        );
    }

    page.append(
        toolbar,
        header,
        grid
    );

    mainContent.append(
        page
    );

    updateActiveGameNavigation(
        game.id
    );

    const progressData =
        await loadGameProgressData(
            game.id
        );

    if (!progressData.available) {
        return;
    }

    const results =
        await Promise.all(
            progressTargets.map(
                async (
                    target
                ) => ({
                    target,
                    progress:
                        await calculateSectionProgress(
                            game.id,
                            target.section,
                            progressData
                        )
                })
            )
        );

    /* Comms-Fortschritt nach Promise.all */
    if (
        viewScope &&
        !isViewScopeCurrent(viewScope)
    ) {
        return;
    }

    let totalItems = 0;
    let totalCompleted = 0;

    for (
        const result
        of results
    ) {
        const {
            target,
            progress
        } = result;

        updateOverviewProgress(
            target.progress,
            progress
        );

        totalItems +=
            progress.total;

        totalCompleted +=
            progress.completed;
    }

    const totalPercentage =
        totalItems > 0
            ? Math.round(
                (
                    totalCompleted /
                    totalItems
                ) *
                100
            )
            : 0;

    overallProgress.hidden =
        false;

    overallProgress.textContent =
        `${totalCompleted} / ${totalItems} · ${totalPercentage} %`;

    overallProgress.setAttribute(
        "aria-label",
        language === "de"
            ? `Gesamtfortschritt: ${totalCompleted} von ${totalItems}, ${totalPercentage} Prozent`
            : `Overall progress: ${totalCompleted} of ${totalItems}, ${totalPercentage} percent`
    );
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
    const link =
        document.createElement(
            "a"
        );

    link.className =
        "comms-section-card overview-card";

    link.href =
        buildGameHash(
            game.id,
            [
                ...routeIds,
                section.id
            ]
        );

    link.dataset.sectionId =
        section.id;

    link.dataset.view =
        section.view;

    const top =
        document.createElement(
            "div"
        );

    top.className =
        "comms-section-card-top overview-card-top";

    const title =
        document.createElement(
            "h3"
        );

    title.textContent =
        getLocalizedText(
            section.name,
            language
        );

    top.append(
        title
    );

    if (
        section.view ===
        "map"
    ) {
        const mapIndicator =
            document.createElement(
                "span"
            );

        mapIndicator.className =
            "comms-map-indicator";

        mapIndicator.textContent =
            "⌖";

        mapIndicator.setAttribute(
            "aria-label",
            uiText.containsMap
        );

        mapIndicator.title =
            uiText.containsMap;

        top.append(
            mapIndicator
        );
    }

    const arrow =
        document.createElement(
            "span"
        );

    arrow.className =
        "comms-section-card-arrow overview-card-arrow";

    arrow.setAttribute(
        "aria-hidden",
        "true"
    );

    arrow.textContent =
        "→";

    top.append(
        arrow
    );

    const description =
        document.createElement(
            "p"
        );

    description.className =
        "overview-card-description";

    description.textContent =
        getLocalizedText(
            section.description,
            language
        );

    const counts =
        document.createElement(
            "p"
        );

    counts.className =
        "comms-section-card-counts overview-card-meta";

    counts.textContent =
        formatCounts(
            section.itemCount,
            section.groupCount,
            language
        );

    const progress =
        createOverviewProgress({
            label: uiText.progress,
            hidden: true
        });

    link.append(
        top,
        description,
        counts,
        progress.element
    );

    return {
        element: link,
        section,
        progress
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
    backLink.className = "back-button category-back-link";
    backLink.href = href;
    backLink.textContent = `← ${label}`;

    toolbar.append(backLink);

    return toolbar;
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
}
