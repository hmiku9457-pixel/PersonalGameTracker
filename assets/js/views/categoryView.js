import {
	loadCategoryData
} from "../services/dataService.js";

import {
	isItemCompleted,
	loadGameProgressData
} from "../services/progressService.js";

import {
	showError,
	showLoading
} from "./commonView.js";

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
 * Öffnet eine bestimmte Kategorie.
 *
 * @param {Object} game Spiel-Manifest
 * @param {Object} category Kategorie
 */
export async function renderCategory(
	game,
	category
) {
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
		/*
		 * Kategorie und Fortschritt parallel laden.
		 */
		const [
			data,
			progressData
		] = await Promise.all([
			loadCategoryData(
				game.id,
				category
			),

			loadGameProgressData(
				game.id
			)
		]);


		mainContent.replaceChildren();


		const gamePage =
			document.createElement(
				"section"
			);


		gamePage.className =
			"game-page";


		gamePage.dataset.gameId =
			game.id;


		gamePage.dataset.categoryId =
			category.id;


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
		 * Zurück-Button
		 */
		const backButton =
			document.createElement(
				"button"
			);


		backButton.type =
			"button";


		backButton.className =
			"back-button";


		backButton.textContent =
			"← Zurück zur Übersicht";


		backButton.addEventListener(
			"click",
			() => {
				window.location.hash =
					`game/${encodeURIComponent(game.id)}`;
			}
		);


		/*
		 * Kategorie
		 */
		const categoryContent =
			document.createElement(
				"section"
			);


		categoryContent.className =
			"category-content";


		const categoryTitle =
			document.createElement(
				"h3"
			);


		categoryTitle.textContent =
			category.name;


		categoryContent.append(
			categoryTitle
		);


		if (category.description) {
			const description =
				document.createElement(
					"p"
				);


			description.textContent =
				category.description;


			categoryContent.append(
				description
			);
		}


		renderCategoryData(
			categoryContent,
			data,
			progressData
		);


		gamePage.append(
			gameHeader,
			backButton,
			categoryContent
		);


		mainContent.append(
			gamePage
		);


		updateActiveGameNavigation(
			game.id
		);

	} catch (error) {
		console.error(error);


		showError(
			"Die Kategorie konnte nicht geladen werden."
		);
	}
}


/**
 * Gibt die Inhalte einer Kategorie aus.
 *
 * Unterstützt:
 *
 * groups
 * sections
 * items
 * direkte Arrays
 *
 * Externe Fortschrittsdaten werden bis zu den
 * einzelnen Items weitergereicht.
 *
 * @param {HTMLElement} container Ziel-Element
 * @param {Object|Array} data Kategorie-Daten
 * @param {Object|null} progressData Externe Fortschrittsdaten
 */
function renderCategoryData(
	container,
	data,
	progressData = null
) {
	/*
	 * Gruppen
	 */
	if (
		Array.isArray(
			data?.groups
		)
	) {
		for (
			const group of data.groups
		) {
			renderCategoryGroup(
				container,
				group,
				progressData
			);
		}


		return;
	}


	/*
	 * Sections
	 */
	if (
		Array.isArray(
			data?.sections
		)
	) {
		for (
			const section of data.sections
		) {
			renderCategoryGroup(
				container,
				section,
				progressData
			);
		}


		return;
	}


	/*
	 * Direktes Items-Array
	 */
	if (
		Array.isArray(
			data?.items
		)
	) {
		renderItemList(
			container,
			data.items,
			progressData
		);


		return;
	}


	/*
	 * Direkt geladenes Array
	 */
	if (Array.isArray(data)) {
		renderItemList(
			container,
			data,
			progressData
		);


		return;
	}


	/*
	 * Keine unterstützten Daten vorhanden
	 */
	const message =
		document.createElement(
			"p"
		);


	message.textContent =
		"Für diese Kategorie sind noch keine darstellbaren Einträge vorhanden.";


	container.append(
		message
	);
}


/**
 * Gibt eine einzelne Gruppe aus.
 *
 * @param {HTMLElement} container Ziel-Element
 * @param {Object} group Gruppe
 * @param {Object|null} progressData Externe Fortschrittsdaten
 */
function renderCategoryGroup(
	container,
	group,
	progressData = null
) {
	const section =
		document.createElement(
			"section"
		);


	section.className =
		"category-group";


	/*
	 * Gruppenname
	 */
	if (group.name) {
		const title =
			document.createElement(
				"h4"
			);


		title.textContent =
			group.name;


		section.append(
			title
		);
	}


	/*
	 * Gruppenbeschreibung
	 */
	if (group.description) {
		const description =
			document.createElement(
				"p"
			);


		description.textContent =
			group.description;


		section.append(
			description
		);
	}


	/*
	 * Items
	 */
	if (
		Array.isArray(
			group.items
		)
	) {
		renderItemList(
			section,
			group.items,
			progressData
		);
	}


	container.append(
		section
	);
}


/**
 * Gibt eine Liste von Items aus.
 *
 * @param {HTMLElement} container Ziel-Element
 * @param {Array} items Items
 * @param {Object|null} progressData Externe Fortschrittsdaten
 */
function renderItemList(
	container,
	items,
	progressData = null
) {
	const list =
		document.createElement(
			"ul"
		);


	list.className =
		"tracker-list";


	for (const item of items) {
		const listItem =
			document.createElement(
				"li"
			);


		listItem.className =
			"tracker-item";


		/*
		 * ID für spätere Interaktionen speichern.
		 */
		if (item.id) {
			listItem.dataset.itemId =
				item.id;
		}


		/*
		 * Status
		 */
		if (
			isItemCompleted(
				item,
				progressData
			)
		) {
			listItem.classList.add(
				"is-completed"
			);
		}


		/*
		 * Name
		 */
		const name =
			document.createElement(
				"span"
			);


		name.className =
			"tracker-item-name";


		name.textContent =
			item.name ??
			item.title ??
			item.id ??
			"Unbenannter Eintrag";


		listItem.append(
			name
		);


		/*
		 * Optionale Beschreibung
		 */
		if (item.description) {
			const description =
				document.createElement(
					"span"
				);


			description.className =
				"tracker-item-description";


			description.textContent =
				item.description;


			listItem.append(
				description
			);
		}


		/*
		 * Optionaler Fundort
		 */
		if (item.location) {
			const location =
				document.createElement(
					"span"
				);


			location.className =
				"tracker-item-location";


			location.textContent =
				item.location;


			listItem.append(
				location
			);
		}


		list.append(
			listItem
		);
	}


	container.append(
		list
	);
}
