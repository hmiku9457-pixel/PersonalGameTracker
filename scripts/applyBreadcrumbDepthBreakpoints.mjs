import {
    readFile,
    writeFile
} from "node:fs/promises";


const BREADCRUMB_VIEW_FILE =
    "assets/js/views/pageBreadcrumbView.js";

const TRACKER_CSS_FILE =
    "assets/css/tracker.css";

const CSS_START =
    "/* === BREADCRUMB DEPTH BREAKPOINTS START === */";

const CSS_END =
    "/* === BREADCRUMB DEPTH BREAKPOINTS END === */";


await patchBreadcrumbView();
await patchTrackerCss();

console.log(
    "Breadcrumb-Depth-Breakpoints wurden eingerichtet."
);


async function patchBreadcrumbView() {
    let source = await readFile(
        BREADCRUMB_VIEW_FILE,
        "utf8"
    );

    if (
        source.includes(
            "banner.dataset.breadcrumbDepth"
        )
    ) {
        console.log(
            "pageBreadcrumbView.js enthält die Breadcrumb-Tiefe bereits."
        );
        return;
    }

    const classAssignmentPattern =
        /banner\.className\s*=\s*["']page-breadcrumb-banner["'];/;

    if (
        !classAssignmentPattern.test(
            source
        )
    ) {
        throw new Error(
            "Die Klassen-Zuweisung des Breadcrumb-Banners konnte nicht gefunden werden."
        );
    }

    const addition = `banner.className =
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
            : \`breadcrumb-depth-\${breadcrumbDepth}\`
    );`;

    source = source.replace(
        classAssignmentPattern,
        addition
    );

    await writeFile(
        BREADCRUMB_VIEW_FILE,
        source,
        "utf8"
    );

    console.log(
        "pageBreadcrumbView.js wurde aktualisiert."
    );
}


async function patchTrackerCss() {
    let source = await readFile(
        TRACKER_CSS_FILE,
        "utf8"
    );

    source = removeMarkedBlock(
        source,
        CSS_START,
        CSS_END
    );

    source = removeLegacyGenericBreakpoint(
        source
    );

    const cssBlock = `
${CSS_START}
/* =========================================================
   Breadcrumb-Umbruch abhängig von der Navigationstiefe
   ========================================================= */

/*
 * Depth 3 und tiefer:
 *
 * The Division 2 - Collectibles - Comms - New York
 */
@media (max-width: 1600px) {
    .game-page
    .page-breadcrumb-banner.breadcrumb-depth-3-plus {
        grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);

        grid-template-rows:
            auto
            38px;

        grid-template-areas:
            "title title"
            "left right";

        min-height: 104px;

        row-gap: 0.65rem;
    }

    .game-page
    .page-breadcrumb-banner.breadcrumb-depth-3-plus
    .page-breadcrumb-title {
        width: 100%;

        justify-self: stretch;
    }
}


/*
 * Depth 2:
 *
 * The Division 2 - Collectibles - Comms
 */
@media (max-width: 1350px) {
    .game-page
    .page-breadcrumb-banner.breadcrumb-depth-2 {
        grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);

        grid-template-rows:
            auto
            38px;

        grid-template-areas:
            "title title"
            "left right";

        min-height: 104px;

        row-gap: 0.65rem;
    }

    .game-page
    .page-breadcrumb-banner.breadcrumb-depth-2
    .page-breadcrumb-title {
        width: 100%;

        justify-self: stretch;
    }
}


/*
 * Depth 1:
 *
 * The Division 2 - Exotics
 */
@media (max-width: 1100px) {
    .game-page
    .page-breadcrumb-banner.breadcrumb-depth-1 {
        grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);

        grid-template-rows:
            auto
            38px;

        grid-template-areas:
            "title title"
            "left right";

        min-height: 104px;

        row-gap: 0.65rem;
    }

    .game-page
    .page-breadcrumb-banner.breadcrumb-depth-1
    .page-breadcrumb-title {
        width: 100%;

        justify-self: stretch;
    }
}


/*
 * Depth 0 besteht nur aus dem Spielnamen und benötigt keinen
 * eigenen Desktop-Breakpoint. Das vorhandene mobile Layout bleibt
 * unverändert.
 */
${CSS_END}
`;

    source =
        source.trimEnd() +
        "\n\n" +
        cssBlock.trim() +
        "\n";

    await writeFile(
        TRACKER_CSS_FILE,
        source,
        "utf8"
    );

    console.log(
        "tracker.css wurde aktualisiert."
    );
}


function removeMarkedBlock(
    source,
    start,
    end
) {
    const pattern =
        new RegExp(
            `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\s*`,
            "m"
        );

    return source.replace(
        pattern,
        ""
    );
}


function removeLegacyGenericBreakpoint(
    source
) {
    const commentNeedle =
        "Bei schmaleren Desktop- und Tabletansichten";

    const commentTextIndex =
        source.indexOf(
            commentNeedle
        );

    if (
        commentTextIndex === -1
    ) {
        console.log(
            "Kein alter allgemeiner Breadcrumb-Breakpoint gefunden."
        );

        return source;
    }

    const commentStart =
        source.lastIndexOf(
            "/*",
            commentTextIndex
        );

    const commentEnd =
        source.indexOf(
            "*/",
            commentTextIndex
        );

    if (
        commentStart === -1 ||
        commentEnd === -1
    ) {
        throw new Error(
            "Der Kommentar des alten Breadcrumb-Breakpoints konnte nicht vollständig gelesen werden."
        );
    }

    const mediaStart =
        source.indexOf(
            "@media",
            commentEnd + 2
        );

    if (
        mediaStart === -1
    ) {
        throw new Error(
            "Die alte allgemeine @media-Regel konnte nicht gefunden werden."
        );
    }

    const openingBrace =
        source.indexOf(
            "{",
            mediaStart
        );

    if (
        openingBrace === -1
    ) {
        throw new Error(
            "Die öffnende Klammer der alten @media-Regel fehlt."
        );
    }

    const mediaEnd =
        findMatchingClosingBrace(
            source,
            openingBrace
        );

    const before =
        source.slice(
            0,
            commentStart
        ).trimEnd();

    const after =
        source.slice(
            mediaEnd + 1
        ).trimStart();

    console.log(
        "Der alte allgemeine Breadcrumb-Breakpoint wurde entfernt."
    );

    return `${before}\n\n${after}`;
}


function findMatchingClosingBrace(
    source,
    openingBrace
) {
    let depth = 0;

    for (
        let index = openingBrace;
        index < source.length;
        index += 1
    ) {
        const character =
            source[index];

        if (
            character === "{"
        ) {
            depth += 1;
        }
        else if (
            character === "}"
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
        "Die schließende Klammer der alten @media-Regel konnte nicht gefunden werden."
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
