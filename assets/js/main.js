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
async function handleAuthSessionChanged(event) {
	console.info(
		"[App] Auth-Session geändert:",
		event.detail?.event
	);


	/*
	 * Ganz wichtig:
	 *
	 * Fortschritt des vorherigen Login-Zustands darf
	 * nicht weiterverwendet werden.
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
 * Der Fortschrittscache muss dabei nicht gelöscht werden,
 * da sich durch die Sprache keine Item-IDs ändern.
 *
 * @param {CustomEvent} event
 */
async function handleLanguageChanged(event) {
	console.info(
		"[App] Sprache geändert:",
		event.detail?.language
	);


	try {

		/*
		 * Navigation neu laden.
		 *
		 * Dadurch können später auch Spielnamen in der
		 * Sidebar automatisch übersetzt werden.
		 */
		await loadGameNavigation();


		/*
		 * Aktuelle Ansicht neu rendern.
		 *
		 * Dadurch werden Spiel-, Kategorie-, Gruppen-
		 * und Item-Texte in der neuen Sprache angezeigt.
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
   3. Initialisierung
   --------------------------------------------------------- */

/**
 * Initialisiert die Anwendung.
 */
async function initializeApp() {
	try {

		/*
		 * Auth-Änderungen beobachten.
		 *
		 * Listener wird bewusst vor dem ersten Rendern
		 * registriert.
		 */
		window.addEventListener(
			"auth-session-changed",
			handleAuthSessionChanged
		);


		/*
		 * Sprachänderungen beobachten.
		 *
		 * Auch dieser Listener wird vor dem ersten Rendern
		 * registriert.
		 */
		window.addEventListener(
			LANGUAGE_CHANGE_EVENT,
			handleLanguageChanged
		);


		/*
		 * Sprachauswahl initialisieren.
		 *
		 * Dabei wird die gespeicherte bzw. automatisch
		 * erkannte Sprache im Select angezeigt.
		 */
		initLanguageView();


		/*
		 * Navigation laden.
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
   4. Routing
   --------------------------------------------------------- */

/*
 * Hash-Routen beobachten.
 */
window.addEventListener(
	"hashchange",
	() => {
		void loadPageFromHash();
	}
);


/* ---------------------------------------------------------
   5. Anwendung starten
   --------------------------------------------------------- */

initializeApp();
