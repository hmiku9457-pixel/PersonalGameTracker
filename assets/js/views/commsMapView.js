/* =========================================================
   Personal Game Tracker
   Comms Map View
   ========================================================= */

import {
    loadCategoryData,
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
    showError,
    showLoading
} from "./commonView.js";

import {
    renderCategoryData,
    registerProgressToggleHandler
} from "./categoryView.js";

import {
    renderCategoryControls
} from "./categoryControlsView.js";

import {
    updateActiveGameNavigation
} from "./navigationView.js";

import {
    createCommsMapController
} from "./commsMapController.js";


const PANEL_BREAKPOINT = 900;
const PANEL_STORAGE_PREFIX = "pgt.commsMap.panel.";

let activeViewController = null;
let activeMapObjectUrl = null;

const UI_TEXT = {
    de: {
        backToComms: "← Zurück zu Comms",
        openList: "Tracking-Liste öffnen",
        closeList: "Tracking-Liste schließen",
        listTitle: "Tracking-Liste",
        items: "Einträge",
        mapAltFallback: "Gebietskarte",
        noMapTitle: "Karte noch nicht hinterlegt",
        noMapDescription:
            "Lege im Manifest einen gültigen mapImage-Pfad fest.",
        markerStatus: "Kartenpositionen",
        markerPending:
            "Noch keine Koordinaten hinterlegt. Die Marker folgen in einer späteren Phase.",
        zoomIn: "Karte vergrößern",
        zoomOut: "Karte verkleinern",
        resetMap: "Kartenansicht zurücksetzen",
        enterFullscreen: "Vollbild öffnen",
        exitFullscreen: "Vollbild schließen",
        mapInstructions:
            "Karte mit Mausrad oder Tasten zoomen und durch Ziehen verschieben.",
        loadError:
            "Die Kartenansicht konnte nicht geladen werden."
    },
    en: {
        backToComms: "← Back to Comms",
        openList: "Open tracking list",
        closeList: "Close tracking list",
        listTitle: "Tracking list",
        items: "items",
        mapAltFallback: "Area map",
        noMapTitle: "No map configured yet",
        noMapDescription:
            "Set a valid mapImage path in the manifest.",
        markerStatus: "Map positions",
        markerPending:
            "No coordinates have been added yet. Markers will follow in a later phase.",
        zoomIn: "Zoom in",
        zoomOut: "Zoom out",
        resetMap: "Reset map view",
        enterFullscreen: "Open fullscreen",
        exitFullscreen: "Exit fullscreen",
        mapInstructions:
            "Zoom with the mouse wheel or keyboard and drag to move the map.",
        loadError:
            "The map view could not be loaded."
    }
};


/**
 * Rendert die Kartenansicht eines Comms-Gebiets.
 *
 * @param {object} game
 * @param {object} commsManifest
 * @param {object} section
 * @param {object} sectionManifest
 * @param {string} sectionManifestFile
 * @param {string[]} routeIds
 */
export async function renderCommsMapView(
    game,
    commsManifest,
    section,
    sectionManifest,
    sectionManifestFile,
    routeIds
) {
    const mainContent = document.getElementById(
        "main-content"
    );

    if (!mainContent) {
        console.warn(
            "Element #main-content wurde nicht gefunden."
        );
        return;
    }

    activeViewController?.abort();
    activeViewController = new AbortController();

    if (activeMapObjectUrl) {
        URL.revokeObjectURL(activeMapObjectUrl);
        activeMapObjectUrl = null;
    }

    showLoading();

    try {
        const [
            combinedData,
            progressData
        ] = await Promise.all([
            loadCombinedSectionData(
                game.id,
                sectionManifest,
                sectionManifestFile
            ),
            loadGameProgressData(game.id)
        ]);

        const language = getCurrentLanguage();
        const uiText = getUiText(language);
        const page = document.createElement("section");

        page.className = "game-page comms-map-page";
        page.dataset.gameId = game.id;
        page.dataset.commsSection = section.id;

        const toolbar = createToolbar(
            game,
            section,
            routeIds,
            combinedData,
            progressData,
            uiText
        );

        const header = createHeader(
            commsManifest,
            section,
            sectionManifest,
            language
        );

        const layout = document.createElement("div");
        layout.className = "comms-map-layout";

        const mapArea = createMapArea(
            section,
            sectionManifest,
            combinedData,
            language,
            uiText
        );

        const listPanel = createListPanel(
            game,
            section,
            combinedData,
            progressData,
            uiText
        );

        const backdrop = document.createElement("button");
        backdrop.type = "button";
        backdrop.className = "comms-map-panel-backdrop";
        backdrop.hidden = true;
        backdrop.setAttribute(
            "aria-label",
            uiText.closeList
        );

        layout.append(
            mapArea.element,
            listPanel.panel,
            backdrop
        );

        page.append(
            toolbar.element,
            header,
            layout
        );

        mainContent.replaceChildren(page);

        registerCommsMapHeightController(
            layout,
            activeViewController.signal
        );
        updateActiveGameNavigation(game.id);

        const panelState = createPanelStateController({
            page,
            layout,
            panel: listPanel.panel,
            backdrop,
            openButton: toolbar.panelButton,
            closeButton: listPanel.closeButton,
            sectionId: section.id,
            uiText,
            signal: activeViewController.signal
        });

        panelState.applyInitialState();

        const mapController = createCommsMapController({
            sectionId: section.id,
            area: mapArea.element,
            viewport: mapArea.viewport,
            canvas: mapArea.canvas,
            uiText,
            signal: activeViewController.signal
        });

        const mapLoaded = await loadMapImage(
            mapArea.image,
            mapArea.emptyState,
            sectionManifest.mapImage ?? section.mapImage ?? "",
            activeViewController.signal
        );
        mapController.setMapAvailable(mapLoaded);
    }
    catch (error) {
        console.error(
            "[Comms Map] Kartenansicht konnte nicht geladen werden:",
            error
        );

        showError(
            getUiText(
                getCurrentLanguage()
            ).loadError
        );
    }
}


/**
 * Lädt alle JSON-Dateien eines Gebiets und führt ihre Gruppen
 * zu einer gemeinsamen Tracking-Liste zusammen.
 *
 * @param {string} gameId
 * @param {object} sectionManifest
 * @param {string} sectionManifestFile
 * @returns {Promise<object>}
 */
async function loadCombinedSectionData(
    gameId,
    sectionManifest,
    sectionManifestFile
) {
    const files = Array.isArray(sectionManifest.categories)
        ? sectionManifest.categories
        : [];

    const loadedFiles = await Promise.all(
        files.map(async (file) => {
            const data = await loadCategoryData(
                gameId,
                {
                    ...file,
                    file: resolveRelativeFile(
                        sectionManifestFile,
                        file.file
                    )
                }
            );

            return {
                file,
                data
            };
        })
    );

    const groups = [];

    for (const entry of loadedFiles) {
        const sourceGroups = getGroups(entry.data);

        for (const group of sourceGroups) {
            groups.push(
                normalizeGroup(
                    group,
                    entry.file
                )
            );
        }
    }

    return {
        id: sectionManifest.id,
        name: sectionManifest.name,
        description: sectionManifest.description,
        groups
    };
}


/**
 * Extrahiert Gruppen aus den vom Tracker unterstützten
 * Datenformaten.
 *
 * @param {object|Array} data
 * @returns {Array<object>}
 */
function getGroups(data) {
    if (Array.isArray(data?.groups)) {
        return data.groups;
    }

    if (Array.isArray(data?.sections)) {
        return data.sections;
    }

    if (Array.isArray(data?.items)) {
        return [
            {
                id: data.id,
                name: data.name,
                description: data.description,
                items: data.items
            }
        ];
    }

    if (Array.isArray(data)) {
        return [
            {
                id: "items",
                name: "Items",
                items: data
            }
        ];
    }

    return [];
}


/**
 * Ergänzt sichere Fallbacks für Fortschritts-Kategorie und
 * eindeutige Gruppen-IDs.
 *
 * @param {object} group
 * @param {object} sourceFile
 * @returns {object}
 */
function normalizeGroup(
    group,
    sourceFile
) {
    const items = Array.isArray(group?.items)
        ? group.items.map((item) => ({
            ...item,
            progressCategoryId:
                typeof item?.progressCategoryId === "string" &&
                item.progressCategoryId.trim() !== ""
                    ? item.progressCategoryId
                    : sourceFile.id
        }))
        : [];

    return {
        ...group,
        id: [
            sourceFile.id,
            group?.id ?? "group"
        ].join("--"),
        items
    };
}


function createToolbar(
    game,
    section,
    routeIds,
    combinedData,
    progressData,
    uiText
) {
    const toolbar = document.createElement("div");
    toolbar.className =
        "category-toolbar comms-map-toolbar";

    const backLink = document.createElement("a");
    backLink.className = "back-button";
    backLink.href = buildGameHash(
        game.id,
        routeIds.slice(0, -1)
    );
    backLink.textContent = uiText.backToComms;

    const actions = document.createElement("div");
    actions.className = "comms-map-toolbar-actions";

    const progressElement = document.createElement("span");
    progressElement.className = "category-content-progress";
    progressElement.dataset.currentCategoryProgress = "true";

    const progress = calculateCategoryProgress(
        combinedData,
        progressData
    );
    const percentage = progress.total > 0
        ? Math.round(
            (progress.completed / progress.total) * 100
        )
        : 0;

    progressElement.textContent =
        `${progress.completed} / ${progress.total} · ${percentage} %`;

    const panelButton = document.createElement("button");
    panelButton.type = "button";
    panelButton.className =
        "comms-map-panel-toggle comms-map-panel-open-button";
    panelButton.setAttribute(
        "aria-expanded",
        "false"
    );
    panelButton.textContent = uiText.openList;

    actions.append(
        progressElement,
        panelButton
    );
    toolbar.append(
        backLink,
        actions
    );

    return {
        element: toolbar,
        panelButton
    };
}


function createHeader(
    commsManifest,
    section,
    sectionManifest,
    language
) {
    const header = document.createElement("header");
    header.className = "game-header comms-map-header";

    const title = document.createElement("h2");
    title.className = "game-title";
    title.textContent = getLocalizedText(
        section.name,
        language
    );

    header.append(title);

    return header;
}

function createMapArea(
    section,
    sectionManifest,
    combinedData,
    language,
    uiText
) {
    const area = document.createElement("section");
    area.className = "comms-map-area";

    const viewport = document.createElement("div");
    viewport.className = "comms-map-viewport";
    viewport.tabIndex = 0;
    viewport.setAttribute(
        "aria-label",
        uiText.mapInstructions
    );

    const canvas = document.createElement("div");
    canvas.className = "comms-map-canvas";

    const image = document.createElement("img");
    image.className = "comms-map-image";
    image.hidden = true;
    image.draggable = false;
    image.alt = getLocalizedText(
        sectionManifest.mapImageAlt ?? section.mapImageAlt,
        language
    ) || `${getLocalizedText(section.name, language)} – ${uiText.mapAltFallback}`;

    const markerLayer = document.createElement("div");
    markerLayer.className = "comms-map-marker-layer";
    markerLayer.setAttribute("aria-hidden", "true");

    const emptyState = document.createElement("div");
    emptyState.className = "comms-map-empty-state";

    const emptyIcon = document.createElement("span");
    emptyIcon.className = "comms-map-empty-icon";
    emptyIcon.setAttribute("aria-hidden", "true");
    emptyIcon.textContent = "⌖";

    const emptyText = document.createElement("div");
    const emptyTitle = document.createElement("h3");
    emptyTitle.textContent = uiText.noMapTitle;

    const emptyDescription = document.createElement("p");
    emptyDescription.textContent = uiText.noMapDescription;

    emptyText.append(
        emptyTitle,
        emptyDescription
    );
    emptyState.append(
        emptyIcon,
        emptyText
    );

    canvas.append(
        image,
        markerLayer,
        emptyState
    );
    viewport.append(canvas);

    const footer = document.createElement("div");
    footer.className = "comms-map-footer";

    const markerInfo = document.createElement("div");
    markerInfo.className = "comms-map-marker-info";

    const markerTitle = document.createElement("strong");
    markerTitle.textContent = uiText.markerStatus;

    const markerText = document.createElement("span");
    markerText.textContent = uiText.markerPending;

    markerInfo.append(
        markerTitle,
        markerText
    );

    const itemCount = document.createElement("span");
    itemCount.className = "comms-map-item-count";
    itemCount.textContent =
        `${countItems(combinedData)} ${uiText.items}`;

    footer.append(
        markerInfo,
        itemCount
    );
    area.append(
        viewport,
        footer
    );

    return {
        element: area,
        viewport,
        canvas,
        image,
        emptyState
    };
}


function createListPanel(
    game,
    section,
    combinedData,
    progressData,
    uiText
) {
    const panel = document.createElement("aside");
    panel.className = "comms-map-list-panel";
    panel.id = `comms-map-list-${section.id}`;
    panel.setAttribute("aria-hidden", "true");

    const panelHeader = document.createElement("header");
    panelHeader.className = "comms-map-list-header";

    const heading = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = uiText.listTitle;

    const count = document.createElement("p");
    count.textContent =
        `${countItems(combinedData)} ${uiText.items}`;

    heading.append(
        title,
        count
    );

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "comms-map-panel-close";
    closeButton.setAttribute(
        "aria-label",
        uiText.closeList
    );
    closeButton.title = uiText.closeList;
    closeButton.textContent = "×";

    panelHeader.append(
        heading,
        closeButton
    );

    const scrollArea = document.createElement("div");
    scrollArea.className = "comms-map-list-scroll";

    const content = document.createElement("section");
    content.className =
        "category-content comms-map-list-content";

    renderCategoryData(
        content,
        combinedData,
        progressData
    );
    renderCategoryControls(content);
    registerProgressToggleHandler(
        content,
        game.id,
        section.id,
        combinedData,
        progressData
    );

    scrollArea.append(content);
    panel.append(
        panelHeader,
        scrollArea
    );

    return {
        panel,
        closeButton
    };
}


function createPanelStateController({
    page,
    layout,
    panel,
    backdrop,
    openButton,
    closeButton,
    sectionId,
    uiText,
    signal
}) {
    const storageKey =
        `${PANEL_STORAGE_PREFIX}${sectionId}`;

    function setOpen(
        open,
        persist = true
    ) {
        const isOpen = Boolean(open);
        const mobile = isMobilePanel();

        page.classList.toggle(
            "is-comms-panel-open",
            isOpen
        );
        layout.classList.toggle(
            "is-panel-open",
            isOpen
        );

        panel.setAttribute(
            "aria-hidden",
            String(!isOpen)
        );
        panel.inert = !isOpen;

        openButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
        openButton.setAttribute(
            "aria-controls",
            panel.id
        );
        openButton.textContent = isOpen
            ? uiText.closeList
            : uiText.openList;

        backdrop.hidden = !(isOpen && mobile);

        if (persist) {
            try {
                localStorage.setItem(
                    storageKey,
                    String(isOpen)
                );
            }
            catch (error) {
                console.debug(
                    "Panel-Zustand konnte nicht gespeichert werden.",
                    error
                );
            }
        }
    }

    function toggle() {
        setOpen(
            !page.classList.contains(
                "is-comms-panel-open"
            )
        );
    }

    openButton.addEventListener(
        "click",
        toggle,
        { signal }
    );

    closeButton.addEventListener(
        "click",
        () => setOpen(false),
        { signal }
    );

    backdrop.addEventListener(
        "click",
        () => setOpen(false),
        { signal }
    );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape" &&
                isMobilePanel() &&
                page.classList.contains(
                    "is-comms-panel-open"
                )
            ) {
                setOpen(false);
                openButton.focus();
            }
        },
        { signal }
    );

    window.addEventListener(
        "resize",
        () => {
            const open = page.classList.contains(
                "is-comms-panel-open"
            );
            backdrop.hidden = !(
                open && isMobilePanel()
            );
        },
        { signal }
    );

    return {
        applyInitialState() {
            let storedState = null;

            try {
                storedState = localStorage.getItem(
                    storageKey
                );
            }
            catch (error) {
                console.debug(
                    "Panel-Zustand konnte nicht gelesen werden.",
                    error
                );
            }

            const defaultOpen = !isMobilePanel();
            const initialOpen = storedState === null
                ? defaultOpen
                : storedState === "true";

            setOpen(
                initialOpen,
                false
            );
        }
    };
}



/**
 * Begrenzt die Desktop-Kartenansicht auf die tatsächlich
 * verfügbare Höhe des Browserfensters.
 *
 * Die Toolbar und der Gebiets-Banner bleiben oberhalb sichtbar.
 * Innerhalb der Kartenansicht scrollt ausschließlich das
 * Tracking-Panel.
 *
 * @param {HTMLElement} layout
 * @param {AbortSignal} signal
 */
function registerCommsMapHeightController(
    layout,
    signal
) {
    if (!(layout instanceof HTMLElement)) {
        return;
    }

    let animationFrameId = 0;

    const updateHeight = () => {
        window.cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId = window.requestAnimationFrame(
            () => {
                if (
                    window.innerWidth <= PANEL_BREAKPOINT ||
                    document.fullscreenElement
                ) {
                    layout.style.removeProperty(
                        "--comms-map-layout-height"
                    );
                    return;
                }

                const page = layout.closest(
                    ".comms-map-page"
                );
                const main = layout.closest("main");
                const footer = document.querySelector(
                    "body > footer"
                );

                const layoutTop =
                    layout.getBoundingClientRect().top;
                const pageBottomPadding =
                    getElementPixelValue(
                        page,
                        "paddingBottom"
                    );
                const mainBottomPadding =
                    getElementPixelValue(
                        main,
                        "paddingBottom"
                    );
                const footerHeight = footer
                    ? footer.getBoundingClientRect().height
                    : 0;

                const availableHeight = Math.floor(
                    window.innerHeight -
                    layoutTop -
                    pageBottomPadding -
                    mainBottomPadding -
                    footerHeight -
                    2
                );

                layout.style.setProperty(
                    "--comms-map-layout-height",
                    String(
                        Math.max(
                            300,
                            availableHeight
                        )
                    ) + "px"
                );
            }
        );
    };

    const observedElements = [
        layout.previousElementSibling,
        layout.previousElementSibling
            ?.previousElementSibling,
        document.querySelector("body > footer")
    ].filter(
        (element) => element instanceof HTMLElement
    );

    const resizeObserver =
        typeof ResizeObserver === "function"
            ? new ResizeObserver(updateHeight)
            : null;

    for (const element of observedElements) {
        resizeObserver?.observe(element);
    }

    window.addEventListener(
        "resize",
        updateHeight,
        { signal }
    );
    window.addEventListener(
        "orientationchange",
        updateHeight,
        { signal }
    );
    document.addEventListener(
        "fullscreenchange",
        updateHeight,
        { signal }
    );
    window.visualViewport?.addEventListener(
        "resize",
        updateHeight,
        { signal }
    );

    signal.addEventListener(
        "abort",
        () => {
            window.cancelAnimationFrame(
                animationFrameId
            );
            resizeObserver?.disconnect();
        },
        { once: true }
    );

    updateHeight();
}


/**
 * Liest einen berechneten CSS-Pixelwert sicher aus.
 *
 * @param {Element|null} element
 * @param {string} property
 * @returns {number}
 */
function getElementPixelValue(
    element,
    property
) {
    if (!(element instanceof Element)) {
        return 0;
    }

    const value = Number.parseFloat(
        window.getComputedStyle(element)[property]
    );

    return Number.isFinite(value)
        ? value
        : 0;
}

async function loadMapImage(
    image,
    emptyState,
    source,
    signal
) {
    if (
        typeof source !== "string" ||
        source.trim() === ""
    ) {
        image.hidden = true;
        emptyState.hidden = false;
        return false;
    }

    try {
        const response = await fetch(
            source,
            { signal }
        );

        if (!response.ok) {
            throw new Error(
                `Karte konnte nicht geladen werden (${response.status}).`
            );
        }

        const blob = await response.blob();
        activeMapObjectUrl = URL.createObjectURL(blob);
        image.src = activeMapObjectUrl;
        image.hidden = false;
        emptyState.hidden = true;

        try {
            await image.decode();
        }
        catch (error) {
            console.debug(
                "Kartenbild wurde ohne decode()-Bestätigung angezeigt.",
                error
            );
        }

        return true;
    }
    catch (error) {
        if (error?.name === "AbortError") {
            return false;
        }

        console.warn(
            "[Comms Map] Kartenbild konnte nicht geladen werden:",
            source,
            error
        );

        image.hidden = true;
        emptyState.hidden = false;
        return false;
    }
}


function countItems(data) {
    return calculateCategoryProgress(
        data,
        null
    ).total;
}


function isMobilePanel() {
    return window.innerWidth <= PANEL_BREAKPOINT;
}


function buildGameHash(
    gameId,
    routeIds
) {
    const encodedRoute = routeIds
        .filter(Boolean)
        .map((entry) => encodeURIComponent(entry))
        .join("/");

    return encodedRoute
        ? `#game/${encodeURIComponent(gameId)}/${encodedRoute}`
        : `#game/${encodeURIComponent(gameId)}`;
}


function getUiText(language) {
    return UI_TEXT[language] ?? UI_TEXT.en;
}
