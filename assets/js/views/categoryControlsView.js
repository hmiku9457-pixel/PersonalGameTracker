/* =========================================================
   Personal Game Tracker
   Category Controls View
   ========================================================= */


/**
 * Erstellt die Bedienelemente für die aktuell
 * geöffnete Kategorie.
 *
 * Aktuell enthalten:
 *
 * - Volltextsuche
 *
 * Später können hier zusätzlich Statusfilter
 * und Sortierung ergänzt werden.
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
	 * Doppelte Bedienelemente verhindern.
	 */
	const existingControls =
		container.querySelector(
			".category-list-controls"
		);


	if (existingControls) {
		existingControls.remove();
	}


	const controls =
		document.createElement(
			"div"
		);


	controls.className =
		"category-list-controls";


	/*
	 * -------------------------------------------------------
	 * Suche
	 * -------------------------------------------------------
	 */

	const searchContainer =
		document.createElement(
			"div"
		);


	searchContainer.className =
		"category-search";


	const label =
		document.createElement(
			"label"
		);


	label.className =
		"category-search-label";


	label.htmlFor =
		"category-search-input";


	label.textContent =
		"Kategorie durchsuchen";


	const searchRow =
		document.createElement(
			"div"
		);


	searchRow.className =
		"category-search-row";


	const input =
		document.createElement(
			"input"
		);


	input.type =
		"search";


	input.id =
		"category-search-input";


	input.className =
		"category-search-input";


	input.placeholder =
		"Name, Beschreibung, Fundort ...";


	input.autocomplete =
		"off";


	input.spellcheck =
		false;


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
		input,
		resultCount
	);


	/*
	 * Meldung bei null Treffern.
	 */
	const emptyMessage =
		document.createElement(
			"p"
		);


	emptyMessage.className =
		"category-search-empty";


	emptyMessage.textContent =
		"Keine passenden Items gefunden.";


	emptyMessage.hidden =
		true;


	searchContainer.append(
		label,
		searchRow,
		emptyMessage
	);


	controls.append(
		searchContainer
	);


	/*
	 * -------------------------------------------------------
	 * Suchzustand
	 * -------------------------------------------------------
	 *
	 * Der ursprüngliche Accordion-Zustand wird
	 * während einer Suche zwischengespeichert.
	 */
	const searchState = {
		active: false,
		groupOpenState: new Map()
	};


	/*
	 * Live-Suche.
	 */
	input.addEventListener(
		"input",
		() => {
			applyCategorySearch(
				container,
				input.value,
				resultCount,
				emptyMessage,
				searchState
			);
		}
	);


	/*
	 * Escape leert das Suchfeld.
	 */
	input.addEventListener(
		"keydown",
		event => {

			if (
				event.key !==
				"Escape"
			) {
				return;
			}


			if (!input.value) {
				return;
			}


			event.preventDefault();


			input.value =
				"";


			applyCategorySearch(
				container,
				"",
				resultCount,
				emptyMessage,
				searchState
			);
		}
	);


	/*
	 * -------------------------------------------------------
	 * Bedienelemente an der richtigen Stelle einfügen.
	 * -------------------------------------------------------
	 *
	 * Die Suche soll vor den Accordion-Steuerelementen
	 * beziehungsweise vor der Tracker-Liste stehen.
	 */
	const firstCategoryElement =
		container.querySelector(
			[
				".category-group-controls",
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
}


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


/**
 * Erstellt beziehungsweise liest den
 * durchsuchbaren Text eines Tracker-Items.
 *
 * Durchsucht werden:
 *
 * - Item-ID
 * - Name
 * - Beschreibung
 * - Detail-Labels
 * - Detail-Werte
 *
 * Der erzeugte Text wird im Dataset gecacht,
 * damit er nicht bei jedem Tastendruck erneut
 * zusammengesetzt werden muss.
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
	 * Name
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
	 * Details.
	 *
	 * Sowohl Label als auch Wert werden
	 * in die Suche aufgenommen.
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


/**
 * Wendet die Volltextsuche auf die aktuell
 * dargestellte Kategorie an.
 *
 * Mehrere Suchbegriffe werden mit UND
 * verknüpft.
 *
 * Beispiel:
 *
 * "dark zone"
 *
 * findet nur Items, deren durchsuchbarer
 * Inhalt sowohl "dark" als auch "zone"
 * enthält.
 *
 * @param {HTMLElement} container
 * @param {string} rawQuery
 * @param {HTMLElement} resultCount
 * @param {HTMLElement} emptyMessage
 * @param {Object} searchState
 */
function applyCategorySearch(
	container,
	rawQuery,
	resultCount,
	emptyMessage,
	searchState
) {
	const query =
		normalizeSearchText(
			rawQuery
		);


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


	/*
	 * -------------------------------------------------------
	 * Suche zurücksetzen
	 * -------------------------------------------------------
	 */
	if (!query) {

		for (
			const item of items
		) {
			item.hidden =
				false;
		}


		for (
			const list of lists
		) {
			list.hidden =
				false;
		}


		for (
			const group of groups
		) {
			group.hidden =
				false;


			/*
			 * Accordion-Zustand von vor
			 * der Suche wiederherstellen.
			 */
			if (
				searchState
					.groupOpenState
					.has(group)
			) {
				group.open =
					searchState
						.groupOpenState
						.get(group);
			}
		}


		searchState.active =
			false;


		searchState
			.groupOpenState
			.clear();


		resultCount.hidden =
			true;


		resultCount.textContent =
			"";


		emptyMessage.hidden =
			true;


		return;
	}


	/*
	 * -------------------------------------------------------
	 * Beginn einer neuen Suche
	 * -------------------------------------------------------
	 *
	 * Der aktuelle Accordion-Zustand wird nur
	 * beim ersten Zeichen gespeichert.
	 */
	if (
		!searchState.active
	) {
		searchState.active =
			true;


		searchState
			.groupOpenState
			.clear();


		for (
			const group of groups
		) {
			searchState
				.groupOpenState
				.set(
					group,
					group.open
				);
		}
	}


	/*
	 * Suchbegriffe aufteilen.
	 */
	const searchTerms =
		query
			.split(/\s+/)
			.filter(Boolean);


	let matchCount =
		0;


	/*
	 * -------------------------------------------------------
	 * Items durchsuchen
	 * -------------------------------------------------------
	 */
	for (
		const item of items
	) {
		const searchText =
			getItemSearchText(
				item
			);


		const matches =
			searchTerms.every(
				term =>
					searchText.includes(
						term
					)
			);


		item.hidden =
			!matches;


		if (matches) {
			matchCount++;
		}
	}


	/*
	 * -------------------------------------------------------
	 * Tracker-Listen ohne Treffer ausblenden
	 * -------------------------------------------------------
	 */
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
	 * -------------------------------------------------------
	 * Gruppen behandeln
	 * -------------------------------------------------------
	 *
	 * Gruppen ohne Treffer verschwinden.
	 * Gruppen mit Treffern werden automatisch
	 * geöffnet.
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


		group.hidden =
			!hasVisibleItem;


		if (hasVisibleItem) {
			group.open =
				true;
		}
	}


	/*
	 * -------------------------------------------------------
	 * Trefferanzeige
	 * -------------------------------------------------------
	 */
	resultCount.textContent =
		matchCount === 1
			? "1 Treffer"
			: `${matchCount} Treffer`;


	resultCount.hidden =
		false;


	emptyMessage.hidden =
		matchCount !== 0;
}
