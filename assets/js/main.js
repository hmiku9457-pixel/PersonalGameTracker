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


/**
 * Reagiert auf Änderungen am Login-Zustand.
 *
 * Nach Login oder Logout:
 *
 * 1. alten Fortschrittscache löschen
 * 2. aktuell geöffnete Route neu rendern
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
		 * Navigation laden
		 */
		await loadGameNavigation();


		/*
		 * Aktuelle Route laden
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


/*
 * Hash-Routen beobachten.
 */
window.addEventListener(
	"hashchange",
	() => {
		void loadPageFromHash();
	}
);


/*
 * Anwendung starten.
 */
initializeApp();
