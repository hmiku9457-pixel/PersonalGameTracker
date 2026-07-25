import {
	loadGameManifest
} from "./services/dataService.js";

import {
	renderGame
} from "./views/gameView.js";

import {
	renderCategory
} from "./views/categoryView.js";

import {
	showError,
	showLoading
} from "./views/commonView.js";

import {
	updateActiveGameNavigation
} from "./views/navigationView.js";


/**
 * Gibt den Main-Container zurück.
 *
 * @returns {HTMLElement|null}
 */
function getMainContent() {
	return document.getElementById(
		"main-content"
	);
}


/**
 * Liest den aktuellen Hash aus.
 *
 * Beispiele:
 *
 * #game/theDivision2
 * #game/theDivision2/collectibles
 *
 * @returns {Array<string>}
 */
function getHashParts() {
	const hash =
		window.location.hash.substring(
			1
		);


	if (!hash) {
		return [];
	}


	return hash
		.split("/")
		.filter(Boolean)
		.map(
			part =>
				decodeURIComponent(
					part
				)
		);
}


/**
 * Lädt den Inhalt passend zur aktuellen URL.
 *
 * @param {string} defaultContent Ursprünglicher Startseiten-Inhalt
 */
export async function loadPageFromHash(
	defaultContent = ""
) {
	const mainContent =
		getMainContent();


	if (!mainContent) {
		console.warn(
			"Element #main-content wurde nicht gefunden."
		);

		return;
	}


	const parts =
		getHashParts();


	/*
	 * Startseite
	 */
	if (parts.length === 0) {
		mainContent.innerHTML =
			defaultContent;


		updateActiveGameNavigation(
			null
		);


		return;
	}


	/*
	 * Unbekannte Route
	 */
	if (parts[0] !== "game") {
		showError(
			"Die aufgerufene Seite existiert nicht."
		);


		return;
	}


	const gameId =
		parts[1];


	if (!gameId) {
		showError(
			"Es wurde kein Spiel angegeben."
		);


		return;
	}


	showLoading();


	try {
		const game =
			await loadGameManifest(
				gameId
			);


		/*
		 * Kategorie geöffnet
		 */
		if (parts[2]) {
			const categoryId =
				parts[2];


			const category =
				game.categories.find(
					entry =>
						entry.id ===
						categoryId
				);


			if (!category) {
				showError(
					"Die angeforderte Kategorie existiert nicht."
				);


				return;
			}


			await renderCategory(
				game,
				category
			);


			return;
		}


		/*
		 * Spielübersicht
		 */
		renderGame(game);

	} catch (error) {
		console.error(error);


		showError(
			"Das Spiel konnte nicht geladen werden."
		);
	}
}
