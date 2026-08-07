import {
    readFile,
    writeFile
} from "node:fs/promises";


const GAME_VIEW_FILE =
    "assets/js/views/gameView.js";

const TRACKER_CSS_FILE =
    "assets/css/tracker.css";

const CSS_START =
    "/* === MANIFEST PROGRESS BANNER START === */";

const CSS_END =
    "/* === MANIFEST PROGRESS BANNER END === */";


await patchGameView();
await patchTrackerCss();

console.log(
    "Der Gesamtfortschritt wurde in den Navigationsbanner verschoben."
);


/* =========================================================
   gameView.js
   ========================================================= */

async function patchGameView() {
    let source = await readFile(
        GAME_VIEW_FILE,
        "utf8"
    );

    if (
        source.includes(
            "manifest-progress-summary"
        )
    ) {
        console.log(
            "gameView.js enthält die neue Fortschrittsanzeige bereits."
        );
        return;
    }

    source = replaceToolbarSection(
        source
    );

    source = removeBottomProgressCard(
        source
    );

    source = replaceNamedFunction(
        source,
        "createGameProgress",
        createManifestProgressFunction()
    );

    source = replaceNamedFunction(
        source,
        "updateTotalProgress",
        updateTotalProgressFunction()
    );

    source = replaceNamedFunction(
        source,
        "hideProgressElements",
        hideProgressElementsFunction()
    );

    source = removeNamedFunction(
        source,
        "getTotalProgressText"
    );

    await writeFile(
        GAME_VIEW_FILE,
        source,
        "utf8"
    );

    console.log(
        "gameView.js wurde aktualisiert."
    );
}


/**
 * Erstellt die Toolbar nun auf jeder Manifestübersicht.
 *
 * Unterseiten erhalten zusätzlich den Zurück-Button.
 * Der Gesamtfortschritt wird immer als rechtes Toolbar-Element
 * angelegt und anschließend durch pageBreadcrumbView.js in den
 * gemeinsamen Banner verschoben.
 */
function replaceToolbarSection(
    source
) {
    const startNeedle =
        "/*\n\t * Bei Untermanifesten einen";

    const endNeedle =
        "\n\t/*\n\t * Titel";

    const startIndex =
        source.indexOf(
            startNeedle
        );

    const endIndex =
        source.indexOf(
            endNeedle,
            startIndex
        );

    if (
        startIndex === -1 ||
        endIndex === -1
    ) {
        throw new Error(
            "Der Toolbar-Bereich in gameView.js konnte nicht gefunden werden."
        );
    }

    const replacement = `/*
	 * Gemeinsame Toolbar für Spiel- und Manifestübersichten.
	 *
	 * pageBreadcrumbView.js verschiebt ihre Elemente später
	 * in den gemeinsamen Navigationsbanner.
	 */
	const toolbar =
		document.createElement(
			"div"
		);

	toolbar.className =
		"category-toolbar";


	/*
	 * Bei Untermanifesten zusätzlich einen
	 * Zurück-Button anzeigen.
	 */
	if (routeIds.length > 0) {

		const backButton =
			document.createElement(
				"button"
			);

		backButton.type =
			"button";

		backButton.className =
			"back-button";

		backButton.textContent =
			getBackButtonText();


		backButton.addEventListener(
			"click",
			() => {

				const parentRoute =
					routeIds.slice(
						0,
						-1
					);


				window.location.hash =
					buildGameHash(
						game.id,
						parentRoute
					);
			}
		);


		toolbar.append(
			backButton
		);
	}


	const manifestProgress =
		createManifestProgressSummary();

	toolbar.append(
		manifestProgress
	);


	gamePage.append(
		toolbar
	);
`;

    return (
        source.slice(
            0,
            startIndex
        ) +
        replacement +
        source.slice(
            endIndex
        )
    );
}


/**
 * Entfernt die bisherige große Gesamtfortschrittskarte unterhalb
 * des Kachelrasters.
 */
function removeBottomProgressCard(
    source
) {
    const startNeedle =
        "\n\t/*\n\t * Gesamtfortschritt";

    const endNeedle =
        "\n\tmainContent.append(";

    const startIndex =
        source.indexOf(
            startNeedle
        );

    const endIndex =
        source.indexOf(
            endNeedle,
            startIndex
        );

    if (
        startIndex === -1 ||
        endIndex === -1
    ) {
        throw new Error(
            "Die bisherige Gesamtfortschrittskarte konnte nicht gefunden werden."
        );
    }

    return (
        source.slice(
            0,
            startIndex
        ) +
        "\n" +
        source.slice(
            endIndex
        )
    );
}


/**
 * Ersetzt eine benannte Funktionsdeklaration vollständig.
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
        source.slice(
            range.end
        )
    );
}


/**
 * Entfernt eine benannte Funktionsdeklaration inklusive
 * unmittelbar davorstehendem JSDoc-Kommentar.
 */
function removeNamedFunction(
    source,
    functionName
) {
    const range =
        findFunctionRange(
            source,
            functionName
        );

    let start =
        range.start;

    const jsDocStart =
        source.lastIndexOf(
            "/**",
            start
        );

    const jsDocEnd =
        source.indexOf(
            "*/",
            jsDocStart
        );

    if (
        jsDocStart !== -1 &&
        jsDocEnd !== -1 &&
        jsDocEnd < start
    ) {
        const between =
            source.slice(
                jsDocEnd + 2,
                start
            );

        if (
            between.trim() === ""
        ) {
            start =
                jsDocStart;
        }
    }

    return (
        source.slice(
            0,
            start
        ).trimEnd() +
        "\n\n" +
        source.slice(
            range.end
        ).trimStart()
    );
}


/**
 * Ermittelt Start und Ende einer klassischen
 * `function name(...) { ... }`-Deklaration.
 */
function findFunctionRange(
    source,
    functionName
) {
    const declarationPattern =
        new RegExp(
            `function\\s+${escapeRegExp(functionName)}\\s*\\(`
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

    const functionStart =
        match.index;

    const openingBrace =
        source.indexOf(
            "{",
            functionStart
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
        start: functionStart,
        end
    };
}


/**
 * Findet die passende schließende geschweifte Klammer.
 *
 * Strings, Template-Strings und Kommentare werden berücksichtigt,
 * damit geschweifte Klammern innerhalb von Texten den Zähler nicht
 * verfälschen.
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
            state = "line-comment";
            index += 1;
            continue;
        }

        if (
            current === "/" &&
            next === "*"
        ) {
            state = "block-comment";
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


function createManifestProgressFunction() {
    return `function createManifestProgressSummary() {

	const progress =
		document.createElement(
			"span"
		);

	progress.className =
		"category-content-progress manifest-progress-summary";

	progress.id =
		"manifest-progress-summary";

	progress.textContent =
		"0 / 0 · 0 %";

	progress.setAttribute(
		"aria-label",
		getCurrentLanguage() === "de"
			? "Gesamtfortschritt: 0 von 0, 0 Prozent"
			: "Overall progress: 0 of 0, 0 percent"
	);


	return progress;
}

`;
}


function updateTotalProgressFunction() {
    return `function updateTotalProgress(
	progresses
) {

	const completed =
		progresses.reduce(
			(sum, progress) =>
				sum +
				progress.completed,
			0
		);

	const total =
		progresses.reduce(
			(sum, progress) =>
				sum +
				progress.total,
			0
		);


	const percent =
		total > 0
			? Math.round(
				(completed / total) *
				100
			)
			: 0;


	const progressElement =
		document.getElementById(
			"manifest-progress-summary"
		);


	if (progressElement) {

		progressElement.textContent =
			\`\${completed} / \${total} · \${percent} %\`;

		progressElement.setAttribute(
			"aria-label",
			getCurrentLanguage() === "de"
				? \`Gesamtfortschritt: \${completed} von \${total}, \${percent} Prozent\`
				: \`Overall progress: \${completed} of \${total}, \${percent} percent\`
		);
	}
}

`;
}


function hideProgressElementsFunction() {
    return `function hideProgressElements(
	container
) {

	const manifestProgress =
		container.querySelector(
			".manifest-progress-summary"
		);

	if (manifestProgress) {
		manifestProgress.hidden = true;
	}


	const categoryProgressElements =
		container.querySelectorAll(
			".category-progress"
		);


	for (
		const element
		of categoryProgressElements
	) {
		element.hidden = true;
	}
}

`;
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
   Gesamtfortschritt auf Manifestübersichten
   ========================================================= */

/*
 * Die Anzeige verwendet grundsätzlich denselben Pill-Stil wie
 * der Fortschritt einer finalen Tracking-Liste.
 */
.game-page
.manifest-progress-summary {
    flex-shrink: 0;

    min-width: max-content;

    font-variant-numeric:
        tabular-nums;

    text-align: center;
}

.game-page
.manifest-progress-summary[hidden] {
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
