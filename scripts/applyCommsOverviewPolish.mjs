import {
    readFile,
    writeFile
} from "node:fs/promises";


const COMMS_VIEW_FILE =
    "assets/js/views/commsOverviewView.js";

const TRACKER_CSS_FILE =
    "assets/css/tracker.css";

const CSS_START =
    "/* === COMMS OVERVIEW POLISH START === */";

const CSS_END =
    "/* === COMMS OVERVIEW POLISH END === */";


await patchCommsView();
await patchTrackerCss();

console.log(
    "Die Comms-Übersicht wurde überarbeitet."
);


/* =========================================================
   commsOverviewView.js
   ========================================================= */

async function patchCommsView() {
    let source = await readFile(
        COMMS_VIEW_FILE,
        "utf8"
    );

    source = replaceNamedFunction(
        source,
        "renderCommsOverview",
        renderCommsOverviewFunction()
    );

    source = replaceNamedFunction(
        source,
        "createSectionCard",
        createSectionCardFunction()
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


/**
 * Neue Comms-Übersicht:
 *
 * - Gesamtfortschritt als Pill in der Toolbar
 * - keine separate Fortschrittskarte am Seitenende
 */
function renderCommsOverviewFunction() {
    return `async function renderCommsOverview(
    game,
    commsManifest,
    routeIds
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
            commsManifest.sections
        )
            ? commsManifest.sections
            : [];

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

        target.progressElement.hidden =
            false;

        target.progressText.textContent =
            \`\${progress.completed} / \${progress.total}\`;

        target.progressFill.style.width =
            \`\${progress.percentage}%\`;

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
        \`\${totalCompleted} / \${totalItems} · \${totalPercentage} %\`;

    overallProgress.setAttribute(
        "aria-label",
        language === "de"
            ? \`Gesamtfortschritt: \${totalCompleted} von \${totalItems}, \${totalPercentage} Prozent\`
            : \`Overall progress: \${totalCompleted} of \${totalItems}, \${totalPercentage} percent\`
    );
}

`;
}


/**
 * Neue Gebietskarte:
 *
 * [ Titel ][ Karten-Icon ]             [ → ]
 *
 * Das Icon belegt dadurch keine eigene obere Zeile mehr.
 */
function createSectionCardFunction() {
    return `function createSectionCard(
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
        "comms-section-card";

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
        "comms-section-card-top";


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
        "comms-section-card-arrow";

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
        "comms-section-card-counts";

    counts.textContent =
        formatCounts(
            section.itemCount,
            section.groupCount,
            language
        );


    const progressElement =
        document.createElement(
            "div"
        );

    progressElement.className =
        "comms-section-card-progress";

    progressElement.hidden =
        true;


    const progressHeader =
        document.createElement(
            "div"
        );

    const progressLabel =
        document.createElement(
            "span"
        );

    progressLabel.textContent =
        uiText.progress;


    const progressText =
        document.createElement(
            "strong"
        );

    progressText.textContent =
        "0 / 0";


    progressHeader.append(
        progressLabel,
        progressText
    );


    const progressTrack =
        document.createElement(
            "div"
        );

    progressTrack.className =
        "progress-bar";


    const progressFill =
        document.createElement(
            "div"
        );

    progressFill.className =
        "progress-bar-fill";

    progressFill.style.width =
        "0%";


    progressTrack.append(
        progressFill
    );

    progressElement.append(
        progressHeader,
        progressTrack
    );


    link.append(
        top,
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

`;
}


/**
 * Ersetzt eine benannte klassische Funktionsdeklaration.
 */
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


/**
 * Ermittelt den Bereich einer Funktion einschließlich ihrer
 * schließenden geschweiften Klammer.
 */
function findFunctionRange(
    source,
    functionName
) {
    const declarationPattern =
        new RegExp(
            `(?:async\\s+)?function\\s+${escapeRegExp(functionName)}\\s*\\(`
        );

    const match =
        declarationPattern.exec(
            source
        );

    if (!match) {
        throw new Error(
            `Die Funktion ${functionName}() konnte nicht gefunden werden.`
        );
    }

    const start =
        match.index;

    const openingBrace =
        source.indexOf(
            "{",
            start
        );

    if (
        openingBrace === -1
    ) {
        throw new Error(
            `Die öffnende Klammer von ${functionName}() fehlt.`
        );
    }

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


/**
 * Klammerauswertung mit Unterstützung für Strings und Kommentare.
 */
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
            current === "'" ||
            current === '"' ||
            current === "`"
        ) {
            state =
                current === "'"
                    ? "single"
                    : current === '"'
                        ? "double"
                        : "template";

            continue;
        }


        if (
            current === "/" &&
            next === "/"
        ) {
            state =
                "line-comment";

            index += 1;
            continue;
        }


        if (
            current === "/" &&
            next === "*"
        ) {
            state =
                "block-comment";

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
        "Eine Funktionsklammer konnte nicht geschlossen werden."
    );
}


/* =========================================================
   tracker.css
   ========================================================= */

async function patchTrackerCss() {
    let source = await readFile(
        TRACKER_CSS_FILE,
        "utf8"
    );

    const cssBlock = `
${CSS_START}
/* =========================================================
   Comms-Übersicht – Fortschritt und kompakte Kartenköpfe
   ========================================================= */

.game-page
.comms-overview-progress {
    flex-shrink: 0;

    min-width: max-content;

    font-variant-numeric:
        tabular-nums;

    text-align: center;
}

.game-page
.comms-overview-progress[hidden] {
    display: none !important;
}


/*
 * Titel, Kartenkennzeichnung und Pfeil liegen in derselben Zeile.
 */
.comms-section-card-top {
    display: flex;
    align-items: center;
    justify-content: flex-start;

    gap: 0.65rem;

    min-width: 0;
}

.comms-section-card-top h3 {
    min-width: 0;
    margin: 0;
}

.comms-section-card-top
.comms-map-indicator {
    flex:
        0
        0
        1.75rem;

    width: 1.75rem;
    height: 1.75rem;

    font-size: 0.95rem;
}

.comms-section-card-top
.comms-section-card-arrow {
    flex-shrink: 0;

    margin-left: auto;
}


/*
 * Der alte separate Gesamtfortschrittsblock wird nicht mehr
 * gerendert. Die Regel verhindert bei alten Browser-Caches
 * einen kurzzeitigen Doppelzustand.
 */
.comms-overview-page
> .comms-overall-progress {
    display: none !important;
}
${CSS_END}
`;

    const pattern =
        new RegExp(
            `${escapeRegExp(CSS_START)}[\\s\\S]*?${escapeRegExp(CSS_END)}\\s*`,
            "m"
        );

    if (
        pattern.test(
            source
        )
    ) {
        source = source.replace(
            pattern,
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
        TRACKER_CSS_FILE,
        source,
        "utf8"
    );

    console.log(
        "tracker.css wurde aktualisiert."
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
