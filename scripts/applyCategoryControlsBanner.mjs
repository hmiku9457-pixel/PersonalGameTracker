import {
    readFile,
    writeFile
} from "node:fs/promises";


const CONTROLS_VIEW_FILE =
    "assets/js/views/categoryControlsView.js";

const TRACKER_CSS_FILE =
    "assets/css/tracker.css";

const CSS_START =
    "/* === CATEGORY CONTROLS BANNER START === */";

const CSS_END =
    "/* === CATEGORY CONTROLS BANNER END === */";


await patchControlsView();
await patchTrackerCss();

console.log(
    "Suche, Filter, Sortierung und Gruppensteuerung wurden in einem Banner zusammengeführt."
);


/* =========================================================
   categoryControlsView.js
   ========================================================= */

async function patchControlsView() {
    let source = await readFile(
        CONTROLS_VIEW_FILE,
        "utf8"
    );

    source = patchExistingControlsCleanup(
        source
    );

    source = patchControlsComposition(
        source
    );

    source = patchInsertionTarget(
        source
    );

    await writeFile(
        CONTROLS_VIEW_FILE,
        source,
        "utf8"
    );

    console.log(
        "categoryControlsView.js wurde aktualisiert."
    );
}


/**
 * Bewahrt eine bereits integrierte Gruppensteuerung, falls die
 * Controls innerhalb derselben Ansicht erneut gerendert werden.
 */
function patchExistingControlsCleanup(
    source
) {
    if (
        source.includes(
            "existingIntegratedGroupControls"
        )
    ) {
        return source;
    }

    const pattern =
        /if\s*\(\s*existingControls\s*\)\s*\{\s*existingControls\.remove\(\);\s*\}/m;

    if (!pattern.test(source)) {
        throw new Error(
            "Der bisherige Cleanup der Kategorie-Controls konnte nicht gefunden werden."
        );
    }

    const replacement = `if (existingControls) {

		const existingIntegratedGroupControls =
			existingControls.querySelector(
				".category-group-controls"
			);


		if (
			existingIntegratedGroupControls
		) {
			existingIntegratedGroupControls
				.classList.remove(
					"is-integrated"
				);

			existingControls.before(
				existingIntegratedGroupControls
			);
		}


		existingControls.remove();
	}`;

    return source.replace(
        pattern,
        replacement
    );
}


/**
 * Baut innerhalb des äußeren Banners zwei Bereiche:
 *
 * - Suchzeile
 * - untere Zeile mit Filter/Sortierung und Gruppenbuttons
 *
 * Die vorhandene Gruppensteuerung wird als DOM-Element verschoben.
 * Dadurch bleiben deren Event-Listener vollständig erhalten.
 */
function patchControlsComposition(
    source
) {
    if (
        source.includes(
            'lowerRow.className =\n\t\t"category-controls-lower-row"'
        )
    ) {
        return source;
    }

    const pattern =
        /controls\.append\(\s*searchContainer,\s*filterSortRow,\s*emptyMessage\s*\);/m;

    if (!pattern.test(source)) {
        throw new Error(
            "Das Zusammensetzen der Kategorie-Controls konnte nicht gefunden werden."
        );
    }

    const replacement = `const lowerRow =
		document.createElement(
			"div"
		);


	lowerRow.className =
		"category-controls-lower-row";


	const groupControls =
		container.querySelector(
			":scope > .category-group-controls"
		);


	lowerRow.append(
		filterSortRow
	);


	if (groupControls) {
		groupControls.classList.add(
			"is-integrated"
		);

		lowerRow.append(
			groupControls
		);
	}


	controls.append(
		searchContainer,
		lowerRow,
		emptyMessage
	);`;

    return source.replace(
        pattern,
        replacement
    );
}


/**
 * Nach dem Verschieben der Gruppensteuerung darf diese nicht mehr
 * als Einfügeanker verwendet werden, da sie nun innerhalb des neuen
 * Banners liegt.
 */
function patchInsertionTarget(
    source
) {
    const legacyEntry =
        '" .category-group-controls"';

    if (
        source.includes(
            legacyEntry
        )
    ) {
        /*
         * Nur eine mögliche ungewöhnliche Formatierung abfangen.
         */
        source = source.replace(
            legacyEntry,
            ""
        );
    }

    const pattern =
        /(\[\s*)"\.category-group-controls",\s*("\.category-group",\s*"\.tracker-list"\s*\])/m;

    if (pattern.test(source)) {
        return source.replace(
            pattern,
            "$1$2"
        );
    }

    /*
     * Bereits korrigiert.
     */
    if (
        !source.includes(
            '".category-group-controls",'
        )
    ) {
        return source;
    }

    /*
     * Whitespace-toleranter Fallback.
     */
    const fallbackPattern =
        /\s*"\.category-group-controls",\s*/m;

    if (!fallbackPattern.test(source)) {
        throw new Error(
            "Der alte Einfügeanker der Gruppensteuerung konnte nicht entfernt werden."
        );
    }

    return source.replace(
        fallbackPattern,
        "\n\t\t\t\t"
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
   Gemeinsamer Banner für Kategorie-Bedienelemente
   ========================================================= */

/*
 * Äußerer gemeinsamer Banner:
 *
 * - Suche
 * - Statusfilter
 * - Sortierung
 * - Alle öffnen / Alle schließen
 */
.game-page
.category-list-controls {
    width: 100%;

    margin:
        0
        0
        1rem;

    padding: 1rem;

    background-color: #1f2937;

    border:
        1px
        solid
        #374151;

    border-radius: 10px;

    box-shadow:
        0 4px 12px
        rgb(0 0 0 / 15%);
}


/*
 * Die Suche ist der obere Bereich des Banners.
 */
.game-page
.category-list-controls
.category-search {
    margin: 0;
}


/*
 * Filter, Sortierung und Gruppensteuerung bilden eine gemeinsame
 * untere Zeile.
 */
.game-page
.category-controls-lower-row {
    width: 100%;

    margin-top: 1rem;
    padding-top: 1rem;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 1rem;

    border-top:
        1px
        solid
        #374151;
}


/*
 * Die bisher eigenständige Filterkarte wird Teil des äußeren
 * Banners und benötigt deshalb keinen zweiten Hintergrund oder
 * Rahmen mehr.
 */
.game-page
.category-controls-lower-row
.category-filter-sort-row {
    flex:
        1
        1
        auto;

    width: auto;
    min-width: 0;

    padding: 0;

    background: transparent;

    border: 0;
    border-radius: 0;
}


/*
 * Die Akkordeon-Buttons sitzen rechts in derselben Zeile.
 */
.game-page
.category-controls-lower-row
.category-group-controls.is-integrated {
    flex:
        0
        0
        auto;

    margin: 0;

    justify-content: flex-end;
}


/*
 * Die Buttons erhalten innerhalb des Banners denselben dunklen
 * Grundton wie Suchfeld und Sortierauswahl.
 */
.game-page
.category-controls-lower-row
.category-group-control-button {
    min-height: 34px;

    background-color: #111827;
}


/*
 * Die Meldung für eine leere Trefferliste bleibt ebenfalls Teil
 * desselben Banners.
 */
.game-page
.category-list-controls
.category-search-empty {
    margin:
        1rem
        0
        0;
}


/*
 * Bei mittleren Breiten werden Filterzeile und Gruppenbuttons
 * innerhalb des Banners untereinander angeordnet.
 */
@media (max-width: 1000px) {
    .game-page
    .category-controls-lower-row {
        align-items: stretch;
        flex-direction: column;
    }

    .game-page
    .category-controls-lower-row
    .category-filter-sort-row {
        width: 100%;
    }

    .game-page
    .category-controls-lower-row
    .category-group-controls.is-integrated {
        width: 100%;

        justify-content: flex-end;
    }
}


/*
 * Die rechte Comms-Kartenleiste ist grundsätzlich schmal. Dort
 * werden die Elemente unabhängig von der Fensterbreite gestapelt.
 */
.game-page
.comms-map-list-content
.category-controls-lower-row {
    align-items: stretch;
    flex-direction: column;
}

.game-page
.comms-map-list-content
.category-controls-lower-row
.category-filter-sort-row {
    width: 100%;

    padding: 0;
}

.game-page
.comms-map-list-content
.category-controls-lower-row
.category-group-controls.is-integrated {
    width: 100%;

    justify-content: flex-start;
}


/*
 * Auf Smartphones nutzen die beiden Akkordeon-Buttons den
 * verfügbaren Platz gleichmäßig.
 */
@media (max-width: 600px) {
    .game-page
    .category-list-controls {
        padding: 0.8rem;
    }

    .game-page
    .category-controls-lower-row {
        margin-top: 0.8rem;
        padding-top: 0.8rem;
    }

    .game-page
    .category-controls-lower-row
    .category-group-controls.is-integrated {
        display: grid;
        grid-template-columns:
            repeat(
                2,
                minmax(0, 1fr)
            );
    }

    .game-page
    .category-controls-lower-row
    .category-group-control-button {
        width: 100%;
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
