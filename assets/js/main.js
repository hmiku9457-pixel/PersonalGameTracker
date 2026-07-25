import {
	loadGameNavigation
} from "./views/navigationView.js";

import {
	loadPageFromHash
} from "./router.js";


const mainContent =
	document.getElementById(
		"main-content"
	);


// Ursprünglichen Startinhalt speichern.
// Dieser wird benötigt, wenn der Hash wieder leer ist.
const defaultContent =
	mainContent?.innerHTML ?? "";


/**
 * Initialisiert den Personal Game Tracker.
 */
async function init() {
	await loadGameNavigation();

	await loadPageFromHash(
		defaultContent
	);
}


/**
 * Bei Änderung des Hashs die passende
 * Seite neu laden.
 */
window.addEventListener(
	"hashchange",
	() => {
		loadPageFromHash(
			defaultContent
		);
	}
);


// Anwendung starten
init();
