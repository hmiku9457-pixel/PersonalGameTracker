import {
    copyFile,
    readFile,
    writeFile
} from "node:fs/promises";


const VIEW_SOURCE =
    "scripts/navigation-banner-files/pageBreadcrumbView.js";

const VIEW_TARGET =
    "assets/js/views/pageBreadcrumbView.js";

const COMMS_VIEW_FILE =
    "assets/js/views/commsOverviewView.js";

const CSS_FILE =
    "assets/css/tracker.css";

const CSS_START =
    "/* === NAVIGATION BANNER POLISH START === */";

const CSS_END =
    "/* === NAVIGATION BANNER POLISH END === */";


await copyFile(
    VIEW_SOURCE,
    VIEW_TARGET
);

console.log(
    "pageBreadcrumbView.js wurde aktualisiert."
);


await patchCommsBackLink();
await patchTrackerCss();

console.log(
    "Die Navigationsbanner wurden vollständig überarbeitet."
);


/**
 * Vereinheitlicht auch die Quellklasse des Comms-Zurück-Links.
 * Die neue Breadcrumb-View erkennt zusätzlich beide Klassen,
 * sodass der Patch auch bei abweichenden Zwischenständen robust ist.
 */
async function patchCommsBackLink() {
    let source = await readFile(
        COMMS_VIEW_FILE,
        "utf8"
    );

    const oldAssignment =
        'backLink.className = "category-back-link";';

    const newAssignment =
        'backLink.className = "back-button category-back-link";';

    if (source.includes(newAssignment)) {
        console.log(
            "Der Comms-Zurück-Link besitzt bereits den gemeinsamen Button-Stil."
        );
        return;
    }

    if (!source.includes(oldAssignment)) {
        throw new Error(
            "Die Klassen-Zuweisung des Comms-Zurück-Links konnte nicht gefunden werden."
        );
    }

    source = source.replace(
        oldAssignment,
        newAssignment
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
 * Ergänzt die abschließenden Designregeln.
 */
async function patchTrackerCss() {
    let source = await readFile(
        CSS_FILE,
        "utf8"
    );

    const cssBlock = `
${CSS_START}
/* =========================================================
   Navigationsbanner – abschließende Vereinheitlichung
   ========================================================= */

/*
 * Einheitliche Höhe auf großen Ansichten:
 *
 * [ Zurück ] [ Breadcrumb ] [ Fortschritt / Aktionen ]
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

    width: 100%;
    min-height: 68px;

    margin:
        0
        0
        1rem;

    padding:
        0.75rem
        0.9rem;

    gap: 1rem;

    background-color: #1f2937;

    border:
        1px
        solid
        #374151;

    border-radius: 10px;

    box-shadow:
        0 6px 16px
        rgb(0 0 0 / 22%);
}

.game-page
.page-breadcrumb-title {
    grid-area: title;

    min-width: 0;
    max-width: 100%;
    margin: 0;

    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;

    justify-self: center;

    font-size: clamp(
        1rem,
        1.2vw,
        1.35rem
    );

    font-weight: 700;
    line-height: 1.3;

    text-align: center;
}

.game-page
.page-breadcrumb-segment {
    white-space: nowrap;
}

.game-page
.page-breadcrumb-separator {
    flex: 0 0 auto;

    padding:
        0
        0.24rem;

    color: #9ca3af;

    white-space: pre;
}

.game-page
.page-breadcrumb-actions {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 0.65rem;
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

.game-page
.page-breadcrumb-actions-right
.comms-map-toolbar-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    gap: 0.65rem;
}

/*
 * Sämtliche Zurück-Navigationen verwenden denselben Button-Stil.
 */
.game-page
.page-breadcrumb-banner
.back-button,

.game-page
.page-breadcrumb-banner
.category-back-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    min-height: 38px;

    margin: 0;
    padding:
        0.45rem
        0.8rem;

    color: #d1d5db;
    background-color:
        rgb(17 24 39 / 62%);

    border:
        1px
        solid
        #4b5563;

    border-radius: 6px;

    font: inherit;
    font-size: 0.9rem;
    font-weight: 500;

    line-height: 1.2;
    text-decoration: none;

    white-space: nowrap;

    cursor: pointer;

    transition:
        color 0.2s ease,
        background-color 0.2s ease,
        border-color 0.2s ease;
}

.game-page
.page-breadcrumb-banner
.back-button:hover,

.game-page
.page-breadcrumb-banner
.category-back-link:hover {
    color: #ffffff;
    background-color: #111827;
    border-color: #6b7280;
}

.game-page
.page-breadcrumb-banner
.back-button:focus-visible,

.game-page
.page-breadcrumb-banner
.category-back-link:focus-visible {
    outline:
        2px
        solid
        #60a5fa;

    outline-offset: 2px;
}

/*
 * Untertexte unter dem Navigationsbanner werden grundsätzlich
 * ausgeblendet. JavaScript entfernt sie zusätzlich aus dem DOM.
 */
.game-page.has-page-breadcrumb-banner
> .game-description,

.game-page.has-page-breadcrumb-banner
> .game-header
> .game-description,

.game-page.has-page-breadcrumb-banner
> .category-content
> .category-content-description {
    display: none !important;
}

/*
 * Die alte Toolbar darf nach dem Zusammenführen nicht mehr separat
 * sichtbar bleiben.
 */
.game-page.has-merged-navigation-banner
> .category-toolbar {
    display: none;
}

/*
 * Bei schmaleren Desktop- und Tabletansichten wird der Breadcrumb
 * in eine eigene Zeile gelegt. Dadurch kann er niemals mit den
 * seitlichen Bedienelementen überlappen.
 *
 * Die zweite Zeile besitzt immer dieselbe Höhe – auch auf Seiten
 * ohne Buttons. Somit bleiben alle Banner innerhalb derselben
 * Bildschirmbreite exakt gleich hoch.
 */
@media (max-width: 1450px) {
    .game-page
    .page-breadcrumb-banner {
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
    .page-breadcrumb-title {
        width: 100%;

        justify-self: stretch;
    }
}

/*
 * Auf Smartphones dürfen die rechten Aktionen umbrechen.
 */
@media (max-width: 700px) {
    .game-page
    .page-breadcrumb-banner {
        grid-template-columns: 1fr;

        grid-template-rows:
            auto
            auto
            auto;

        grid-template-areas:
            "title"
            "left"
            "right";

        min-height: 0;

        padding:
            0.75rem
            0.7rem;
    }

    .game-page
    .page-breadcrumb-actions-left,
    .game-page
    .page-breadcrumb-actions-right {
        width: 100%;

        justify-self: stretch;
    }

    .game-page
    .page-breadcrumb-actions {
        flex-wrap: wrap;
    }

    .game-page
    .page-breadcrumb-actions-left {
        justify-content: flex-start;
    }

    .game-page
    .page-breadcrumb-actions-right,
    .game-page
    .page-breadcrumb-actions-right
    .comms-map-toolbar-actions {
        justify-content: flex-end;
    }
}

/*
 * Sehr schmale Displays: der Zurück-Button nutzt die volle Breite,
 * weitere Aktionen werden gleichmäßig verteilt.
 */
@media (max-width: 430px) {
    .game-page
    .page-breadcrumb-actions-left
    .back-button,

    .game-page
    .page-breadcrumb-actions-left
    .category-back-link {
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

    if (pattern.test(source)) {
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
        CSS_FILE,
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
