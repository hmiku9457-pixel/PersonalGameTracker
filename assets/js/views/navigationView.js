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
 * Gibt einen lokalisierten Navigationstext zurück.
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
   2. DOM
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
 * Gibt den Link zur allgemeinen
 * Spieleübersicht zurück.
 *
 * @returns {HTMLAnchorElement|null}
 */
function getGamesOverviewLink() {

	return document.getElementById(
		"games-overview-link"
	);
}


/* ---------------------------------------------------------
   3. Navigation laden
   --------------------------------------------------------- */

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


	/*
	 * Text des vorhandenen Übersichtslinks
	 * an die aktuelle Sprache anpassen.
	 */
	updateGamesOverviewLink();


	try {

		const games =
			await loadGames();


		gameNavigation.replaceChildren();


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
		 * Aktives Spiel anhand der aktuellen
		 * URL markieren.
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
   4. Übersichts-Link aktualisieren
   --------------------------------------------------------- */

/**
 * Aktualisiert den Text und stellt sicher,
 * dass der Spiele-Link immer anklickbar bleibt.
 */
function updateGamesOverviewLink() {

	const gamesOverviewLink =
		getGamesOverviewLink();


	if (!gamesOverviewLink) {

		console.warn(
			"Element #games-overview-link wurde nicht gefunden."
		);

		return;
	}


	gamesOverviewLink.textContent =
		getUiText(
			"gamesOverview"
		);


	gamesOverviewLink.href =
		"#games";


	/*
	 * Der Übersichts-Link wird absichtlich nicht
	 * als aktiver Spiele-Link markiert.
	 *
	 * Dadurch bleibt er auch auf der Spieleübersicht
	 * jederzeit anklickbar.
	 */
	gamesOverviewLink.classList.remove(
		"is-active"
	);


	gamesOverviewLink.removeAttribute(
		"aria-current"
	);
}


/* ---------------------------------------------------------
   5. Spiel-Link erstellen
   --------------------------------------------------------- */

/**
 * Erstellt einen Navigationseintrag
 * für ein einzelnes Spiel.
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
   6. Aktives Spiel
   --------------------------------------------------------- */

/**
 * Markiert ausschließlich das aktuell
 * ausgewählte Spiel in der Navigation.
 *
 * Der obere Link "Spiele" bleibt unabhängig
 * von der aktuellen Route immer anklickbar.
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
   7. Aktivzustand setzen
   --------------------------------------------------------- */

/**
 * Setzt Klasse und aria-current
 * eines Spiele-Links.
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
   8. Aktuelles Spiel aus Hash auslesen
   --------------------------------------------------------- */

/**
 * Liest die aktuelle Spiel-ID aus dem Hash.
 *
 * Beispiele:
 *
 * kein Hash
 * → null
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
