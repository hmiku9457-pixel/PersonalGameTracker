import {
    readFile,
    writeFile
} from "node:fs/promises";


const CSS_FILE =
    "assets/css/tracker.css";

const BLOCK_START =
    "/* === COMMS MAP BANNER ALIGNMENT FIX START === */";

const BLOCK_END =
    "/* === COMMS MAP BANNER ALIGNMENT FIX END === */";


let source = await readFile(
    CSS_FILE,
    "utf8"
);

const cssBlock = `
${BLOCK_START}
/*
 * Das globale Website-Header-Layout verwendet drei Grid-Spalten.
 * Der Kartenbanner ist ebenfalls ein <header> und würde dieses
 * Layout sonst übernehmen.
 */
.game-page.comms-map-page
.comms-map-header {
    display: block;
    grid-template-columns: none;
    align-items: initial;

    width: 100%;
    min-height: 0;

    text-align: center;
}

.game-page.comms-map-page
.comms-map-header .game-title {
    grid-column: auto;
    justify-self: auto;

    width: 100%;
    max-width: none;
    margin: 0;

    text-align: center;
    white-space: normal;
}

/*
 * Diese Elemente gehören nicht mehr zum kompakten
 * Navigationsbanner.
 */
.game-page.comms-map-page
.comms-map-header .comms-section-eyebrow,
.game-page.comms-map-page
.comms-map-header .game-description {
    display: none;
}
${BLOCK_END}
`;

const blockPattern =
    new RegExp(
        `${escapeRegExp(BLOCK_START)}[\\s\\S]*?${escapeRegExp(BLOCK_END)}\\s*`,
        "m"
    );

if (blockPattern.test(source)) {
    source = source.replace(
        blockPattern,
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
    "Der Comms-Kartenbanner wurde auf ein einspaltiges Layout umgestellt."
);


function escapeRegExp(value) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}
