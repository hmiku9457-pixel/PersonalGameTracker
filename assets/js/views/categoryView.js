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
			game.name;


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
			progressData
		);


		/*
		 * Fortschrittsbuttons aktivieren.
		 *
		 * Es wird nur ein Event-Listener für die
		 * gesamte Kategorie benötigt.
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


		/*
		 * Erst aktualisieren, wenn die Anzeige
		 * tatsächlich im DOM vorhanden ist.
		 */
		updateCurrentCategoryProgress(
			data,
			progressData
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
			"Die Kategorie konnte nicht geladen werden."
		);
	}
}


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
 * @param {HTMLElement} container
 * @param {Object|Array} data
 * @param {Object} progressData
 */
function renderCategoryData(
	container,
	data,
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
				progressData
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
				progressData
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
			progressData
		);


		return;
	}


	if (Array.isArray(data)) {
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
		"Für diese Kategorie sind noch keine darstellbaren Einträge vorhanden.";


	container.append(
		message
	);
}


/**
 * Gibt eine einzelne Gruppe oder Section aus.
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
			"section"
		);


	section.className =
		"category-group";


	/*
	 * Gruppenname
	 */
	if (
		group.name ||
		group.title
	) {
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
			group.name ??
			group.title;


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


	/*
	 * Direkte Items
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


	/*
	 * Optional verschachtelte Gruppen
	 */
	if (
		Array.isArray(
			group.groups
		)
	) {
		for (
			const nestedGroup
			of group.groups
		) {
			renderCategoryGroup(
				section,
				nestedGroup,
				progressData
			);
		}
	}


	/*
	 * Optional verschachtelte Sections
	 */
	if (
		Array.isArray(
			group.sections
		)
	) {
		for (
			const nestedSection
			of group.sections
		) {
			renderCategoryGroup(
				section,
				nestedSection,
				progressData
			);
		}
	}


	container.append(
		section
	);
}


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
	 * -------------------------------------------------------
	 * Status-Indikator
	 * -------------------------------------------------------
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
	 * -------------------------------------------------------
	 * Inhalt
	 * -------------------------------------------------------
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
		createItemDetails(
			item
		);


	if (details) {
		content.append(
			details
		);
	}


	/*
	 * -------------------------------------------------------
	 * Toggle-Button
	 * -------------------------------------------------------
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
			"Dieses Item besitzt keine gültige ID.";
	}


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
 * Unterstützt:
 *
 * "details": [
 *     {
 *         "label": "Fundort",
 *         "value": "..."
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


	/*
	 * Universelle Detail-Struktur
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
	 * location weiterhin als Fallback.
	 */
	if (
		item.location &&
		!detailEntries.some(
			detail =>
				detail.label
					.toLowerCase() ===
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
					? "Details ausblenden"
					: "Details anzeigen";
		}
	);


	return details;
}


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
			? "Gefunden"
			: "Nicht gefunden";


	button.disabled =
		!authenticated;


	if (authenticated) {

		const actionText =
			completed
				? "Markierung entfernen"
				: "Als gefunden markieren";


		button.title =
			actionText;


		button.setAttribute(
			"aria-label",
			actionText
		);

	}
	else {

		const loginText =
			"Zum Ändern des Fortschritts anmelden";


		button.title =
			loginText;


		button.setAttribute(
			"aria-label",
			loginText
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
				(
					progress.completed /
					progress.total
				) * 100
			)
			: 0;


	element.textContent =
		`${progress.completed} / ${progress.total} · ${percent} %`;
}


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
					? "Speichern..."
					: "Entfernen...";


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


				/*
				 * Der lokale Zustand wurde im Service
				 * bei einem Fehler nicht verändert.
				 * Deshalb stellen wir den alten Zustand
				 * wieder dar.
				 */
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
