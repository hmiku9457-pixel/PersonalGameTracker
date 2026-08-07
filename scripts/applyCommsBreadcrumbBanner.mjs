import {
    readFile,
    writeFile
} from "node:fs/promises";


const CATEGORY_VIEW_FILE =
    "assets/js/views/categoryView.js";

const TRACKER_CSS_FILE =
    "assets/css/tracker.css";

const CSS_START =
    "/* === COMMS BREADCRUMB BANNER START === */";

const CSS_END =
    "/* === COMMS BREADCRUMB BANNER END === */";


await patchCategoryView();
await patchTrackerCss();

console.log(
    "Comms-Navigationsbanner wurde aktualisiert."
);


/**
 * Kennzeichnet ausschließlich die Listenansicht
 * „Collectibles → Comms → Missionen“.
 */
async function patchCategoryView() {
    let source = await readFile(
        CATEGORY_VIEW_FILE,
        "utf8"
    );

    if (
        source.includes(
            'gamePage.classList.add(\n\t\t\t\t"comms-list-page"'
        ) ||
        source.includes(
            'gamePage.classList.add(\r\n\t\t\t\t"comms-list-page"'
        )
    ) {
        console.log(
            "categoryView.js enthält die Comms-Kennzeichnung bereits."
        );
        return;
    }

    const classAssignmentPattern =
        /(gamePage\.className\s*=\s*["']game-page["'];)/;

    if (
        !classAssignmentPattern.test(source)
    ) {
        throw new Error(
            "Die Zuweisung von gamePage.className konnte in categoryView.js nicht gefunden werden."
        );
    }

    const addition = `$1


		const isCommsMissionList =
			category.id === "missions" &&
			typeof category.parentHash === "string" &&
			category.parentHash.includes(
				"/collectibles/comms"
			);


		if (
			isCommsMissionList
		) {
			gamePage.classList.add(
				"comms-list-page"
			);
		}`;

    source = source.replace(
        classAssignmentPattern,
        addition
    );

    await writeFile(
        CATEGORY_VIEW_FILE,
        source,
        "utf8"
    );

    console.log(
        "categoryView.js wurde aktualisiert."
    );
}


/**
 * Vereinheitlicht die Gebiets- und Missionsbanner und ergänzt
 * den sichtbaren Navigationspfad.
 *
 * Der Header des seitlichen Tracking-Panels bleibt unverändert.
 */
async function patchTrackerCss() {
    let source = await readFile(
        TRACKER_CSS_FILE,
        "utf8"
    );

    const cssBlock = `
${CSS_START}
/* =========================================================
   Comms – einheitliche Banner mit Navigationspfad
   ========================================================= */

/*
 * Kartenüberschriften wie „New York“ mittig ausrichten.
 */
.game-page .comms-map-header {
    text-align: center;
}

.game-page .comms-map-header h1,
.game-page .comms-map-header h2,
.game-page .comms-map-header h3 {
    margin: 0;

    font-size: clamp(
        1.05rem,
        1.25vw,
        1.45rem
    );
    line-height: 1.35;
    overflow-wrap: anywhere;
}

/*
 * Den vollständigen Pfad vor dem vorhandenen, lokalisierten
 * Gebietsnamen darstellen.
 */
.game-page .comms-map-header h1::before,
.game-page .comms-map-header h2::before,
.game-page .comms-map-header h3::before {
    content: "The Division 2 - Collectibles - Comms - ";
}

/*
 * In der speziellen Comms-Missionsansicht wird der allgemeine
 * Spieltitel nicht zusätzlich angezeigt.
 */
.game-page.comms-list-page > .game-header {
    display: none;
}

/*
 * Der bisherige Erklärungstext unter „Missionen“ entfällt.
 */
.game-page.comms-list-page
.category-content-description {
    display: none;
}

/*
 * „Missionen“ erhält denselben kompakten Bannerstil wie die
 * Kartenregionen.
 */
.game-page.comms-list-page
.category-content-header {
    margin: 0 0 1rem;
    padding: 0.95rem 1.15rem;

    text-align: center;

    background-color: #1f2937;
    border: 1px solid #374151;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

.game-page.comms-list-page
.category-content-header h1,
.game-page.comms-list-page
.category-content-header h2,
.game-page.comms-list-page
.category-content-header h3 {
    margin: 0;

    font-size: clamp(
        1.05rem,
        1.25vw,
        1.45rem
    );
    line-height: 1.35;
    overflow-wrap: anywhere;
}

.game-page.comms-list-page
.category-content-header h1::before,
.game-page.comms-list-page
.category-content-header h2::before,
.game-page.comms-list-page
.category-content-header h3::before {
    content: "The Division 2 - Collectibles - Comms - ";
}

@media (max-width: 900px) {
    .game-page.comms-list-page
    .category-content-header {
        padding: 0.85rem 1rem;
    }

    .game-page .comms-map-header h1,
    .game-page .comms-map-header h2,
    .game-page .comms-map-header h3,
    .game-page.comms-list-page
    .category-content-header h1,
    .game-page.comms-list-page
    .category-content-header h2,
    .game-page.comms-list-page
    .category-content-header h3 {
        font-size: 1rem;
    }
}
${CSS_END}
`;

    const existingBlockPattern =
        new RegExp(
            `${escapeRegExp(CSS_START)}[\\s\\S]*?${escapeRegExp(CSS_END)}\\s*`,
            "m"
        );

    /*
     * Entfernt zusätzlich den älteren Bannerblock, falls dieser bereits
     * testweise angewendet wurde.
     */
    const oldBlockPattern =
        /\/\* === COMMS CATEGORY BANNER CONSISTENCY START === \*\/[\s\S]*?\/\* === COMMS CATEGORY BANNER CONSISTENCY END === \*\/\s*/m;

    source = source.replace(
        oldBlockPattern,
        ""
    );

    if (
        existingBlockPattern.test(source)
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
        TRACKER_CSS_FILE,
        source,
        "utf8"
    );

    console.log(
        "tracker.css wurde aktualisiert."
    );
}


function escapeRegExp(value) {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}
