/* =========================================================
   Personal Game Tracker
   Game View
   ========================================================= */

import {
	loadCategoryData,
	loadManifest,
	resolveRelativeFile
} from "../services/dataService.js";


import {
	calculateCategoryProgress,
	loadGameProgressData
} from "../services/progressService.js";


import {
	getCurrentLanguage,
	getLocalizedText
} from "../services/languageService.js";


const mainContent =
	document.getElementById(
		"main-content"
	);


/* ---------------------------------------------------------
   1. Spielansicht
   --------------------------------------------------------- */

/**
 * Rendert eine Spiel- oder Manifestübersicht.
 *
 * Dadurch kann dieselbe Kachelansicht sowohl für
 *
 * The Division 2
 *
 * als auch beispielsweise
 *
 * The Division 2 → Collectibles
 *
 * verwendet werden.
 *
 * @param {Object} game
 * @param {Object} options
 */
export async function renderGame(
	game,
	options = {}
) {

	const manifest =
		options.manifest ||
		game;


	const manifestFile =
		options.manifestFile ||
		"manifest.json";


	const routeIds =
		Array.isArray(options.routeIds)
			? options.routeIds
			: [];


	/*
	 * Titel ermitteln.
	 *
	 * Unterstützt:
	 *
	 * "name": "Dark Souls"
	 *
	 * sowie:
	 *
	 * "name": {
	 *     "de": "Dark Souls",
	 *     "en": "Dark Souls"
	 * }
	 */
	const title =
		getLocalizedText(
			options.title ||
			manifest.name ||
			game.name,
			game.id
		);


	/*
	 * Beschreibung ermitteln.
	 */
	const description =
		getLocalizedText(
			options.description ||
			manifest.description ||
			"",
			""
		);


	mainContent.innerHTML = "";


	const gamePage =
		document.createElement(
			"section"
		);

	gamePage.className =
		"game-page";


	/*
	 * Bei Untermanifesten einen
	 * Zurück-Button anzeigen.
	 */
	if (routeIds.length > 0) {

		const toolbar =
			document.createElement(
				"div"
			);

		toolbar.className =
			"category-toolbar";


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


		gamePage.append(
			toolbar
		);
	}


	/*
	 * Titel
	 */

	const titleElement =
		document.createElement(
			"h2"
		);

	titleElement.className =
		"game-title";

	titleElement.textContent =
		title;


	gamePage.append(
		titleElement
	);


	/*
	 * Optionale Beschreibung
	 */

	if (description) {

		const descriptionElement =
			document.createElement(
				"p"
			);

		descriptionElement.className =
			"game-description";

		descriptionElement.textContent =
			description;


		gamePage.append(
			descriptionElement
		);
	}


	/*
	 * Kategorie-Kacheln
	 */

	const categoryGrid =
		document.createElement(
			"div"
		);

	categoryGrid.className =
		"category-grid";


	const categories =
		Array.isArray(
			manifest.categories
		)
			? manifest.categories
			: [];


	for (
		const category
		of categories
	) {

		categoryGrid.append(
			createCategoryCard(
				game,
				category,
				routeIds
			)
		);
	}


	gamePage.append(
		categoryGrid
	);


	/*
	 * Gesamtfortschritt
	 */

	const gameProgress =
		createGameProgress();


	gamePage.append(
		gameProgress
	);


	mainContent.append(
		gamePage
	);


	/*
	 * Benutzerfortschritt laden.
	 */

	const progressData =
		await loadGameProgressData(
			game.id
		);


	/*
	 * Ohne Anmeldung keinen persönlichen
	 * Fortschritt anzeigen.
	 */

	if (
		!progressData ||
		!progressData.available
	) {

		hideProgressElements(
			gamePage
		);

		return;
	}


	await loadManifestProgress(
		game,
		manifest,
		manifestFile,
		progressData
	);
}


/* ---------------------------------------------------------
   2. Kategorie-Kacheln
   --------------------------------------------------------- */

/**
 * Erstellt eine Kategorie-Kachel.
 *
 * @param {Object} game
 * @param {Object} category
 * @param {Array<string>} routeIds
 * @returns {HTMLButtonElement}
 */
function createCategoryCard(
	game,
	category,
	routeIds
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


	const title =
		document.createElement(
			"h3"
		);


	title.textContent =
		getLocalizedText(
			category.name,
			category.id
		);


	button.append(
		title
	);


	const localizedDescription =
		getLocalizedText(
			category.description,
			""
		);


	if (localizedDescription) {

		const description =
			document.createElement(
				"p"
			);

		description.className =
			"category-description";

		description.textContent =
			localizedDescription;


		button.append(
			description
		);
	}


	const progress =
		document.createElement(
			"span"
		);

	progress.className =
		"category-progress";

	progress.dataset.categoryProgress =
		category.id;

	progress.textContent =
		"0 / 0";


	button.append(
		progress
	);


	button.addEventListener(
		"click",
		() => {

			const nextRoute = [
				...routeIds,
				category.id
			];


			window.location.hash =
				buildGameHash(
					game.id,
					nextRoute
				);
		}
	);


	return button;
}


/* ---------------------------------------------------------
   3. Gesamtfortschritt
   --------------------------------------------------------- */

/**
 * Erstellt die Gesamtfortschrittsanzeige.
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
		getTotalProgressText();


	const count =
		document.createElement(
			"span"
		);

	count.id =
		"game-progress-count";

	count.textContent =
		"0 / 0";


	header.append(
		label,
		count
	);


	const progressBar =
		document.createElement(
			"div"
		);

	progressBar.className =
		"progress-bar";


	const progressFill =
		document.createElement(
			"div"
		);

	progressFill.className =
		"progress-bar-fill";

	progressFill.id =
		"game-progress-fill";


	progressBar.append(
		progressFill
	);


	const percent =
		document.createElement(
			"div"
		);

	percent.className =
		"game-progress-percent";

	percent.id =
		"game-progress-percent";

	percent.textContent =
		"0 %";


	container.append(
		header,
		progressBar,
		percent
	);


	return container;
}


/* ---------------------------------------------------------
   4. Fortschrittsberechnung
   --------------------------------------------------------- */

/**
 * Berechnet den Fortschritt aller Kategorien
 * eines Manifests.
 *
 * Untermanifeste werden rekursiv ausgewertet.
 *
 * @param {Object} game
 * @param {Object} manifest
 * @param {string} manifestFile
 * @param {Object} progressData
 */
async function loadManifestProgress(
	game,
	manifest,
	manifestFile,
	progressData
) {

	const categories =
		Array.isArray(
			manifest.categories
		)
			? manifest.categories
			: [];


	const results =
		await Promise.all(
			categories.map(
				async (category) => {

					try {

						const progress =
							await calculateEntryProgress(
								game.id,
								category,
								manifestFile,
								progressData
							);


						updateCategoryProgress(
							category.id,
							progress
						);


						return progress;

					} catch (error) {

						console.error(
							`Fortschritt für Kategorie "${category.id}" konnte nicht geladen werden.`,
							error
						);


						const progress = {
							completed: 0,
							total: 0
						};


						updateCategoryProgress(
							category.id,
							progress
						);


						return progress;
					}
				}
			)
		);


	updateTotalProgress(
		results
	);
}


/**
 * Berechnet den Fortschritt eines einzelnen
 * Manifest-Eintrags.
 *
 * Normale Kategorie:
 * JSON laden und direkt berechnen.
 *
 * Manifest:
 * Untermanifest rekursiv berechnen.
 *
 * @param {string} gameId
 * @param {Object} entry
 * @param {string} parentManifestFile
 * @param {Object} progressData
 * @returns {Promise<{completed:number,total:number}>}
 */
async function calculateEntryProgress(
	gameId,
	entry,
	parentManifestFile,
	progressData
) {

	const resolvedFile =
		resolveRelativeFile(
			parentManifestFile,
			entry.file
		);


	/*
	 * Untermanifest
	 */

	if (
		entry.type ===
		"manifest"
	) {

		const childManifest =
			await loadManifest(
				gameId,
				resolvedFile
			);


		return calculateManifestProgress(
			gameId,
			childManifest,
			resolvedFile,
			progressData
		);
	}


	/*
	 * Normale Kategorie
	 */

	const resolvedCategory = {
		...entry,
		file: resolvedFile
	};


	const data =
		await loadCategoryData(
			gameId,
			resolvedCategory
		);


	return calculateCategoryProgress(
		data,
		progressData
	);
}


/**
 * Berechnet rekursiv den Fortschritt
 * eines kompletten Manifests.
 *
 * @param {string} gameId
 * @param {Object} manifest
 * @param {string} manifestFile
 * @param {Object} progressData
 * @returns {Promise<{completed:number,total:number}>}
 */
async function calculateManifestProgress(
	gameId,
	manifest,
	manifestFile,
	progressData
) {

	const categories =
		Array.isArray(
			manifest.categories
		)
			? manifest.categories
			: [];


	const results =
		await Promise.all(
			categories.map(
				(category) =>
					calculateEntryProgress(
						gameId,
						category,
						manifestFile,
						progressData
					)
			)
		);


	return results.reduce(
		(totalProgress, progress) => {

			totalProgress.completed +=
				progress.completed;

			totalProgress.total +=
				progress.total;


			return totalProgress;
		},
		{
			completed: 0,
			total: 0
		}
	);
}


/* ---------------------------------------------------------
   5. Fortschrittsanzeige
   --------------------------------------------------------- */

/**
 * Aktualisiert die Fortschrittsanzeige
 * einer einzelnen Kategorie-Kachel.
 *
 * @param {string} categoryId
 * @param {{completed:number,total:number}} progress
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
 * @param {Array<{completed:number,total:number}>} progresses
 */
function updateTotalProgress(
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


	const countElement =
		document.getElementById(
			"game-progress-count"
		);


	const fillElement =
		document.getElementById(
			"game-progress-fill"
		);


	const percentElement =
		document.getElementById(
			"game-progress-percent"
		);


	if (countElement) {

		countElement.textContent =
			`${completed} / ${total}`;
	}


	if (fillElement) {

		fillElement.style.width =
			`${percent}%`;
	}


	if (percentElement) {

		percentElement.textContent =
			`${percent} %`;
	}
}


/**
 * Blendet persönliche Fortschrittsanzeigen
 * aus, wenn kein Benutzer angemeldet ist.
 *
 * @param {HTMLElement} container
 */
function hideProgressElements(
	container
) {

	const gameProgress =
		container.querySelector(
			".game-progress"
		);


	if (gameProgress) {
		gameProgress.hidden = true;
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


/* ---------------------------------------------------------
   6. Lokalisierte UI-Texte
   --------------------------------------------------------- */

/**
 * Gibt den Text des Zurück-Buttons zurück.
 *
 * @returns {string}
 */
function getBackButtonText() {
	return getCurrentLanguage() === "de"
		? "← Zurück"
		: "← Back";
}


/**
 * Gibt die Beschriftung des
 * Gesamtfortschritts zurück.
 *
 * @returns {string}
 */
function getTotalProgressText() {
	return getCurrentLanguage() === "de"
		? "Gesamtfortschritt"
		: "Overall progress";
}


/* ---------------------------------------------------------
   7. Routing
   --------------------------------------------------------- */

/**
 * Erzeugt einen Hash für eine Spielroute.
 *
 * @param {string} gameId
 * @param {Array<string>} routeIds
 * @returns {string}
 */
function buildGameHash(
	gameId,
	routeIds = []
) {

	const encodedGameId =
		encodeURIComponent(
			gameId
		);


	const encodedRoute =
		routeIds.map(
			routeId =>
				encodeURIComponent(
					routeId
				)
		);


	const parts = [
		"game",
		encodedGameId,
		...encodedRoute
	];


	return `#${parts.join("/")}`;
}
