import {
	loadCategoryData
} from "../services/dataService.js";

import {
	calculateCategoryProgress,
	isItemCompleted,
	loadGameProgressData,
	setItemCompleted
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
 * @param {Object} game
 * @param {Object} category
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
		 * Sticky-Toolbar
		 *
		 * Enthält den Zurück-Button und den
		 * Fortschritt der geöffneten Kategorie.
		 */
		const categoryToolbar =
			document.createElement(
				"div"
			);


		categoryToolbar.className =
			"category-toolbar";


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
		 * Fortschrittsanzeige
		 */
		const categoryProgress =
			document.createElement(
				"span"
			);


		categoryProgress.className =
			"category-content-progress";


		categoryProgress.dataset.currentCategoryProgress =
			"true";


		/*
		 * Fallback, bis der tatsächliche Wert
		 * berechnet wurde.
		 */
		categoryProgress.textContent =
			"0 / 0 · 0 %";


		categoryToolbar.append(
			backButton,
			categoryProgress
		);


		/*
		 * Kategorie-Inhalt
		 */
		const categoryContent =
			document.createElement(
				"section"
			);


		categoryContent.className =
			"category-content";


		/*
		 * Kategorie-Kopf
		 */
		const categoryHeader =
			document.createElement(
				"div"
			);


		categoryHeader.className =
			"category-content-header";


		const categoryTitle =
			document.createElement(
				"h3"
			);


		categoryTitle.textContent =
			category.name;


		categoryHeader.append(
			categoryTitle
		);


		categoryContent.append(
			categoryHeader
		);


		/*
		 * Beschreibung
		 */
		if (category.description) {
			const description =
				document.createElement(
					"p"
				);


			description.className =
				"category-content-description";


			description.textContent =
				category.description;


			categoryContent.append(
				description
			);
		}


		/*
		 * Kategorie-Daten darstellen
		 */
		renderCategoryData(
			categoryContent,
			data,
			game.id,
			progressData
		);


		/*
		 * Seite zusammensetzen
		 */
		gamePage.append(
			gameHeader,
			categoryToolbar,
			categoryContent
		);


		mainContent.append(
			gamePage
		);


		/*
		 * Wichtig:
		 *
		 * Erst nach mainContent.append() aktualisieren,
		 * damit die Fortschrittsanzeige bereits im DOM
		 * vorhanden ist.
		 */
		updateCurrentCategoryProgress(
			data,
			progressData
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
 * @param {HTMLElement} container
 * @param {Object|Array} data
 * @param {string} gameId
 * @param {Object} progressData
 */
function renderCategoryData(
	container,
	data,
	gameId,
	progressData
) {
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
				gameId,
				progressData,
				data
			);
		}


		return;
	}


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
				gameId,
				progressData,
				data
			);
		}


		return;
	}


	if (
		Array.isArray(
			data?.items
		)
	) {
		renderItemList(
			container,
			data.items,
			gameId,
			progressData,
			data
		);


		return;
	}


	if (Array.isArray(data)) {
		renderItemList(
			container,
			data,
			gameId,
			progressData,
			data
		);


		return;
	}


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
 * @param {HTMLElement} container
 * @param {Object} group
 * @param {string} gameId
 * @param {Object} progressData
 * @param {Object|Array} categoryData
 */
function renderCategoryGroup(
	container,
	group,
	gameId,
	progressData,
	categoryData
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
		const header =
			document.createElement(
				"div"
			);


		header.className =
			"category-group-header";


		const title =
			document.createElement(
				"h4"
			);


		title.textContent =
			group.name;


		header.append(
			title
		);


		section.append(
			header
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


		description.className =
			"category-group-description";


		description.textContent =
			group.description;


		section.append(
			description
		);
	}


	if (
		Array.isArray(
			group.items
		)
	) {
		renderItemList(
			section,
			group.items,
			gameId,
			progressData,
			categoryData
		);
	}


	container.append(
		section
	);
}


/**
 * Gibt eine Liste von Tracker-Items aus.
 *
 * @param {HTMLElement} container
 * @param {Array} items
 * @param {string} gameId
 * @param {Object} progressData
 * @param {Object|Array} categoryData
 */
function renderItemList(
	container,
	items,
	gameId,
	progressData,
	categoryData
) {
	const list =
		document.createElement(
			"ul"
		);


	list.className =
		"tracker-list";


	for (const item of items) {
		const listItem =
			createTrackerItem(
				item,
				gameId,
				progressData,
				categoryData
			);


		list.append(
			listItem
		);
	}


	container.append(
		list
	);
}


/**
 * Erstellt einen einzelnen Tracker-Eintrag.
 *
 * @param {Object} item
 * @param {string} gameId
 * @param {Object} progressData
 * @param {Object|Array} categoryData
 * @returns {HTMLLIElement}
 */
function createTrackerItem(
	item,
	gameId,
	progressData,
	categoryData
) {
	const listItem =
		document.createElement(
			"li"
		);


	listItem.className =
		"tracker-item";


	if (item.id) {
		listItem.dataset.itemId =
			item.id;
	}


	/*
	 * Status-Indikator
	 */
	const statusIndicator =
		document.createElement(
			"span"
		);


	statusIndicator.className =
		"tracker-item-status";


	statusIndicator.setAttribute(
		"aria-hidden",
		"true"
	);


	/*
	 * Inhalt
	 */
	const content =
		document.createElement(
			"div"
		);


	content.className =
		"tracker-item-content";


	const name =
		document.createElement(
			"h5"
		);


	name.className =
		"tracker-item-name";


	name.textContent =
		item.name ??
		item.title ??
		item.id ??
		"Unbenannter Eintrag";


	content.append(
		name
	);


	/*
	 * Beschreibung
	 */
	if (item.description) {
		const description =
			document.createElement(
				"p"
			);


		description.className =
			"tracker-item-description";


		description.textContent =
			item.description;


		content.append(
			description
		);
	}


	/*
	 * Details
	 */
	const details =
		createItemDetails(item);


	if (details) {
		content.append(
			details
		);
	}


	/*
	 * Toggle-Button
	 */
	const toggleButton =
		document.createElement(
			"button"
		);


	toggleButton.type =
		"button";


	toggleButton.className =
		"tracker-toggle";


	/*
	 * Initialen Status setzen
	 */
	const completed =
		isItemCompleted(
			item,
			progressData
		);


	updateTrackerItemState(
		listItem,
		statusIndicator,
		toggleButton,
		completed
	);


	/*
	 * Status ändern
	 */
	toggleButton.addEventListener(
		"click",
		() => {
			const currentState =
				isItemCompleted(
					item,
					progressData
				);


			const newState =
				!currentState;


			setItemCompleted(
				gameId,
				item,
				newState,
				progressData
			);


			updateTrackerItemState(
				listItem,
				statusIndicator,
				toggleButton,
				newState
			);


			/*
			 * Fortschrittsanzeige direkt aktualisieren.
			 */
			updateCurrentCategoryProgress(
				categoryData,
				progressData
			);
		}
	);


	listItem.append(
		statusIndicator,
		content,
		toggleButton
	);


	return listItem;
}


/**
 * Erstellt den Detailbereich eines Items.
 *
 * Unterstützt bevorzugt:
 *
 * "details": [
 *     {
 *         "label": "Fundort",
 *         "value": "..."
 *     }
 * ]
 *
 * Das bisherige Feld "location" wird zusätzlich
 * weiterhin unterstützt.
 *
 * @param {Object} item
 * @returns {HTMLDetailsElement|null}
 */
function createItemDetails(item) {
	const detailEntries = [];


	/*
	 * Universelle neue Detail-Struktur
	 */
	if (
		Array.isArray(
			item.details
		)
	) {
		for (
			const detail of item.details
		) {
			if (
				!detail ||
				!detail.label ||
				detail.value === undefined ||
				detail.value === null ||
				detail.value === ""
			) {
				continue;
			}


			detailEntries.push({
				label:
					String(
						detail.label
					),

				value:
					String(
						detail.value
					)
			});
		}
	}


	/*
	 * Alte location-Eigenschaft weiterhin
	 * als Fallback unterstützen.
	 */
	if (
		item.location &&
		!detailEntries.some(
			detail =>
				detail.label.toLowerCase() ===
				"fundort"
		)
	) {
		detailEntries.push({
			label:
				"Fundort",

			value:
				String(
					item.location
				)
		});
	}


	if (
		detailEntries.length === 0
	) {
		return null;
	}


	const details =
		document.createElement(
			"details"
		);


	details.className =
		"tracker-item-details";


	const summary =
		document.createElement(
			"summary"
		);


	summary.textContent =
		"Details anzeigen";


	details.append(
		summary
	);


	const detailList =
		document.createElement(
			"dl"
		);


	for (
		const detail of detailEntries
	) {
		const term =
			document.createElement(
				"dt"
			);


		term.textContent =
			detail.label;


		const description =
			document.createElement(
				"dd"
			);


		description.textContent =
			detail.value;


		detailList.append(
			term,
			description
		);
	}


	details.append(
		detailList
	);


	/*
	 * Text beim Öffnen/Schließen anpassen.
	 */
	details.addEventListener(
		"toggle",
		() => {
			summary.textContent =
				details.open
					? "Details ausblenden"
					: "Details anzeigen";
		}
	);


	return details;
}


/**
 * Aktualisiert den visuellen Status
 * eines Tracker-Items.
 *
 * @param {HTMLElement} listItem
 * @param {HTMLElement} statusIndicator
 * @param {HTMLButtonElement} toggleButton
 * @param {boolean} completed
 */
function updateTrackerItemState(
	listItem,
	statusIndicator,
	toggleButton,
	completed
) {
	listItem.classList.toggle(
		"is-completed",
		completed
	);


	statusIndicator.textContent =
		completed
			? "✓"
			: "";


	statusIndicator.classList.toggle(
		"is-completed",
		completed
	);


	toggleButton.classList.toggle(
		"is-active",
		completed
	);


	toggleButton.setAttribute(
		"aria-pressed",
		String(completed)
	);


	if (completed) {
		toggleButton.textContent =
			"✓ Gefunden";


		toggleButton.setAttribute(
			"aria-label",
			"Als nicht gefunden markieren"
		);

	} else {
		toggleButton.textContent =
			"Als gefunden markieren";


		toggleButton.setAttribute(
			"aria-label",
			"Als gefunden markieren"
		);
	}
}


/**
 * Aktualisiert den Fortschritt der aktuell
 * geöffneten Kategorie.
 *
 * @param {Object|Array} categoryData
 * @param {Object} progressData
 */
function updateCurrentCategoryProgress(
	categoryData,
	progressData
) {
	const element =
		document.querySelector(
			"[data-current-category-progress]"
		);


	if (!element) {
		return;
	}


	const progress =
		calculateCategoryProgress(
			categoryData,
			progressData
		);


	const percent =
		progress.total > 0
			? Math.round(
				(progress.completed /
					progress.total) *
					100
			)
			: 0;


	element.textContent =
		`${progress.completed} / ${progress.total} · ${percent} %`;
}
