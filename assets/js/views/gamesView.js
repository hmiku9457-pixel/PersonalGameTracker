/* =========================================================
   Personal Game Tracker
   Games View
   ========================================================= */

import {
	loadGames
} from "../services/dataService.js";


import {
	getCurrentLanguage,
	getLocalizedText
} from "../services/languageService.js";


import {
	showError,
	showLoading
} from "./commonView.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		title:
			"Spiele",

		description:
			"Wähle ein Spiel aus, um dessen Kategorien und Fortschritt anzuzeigen.",

		noGames:
			"Es sind aktuell keine Spiele verfügbar.",

		loadFailed:
			"Die Spieleübersicht konnte nicht geladen werden."
	},

	en: {
		title:
			"Games",

		description:
			"Select a game to view its categories and progress.",

		noGames:
			"No games are currently available.",

		loadFailed:
			"The games overview could not be loaded."
	}
};


/**
 * Gibt einen lokalisierten Text
 * der Spieleübersicht zurück.
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
 * Gibt den Main-Container zurück.
 *
 * @returns {HTMLElement|null}
 */
function getMainContent() {

	return document.getElementById(
		"main-content"
	);
}


/* ---------------------------------------------------------
   3. Spieleübersicht rendern
   --------------------------------------------------------- */

/**
 * Rendert alle verfügbaren Spiele
 * als anklickbare Karten.
 */
export async function renderGamesOverview() {

	const mainContent =
		getMainContent();


	if (!mainContent) {

		console.warn(
			"Element #main-content wurde nicht gefunden."
		);

		return;
	}


	showLoading();


	try {

		const games =
			await loadGames();


		mainContent.replaceChildren();


		const gamesPage =
			document.createElement(
				"section"
			);


		gamesPage.className =
			"games-page";


		/*
		 * ---------------------------------------------------
		 * Überschrift
		 * ---------------------------------------------------
		 */

		const title =
			document.createElement(
				"h2"
			);


		title.className =
			"games-title game-title";


		title.textContent =
			getUiText(
				"title"
			);


		gamesPage.append(
			title
		);


		/*
		 * ---------------------------------------------------
		 * Beschreibung
		 * ---------------------------------------------------
		 */

		const description =
			document.createElement(
				"p"
			);


		description.className =
			"games-description game-description";


		description.textContent =
			getUiText(
				"description"
			);


		gamesPage.append(
			description
		);


		/*
		 * ---------------------------------------------------
		 * Gültige Spiele ermitteln
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


		/*
		 * ---------------------------------------------------
		 * Keine Spiele vorhanden
		 * ---------------------------------------------------
		 */

		if (
			validGames.length === 0
		) {

			const emptyMessage =
				document.createElement(
					"p"
				);


			emptyMessage.className =
				"games-empty-message";


			emptyMessage.textContent =
				getUiText(
					"noGames"
				);


			gamesPage.append(
				emptyMessage
			);


			mainContent.append(
				gamesPage
			);


			return;
		}


		/*
		 * ---------------------------------------------------
		 * Spiele-Karten
		 * ---------------------------------------------------
		 */

		const gamesGrid =
			document.createElement(
				"div"
			);


		/*
		 * category-grid wird vorläufig zusätzlich verwendet,
		 * damit die bereits vorhandenen Grid-Styles greifen.
		 */
		gamesGrid.className =
			"games-grid category-grid";


		for (
			const game
			of validGames
		) {

			gamesGrid.append(
				createGameCard(
					game
				)
			);
		}


		gamesPage.append(
			gamesGrid
		);


		mainContent.append(
			gamesPage
		);

	}
	catch (error) {

		console.error(
			"Spieleübersicht konnte nicht geladen werden:",
			error
		);


		showError(
			getUiText(
				"loadFailed"
			)
		);
	}
}


/* ---------------------------------------------------------
   4. Spiele-Karte erstellen
   --------------------------------------------------------- */

/**
 * Erstellt eine anklickbare Karte
 * für ein einzelnes Spiel.
 *
 * @param {Object} game
 * @returns {HTMLButtonElement}
 */
function createGameCard(
	game
) {

	const button =
		document.createElement(
			"button"
		);


	button.type =
		"button";


	/*
	 * category-card wird vorläufig zusätzlich verwendet,
	 * damit die existierenden Karten-Styles greifen.
	 */
	button.className =
		"game-card category-card";


	button.dataset.gameId =
		game.id;


	const title =
		document.createElement(
			"h3"
		);


	title.className =
		"game-card-title";


	title.textContent =
		getLocalizedText(
			game.name,
			game.id
		);


	button.append(
		title
	);


	/*
	 * Eine Beschreibung wird nur angezeigt,
	 * wenn sie in games.json vorhanden ist.
	 */
	const localizedDescription =
		getLocalizedText(
			game.description,
			""
		);


	if (
		localizedDescription
	) {

		const description =
			document.createElement(
				"p"
			);


		description.className =
			"game-card-description category-description";


		description.textContent =
			localizedDescription;


		button.append(
			description
		);
	}


	button.addEventListener(
		"click",
		() => {

			window.location.hash =
				buildGameHash(
					game.id
				);
		}
	);


	return button;
}


/* ---------------------------------------------------------
   5. Spielroute erzeugen
   --------------------------------------------------------- */

/**
 * Erzeugt den Hash für eine Spieleseite.
 *
 * Beispiel:
 *
 * theDivision2
 *
 * wird:
 *
 * #game/theDivision2
 *
 * @param {string} gameId
 * @returns {string}
 */
function buildGameHash(
	gameId
) {

	return (
		`#game/${encodeURIComponent(gameId)}`
	);
}
