/* =========================================================
   Personal Game Tracker
   Main
   ========================================================= */

import {
	loadGameNavigation
} from "./views/navigationView.js";


import {
	loadPageFromHash
} from "./router.js";


import {
	clearProgressCache
} from "./services/progressService.js";


import {
	initLanguageView
} from "./views/languageView.js";


import {
	LANGUAGE_CHANGE_EVENT
} from "./services/languageService.js";


/* ---------------------------------------------------------
   1. Authentifizierung
   --------------------------------------------------------- */

/**
 * Reagiert auf Änderungen am Login-Zustand.
 *
 * Nach Login oder Logout:
 *
 * 1. alten Fortschrittscache löschen
 * 2. aktuell geöffnete Route neu rendern
 *
 * @param {CustomEvent} event
 */
async function handleAuthSessionChanged(
	event
) {
	console.info(
		"[App] Auth-Session geändert:",
		event.detail?.event
	);


	/*
	 * Fortschritt des vorherigen Login-Zustands
	 * darf nicht weiterverwendet werden.
	 */
	clearProgressCache();


	try {

		await loadPageFromHash();


		console.info(
			"[App] Aktuelle Ansicht nach Auth-Änderung neu geladen."
		);

	}
	catch (error) {

		console.error(
			"[App] Ansicht konnte nach Auth-Änderung nicht neu geladen werden:",
			error
		);
	}
}


/* ---------------------------------------------------------
   2. Sprache
   --------------------------------------------------------- */

/**
 * Reagiert auf Änderungen der ausgewählten Sprache.
 *
 * Nach einem Sprachwechsel:
 *
 * 1. Spiele-Navigation neu rendern
 * 2. aktuell geöffnete Route neu rendern
 *
 * @param {CustomEvent} event
 */
async function handleLanguageChanged(
	event
) {
	console.info(
		"[App] Sprache geändert:",
		event.detail?.language
	);


	try {

		/*
		 * Navigation neu laden.
		 */
		await loadGameNavigation();


		/*
		 * Aktuelle Ansicht neu rendern.
		 */
		await loadPageFromHash();


		console.info(
			"[App] Ansicht nach Sprachänderung neu geladen."
		);

	}
	catch (error) {

		console.error(
			"[App] Ansicht konnte nach Sprachänderung nicht neu geladen werden:",
			error
		);
	}
}


/* ---------------------------------------------------------
   3. Spieleübersicht
   --------------------------------------------------------- */

/**
 * Behandelt einen Klick auf den oberen
 * Navigationseintrag "Spiele".
 *
 * Der Klick funktioniert auch dann, wenn
 * #games bereits die aktuelle Route ist.
 *
 * @param {MouseEvent} event
 */
function handleGamesOverviewClick(
	event
) {
	event.preventDefault();


	const gamesHash =
		"#games";


	/*
	 * Befinden wir uns bereits auf #games,
	 * entsteht normalerweise kein Hashchange.
	 *
	 * Deshalb wird die Route direkt neu geladen.
	 */
	if (
		window.location.hash ===
		gamesHash
	) {

		void loadPageFromHash();

		return;
	}


	/*
	 * Bei einer anderen Route wird der Hash
	 * geändert. Der normale hashchange-Listener
	 * lädt anschließend die Spieleübersicht.
	 */
	window.location.hash =
		gamesHash;
}


/**
 * Initialisiert den oberen Link
 * zur Spieleübersicht.
 */
function initGamesOverviewLink() {

	const gamesOverviewLink =
		document.getElementById(
			"games-overview-link"
		);


	if (!gamesOverviewLink) {

		console.warn(
			"[App] Element #games-overview-link wurde nicht gefunden."
		);

		return;
	}


	gamesOverviewLink.href =
		"#games";


	gamesOverviewLink.addEventListener(
		"click",
		handleGamesOverviewClick
	);
}


/* ---------------------------------------------------------
   4. Initialisierung
   --------------------------------------------------------- */

/**
 * Initialisiert die Anwendung.
 */
async function initializeApp() {

	try {

		/*
		 * Auth-Änderungen beobachten.
		 */
		window.addEventListener(
			"auth-session-changed",
			handleAuthSessionChanged
		);


		/*
		 * Sprachänderungen beobachten.
		 */
		window.addEventListener(
			LANGUAGE_CHANGE_EVENT,
			handleLanguageChanged
		);


		/*
		 * Sprachauswahl initialisieren.
		 */
		initLanguageView();


		/*
		 * Oberen Spiele-Link initialisieren.
		 */
		initGamesOverviewLink();


		/*
		 * Spiele-Navigation laden.
		 */
		await loadGameNavigation();


		/*
		 * Aktuelle Route laden.
		 */
		await loadPageFromHash();


		console.info(
			"[App] Anwendung initialisiert."
		);

	}
	catch (error) {

		console.error(
			"[App] Initialisierung fehlgeschlagen:",
			error
		);
	}
}


/* ---------------------------------------------------------
   5. Routing
   --------------------------------------------------------- */

/**
 * Reagiert auf Änderungen des URL-Hashes.
 */
function handleHashChanged() {

	void loadPageFromHash();
}


/*
 * Hash-Routen beobachten.
 */
window.addEventListener(
	"hashchange",
	handleHashChanged
);


/* ---------------------------------------------------------
   6. Anwendung starten
   --------------------------------------------------------- */

initializeApp();
