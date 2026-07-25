import {
	loadCategoryData
} from "../services/dataService.js";

import {
	calculateCategoryProgress,
	loadGameProgressData
} from "../services/progressService.js";

import {
	updateActiveGameNavigation
} from "./navigationView.js";


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
 * Erstellt die komplette Übersichtsseite
 * eines Spiels.
 *
 * @param {Object} game Spiel-Manifest
 */
export function renderGame(game) {
	const mainContent =
		getMainContent();


	if (!mainContent) {
		console.warn(
			"Element #main-content wurde nicht gefunden."
		);

		return;
	}


	mainContent.replaceChildren();


	const gamePage =
		document.createElement(
			"section"
		);


	gamePage.className =
		"game-page";


	/*
	 * Die Spiel-ID am Seitencontainer speichern.
	 *
	 * Dadurch können asynchrone Prozesse später
	 * prüfen, ob immer noch dasselbe Spiel
	 * dargestellt wird.
	 */
	gamePage.dataset.gameId =
		game.id;


	/*
	 * Spieltitel
	 */
	const gameHeader =
		document.createElement(
			"div"
		);


	gameHeader.className =
		"game-header";


	const gameTitle =
		document.createElement(
			"h2"
		);


	gameTitle.className =
		"game-title";


	gameTitle.textContent =
		game.name;


	gameHeader.append(
		gameTitle
	);


	/*
	 * Kategorien
	 */
	const categoryGrid =
		document.createElement(
			"div"
		);


	categoryGrid.className =
		"category-grid";


	categoryGrid.id =
		"category-grid";


	for (
		const category of game.categories
	) {
		const categoryCard =
			createCategoryCard(
				game,
				category
			);


		categoryGrid.append(
			categoryCard
		);
	}


	/*
	 * Gesamtfortschritt
	 */
	const progressContainer =
		createGameProgress();


	gamePage.append(
		gameHeader,
		categoryGrid,
		progressContainer
	);


	mainContent.append(
		gamePage
	);


	updateActiveGameNavigation(
		game.id
	);


	/*
	 * Fortschrittswerte nachladen.
	 *
	 * Bewusst nicht mit await:
	 * Die Seite kann sofort dargestellt werden.
	 */
	loadGameProgress(game);
}


/**
 * Erstellt einen einzelnen Kategorie-Button.
 *
 * @param {Object} game Spiel-Manifest
 * @param {Object} category Kategorie
 * @returns {HTMLButtonElement}
 */
function createCategoryCard(
	game,
	category
) {
	const button =
		document.createElement(
			"button"
		);


	button.type =
		"button";


	button.className =
		"category-card";


	button.dataset.categoryId =
		category.id;


	/*
	 * Kategorie-Titel
	 */
	const title =
		document.createElement(
			"h3"
		);


	title.textContent =
		category.name;


	/*
	 * Beschreibung
	 */
	const description =
		document.createElement(
			"p"
		);


	description.className =
		"category-description";


	description.textContent =
		category.description ?? "";


	/*
	 * Fortschritt
	 */
	const progress =
		document.createElement(
			"span"
		);


	progress.className =
		"category-progress";


	progress.textContent =
		"0 / 0";


	progress.dataset.categoryProgress =
		category.id;


	button.append(
		title,
		description,
		progress
	);


	/*
	 * Kategorie öffnen
	 */
	button.addEventListener(
		"click",
		() => {
			window.location.hash =
				`game/${encodeURIComponent(game.id)}/${encodeURIComponent(category.id)}`;
		}
	);


	return button;
}


/**
 * Erstellt den Gesamtfortschritt
 * eines Spiels.
 *
 * @returns {HTMLElement}
 */
function createGameProgress() {
	const container =
		document.createElement(
			"div"
		);


	container.className =
		"game-progress";


	/*
	 * Kopfzeile
	 */
	const header =
		document.createElement(
			"div"
		);


	header.className =
		"game-progress-header";


	const label =
		document.createElement(
			"span"
		);


	label.textContent =
		"Gesamtfortschritt";


	const count =
		document.createElement(
			"strong"
		);


	count.id =
		"game-progress-count";


	count.textContent =
		"0 / 0";


	header.append(
		label,
		count
	);


	/*
	 * Fortschrittsbalken
	 */
	const progressBar =
		document.createElement(
			"div"
		);


	progressBar.className =
		"progress-bar";


	progressBar.setAttribute(
		"role",
		"progressbar"
	);


	progressBar.setAttribute(
		"aria-label",
		"Gesamtfortschritt"
	);


	progressBar.setAttribute(
		"aria-valuemin",
		"0"
	);


	progressBar.setAttribute(
		"aria-valuemax",
		"100"
	);


	progressBar.setAttribute(
		"aria-valuenow",
		"0"
	);


	const progressFill =
		document.createElement(
			"div"
		);


	progressFill.id =
		"game-progress-fill";


	progressFill.className =
		"progress-bar-fill";


	progressFill.style.width =
		"0%";


	progressBar.append(
		progressFill
	);


	/*
	 * Prozentanzeige
	 */
	const percentage =
		document.createElement(
			"span"
		);


	percentage.id =
		"game-progress-percent";


	percentage.className =
		"game-progress-percent";


	percentage.textContent =
		"0 %";


	container.append(
		header,
		progressBar,
		percentage
	);


	return container;
}


/**
 * Lädt alle Kategorien eines Spiels und berechnet
 * daraus den Gesamtfortschritt.
 *
 * Fortschrittsdaten aus mockProgress.json werden
 * dabei automatisch berücksichtigt.
 *
 * @param {Object} game Spiel-Manifest
 */
async function loadGameProgress(game) {
	let totalCompleted = 0;
	let totalItems = 0;


	/*
	 * Fortschrittsdaten nur einmal pro Spiel laden.
	 */
	const progressData =
		await loadGameProgressData(
			game.id
		);


	for (
		const category of game.categories
	) {
		try {
			const categoryData =
				await loadCategoryData(
					game.id,
					category
				);


			const progress =
				calculateCategoryProgress(
					categoryData,
					progressData
				);


			totalCompleted +=
				progress.completed;


			totalItems +=
				progress.total;


			updateCategoryProgress(
				category.id,
				progress
			);

		} catch (error) {
			console.error(
				`Fortschritt für "${category.name}" konnte nicht geladen werden.`,
				error
			);
		}
	}


	/*
	 * Sicherstellen, dass inzwischen nicht
	 * auf eine andere Seite gewechselt wurde.
	 */
	const currentGamePage =
		document.querySelector(
			".game-page[data-game-id]"
		);


	if (
		!currentGamePage ||
		currentGamePage.dataset.gameId !==
			game.id ||
		!document.getElementById(
			"category-grid"
		)
	) {
		return;
	}


	updateTotalProgress(
		totalCompleted,
		totalItems
	);
}


/**
 * Aktualisiert die Fortschrittsanzeige
 * einer Kategorie.
 *
 * @param {string} categoryId Kategorie-ID
 * @param {{completed: number, total: number}} progress Fortschritt
 */
function updateCategoryProgress(
	categoryId,
	progress
) {
	const element =
		document.querySelector(
			`[data-category-progress="${CSS.escape(categoryId)}"]`
		);


	if (!element) {
		return;
	}


	element.textContent =
		`${progress.completed} / ${progress.total}`;
}


/**
 * Aktualisiert den Gesamtfortschritt.
 *
 * @param {number} completed Erledigte Einträge
 * @param {number} total Gesamte Einträge
 */
function updateTotalProgress(
	completed,
	total
) {
	const count =
		document.getElementById(
			"game-progress-count"
		);


	const fill =
		document.getElementById(
			"game-progress-fill"
		);


	const percentage =
		document.getElementById(
			"game-progress-percent"
		);


	const progressBar =
		document.querySelector(
			".progress-bar"
		);


	let percent = 0;


	if (total > 0) {
		percent =
			Math.round(
				(completed / total) *
				100
			);
	}


	if (count) {
		count.textContent =
			`${completed} / ${total}`;
	}


	if (fill) {
		fill.style.width =
			`${percent}%`;
	}


	if (percentage) {
		percentage.textContent =
			`${percent} %`;
	}


	if (progressBar) {
		progressBar.setAttribute(
			"aria-valuenow",
			String(percent)
		);
	}
}
