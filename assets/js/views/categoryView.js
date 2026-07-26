/* =========================================================
   Personal Game Tracker
   Category View
   ========================================================= */


import {
	loadCategoryData
} from "../services/dataService.js";

import {
	calculateCategoryProgress,
	isItemCompleted,
	loadGameProgressData,
	setItemCompleted,
	getProgressErrorMessage
} from "../services/progressService.js";

import {
	getCurrentLanguage,
	getLocalizedText
} from "../services/languageService.js";

import {
	showError,
	showLoading
} from "./commonView.js";

import {
	updateActiveGameNavigation
} from "./navigationView.js";

import {
	renderCategoryControls
} from "./categoryControlsView.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		backToOverview: "← Zurück zur Übersicht",
		noEntries:
			"Für diese Kategorie sind noch keine darstellbaren Einträge vorhanden.",
		openAll: "Alle öffnen",
		closeAll: "Alle schließen",
		group: "Gruppe",
		unnamedEntry: "Unbenannter Eintrag",
		location: "Fundort",
		showDetails: "Details anzeigen",
		hideDetails: "Details ausblenden",
		found: "Gefunden",
		notFound: "Nicht gefunden",
		removeMark: "Markierung entfernen",
		markFound: "Als gefunden markieren",
		loginForProgress:
			"Zum Ändern des Fortschritts anmelden",
		invalidItemId:
			"Dieses Item besitzt keine gültige ID.",
		saving: "Speichern...",
		removing: "Entfernen...",
		categoryLoadError:
			"Die Kategorie konnte nicht geladen werden."
	},

	en: {
		backToOverview: "← Back to overview",
		noEntries:
			"There are no displayable entries in this category yet.",
		openAll: "Open all",
		closeAll: "Close all",
		group: "Group",
		unnamedEntry: "Unnamed entry",
		location: "Location",
		showDetails: "Show details",
		hideDetails: "Hide details",
		found: "Found",
		notFound: "Not found",
		removeMark: "Remove mark",
		markFound: "Mark as found",
		loginForProgress:
			"Sign in to change progress",
		invalidItemId:
			"This item does not have a valid ID.",
		saving: "Saving...",
		removing: "Removing...",
		categoryLoadError:
			"The category could not be loaded."
	}
};


/**
 * Gibt einen statischen UI-Text in der
 * aktuell gewählten Sprache zurück.
 *
 * @param {string} key
 * @returns {string}
 */
function getUiText(key) {
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
   3. Kategorie öffnen
   --------------------------------------------------------- */

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
		 * ---------------------------------------------------
		 * Spieltitel
		 * ---------------------------------------------------
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
			getLocalizedText(
				game.name,
				game.id
			);


		gameHeader.append(
			gameTitle
		);


		/*
		 * ---------------------------------------------------
		 * Sticky-Toolbar
		 * ---------------------------------------------------
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
			getUiText(
				"backToOverview"
			);


		backButton.addEventListener(
			"click",
			() => {

				window.location.hash =
					category.parentHash ||
					`#game/${game.id}`;
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


		categoryProgress.textContent =
			"0 / 0 · 0 %";


		categoryToolbar.append(
			backButton,
			categoryProgress
		);


		/*
		 * ---------------------------------------------------
		 * Kategorie-Inhalt
		 * ---------------------------------------------------
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
			getLocalizedText(
				category.name,
				category.id
			);


		categoryHeader.append(
			categoryTitle
		);


		categoryContent.append(
			categoryHeader
		);


		/*
		 * Beschreibung
		 */
		const localizedCategoryDescription =
			getLocalizedText(
				category.description,
				""
			);


		if (
			localizedCategoryDescription
		) {
			const description =
				document.createElement(
					"p"
				);


			description.className =
				"category-content-description";


			description.textContent =
				localizedCategoryDescription;


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
			progressData
		);


		/*
		 * Bedienelemente der Kategorie
		 * erstellen.
		 */
		renderCategoryControls(
			categoryContent
		);


		/*
		 * Fortschrittsbuttons aktivieren.
		 */
		registerProgressToggleHandler(
			categoryContent,
			game.id,
			category.id,
			data,
			progressData
		);


		/*
		 * ---------------------------------------------------
		 * Seite zusammensetzen
		 * ---------------------------------------------------
		 */

		gamePage.append(
			gameHeader,
			categoryToolbar,
			categoryContent
		);


		mainContent.append(
			gamePage
		);


		updateCurrentCategoryProgress(
			data,
			progressData
		);


		updateAllCategoryGroupProgress(
			categoryContent
		);


		updateActiveGameNavigation(
			game.id
		);

	}
	catch (error) {
		console.error(
			"[Category] Kategorie konnte nicht geladen werden:",
			error
		);


		showError(
			getUiText(
				"categoryLoadError"
			)
		);
	}
}


/* ---------------------------------------------------------
   4. Kategorie-Daten
   --------------------------------------------------------- */

/**
 * Gibt die Inhalte einer Kategorie aus.
 *
 * Unterstützt:
 *
 * - groups
 * - sections
 * - items
 * - direkte Arrays
 *
 * Gruppen und Sections werden als
 * einklappbare Bereiche dargestellt.
 *
 * @param {HTMLElement} container
 * @param {Object|Array} data
 * @param {Object} progressData
 */
function renderCategoryData(
	container,
	data,
	progressData
) {
	let groups = null;


	if (
		Array.isArray(
			data?.groups
		)
	) {
		groups =
			data.groups;
	}
	else if (
		Array.isArray(
			data?.sections
		)
	) {
		groups =
			data.sections;
	}


	/*
	 * Gruppierte Kategorie
	 */
	if (groups) {

		if (groups.length > 0) {

			renderCategoryGroupControls(
				container
			);


			for (
				const group of groups
			) {
				renderCategoryGroup(
					container,
					group,
					progressData
				);
			}

		}


		return;
	}


	/*
	 * Direktes Items-Array innerhalb
	 * des Kategorie-Objekts.
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
	 * Kategorie selbst ist bereits
	 * ein Array.
	 */
	if (
		Array.isArray(data)
	) {
		renderItemList(
			container,
			data,
			progressData
		);


		return;
	}


	const message =
		document.createElement(
			"p"
		);


	message.textContent =
		getUiText(
			"noEntries"
		);


	container.append(
		message
	);
}


/* ---------------------------------------------------------
   5. Gruppensteuerung
   --------------------------------------------------------- */

/**
 * Erstellt die Steuerung für
 * alle einklappbaren Kategoriegruppen.
 *
 * @param {HTMLElement} container
 */
function renderCategoryGroupControls(
	container
) {
	const controls =
		document.createElement(
			"div"
		);


	controls.className =
		"category-group-controls";


	/*
	 * Alle öffnen
	 */
	const openAllButton =
		document.createElement(
			"button"
		);


	openAllButton.type =
		"button";


	openAllButton.className =
		"category-group-control-button";


	openAllButton.textContent =
		getUiText(
			"openAll"
		);


	openAllButton.addEventListener(
		"click",
		() => {
			setAllCategoryGroups(
				container,
				true
			);
		}
	);


	/*
	 * Alle schließen
	 */
	const closeAllButton =
		document.createElement(
			"button"
		);


	closeAllButton.type =
		"button";


	closeAllButton.className =
		"category-group-control-button";


	closeAllButton.textContent =
		getUiText(
			"closeAll"
		);


	closeAllButton.addEventListener(
		"click",
		() => {
			setAllCategoryGroups(
				container,
				false
			);
		}
	);


	controls.append(
		openAllButton,
		closeAllButton
	);


	container.append(
		controls
	);
}


/**
 * Öffnet oder schließt alle
 * Kategoriegruppen.
 *
 * @param {HTMLElement} container
 * @param {boolean} open
 */
function setAllCategoryGroups(
	container,
	open
) {
	const groups =
		container.querySelectorAll(
			".category-group"
		);


	for (
		const group of groups
	) {
		group.open =
			open;
	}
}


/* ---------------------------------------------------------
   6. Kategoriegruppe
   --------------------------------------------------------- */

/**
 * Gibt eine einzelne Gruppe als
 * einklappbaren Bereich aus.
 *
 * @param {HTMLElement} container
 * @param {Object} group
 * @param {Object} progressData
 */
function renderCategoryGroup(
	container,
	group,
	progressData
) {
	const section =
		document.createElement(
			"details"
		);


	section.className =
		"category-group";


	if (group.id) {
		section.dataset.groupId =
			group.id;
	}


	/*
	 * Gruppen-Header
	 */
	const header =
		document.createElement(
			"summary"
		);


	header.className =
		"category-group-header";


	const headerMain =
		document.createElement(
			"span"
		);


	headerMain.className =
		"category-group-header-main";


	const chevron =
		document.createElement(
			"span"
		);


	chevron.className =
		"category-group-chevron";


	chevron.setAttribute(
		"aria-hidden",
		"true"
	);


	chevron.textContent =
		"▶";


	const title =
		document.createElement(
			"span"
		);


	title.className =
		"category-group-title";


	title.textContent =
		getLocalizedText(
			group.name,
			group.id ||
			getUiText("group")
		);


	headerMain.append(
		chevron,
		title
	);


	/*
	 * Fortschritt der Gruppe
	 */
	const progress =
		calculateCategoryProgress(
			group,
			progressData
		);


	const progressElement =
		document.createElement(
			"span"
		);


	progressElement.className =
		"category-group-progress";


	progressElement.textContent =
		`${progress.completed} / ${progress.total}`;


	header.append(
		headerMain,
		progressElement
	);


	/*
	 * Inhalt der Gruppe
	 */
	const body =
		document.createElement(
			"div"
		);


	body.className =
		"category-group-body";


	/*
	 * Optionale Beschreibung
	 */
	const localizedGroupDescription =
		getLocalizedText(
			group.description,
			""
		);


	if (
		localizedGroupDescription
	) {

		const description =
			document.createElement(
				"p"
			);


		description.className =
			"category-group-description";


		description.textContent =
			localizedGroupDescription;


		body.append(
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
			body,
			group.items,
			progressData
		);
	}


	section.append(
		header,
		body
	);


	container.append(
		section
	);
}


/* ---------------------------------------------------------
   7. Item-Liste
   --------------------------------------------------------- */

/**
 * Rendert eine Liste von Tracker-Items.
 *
 * @param {HTMLElement} container
 * @param {Array<Object>} items
 * @param {Object|null} progressData
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
			createTrackerItem(
				item,
				progressData
			);


		list.append(
			listItem
		);
	}


	container.append(
		list
	);
}


/* ---------------------------------------------------------
   8. Tracker-Item
   --------------------------------------------------------- */

/**
 * Erstellt einen einzelnen Tracker-Eintrag.
 *
 * Diese Funktion rendert ausschließlich.
 * Die Speicherung erfolgt zentral über
 * registerProgressToggleHandler().
 *
 * @param {Object} item
 * @param {Object|null} progressData
 * @returns {HTMLLIElement}
 */
function createTrackerItem(
	item,
	progressData
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


	const localizedName =
		getLocalizedText(
			item.name,
			""
		);


	const localizedTitle =
		getLocalizedText(
			item.title,
			""
		);


	name.textContent =
		localizedName ||
		localizedTitle ||
		item.id ||
		getUiText(
			"unnamedEntry"
		);


	content.append(
		name
	);


	/*
	 * Beschreibung
	 */
	const localizedDescription =
		getLocalizedText(
			item.description,
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
			"tracker-item-description";


		description.textContent =
			localizedDescription;


		content.append(
			description
		);
	}


	/*
	 * Details
	 */
	const details =
		createItemDetails(
			item
		);


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


	if (item.id) {
		toggleButton.dataset.itemId =
			item.id;
	}


	const completed =
		isItemCompleted(
			item,
			progressData
		);


	updateTrackerItemState(
		listItem,
		statusIndicator,
		toggleButton,
		completed,
		progressData?.authenticated === true
	);


	/*
	 * Items ohne ID können nicht persistent
	 * gespeichert werden.
	 */
	if (!item.id) {
		toggleButton.disabled =
			true;


		toggleButton.title =
			getUiText(
				"invalidItemId"
			);
	}


	listItem.append(
		statusIndicator,
		content,
		toggleButton
	);


	return listItem;
}


/* ---------------------------------------------------------
   9. Item-Details
   --------------------------------------------------------- */

/**
 * Erstellt den Detailbereich eines Items.
 *
 * Unterstützt weiterhin:
 *
 * "details": [
 *     {
 *         "label": "Fundort",
 *         "value": "..."
 *     }
 * ]
 *
 * Zusätzlich:
 *
 * "details": [
 *     {
 *         "label": {
 *             "de": "Fundort",
 *             "en": "Location"
 *         },
 *         "value": {
 *             "de": "...",
 *             "en": "..."
 *         }
 *     }
 * ]
 *
 * Das ältere Feld "location" wird weiterhin
 * als Fallback unterstützt.
 *
 * @param {Object} item
 * @returns {HTMLDetailsElement|null}
 */
function createItemDetails(item) {
	const detailEntries = [];


	if (
		Array.isArray(
			item.details
		)
	) {
		for (
			const detail of item.details
		) {
			if (!detail) {
				continue;
			}


			const label =
				getLocalizedText(
					detail.label,
					""
				);


			const value =
				getLocalizedText(
					detail.value,
					""
				);


			if (
				!label.trim() ||
				!value.trim()
			) {
				continue;
			}


			detailEntries.push({
				label:
					label.trim(),

				value:
					value.trim()
			});
		}
	}


	/*
	 * Altes "location"-Feld weiterhin
	 * unterstützen.
	 */
	const localizedLocation =
		getLocalizedText(
			item.location,
			""
		);


	if (
		localizedLocation &&
		!detailEntries.some(
			detail =>
				isLocationLabel(
					detail.label
				)
		)
	) {
		detailEntries.push({
			label:
				getUiText(
					"location"
				),

			value:
				localizedLocation
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
		getUiText(
			"showDetails"
		);


	details.append(
		summary
	);


	const detailList =
		document.createElement(
			"dl"
		);


	for (
		const detail
		of detailEntries
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


	details.addEventListener(
		"toggle",
		() => {
			summary.textContent =
				details.open
					? getUiText(
						"hideDetails"
					)
					: getUiText(
						"showDetails"
					);
		}
	);


	return details;
}


/**
 * Prüft, ob eine Detail-Beschriftung
 * bereits einen Fundort beschreibt.
 *
 * Dadurch wird verhindert, dass ein altes
 * "location"-Feld zusätzlich zu einem
 * vorhandenen Fundort-Detail angezeigt wird.
 *
 * @param {string} label
 * @returns {boolean}
 */
function isLocationLabel(label) {
	const normalizedLabel =
		label
			.trim()
			.toLocaleLowerCase();


	return (
		normalizedLabel ===
			"fundort" ||
		normalizedLabel ===
			"location"
	);
}


/* ---------------------------------------------------------
   10. Item-Status
   --------------------------------------------------------- */

/**
 * Aktualisiert den sichtbaren Zustand eines Items.
 *
 * @param {HTMLElement} listItem
 * @param {HTMLElement} statusIndicator
 * @param {HTMLButtonElement} toggleButton
 * @param {boolean} completed
 * @param {boolean} authenticated
 */
function updateTrackerItemState(
	listItem,
	statusIndicator,
	toggleButton,
	completed,
	authenticated
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


	updateTrackerToggle(
		toggleButton,
		completed,
		authenticated
	);
}


/**
 * Aktualisiert den sichtbaren Status eines
 * Fortschrittsbuttons.
 *
 * @param {HTMLButtonElement} button
 * @param {boolean} completed
 * @param {boolean} authenticated
 */
function updateTrackerToggle(
	button,
	completed,
	authenticated
) {
	button.classList.toggle(
		"is-completed",
		completed
	);


	button.setAttribute(
		"aria-pressed",
		String(completed)
	);


	button.textContent =
		completed
			? getUiText(
				"found"
			)
			: getUiText(
				"notFound"
			);


	button.disabled =
		!authenticated;


	if (authenticated) {

		const actionText =
			completed
				? getUiText(
					"removeMark"
				)
				: getUiText(
					"markFound"
				);


		button.title =
			actionText;


		button.setAttribute(
			"aria-label",
			actionText
		);

	}
	else {

		const loginText =
			getUiText(
				"loginForProgress"
			);


		button.title =
			loginText;


		button.setAttribute(
			"aria-label",
			loginText
		);

	}
}


/* ---------------------------------------------------------
   11. Gruppenfortschritt
   --------------------------------------------------------- */

/**
 * Aktualisiert den Fortschritt einer
 * sichtbaren Kategoriegruppe anhand
 * der gerenderten Tracker-Items.
 *
 * @param {HTMLElement|null} groupElement
 */
function updateCategoryGroupProgress(
	groupElement
) {
	if (!groupElement) {
		return;
	}


	const progressElement =
		groupElement.querySelector(
			".category-group-progress"
		);


	if (!progressElement) {
		return;
	}


	const items =
		groupElement.querySelectorAll(
			".tracker-item"
		);


	const completedItems =
		groupElement.querySelectorAll(
			".tracker-item.is-completed"
		);


	progressElement.textContent =
		`${completedItems.length} / ${items.length}`;
}


/**
 * Aktualisiert den Fortschritt aller
 * sichtbaren Kategoriegruppen.
 *
 * @param {HTMLElement} container
 */
function updateAllCategoryGroupProgress(
	container
) {
	if (!container) {
		return;
	}


	const groups =
		container.querySelectorAll(
			".category-group"
		);


	for (
		const group of groups
	) {
		updateCategoryGroupProgress(
			group
		);
	}
}


/* ---------------------------------------------------------
   12. Kategorie-Fortschritt
   --------------------------------------------------------- */

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
				(
					progress.completed /
					progress.total
				) * 100
			)
			: 0;


	element.textContent =
		`${progress.completed} / ${progress.total} · ${percent} %`;
}


/* ---------------------------------------------------------
   13. Item-Suche
   --------------------------------------------------------- */

/**
 * Sucht rekursiv ein Item anhand seiner ID.
 *
 * @param {Object|Array} data
 * @param {string} itemId
 * @returns {Object|null}
 */
function findItemById(
	data,
	itemId
) {
	if (!data) {
		return null;
	}


	if (Array.isArray(data)) {

		for (const entry of data) {

			if (
				entry?.id === itemId
			) {
				return entry;
			}


			const nested =
				findItemById(
					entry,
					itemId
				);


			if (nested) {
				return nested;
			}
		}


		return null;
	}


	if (
		typeof data === "object"
	) {

		if (
			data.id === itemId
		) {
			return data;
		}


		for (
			const value
			of Object.values(data)
		) {

			if (
				typeof value !== "object" ||
				value === null
			) {
				continue;
			}


			const nested =
				findItemById(
					value,
					itemId
				);


			if (nested) {
				return nested;
			}
		}

	}


	return null;
}


/* ---------------------------------------------------------
   14. Fortschrittsbuttons
   --------------------------------------------------------- */

/**
 * Aktiviert die Fortschrittsbuttons einer Kategorie.
 *
 * Es wird Event Delegation verwendet, sodass für eine
 * Kategorie nur ein einziger Click-Listener notwendig ist.
 *
 * @param {HTMLElement} container
 * @param {string} gameId
 * @param {string} categoryId
 * @param {Object|Array} data
 * @param {Object} progressData
 */
function registerProgressToggleHandler(
	container,
	gameId,
	categoryId,
	data,
	progressData
) {
	container.addEventListener(
		"click",
		async (event) => {

			if (
				!(
					event.target
					instanceof Element
				)
			) {
				return;
			}


			const button =
				event.target.closest(
					".tracker-toggle"
				);


			if (
				!button ||
				!container.contains(button)
			) {
				return;
			}


			const itemId =
				button.dataset.itemId;


			if (!itemId) {
				console.error(
					"[Progress] Button besitzt keine Item-ID."
				);

				return;
			}


			const item =
				findItemById(
					data,
					itemId
				);


			if (!item) {
				console.error(
					"[Progress] Item konnte nicht gefunden werden:",
					itemId
				);

				return;
			}


			const currentState =
				isItemCompleted(
					item,
					progressData
				);


			const newState =
				!currentState;


			const listItem =
				button.closest(
					".tracker-item"
				);


			const statusIndicator =
				listItem?.querySelector(
					".tracker-item-status"
				) ?? null;


			/*
			 * Während des Requests keine weiteren
			 * Klicks zulassen.
			 */
			button.disabled =
				true;


			button.setAttribute(
				"aria-busy",
				"true"
			);


			button.textContent =
				newState
					? getUiText(
						"saving"
					)
					: getUiText(
						"removing"
					);


			try {

				await setItemCompleted(
					gameId,
					categoryId,
					item,
					newState,
					progressData
				);


				/*
				 * Item visuell aktualisieren.
				 */
				if (
					listItem &&
					statusIndicator
				) {
					updateTrackerItemState(
						listItem,
						statusIndicator,
						button,
						newState,
						true
					);
				}
				else {
					updateTrackerToggle(
						button,
						newState,
						true
					);
				}


				/*
				 * Fortschritt der Unterkategorie
				 * sofort neu berechnen.
				 */
				if (listItem) {
					updateCategoryGroupProgress(
						listItem.closest(
							".category-group"
						)
					);
				}


				/*
				 * Kategorie-Fortschritt sofort
				 * neu berechnen.
				 */
				updateCurrentCategoryProgress(
					data,
					progressData
				);


				console.info(
					`[Progress] "${item.id}" wurde ${
						newState
							? "markiert"
							: "demarkiert"
					}.`
				);

			}
			catch (error) {

				console.error(
					"[Progress] Änderung konnte nicht gespeichert werden:",
					error
				);


				if (
					listItem &&
					statusIndicator
				) {
					updateTrackerItemState(
						listItem,
						statusIndicator,
						button,
						currentState,
						progressData?.authenticated === true
					);
				}
				else {
					updateTrackerToggle(
						button,
						currentState,
						progressData?.authenticated === true
					);
				}


				if (listItem) {
					updateCategoryGroupProgress(
						listItem.closest(
							".category-group"
						)
					);
				}


				window.alert(
					getProgressErrorMessage(
						error
					)
				);

			}
			finally {

				button.removeAttribute(
					"aria-busy"
				);

			}

		}
	);
}
