import {
    readFile,
    writeFile
} from "node:fs/promises";

const MAP_VIEW_FILE =
    "assets/js/views/commsMapView.js";
const TRACKER_CSS_FILE =
    "assets/css/tracker.css";

const CSS_START =
    "/* === COMMS PHASE 5 VIEWPORT HEIGHT START === */";
const CSS_END =
    "/* === COMMS PHASE 5 VIEWPORT HEIGHT END === */";

await patchMapView();
await patchTrackerCss();

console.log(
    "Phase-5-Höhenbegrenzung wurde erfolgreich angewendet."
);

async function patchMapView() {
    let source = await readFile(
        MAP_VIEW_FILE,
        "utf8"
    );

    if (
        !source.includes(
            "registerCommsMapHeightController("
        )
    ) {
        const mountPattern =
            /(^[ \t]*mainContent\.replaceChildren\(page\);[ \t]*$)/m;

        if (!mountPattern.test(source)) {
            throw new Error(
                "Einfügeposition nach mainContent.replaceChildren(page) wurde nicht gefunden."
            );
        }

        source = source.replace(
            mountPattern,
            [
                "$1",
                "",
                "        registerCommsMapHeightController(",
                "            layout,",
                "            activeViewController.signal",
                "        );"
            ].join("\n")
        );
    }

    if (
        !source.includes(
            "function registerCommsMapHeightController("
        )
    ) {
        const helperAnchor =
            /\nasync function loadMapImage\(/;

        if (!helperAnchor.test(source)) {
            throw new Error(
                "Einfügeposition vor loadMapImage() wurde nicht gefunden."
            );
        }

        source = source.replace(
            helperAnchor,
            `${createHeightControllerSource()}\n\nasync function loadMapImage(`
        );
    }

    await writeFile(
        MAP_VIEW_FILE,
        source,
        "utf8"
    );

    console.log(
        `${MAP_VIEW_FILE} wurde aktualisiert.`
    );
}

async function patchTrackerCss() {
    let source = await readFile(
        TRACKER_CSS_FILE,
        "utf8"
    );

    const cssBlock = createCssBlock();
    const existingPattern = new RegExp(
        `${escapeRegExp(CSS_START)}[\\s\\S]*?${escapeRegExp(CSS_END)}`,
        "m"
    );

    if (existingPattern.test(source)) {
        source = source.replace(
            existingPattern,
            cssBlock
        );
    }
    else {
        source = `${source.trimEnd()}\n\n${cssBlock}\n`;
    }

    await writeFile(
        TRACKER_CSS_FILE,
        source,
        "utf8"
    );

    console.log(
        `${TRACKER_CSS_FILE} wurde aktualisiert.`
    );
}

function createHeightControllerSource() {
    return `

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
}`;
}

function createCssBlock() {
    return `${CSS_START}
/* =========================================================
   Comms Phase 5 – vertikale Viewport-Begrenzung
   ========================================================= */

@media (min-width: 901px) {
    .game-page.comms-map-page
    .comms-map-layout {
        height: var(
            --comms-map-layout-height,
            calc(100dvh - 18rem)
        );
        min-height: 0;
        max-height: var(
            --comms-map-layout-height,
            calc(100dvh - 18rem)
        );
    }

    .game-page.comms-map-page
    .comms-map-area,
    .game-page.comms-map-page
    .comms-map-list-panel {
        height: 100%;
        min-height: 0;
    }

    .game-page.comms-map-page
    .comms-map-viewport,
    .game-page.comms-map-page
    .comms-map-canvas {
        min-height: 0;
    }

    .game-page.comms-map-page
    .comms-map-list-scroll {
        height: 100%;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior-y: contain;
    }
}
${CSS_END}`;
}

function escapeRegExp(value) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}
