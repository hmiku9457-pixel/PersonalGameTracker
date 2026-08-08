/* =========================================================
   Personal Game Tracker
   Category Controls View
   ========================================================= */


import {
	getActiveViewScope,
	registerViewCleanup
} from "../services/viewScopeService.js";


import {
	getCurrentLanguage,
	getCurrentLocale
} from "../services/languageService.js";


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
   2. Observer
   --------------------------------------------------------- */

/*
 * Es soll immer nur ein Observer für die aktuell
 * dargestellte Kategorie aktiv sein.
 *
 * Beim Wechsel der Kategorie wird der alte Observer
 * beendet und durch einen neuen ersetzt.
 */
let activeItemStateObserver =
	null;


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


	/*
	 * Eventuell bestehenden Observer einer
	 * vorherigen Kategorie beenden.
	 */
	if (activeItemStateObserver) {
		activeItemStateObserver.disconnect();

		activeItemStateObserver =
			null;
	}


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
					emptyMessage
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


			applyCategoryControls(
				container,
				controlState,
				resultCount,
				emptyMessage
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


			applyCategoryControls(
				container,
				controlState,
				resultCount,
				emptyMessage
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


			applyCategoryControls(
				container,
				controlState,
				resultCount,
				emptyMessage
			);

		}
	);


	/*
	 * =====================================================
	 * Änderung eines Tracker-Status beobachten
	 * =====================================================
	 */

	let updateScheduled =
		false;


	activeItemStateObserver =
		new MutationObserver(
			mutations => {

				const itemStateChanged =
					mutations.some(
						mutation =>
							mutation.type ===
								"attributes" &&
							mutation.attributeName ===
								"class" &&
							mutation.target instanceof
								Element &&
							mutation.target.matches(
								".tracker-item"
							)
					);


				if (
					!itemStateChanged ||
					updateScheduled
				) {
					return;
				}


				updateScheduled =
					true;


				queueMicrotask(
					() => {

						updateScheduled =
							false;


						applyCategoryControls(
							container,
							controlState,
							resultCount,
							emptyMessage
						);

					}
				);

			}
		);


	activeItemStateObserver.observe(
		container,
		{
			subtree: true,
			attributes: true,
			attributeFilter: [
				"class"
			]
		}
	);

	const observerForViewScope =
		activeItemStateObserver;

	registerViewCleanup(
		() => {
			observerForViewScope.disconnect();

			if (
				activeItemStateObserver ===
				observerForViewScope
			) {
				activeItemStateObserver =
					null;
			}
		},
		getActiveViewScope()
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
		emptyMessage
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
   5. Textnormalisierung
   --------------------------------------------------------- */

/**
 * Normalisiert Text für die Volltextsuche.
 *
 * Dadurch werden unter anderem:
 *
 * - Groß-/Kleinschreibung ignoriert
 * - Akzente vereinheitlicht
 * - ß und ss gleich behandelt
 *
 * @param {*} value
 * @returns {string}
 */
function normalizeSearchText(
	value
) {
	return String(
		value ?? ""
	)
		.normalize(
			"NFD"
		)
		.replace(
			/[\u0300-\u036f]/g,
			""
		)
		.replace(
			/ß/g,
			"ss"
		)
		.toLowerCase()
		.trim();
}


/* ---------------------------------------------------------
   6. Suchtext
   --------------------------------------------------------- */

/**
 * Erstellt beziehungsweise liest den
 * durchsuchbaren Text eines Tracker-Items.
 *
 * Durchsucht werden ausschließlich die
 * aktuell gerenderten Texte:
 *
 * - Item-ID
 * - Name
 * - Beschreibung
 * - Detail-Labels
 * - Detail-Werte
 *
 * Damit arbeitet die Suche automatisch in
 * der aktuell ausgewählten Sprache.
 *
 * Der Suchtext wird im Dataset gecacht.
 *
 * @param {HTMLElement} itemElement
 * @returns {string}
 */
function getItemSearchText(
	itemElement
) {
	if (
		itemElement.dataset.searchText
	) {
		return itemElement.dataset
			.searchText;
	}


	const values = [];


	/*
	 * Item-ID
	 */
	if (
		itemElement.dataset.itemId
	) {
		values.push(
			itemElement.dataset.itemId
		);
	}


	/*
	 * Item-Name
	 */
	const name =
		itemElement.querySelector(
			".tracker-item-name"
		);


	if (name?.textContent) {
		values.push(
			name.textContent
		);
	}


	/*
	 * Beschreibung
	 */
	const description =
		itemElement.querySelector(
			".tracker-item-description"
		);


	if (
		description?.textContent
	) {
		values.push(
			description.textContent
		);
	}


	/*
	 * Details
	 */
	const detailElements =
		itemElement.querySelectorAll(
			[
				".tracker-item-details dt",
				".tracker-item-details dd"
			].join(", ")
		);


	for (
		const detailElement
		of detailElements
	) {
		if (
			detailElement.textContent
		) {
			values.push(
				detailElement.textContent
			);
		}
	}


	const searchText =
		normalizeSearchText(
			values.join(" ")
		);


	itemElement.dataset.searchText =
		searchText;


	return searchText;
}


/* ---------------------------------------------------------
   7. Sortiername
   --------------------------------------------------------- */

/**
 * Gibt den sichtbaren Namen eines Items für
 * die alphabetische Sortierung zurück.
 *
 * Da die Kategorie bei einem Sprachwechsel
 * neu gerendert wird, entspricht der Name
 * automatisch der aktuell gewählten Sprache.
 *
 * @param {HTMLElement} itemElement
 * @returns {string}
 */
function getItemSortName(
	itemElement
) {
	if (
		itemElement.dataset.sortName
	) {
		return itemElement.dataset
			.sortName;
	}


	const name =
		itemElement.querySelector(
			".tracker-item-name"
		);


	const sortName =
		String(
			name?.textContent ??
			itemElement.dataset.itemId ??
			""
		)
			.trim();


	itemElement.dataset.sortName =
		sortName;


	return sortName;
}


/* ---------------------------------------------------------
   8. Statusprüfung
   --------------------------------------------------------- */

/**
 * Prüft, ob ein Item zum aktuell
 * ausgewählten Statusfilter passt.
 *
 * @param {HTMLElement} item
 * @param {string} status
 * @returns {boolean}
 */
function matchesStatusFilter(
	item,
	status
) {
	if (
		status === "all"
	) {
		return true;
	}


	const completed =
		item.classList.contains(
			"is-completed"
		);


	if (
		status === "completed"
	) {
		return completed;
	}


	if (
		status === "incomplete"
	) {
		return !completed;
	}


	return true;
}


/* ---------------------------------------------------------
   9. Sortierung
   --------------------------------------------------------- */

/**
 * Sortiert die Items innerhalb aller
 * Tracker-Listen.
 *
 * Unterkategorien selbst werden nicht
 * alphabetisch verschoben.
 *
 * Die Sortierung verwendet das Locale der
 * aktuell ausgewählten Sprache.
 *
 * @param {HTMLElement} container
 * @param {string} direction
 */
function sortCategoryItems(
	container,
	direction
) {
	const lists =
		container.querySelectorAll(
			".tracker-list"
		);


	const locale =
		getCurrentLocale();


	for (
		const list of lists
	) {
		const items =
			Array.from(
				list.querySelectorAll(
					":scope > .tracker-item"
				)
			);


		items.sort(
			(first, second) => {

				const firstName =
					getItemSortName(
						first
					);


				const secondName =
					getItemSortName(
						second
					);


				const comparison =
					firstName.localeCompare(
						secondName,
						locale,
						{
							sensitivity:
								"base",

							numeric:
								true
						}
					);


				return direction ===
					"desc"
					? -comparison
					: comparison;

			}
		);


		for (
			const item of items
		) {
			list.append(
				item
			);
		}
	}
}


/* ---------------------------------------------------------
   10. Controls anwenden
   --------------------------------------------------------- */

/**
 * Wendet Suche, Statusfilter und Sortierung
 * gemeinsam auf die aktuelle Kategorie an.
 *
 * Reihenfolge:
 *
 * 1. Sortierung
 * 2. Volltextsuche
 * 3. Statusfilter
 * 4. Listen aktualisieren
 * 5. Gruppen aktualisieren
 *
 * @param {HTMLElement} container
 * @param {Object} state
 * @param {HTMLElement} resultCount
 * @param {HTMLElement} emptyMessage
 */
function applyCategoryControls(
	container,
	state,
	resultCount,
	emptyMessage
) {
	const query =
		normalizeSearchText(
			state.query
		);


	const searchTerms =
		query
			.split(/\s+/)
			.filter(Boolean);


	const searchIsActive =
		searchTerms.length > 0;


	const statusIsActive =
		state.status !==
			"all";


	/*
	 * =====================================================
	 * Accordion-Zustand der Suche behandeln
	 * =====================================================
	 */

	const groups =
		Array.from(
			container.querySelectorAll(
				".category-group"
			)
		);


	/*
	 * Suche beginnt.
	 *
	 * Aktuellen Accordion-Zustand speichern.
	 */
	if (
		searchIsActive &&
		!state.searchActive
	) {
		state.searchActive =
			true;


		state.groupOpenState.clear();


		for (
			const group of groups
		) {
			state.groupOpenState.set(
				group,
				group.open
			);
		}
	}


	/*
	 * Suche wurde beendet.
	 *
	 * Ursprünglichen Accordion-Zustand
	 * wiederherstellen.
	 */
	if (
		!searchIsActive &&
		state.searchActive
	) {
		for (
			const group of groups
		) {
			if (
				state.groupOpenState.has(
					group
				)
			) {
				group.open =
					state.groupOpenState.get(
						group
					);
			}
		}


		state.groupOpenState.clear();


		state.searchActive =
			false;
	}


	/*
	 * =====================================================
	 * Sortierung
	 * =====================================================
	 */

	sortCategoryItems(
		container,
		state.sort
	);


	/*
	 * =====================================================
	 * Items filtern
	 * =====================================================
	 */

	const items =
		Array.from(
			container.querySelectorAll(
				".tracker-item"
			)
		);


	let visibleItemCount =
		0;


	for (
		const item of items
	) {
		/*
		 * Volltextsuche.
		 */
		const searchText =
			getItemSearchText(
				item
			);


		const matchesSearch =
			searchTerms.every(
				term =>
					searchText.includes(
						term
					)
			);


		/*
		 * Statusfilter.
		 */
		const matchesStatus =
			matchesStatusFilter(
				item,
				state.status
			);


		const visible =
			matchesSearch &&
			matchesStatus;


		item.hidden =
			!visible;


		if (visible) {
			visibleItemCount++;
		}
	}


	/*
	 * =====================================================
	 * Tracker-Listen aktualisieren
	 * =====================================================
	 */

	const lists =
		Array.from(
			container.querySelectorAll(
				".tracker-list"
			)
		);


	for (
		const list of lists
	) {
		const listItems =
			Array.from(
				list.querySelectorAll(
					":scope > .tracker-item"
				)
			);


		const hasVisibleItem =
			listItems.some(
				item =>
					!item.hidden
			);


		list.hidden =
			!hasVisibleItem;
	}


	/*
	 * =====================================================
	 * Gruppen aktualisieren
	 * =====================================================
	 */

	for (
		const group of groups
	) {
		const groupItems =
			Array.from(
				group.querySelectorAll(
					".tracker-item"
				)
			);


		const hasVisibleItem =
			groupItems.some(
				item =>
					!item.hidden
			);


		/*
		 * Gruppen ohne passende Items
		 * komplett ausblenden.
		 */
		group.hidden =
			!hasVisibleItem;


		/*
		 * Während einer Volltextsuche werden
		 * Gruppen mit Treffern automatisch geöffnet.
		 *
		 * Ein reiner Statusfilter öffnet Gruppen
		 * dagegen nicht automatisch.
		 */
		if (
			searchIsActive &&
			hasVisibleItem
		) {
			group.open =
				true;
		}
	}


	/*
	 * =====================================================
	 * Trefferanzeige
	 * =====================================================
	 */

	if (searchIsActive) {

		resultCount.textContent =
			getResultCountText(
				visibleItemCount,
				true
			);


		resultCount.hidden =
			false;

	}
	else if (statusIsActive) {

		resultCount.textContent =
			getResultCountText(
				visibleItemCount,
				false
			);


		resultCount.hidden =
			false;

	}
	else {

		resultCount.textContent =
			"";


		resultCount.hidden =
			true;

	}


	/*
	 * =====================================================
	 * Keine Treffer
	 * =====================================================
	 */

	const filteringIsActive =
		searchIsActive ||
		statusIsActive;


	emptyMessage.hidden =
		!(
			filteringIsActive &&
			visibleItemCount === 0
		);
}


/* ---------------------------------------------------------
   11. Treffertext
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
