/* =========================================================
   Personal Game Tracker
   Page Breadcrumb View
   ========================================================= */

import {
    getCurrentLanguage,
    getLocalizedText
} from "../services/languageService.js";


const UI_TEXT = {
    de: {
        navigationPath: "Navigationspfad"
    },
    en: {
        navigationPath: "Navigation path"
    }
};


/**
 * Ersetzt die bisherigen Seitentitel durch einen einheitlichen
 * Navigationsbanner.
 *
 * Eine vorhandene Kategorie-Toolbar wird nicht mehr separat
 * angezeigt. Ihre Bedienelemente werden in den Banner übernommen:
 *
 * - Zurück-Button links
 * - Breadcrumb mittig
 * - Fortschritt und weitere Aktionen rechts
 *
 * @param {Array<unknown>} items
 * @param {Object} options
 * @param {boolean} options.removeDescriptions
 * @returns {HTMLElement|null}
 */
export function applyPageBreadcrumbBanner(
    items,
    {
        removeDescriptions = false
    } = {}
) {
    const page = document.querySelector(
        "#main-content .game-page"
    );

    if (!page) {
        return null;
    }

    const segments = normalizeBreadcrumbItems(
        items
    );

    if (segments.length === 0) {
        return null;
    }

    removePreviousPageTitles(
        page
    );

    if (removeDescriptions) {
        removePageDescriptions(
            page
        );
    }

    const toolbar = page.querySelector(
        ":scope > .category-toolbar"
    );

    const banner = createPageBreadcrumbBanner(
        segments
    );

    if (toolbar) {
        mergeToolbarIntoBanner(
            toolbar,
            banner
        );
    }

    page.prepend(
        banner
    );

    page.classList.add(
        "has-page-breadcrumb-banner",
        "has-merged-navigation-banner"
    );

    return banner;
}


/**
 * Erstellt den gemeinsamen Navigationsbanner.
 *
 * @param {string[]} segments
 * @returns {HTMLElement}
 */
export function createPageBreadcrumbBanner(
    segments
) {
    const language =
        getCurrentLanguage();

    const banner =
        document.createElement(
            "header"
        );

    banner.className =
        "page-breadcrumb-banner";

    banner.setAttribute(
        "aria-label",
        UI_TEXT[language]?.navigationPath ??
        UI_TEXT.en.navigationPath
    );

    const left =
        document.createElement(
            "div"
        );

    left.className =
        "page-breadcrumb-actions page-breadcrumb-actions-left";

    const title =
        document.createElement(
            "h2"
        );

    title.className =
        "page-breadcrumb-title";

    title.setAttribute(
        "aria-label",
        segments.join(
            " - "
        )
    );

    segments.forEach(
        (
            segment,
            index
        ) => {
            if (index > 0) {
                const separator =
                    document.createElement(
                        "span"
                    );

                separator.className =
                    "page-breadcrumb-separator";

                separator.setAttribute(
                    "aria-hidden",
                    "true"
                );

                separator.textContent =
                    " - ";

                title.append(
                    separator
                );
            }

            const segmentElement =
                document.createElement(
                    "span"
                );

            segmentElement.className =
                "page-breadcrumb-segment";

            segmentElement.textContent =
                segment;

            title.append(
                segmentElement
            );
        }
    );

    const right =
        document.createElement(
            "div"
        );

    right.className =
        "page-breadcrumb-actions page-breadcrumb-actions-right";

    banner.append(
        left,
        title,
        right
    );

    return banner;
}


/**
 * Verschiebt die vorhandenen Toolbar-Elemente in den neuen Banner.
 *
 * Unterstützt unter anderem:
 *
 * - normale Kategorie: Back + Fortschritt
 * - Untermanifest: Back
 * - Comms-Karte: Back + Fortschritt + Listen-Schalter
 *
 * Event-Listener und bestehende Elementreferenzen bleiben erhalten,
 * weil die DOM-Elemente verschoben und nicht neu erzeugt werden.
 *
 * @param {HTMLElement} toolbar
 * @param {HTMLElement} banner
 */
function mergeToolbarIntoBanner(
    toolbar,
    banner
) {
    const left = banner.querySelector(
        ".page-breadcrumb-actions-left"
    );

    const right = banner.querySelector(
        ".page-breadcrumb-actions-right"
    );

    if (
        !left ||
        !right
    ) {
        toolbar.remove();
        return;
    }

    const backControl =
        toolbar.querySelector(
            ".back-button"
        );

    if (backControl) {
        left.append(
            backControl
        );
    }

    const directChildren = [
        ...toolbar.children
    ];

    for (
        const child
        of directChildren
    ) {
        if (
            child === backControl ||
            child.contains(
                backControl
            )
        ) {
            continue;
        }

        right.append(
            child
        );
    }

    /*
     * Falls die Toolbar einen verschachtelten Back-Button enthielt,
     * aber dessen leerer Wrapper übrig blieb, wird dieser entfernt.
     */
    for (
        const child
        of [
            ...toolbar.children
        ]
    ) {
        if (
            child.childElementCount === 0 &&
            child.textContent.trim() === ""
        ) {
            child.remove();
        }
    }

    toolbar.remove();

    banner.classList.toggle(
        "has-left-actions",
        left.childElementCount > 0
    );

    banner.classList.toggle(
        "has-right-actions",
        right.childElementCount > 0
    );
}


/**
 * Wandelt lokalisierte Namen und Strings in sichtbare
 * Breadcrumb-Segmente um.
 *
 * @param {Array<unknown>} items
 * @returns {string[]}
 */
function normalizeBreadcrumbItems(
    items
) {
    if (!Array.isArray(items)) {
        return [];
    }

    const language =
        getCurrentLanguage();

    const result = [];

    for (const item of items) {
        let text = "";

        if (
            typeof item ===
            "string"
        ) {
            text =
                item.trim();
        }
        else if (
            item &&
            typeof item ===
            "object"
        ) {
            const source =
                Object.prototype.hasOwnProperty.call(
                    item,
                    "name"
                )
                    ? item.name
                    : item;

            text =
                getLocalizedText(
                    source,
                    language
                ).trim();
        }

        if (
            text &&
            result.at(-1) !== text
        ) {
            result.push(
                text
            );
        }
    }

    return result;
}


/**
 * Entfernt ausschließlich die alten Seitentitel.
 * Header innerhalb der Tracking-Liste bleiben erhalten.
 *
 * @param {HTMLElement} page
 */
function removePreviousPageTitles(
    page
) {
    const selectors = [
        ":scope > .page-breadcrumb-banner",
        ":scope > .game-header",
        ":scope > .comms-map-header",
        ":scope > .game-title",
        ":scope > .category-content > .category-content-header"
    ];

    for (const selector of selectors) {
        const elements =
            page.querySelectorAll(
                selector
            );

        for (const element of elements) {
            element.remove();
        }
    }
}


/**
 * Entfernt optionale Einführungstexte auf Ansichten,
 * die bewusst nur den kompakten Banner verwenden sollen.
 *
 * @param {HTMLElement} page
 */
function removePageDescriptions(
    page
) {
    const selectors = [
        ":scope > .game-description",
        ":scope > .category-content > .category-content-description"
    ];

    for (const selector of selectors) {
        const elements =
            page.querySelectorAll(
                selector
            );

        for (const element of elements) {
            element.remove();
        }
    }
}
