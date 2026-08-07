import {
    copyFile,
    readFile,
    writeFile
} from "node:fs/promises";


const VIEW_SOURCE =
    "scripts/merged-banner-files/pageBreadcrumbView.js";

const VIEW_TARGET =
    "assets/js/views/pageBreadcrumbView.js";

const CSS_FILE =
    "assets/css/tracker.css";

const CSS_START =
    "/* === MERGED NAVIGATION BANNER START === */";

const CSS_END =
    "/* === MERGED NAVIGATION BANNER END === */";


await copyFile(
    VIEW_SOURCE,
    VIEW_TARGET
);

console.log(
    "pageBreadcrumbView.js wurde aktualisiert."
);


let css = await readFile(
    CSS_FILE,
    "utf8"
);

const cssBlock = `
${CSS_START}
/* =========================================================
   Zusammengeführter Navigationsbanner
   ========================================================= */

/*
 * Eine Kopfzeile für:
 *
 * [ Zurück ] [ Navigationspfad ] [ Fortschritt / Aktionen ]
 *
 * Die beiden äußeren Spalten sind gleich breit. Dadurch bleibt
 * der Breadcrumb unabhängig von der Breite der Aktionen exakt
 * in der verfügbaren Gesamtfläche zentriert.
 */
.game-page
.page-breadcrumb-banner {
    position: sticky;
    top: 0;
    z-index: 20;

    display: grid;
    grid-template-columns:
        minmax(0, 1fr)
        minmax(0, auto)
        minmax(0, 1fr);
    grid-template-areas:
        "left title right";

    align-items: center;

    gap: 1rem;

    margin:
        0
        0
        1rem;

    padding:
        0.8rem
        0.9rem;

    background-color: #1f2937;
    border: 1px solid #374151;
    border-radius: 10px;

    box-shadow:
        0 6px 16px
        rgb(0 0 0 / 22%);
}

.game-page
.page-breadcrumb-title {
    grid-area: title;

    min-width: 0;
    width: auto;
    max-width: 100%;

    justify-self: center;

    margin: 0;

    text-align: center;
}

.game-page
.page-breadcrumb-actions {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 0.75rem;
}

.game-page
.page-breadcrumb-actions-left {
    grid-area: left;

    justify-self: start;
    justify-content: flex-start;
}

.game-page
.page-breadcrumb-actions-right {
    grid-area: right;

    justify-self: end;
    justify-content: flex-end;
}

/*
 * Die Action-Gruppe der Kartenansicht bleibt kompakt und wird
 * vollständig in die rechte Bannerseite übernommen.
 */
.game-page
.page-breadcrumb-actions-right
.comms-map-toolbar-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    gap: 0.75rem;
}

/*
 * Die alte Toolbar wird durch JavaScript entfernt.
 * Diese Regel verhindert ein kurzes Aufblitzen vor dem Umbau.
 */
.game-page.has-merged-navigation-banner
> .category-toolbar {
    display: none;
}

/*
 * In dem neuen dunkleren Banner sollen die bestehenden Buttons
 * etwas stärker mit dem Banner verschmelzen.
 */
.game-page
.page-breadcrumb-banner
.back-button,

.game-page
.page-breadcrumb-banner
.comms-map-panel-toggle {
    background-color:
        rgb(17 24 39 / 62%);

    border-color: #4b5563;
}

.game-page
.page-breadcrumb-banner
.back-button:hover,

.game-page
.page-breadcrumb-banner
.comms-map-panel-toggle:hover {
    background-color: #111827;
}

/*
 * Mittelgroße Ansichten:
 * Der Pfad bleibt oben zentriert, Bedienelemente liegen darunter
 * weiterhin innerhalb desselben Banners.
 */
@media (max-width: 900px) {
    .game-page
    .page-breadcrumb-banner {
        grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);

        grid-template-areas:
            "title title"
            "left right";

        row-gap: 0.75rem;
    }

    .game-page
    .page-breadcrumb-title {
        width: 100%;
    }
}

/*
 * Smartphones:
 * Aktionen dürfen umbrechen. Der Zurück-Button bleibt links,
 * Fortschritt und Zusatzaktion rechts beziehungsweise darunter.
 */
@media (max-width: 600px) {
    .game-page
    .page-breadcrumb-banner {
        padding:
            0.75rem
            0.7rem;

        gap: 0.65rem;
    }

    .game-page
    .page-breadcrumb-actions {
        flex-wrap: wrap;
    }

    .game-page
    .page-breadcrumb-actions-right {
        justify-content: flex-end;
    }

    .game-page
    .page-breadcrumb-actions-right
    .comms-map-toolbar-actions {
        flex-wrap: wrap;
    }
}

/*
 * Sehr schmale Displays:
 * Alle Bereiche werden untereinander dargestellt, bleiben aber
 * Teil desselben Banners.
 */
@media (max-width: 430px) {
    .game-page
    .page-breadcrumb-banner {
        grid-template-columns: 1fr;

        grid-template-areas:
            "title"
            "left"
            "right";
    }

    .game-page
    .page-breadcrumb-actions-left,
    .game-page
    .page-breadcrumb-actions-right {
        width: 100%;

        justify-self: stretch;
    }

    .game-page
    .page-breadcrumb-actions-left
    .back-button {
        width: 100%;
    }

    .game-page
    .page-breadcrumb-actions-right,
    .game-page
    .page-breadcrumb-actions-right
    .comms-map-toolbar-actions {
        justify-content: space-between;
    }
}
${CSS_END}
`;

const pattern =
    new RegExp(
        `${escapeRegExp(CSS_START)}[\\s\\S]*?${escapeRegExp(CSS_END)}\\s*`,
        "m"
    );

if (pattern.test(css)) {
    css = css.replace(
        pattern,
        cssBlock.trim() + "\n"
    );
}
else {
    css =
        css.trimEnd() +
        "\n\n" +
        cssBlock.trim() +
        "\n";
}

await writeFile(
    CSS_FILE,
    css,
    "utf8"
);

console.log(
    "tracker.css wurde aktualisiert."
);


function escapeRegExp(
    value
) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}
