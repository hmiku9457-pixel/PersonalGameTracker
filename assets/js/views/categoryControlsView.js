/* =========================================================
   Personal Game Tracker
   Category Controls View
   ========================================================= */


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
   2. Performance-Zustand
   --------------------------------------------------------- */

/*
 * Die Item-Struktur einer gerenderten Kategorie bleibt
 * während ihrer Lebensdauer unverändert. Die dafür
 * benötigten DOM-Referenzen können daher gecacht werden.
 */
const categoryElementCache =
	new WeakMap();


/*
 * Schnelle Eingaben in der Volltextsuche werden auf
 * maximal eine Filterberechnung pro Browser-Frame
 * zusammengefasst.
 */
const scheduledCategoryUpdateFrames =
	new WeakMap();


/*
 * Wird dieselbe Kategorie-View erneut initialisiert,
 * ersetzen wir den vorherigen Status-Listener sauber.
 */
const categoryStateChangeHandlers =
	new WeakMap();


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


	const pendingUpdateFrame =
		scheduledCategoryUpdateFrames.get(
			container
		);

	if (
		pendingUpdateFrame !==
		undefined
	) {
		cancelAnimationFrame(
			pendingUpdateFrame
		);
	}

	scheduledCategoryUpdateFrames.delete(
		container
	);

	categoryElementCache.delete(
		container
	);


	const previousStateChangeHandler =
		categoryStateChangeHandlers.get(
			container
		);

	if (previousStateChangeHandler) {
		container.removeEventListener(
			"tracker-item-state-changed",
			previousStateChangeHandler
		);

		categoryStateChangeHandlers.delete(
			container
		);
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


			scheduleCategoryControlsUpdate(
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


			scheduleCategoryControlsUpdate(
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

			controlState.sortDirty =
				true;


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
				emptyMessage
			);
		};

	container.addEventListener(
		"tracker-item-state-changed",
		stateChangeHandler
	);

	categoryStateChangeHandlers.set(
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
   9. DOM-Cache
   --------------------------------------------------------- */

/**
 * Erfasst die für Suche, Filterung und Sortierung
 * benötigten DOM-Elemente einmal pro Kategorie.
 *
 * @param {HTMLElement} container
 * @returns {object}
 */
function getCategoryElements(
	container
) {
	const cached =
		categoryElementCache.get(
			container
		);

	if (cached) {
		return cached;
	}


	const items =
		Array.from(
			container.querySelectorAll(
				".tracker-item"
			)
		);

	const lists =
		Array.from(
			container.querySelectorAll(
				".tracker-list"
			)
		);

	const groups =
		Array.from(
			container.querySelectorAll(
				".category-group"
			)
		);


	const listItems =
		new Map();

	for (
		const list
		of lists
	) {
		listItems.set(
			list,
			Array.from(
				list.querySelectorAll(
					":scope > .tracker-item"
				)
			)
		);
	}


	const groupItems =
		new Map();

	for (
		const group
		of groups
	) {
		groupItems.set(
			group,
			Array.from(
				group.querySelectorAll(
					".tracker-item"
				)
			)
		);
	}


	const result = {
		items,
		lists,
		groups,
		listItems,
		groupItems
	};

	categoryElementCache.set(
		container,
		result
	);

	return result;
}


/**
 * Bündelt schnelle Suchänderungen auf maximal
 * eine Filterberechnung pro Browser-Frame.
 *
 * @param {HTMLElement} container
 * @param {Object} state
 * @param {HTMLElement} resultCount
 * @param {HTMLElement} emptyMessage
 */
function scheduleCategoryControlsUpdate(
	container,
	state,
	resultCount,
	emptyMessage
) {
	const previousFrame =
		scheduledCategoryUpdateFrames.get(
			container
		);

	if (
		previousFrame !==
		undefined
	) {
		cancelAnimationFrame(
			previousFrame
		);
	}


	const frame =
		requestAnimationFrame(
			() => {
				scheduledCategoryUpdateFrames.delete(
					container
				);

				if (
					!container.isConnected
				) {
					return;
				}

				applyCategoryControls(
					container,
					state,
					resultCount,
					emptyMessage
				);
			}
		);

	scheduledCategoryUpdateFrames.set(
		container,
		frame
	);
}


/* ---------------------------------------------------------
   10. Sortierung
   --------------------------------------------------------- */

/**
 * Sortiert die gecachten Items innerhalb aller
 * Tracker-Listen.
 *
 * @param {object} categoryElements
 * @param {string} direction
 */
function sortCategoryItems(
	categoryElements,
	direction
) {
	const locale =
		getCurrentLocale();

	for (
		const list
		of categoryElements.lists
	) {
		const items =
			categoryElements.listItems.get(
				list
			) ?? [];

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

		/*
		 * Ein DOM-Append pro Liste statt eines
		 * einzelnen Appends pro Item.
		 */
		list.append(
			...items
		);
	}
}


/* ---------------------------------------------------------
   11. Controls anwenden
   --------------------------------------------------------- */

/**
 * Wendet Suche und Statusfilter auf die gecachten
 * Kategorieelemente an.
 *
 * Sortiert wird ausschließlich beim initialen Rendern
 * oder nach einer Änderung der Sortierauswahl.
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
	/*
	 * Ein direkt ausgelöstes Update ersetzt eine
	 * eventuell noch ausstehende Suchberechnung.
	 */
	const pendingFrame =
		scheduledCategoryUpdateFrames.get(
			container
		);

	if (
		pendingFrame !==
		undefined
	) {
		cancelAnimationFrame(
			pendingFrame
		);

		scheduledCategoryUpdateFrames.delete(
			container
		);
	}


	const categoryElements =
		getCategoryElements(
			container
		);

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

	const groups =
		categoryElements.groups;


	/*
	 * Suche beginnt:
	 * Accordion-Zustand sichern.
	 */
	if (
		searchIsActive &&
		!state.searchActive
	) {
		state.searchActive =
			true;

		state.groupOpenState.clear();

		for (
			const group
			of groups
		) {
			state.groupOpenState.set(
				group,
				group.open
			);
		}
	}


	/*
	 * Suche endet:
	 * ursprünglichen Accordion-Zustand herstellen.
	 */
	if (
		!searchIsActive &&
		state.searchActive
	) {
		for (
			const group
			of groups
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


	if (state.sortDirty) {
		sortCategoryItems(
			categoryElements,
			state.sort
		);

		state.sortDirty =
			false;
	}


	let visibleItemCount =
		0;

	for (
		const item
		of categoryElements.items
	) {
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


	for (
		const list
		of categoryElements.lists
	) {
		const listEntries =
			categoryElements.listItems.get(
				list
			) ?? [];

		list.hidden =
			!listEntries.some(
				item =>
					!item.hidden
			);
	}


	for (
		const group
		of groups
	) {
		const groupEntries =
			categoryElements.groupItems.get(
				group
			) ?? [];

		const hasVisibleItem =
			groupEntries.some(
				item =>
					!item.hidden
			);

		group.hidden =
			!hasVisibleItem;

		if (
			searchIsActive &&
			hasVisibleItem
		) {
			group.open =
				true;
		}
	}


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
   12. Treffertext
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
