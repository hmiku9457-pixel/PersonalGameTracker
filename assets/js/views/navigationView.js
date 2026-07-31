/* =========================================================
   Personal Game Tracker
   Navigation View
   ========================================================= */

import {
	loadGames
} from "../services/dataService.js";


import {
	getCurrentLanguage,
	getLocalizedText
} from "../services/languageService.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		gamesOverview:
			"Spiele",

		loadFailed:
			"Spiele konnten nicht geladen werden."
	},

	en: {
		gamesOverview:
			"Games",

		loadFailed:
			"Games could not be loaded."
	}
};


/**
 * Gibt einen lokalisierten Text
 * der Navigation zurück.
 *
 * @param {string} key
 * @returns {string}
 */
function getUiText(
	key
) {
	const language =
		getCurrentLanguage();


	return (
		UI_TEXT[language]?.[key] ??
		UI_TEXT.en?.[key] ??
		key
	);
}


/* ---------------------------------------------------------
   2. Navigation
   --------------------------------------------------------- */

/**
 * Gibt den Container der Spiele-Navigation zurück.
 *
 * @returns {HTMLElement|null}
 */
function getGameNavigation() {

	return document.getElementById(
		"game-navigation"
	);
}


/**
 * Erstellt die Spiele-Navigation.
 */
export async function loadGameNavigation() {

	const gameNavigation =
		getGameNavigation();


	if (!gameNavigation) {

		console.warn(
			"Element #game-navigation wurde nicht gefunden."
		);

		return;
	}


	try {

		const games =
			await loadGames();


		gameNavigation.replaceChildren();


		/*
		 * ---------------------------------------------------
		 * Allgemeine Spieleübersicht
		 * ---------------------------------------------------
		 */

		gameNavigation.append(
			createGamesOverviewNavigationItem()
		);


		/*
		 * ---------------------------------------------------
		 * Einzelne Spiele
		 * ---------------------------------------------------
		 */

		const validGames =
			Array.isArray(
				games
			)
				? games.filter(
					game =>
						game &&
						typeof game.id ===
							"string" &&
						game.id.trim() !==
							""
				)
				: [];


		for (
			const game
			of validGames
		) {

			gameNavigation.append(
				createGameNavigationItem(
					game
				)
			);
		}


		/*
		 * Aktiven Zustand anhand des aktuellen
		 * URL-Hashes setzen.
		 */
		updateActiveGameNavigation(
			getCurrentGameIdFromHash()
		);

	}
	catch (error) {

		console.error(
			"Spiele-Navigation konnte nicht geladen werden:",
			error
		);


		gameNavigation.replaceChildren();


		const listItem =
			document.createElement(
				"li"
			);


		listItem.textContent =
			getUiText(
				"loadFailed"
			);


		gameNavigation.append(
			listItem
		);
	}
}


/* ---------------------------------------------------------
   3. Übersichts-Link erstellen
   --------------------------------------------------------- */

/**
 * Erstellt den Navigationseintrag für
 * die allgemeine Spieleübersicht.
 *
 * @returns {HTMLLIElement}
 */
function createGamesOverviewNavigationItem() {

	const listItem =
		document.createElement(
			"li"
		);


	const link =
		document.createElement(
			"a"
		);


	link.href =
		"#games";


	link.textContent =
		getUiText(
			"gamesOverview"
		);


	link.dataset.navigationTarget =
		"games";


	listItem.append(
		link
	);


	return listItem;
}


/* ---------------------------------------------------------
   4. Spiel-Link erstellen
   --------------------------------------------------------- */

/**
 * Erstellt den Navigationseintrag für
 * ein einzelnes Spiel.
 *
 * @param {Object} game
 * @returns {HTMLLIElement}
 */
function createGameNavigationItem(
	game
) {

	const listItem =
		document.createElement(
			"li"
		);


	const link =
		document.createElement(
			"a"
		);


	link.href =
		`#game/${encodeURIComponent(game.id)}`;


	/*
	 * Unterstützt sowohl:
	 *
	 * "name": "Dark Souls"
	 *
	 * als auch:
	 *
	 * "name": {
	 *     "de": "Dark Souls",
	 *     "en": "Dark Souls"
	 * }
	 */
	link.textContent =
		getLocalizedText(
			game.name,
			game.id
		);


	link.dataset.gameId =
		game.id;


	listItem.append(
		link
	);


	return listItem;
}


/* ---------------------------------------------------------
   5. Aktiver Navigationspunkt
   --------------------------------------------------------- */

/**
 * Markiert die allgemeine Spieleübersicht
 * oder das aktuell ausgewählte Spiel.
 *
 * currentGameId === null:
 * Die allgemeine Spieleübersicht ist aktiv.
 *
 * currentGameId enthält eine Spiel-ID:
 * Das entsprechende Spiel ist aktiv.
 *
 * @param {string|null} currentGameId
 */
export function updateActiveGameNavigation(
	currentGameId = null
) {

	const gameNavigation =
		getGameNavigation();


	if (!gameNavigation) {
		return;
	}


	/*
	 * -------------------------------------------------------
	 * Allgemeine Spieleübersicht
	 * -------------------------------------------------------
	 */

	const gamesOverviewLink =
		gameNavigation.querySelector(
			'[data-navigation-target="games"]'
		);


	setLinkActiveState(
		gamesOverviewLink,
		currentGameId === null
	);


	/*
	 * -------------------------------------------------------
	 * Einzelne Spiele
	 * -------------------------------------------------------
	 */

	const gameLinks =
		gameNavigation.querySelectorAll(
			"[data-game-id]"
		);


	for (
		const link
		of gameLinks
	) {

		const isActive =
			link.dataset.gameId ===
			currentGameId;


		setLinkActiveState(
			link,
			isActive
		);
	}
}


/* ---------------------------------------------------------
   6. Aktivzustand eines Links
   --------------------------------------------------------- */

/**
 * Setzt Klasse und aria-current
 * eines Navigationslinks.
 *
 * @param {Element|null} link
 * @param {boolean} isActive
 */
function setLinkActiveState(
	link,
	isActive
) {

	if (!link) {
		return;
	}


	link.classList.toggle(
		"is-active",
		isActive
	);


	if (isActive) {

		link.setAttribute(
			"aria-current",
			"page"
		);

	}
	else {

		link.removeAttribute(
			"aria-current"
		);
	}
}


/* ---------------------------------------------------------
   7. Aktuelles Spiel aus Hash auslesen
   --------------------------------------------------------- */

/**
 * Liest die aktuelle Spiel-ID aus dem Hash.
 *
 * Beispiele:
 *
 * #games
 * → null
 *
 * #game/theDivision2
 * → theDivision2
 *
 * #game/theDivision2/collectibles
 * → theDivision2
 *
 * @returns {string|null}
 */
function getCurrentGameIdFromHash() {

	const hash =
		window.location.hash
			.replace(/^#/, "");


	if (!hash) {
		return null;
	}


	const routeParts =
		hash
			.split("/")
			.filter(Boolean);


	if (
		routeParts[0] !== "game" ||
		!routeParts[1]
	) {
		return null;
	}


	try {

		return decodeURIComponent(
			routeParts[1]
		);

	}
	catch (error) {

		console.warn(
			"Spiel-ID im URL-Hash konnte nicht gelesen werden:",
			error
		);


		return routeParts[1];
	}
}
