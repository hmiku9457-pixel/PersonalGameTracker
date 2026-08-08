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
 * Ersetzt die bisherigen Seitentitel durch einen gemeinsamen
 * Navigationsbanner.
 *
 * Vorhandene Toolbar-Elemente werden in den Banner verschoben:
 *
 * - Zurück-Button links
 * - Breadcrumb mittig
 * - Fortschritt und Zusatzaktionen rechts
 *
 * Beschreibende Untertexte unter dem Banner werden grundsätzlich
 * entfernt, da die nachfolgenden Kacheln beziehungsweise Listen den
 * Inhalt bereits ausreichend erklären.
 *
 * @param {Array<unknown>} items
 * @param {Object} options
 * @param {boolean} options.removeDescriptions
 * @returns {HTMLElement|null}
 */
export function applyPageBreadcrumbBanner(
    items,
    {
        removeDescriptions = true
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


    const breadcrumbDepth = Math.max(
        0,
        segments.length - 1
    );

    banner.dataset.breadcrumbDepth =
        String(
            breadcrumbDepth
        );

    banner.classList.add(
        breadcrumbDepth >= 3
            ? "breadcrumb-depth-3-plus"
            : `breadcrumb-depth-${breadcrumbDepth}`
    );

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
 * Verschiebt die vorhandenen Toolbar-Elemente in den Banner.
 *
 * Der Comms-Zurück-Link verwendete ursprünglich eine eigene Klasse.
 * Beide Varianten werden deshalb als Zurück-Navigation erkannt und
 * anschließend mit dem gemeinsamen Button-Stil versehen.
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
            ".back-button, .category-back-link"
        );

    if (backControl) {
        backControl.classList.add(
            "back-button"
        );

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
 * Entfernt beschreibende Untertexte direkt unter dem Seitenbanner.
 *
 * @param {HTMLElement} page
 */
function removePageDescriptions(
    page
) {
    const selectors = [
        ":scope > .game-description",
        ":scope > .game-header > .game-description",
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
