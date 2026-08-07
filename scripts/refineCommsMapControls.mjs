import {
    readFile,
    writeFile
} from "node:fs/promises";


const CSS_FILE =
    "assets/css/tracker.css";

const BLOCK_START =
    "/* === COMMS MAP CONTROLS REFINEMENT START === */";

const BLOCK_END =
    "/* === COMMS MAP CONTROLS REFINEMENT END === */";


let source = await readFile(
    CSS_FILE,
    "utf8"
);


const cssBlock = `
${BLOCK_START}
/* =========================================================
   Comms-Kartenansicht – gegliederter Bedienbereich
   ========================================================= */

/*
 * Linke Spalte:
 * Statusfilter
 *
 * Rechte Spalte:
 * Gruppensteuerung und darunter Sortierung
 */
.game-page
.comms-map-list-content
.category-controls-lower-row {
    display: grid;

    grid-template-columns:
        minmax(0, 1fr)
        minmax(8rem, 0.72fr);

    grid-template-areas:
        "status group-buttons"
        "status sort";

    align-items: start;

    column-gap: 0;
    row-gap: 0.75rem;
}


/*
 * Status und Sortierung liegen ursprünglich im selben Wrapper.
 * Dadurch können beide direkt im äußeren Grid positioniert werden.
 */
.game-page
.comms-map-list-content
.category-filter-sort-row {
    display: contents;
}


/* =========================================================
   Linke Spalte – Status
   ========================================================= */

.game-page
.comms-map-list-content
.category-status-filter {
    grid-area: status;

    width: 100%;
    min-width: 0;

    padding-right: 0.85rem;
}


/* =========================================================
   Rechte Spalte – Gruppensteuerung
   ========================================================= */

.game-page
.comms-map-list-content
.category-group-controls.is-integrated {
    grid-area: group-buttons;

    width: 100%;
    min-width: 0;
    margin: 0;
    padding-left: 0.85rem;

    display: grid;
    grid-template-columns: 1fr;

    gap: 0.45rem;

    border-left:
        1px
        solid
        #374151;
}


/*
 * Ergänzt eine klare Überschrift, ohne zusätzliches JavaScript.
 */
.game-page
.comms-map-list-content
.category-group-controls.is-integrated::before {
    content: "Gruppen:";

    display: block;

    margin:
        0
        0
        0.1rem;

    color: #f3f4f6;

    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1.3;
}

html[lang="en"]
.game-page
.comms-map-list-content
.category-group-controls.is-integrated::before {
    content: "Groups:";
}


.game-page
.comms-map-list-content
.category-group-controls.is-integrated
.category-group-control-button {
    width: 100%;
    min-height: 36px;
}


/* =========================================================
   Rechte Spalte – Sortierung
   ========================================================= */

.game-page
.comms-map-list-content
.category-sort {
    grid-area: sort;

    width: 100%;
    min-width: 0;
    margin: 0;

    padding:
        0.75rem
        0
        0
        0.85rem;

    border-top:
        1px
        solid
        #374151;

    border-left:
        1px
        solid
        #374151;
}


.game-page
.comms-map-list-content
.category-sort
.category-control-label {
    display: block;

    margin:
        0
        0
        0.45rem;
}


.game-page
.comms-map-list-content
.category-sort-select {
    width: 100%;
    min-width: 0;
}


/*
 * Auf sehr schmalen Kartenleisten wird wieder untereinander
 * angeordnet. Die optische Gruppierung bleibt bestehen.
 */
@media (max-width: 430px) {
    .game-page
    .comms-map-list-content
    .category-controls-lower-row {
        grid-template-columns: 1fr;

        grid-template-areas:
            "status"
            "group-buttons"
            "sort";

        row-gap: 0.85rem;
    }

    .game-page
    .comms-map-list-content
    .category-status-filter {
        padding-right: 0;
    }

    .game-page
    .comms-map-list-content
    .category-group-controls.is-integrated,

    .game-page
    .comms-map-list-content
    .category-sort {
        padding-left: 0;

        border-left: 0;
    }

    .game-page
    .comms-map-list-content
    .category-group-controls.is-integrated {
        padding-top: 0.75rem;

        border-top:
            1px
            solid
            #374151;
    }
}
${BLOCK_END}
`;


const existingBlockPattern =
    new RegExp(
        `${escapeRegExp(BLOCK_START)}[\\s\\S]*?${escapeRegExp(BLOCK_END)}\\s*`,
        "m"
    );


if (
    existingBlockPattern.test(
        source
    )
) {
    source = source.replace(
        existingBlockPattern,
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
    "Der Bedienbereich der Comms-Kartenansicht wurde verfeinert."
);


function escapeRegExp(
    value
) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}
