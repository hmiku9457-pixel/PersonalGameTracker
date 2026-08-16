/* =========================================================
   Personal Game Tracker
   Category Controls View
   ========================================================= */


import {
	getCurrentLanguage
} from "../services/languageService.js";


import {
	applyCategoryControls,
	resetCategoryControlsEngine,
	scheduleCategoryControlsUpdate,
	setCategoryStateChangeHandler
} from "./categoryControlsEngine.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		searchLabel: "Kategorie durchsuchen",
		searchPlaceholder:
			"Name, Beschreibung, Fundort ...",

		status: "Status:",
		all: "Alle",
		incomplete: "Nicht gefunden",
		completed: "Gefunden",

		sort: "Sortierung:",

		noResults:
			"Keine passenden Items gefunden.",

		resultSingular: "Treffer",
		resultPlural: "Treffer",

		itemSingular: "Item",
		itemPlural: "Items"
	},

	en: {
		searchLabel: "Search category",
		searchPlaceholder:
			"Name, description, location ...",

		status: "Status:",
		all: "All",
		incomplete: "Not found",
		completed: "Found",

		sort: "Sort:",

		noResults:
			"No matching items found.",

		resultSingular: "result",
		resultPlural: "results",

		itemSingular: "item",
		itemPlural: "items"
	}
};


/**
 * Gibt einen UI-Text in der aktuell
 * ausgewählten Sprache zurück.
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
   3. Kategorie-Controls
   --------------------------------------------------------- */

/**
 * Erstellt die Bedienelemente für die aktuell
 * geöffnete Kategorie.
 *
 * Enthalten:
 *
 * - Volltextsuche
 * - Statusfilter
 * - alphabetische Sortierung
 *
 * @param {HTMLElement} container
 */
export function renderCategoryControls(
	container
) {
	if (
		!(
			container instanceof HTMLElement
		)
	) {
		return;
	}


	/*
	 * Ohne Tracker-Items werden keine
	 * Bedienelemente benötigt.
	 */
	if (
		!container.querySelector(
			".tracker-item"
		)
	) {
		return;
	}


	resetCategoryControlsEngine(
		container
	);


	/*
	 * Doppelte Bedienelemente verhindern.
	 */
	const existingControls =
		container.querySelector(
			".category-list-controls"
		);


	if (existingControls) {

		const existingIntegratedGroupControls =
			existingControls.querySelector(
				".category-group-controls"
			);


		if (
			existingIntegratedGroupControls
		) {
			existingIntegratedGroupControls
				.classList.remove(
					"is-integrated"
				);

			existingControls.before(
				existingIntegratedGroupControls
			);
		}


		existingControls.remove();
	}


	/*
	 * =====================================================
	 * Hauptcontainer
	 * =====================================================
	 */

	const controls =
		document.createElement(
			"div"
		);


	controls.className =
		"category-list-controls";


	/*
	 * Gemeinsamer Zustand aller Bedienelemente.
	 */
	const controlState = {
		query: "",
		status: "all",
		sort: "asc",
		sortDirty: true,

		searchActive: false,

		groupOpenState:
			new Map()
	};


	/*
	 * =====================================================
	 * 1. Volltextsuche
	 * =====================================================
	 */

	const searchContainer =
		document.createElement(
			"div"
		);


	searchContainer.className =
		"category-search";


	const searchLabel =
		document.createElement(
			"label"
		);


	searchLabel.className =
		"category-search-label";


	searchLabel.htmlFor =
		"category-search-input";


	searchLabel.textContent =
		getUiText(
			"searchLabel"
		);


	const searchRow =
		document.createElement(
			"div"
		);


	searchRow.className =
		"category-search-row";


	const searchInput =
		document.createElement(
			"input"
		);


	searchInput.type =
		"search";


	searchInput.id =
		"category-search-input";


	searchInput.className =
		"category-search-input";


	searchInput.placeholder =
		getUiText(
			"searchPlaceholder"
		);


	searchInput.autocomplete =
		"off";


	searchInput.spellcheck =
		false;


	/*
	 * Trefferanzahl
	 */
	const resultCount =
		document.createElement(
			"span"
		);


	resultCount.className =
		"category-search-result-count";


	resultCount.setAttribute(
		"aria-live",
		"polite"
	);


	resultCount.hidden =
		true;


	searchRow.append(
		searchInput,
		resultCount
	);


	searchContainer.append(
		searchLabel,
		searchRow
	);


	/*
	 * =====================================================
	 * 2. Filter und Sortierung
	 * =====================================================
	 */

	const filterSortRow =
		document.createElement(
			"div"
		);


	filterSortRow.className =
		"category-filter-sort-row";


	/*
	 * -----------------------------------------------------
	 * Statusfilter
	 * -----------------------------------------------------
	 */

	const statusFilter =
		document.createElement(
			"div"
		);


	statusFilter.className =
		"category-status-filter";


	const statusLabel =
		document.createElement(
			"span"
		);


	statusLabel.className =
		"category-control-label";


	statusLabel.textContent =
		getUiText(
			"status"
		);


	const statusButtons =
		document.createElement(
			"div"
		);


	statusButtons.className =
		"category-status-buttons";


	/*
	 * Verfügbare Filter.
	 *
	 * Der interne Wert bleibt sprachunabhängig.
	 */
	const filterOptions = [
		{
			value: "all",
			label:
				getUiText("all")
		},
		{
			value: "incomplete",
			label:
				getUiText("incomplete")
		},
		{
			value: "completed",
			label:
				getUiText("completed")
		}
	];


	for (
		const option
		of filterOptions
	) {
		const button =
			document.createElement(
				"button"
			);


		button.type =
			"button";


		button.className =
			"category-status-button";


		button.dataset.statusFilter =
			option.value;


		button.textContent =
			option.label;


		const active =
			option.value ===
			controlState.status;


		button.classList.toggle(
			"is-active",
			active
		);


		button.setAttribute(
			"aria-pressed",
			String(active)
		);


		button.addEventListener(
			"click",
			() => {

				controlState.status =
					option.value;


				updateStatusButtons(
					statusButtons,
					controlState.status
				);


				applyCategoryControls(
					container,
					controlState,
					resultCount,
					emptyMessage,
					getResultCountText
				);

			}
		);


		statusButtons.append(
			button
		);
	}


	statusFilter.append(
		statusLabel,
		statusButtons
	);


	/*
	 * -----------------------------------------------------
	 * Sortierung
	 * -----------------------------------------------------
	 */

	const sortContainer =
		document.createElement(
			"div"
		);


	sortContainer.className =
		"category-sort";


	const sortLabel =
		document.createElement(
			"label"
		);


	sortLabel.className =
		"category-control-label";


	sortLabel.htmlFor =
		"category-sort-select";


	sortLabel.textContent =
		getUiText(
			"sort"
		);


	const sortSelect =
		document.createElement(
			"select"
		);


	sortSelect.id =
		"category-sort-select";


	sortSelect.className =
		"category-sort-select";


	const sortAscending =
		document.createElement(
			"option"
		);


	sortAscending.value =
		"asc";


	sortAscending.textContent =
		"A–Z";


	const sortDescending =
		document.createElement(
			"option"
		);


	sortDescending.value =
		"desc";


	sortDescending.textContent =
		"Z–A";


	sortSelect.append(
		sortAscending,
		sortDescending
	);


	sortSelect.value =
		controlState.sort;


	sortContainer.append(
		sortLabel,
		sortSelect
	);


	filterSortRow.append(
		statusFilter,
		sortContainer
	);


	/*
	 * =====================================================
	 * 3. Keine Treffer
	 * =====================================================
	 */

	const emptyMessage =
		document.createElement(
			"p"
		);


	emptyMessage.className =
		"category-search-empty";


	emptyMessage.textContent =
		getUiText(
			"noResults"
		);


	emptyMessage.hidden =
		true;


	/*
	 * =====================================================
	 * Bedienelemente zusammensetzen
	 * =====================================================
	 */

	const lowerRow =
		document.createElement(
			"div"
		);


	lowerRow.className =
		"category-controls-lower-row";


	const groupControls =
		container.querySelector(
			":scope > .category-group-controls"
		);


	lowerRow.append(
		filterSortRow
	);


	if (groupControls) {
		groupControls.classList.add(
			"is-integrated"
		);

		lowerRow.append(
			groupControls
		);
	}


	controls.append(
		searchContainer,
		lowerRow,
		emptyMessage
	);


	/*
	 * Die Controls sollen vor den Accordions
	 * beziehungsweise vor der Tracker-Liste stehen.
	 */
	const firstCategoryElement =
		container.querySelector(
			[
				".category-group",
				".tracker-list"
			].join(", ")
		);


	if (firstCategoryElement) {
		container.insertBefore(
			controls,
			firstCategoryElement
		);
	}
	else {
		container.append(
			controls
		);
	}


	/*
	 * =====================================================
	 * Events
	 * =====================================================
	 */


	/*
	 * -----------------------------------------------------
	 * Live-Suche
	 * -----------------------------------------------------
	 */

	searchInput.addEventListener(
		"input",
		() => {

			controlState.query =
				searchInput.value;


			scheduleCategoryControlsUpdate(
				container,
				controlState,
				resultCount,
				emptyMessage,
				getResultCountText
			);

		}
	);


	/*
	 * ESC leert ausschließlich die Suche.
	 *
	 * Statusfilter und Sortierung bleiben bestehen.
	 */
	searchInput.addEventListener(
		"keydown",
		event => {

			if (
				event.key !==
				"Escape"
			) {
				return;
			}


			if (!searchInput.value) {
				return;
			}


			event.preventDefault();


			searchInput.value =
				"";


			controlState.query =
				"";


			scheduleCategoryControlsUpdate(
				container,
				controlState,
				resultCount,
				emptyMessage,
				getResultCountText
			);

		}
	);


	/*
	 * -----------------------------------------------------
	 * Sortierung
	 * -----------------------------------------------------
	 */

	sortSelect.addEventListener(
		"change",
		() => {

			controlState.sort =
				sortSelect.value;

			controlState.sortDirty =
				true;


			applyCategoryControls(
				container,
				controlState,
				resultCount,
				emptyMessage,
				getResultCountText
			);

		}
	);


	/*
	 * =====================================================
	 * Gezielt auf geänderten Tracker-Status reagieren
	 * =====================================================
	 */
	const stateChangeHandler =
		() => {
			/*
			 * Ohne aktiven Statusfilter ändert ein
			 * Fortschrittswechsel die sichtbare Menge nicht.
			 */
			if (
				controlState.status ===
				"all"
			) {
				return;
			}

			applyCategoryControls(
				container,
				controlState,
				resultCount,
				emptyMessage,
				getResultCountText
			);
		};

	setCategoryStateChangeHandler(
		container,
		stateChangeHandler
	);


	/*
	 * Initial anwenden.
	 *
	 * Dadurch wird die Liste direkt alphabetisch
	 * A–Z dargestellt.
	 */
	applyCategoryControls(
		container,
		controlState,
		resultCount,
		emptyMessage,
		getResultCountText
	);
}


/* ---------------------------------------------------------
   4. Statusfilter
   --------------------------------------------------------- */

/**
 * Aktualisiert die sichtbare Auswahl der
 * Statusfilter-Buttons.
 *
 * @param {HTMLElement} container
 * @param {string} activeStatus
 */
function updateStatusButtons(
	container,
	activeStatus
) {
	const buttons =
		container.querySelectorAll(
			".category-status-button"
		);


	for (
		const button of buttons
	) {
		const active =
			button.dataset
				.statusFilter ===
			activeStatus;


		button.classList.toggle(
			"is-active",
			active
		);


		button.setAttribute(
			"aria-pressed",
			String(active)
		);
	}
}


/* ---------------------------------------------------------
   5. Treffertext
   --------------------------------------------------------- */

/**
 * Erstellt die lokalisierte Trefferanzeige.
 *
 * Beispiele:
 *
 * Deutsch:
 * 1 Treffer
 * 5 Treffer
 * 1 Item
 * 5 Items
 *
 * Englisch:
 * 1 result
 * 5 results
 * 1 item
 * 5 items
 *
 * @param {number} count
 * @param {boolean} searchMode
 * @returns {string}
 */
function getResultCountText(
	count,
	searchMode
) {
	if (searchMode) {
		const label =
			count === 1
				? getUiText(
					"resultSingular"
				)
				: getUiText(
					"resultPlural"
				);


		return `${count} ${label}`;
	}


	const label =
		count === 1
			? getUiText(
				"itemSingular"
			)
			: getUiText(
				"itemPlural"
			);


	return `${count} ${label}`;
}
