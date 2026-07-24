const mainContent = document.getElementById("main-content");
const gameNavigation = document.getElementById("game-navigation");

// Startinhalt der Seite speichern
const defaultContent = mainContent.innerHTML;

// Basisordner für alle JSON-Daten
const DATA_PATH = "data";

// Bereits geladene JSON-Dateien zwischenspeichern
const jsonCache = new Map();

// Aktuell dargestelltes Spiel
let currentGameId = null;


/**
 * Lädt eine JSON-Datei.
 *
 * Bereits geladene Dateien werden aus dem Cache zurückgegeben.
 *
 * @param {string} path Pfad zur JSON-Datei
 * @returns {Promise<any>}
 */
async function loadJson(path) {
	if (jsonCache.has(path)) {
		return jsonCache.get(path);
	}

	const response = await fetch(path);

	if (!response.ok) {
		throw new Error(
			`JSON-Datei konnte nicht geladen werden: ${path} (${response.status})`
		);
	}

	const data = await response.json();

	jsonCache.set(path, data);

	return data;
}


/**
 * Lädt die Liste aller Spiele.
 *
 * data/games.json:
 *
 * [
 *     {
 *         "id": "theDivision2",
 *         "name": "The Division 2"
 *     }
 * ]
 *
 * @returns {Promise<Array>}
 */
async function loadGames() {
	const games = await loadJson(`${DATA_PATH}/games.json`);

	if (!Array.isArray(games)) {
		throw new Error("games.json muss ein Array enthalten.");
	}

	return games;
}


/**
 * Erstellt die Spiele-Navigation.
 */
async function loadGameNavigation() {
	if (!gameNavigation) {
		console.warn(
			"Element #game-navigation wurde nicht gefunden."
		);

		return;
	}

	try {
		const games = await loadGames();

		gameNavigation.replaceChildren();

		for (const game of games) {
			const listItem = document.createElement("li");

			const link = document.createElement("a");

			link.href = `#game/${encodeURIComponent(game.id)}`;
			link.textContent = game.name;
			link.dataset.gameId = game.id;

			listItem.append(link);
			gameNavigation.append(listItem);
		}

		updateActiveGameNavigation();

	} catch (error) {
		console.error(error);

		gameNavigation.replaceChildren();

		const listItem = document.createElement("li");
		listItem.textContent = "Spiele konnten nicht geladen werden.";

		gameNavigation.append(listItem);
	}
}


/**
 * Lädt das Manifest eines Spiels.
 *
 * @param {string} gameId ID des Spiels
 * @returns {Promise<Object>}
 */
async function loadGameManifest(gameId) {
	const path = `${DATA_PATH}/${gameId}/manifest.json`;

	const manifest = await loadJson(path);

	if (!manifest.id) {
		manifest.id = gameId;
	}

	if (!Array.isArray(manifest.categories)) {
		manifest.categories = [];
	}

	return manifest;
}


/**
 * Lädt die JSON-Datei einer Kategorie.
 *
 * @param {string} gameId ID des Spiels
 * @param {Object} category Kategorie aus dem Manifest
 * @returns {Promise<Object>}
 */
async function loadCategoryData(gameId, category) {
	if (!category.file) {
		throw new Error(
			`Für die Kategorie "${category.name}" wurde keine Datei angegeben.`
		);
	}

	const path = `${DATA_PATH}/${gameId}/${category.file}`;

	return loadJson(path);
}


/**
 * Zeigt einen Ladehinweis im Main-Bereich an.
 */
function showLoading() {
	mainContent.innerHTML = `
		<div class="loading">
			<p>Inhalt wird geladen ...</p>
		</div>
	`;
}


/**
 * Zeigt eine Fehlermeldung an.
 *
 * @param {string} message Fehlermeldung
 */
function showError(message = "Der Inhalt konnte nicht geladen werden.") {
	mainContent.innerHTML = `
		<section class="error-message">
			<h2>Fehler</h2>
			<p>${message}</p>
		</section>
	`;
}


/**
 * Erstellt die komplette Übersichtsseite eines Spiels.
 *
 * @param {Object} game Spiel-Manifest
 */
function renderGame(game) {
	mainContent.replaceChildren();

	currentGameId = game.id;

	const gamePage = document.createElement("section");
	gamePage.className = "game-page";


	/*
	 * Spieltitel
	 */
	const gameHeader = document.createElement("div");
	gameHeader.className = "game-header";

	const gameTitle = document.createElement("h2");
	gameTitle.className = "game-title";
	gameTitle.textContent = game.name;

	gameHeader.append(gameTitle);


	/*
	 * Kategorien
	 */
	const categoryGrid = document.createElement("div");
	categoryGrid.className = "category-grid";
	categoryGrid.id = "category-grid";

	for (const category of game.categories) {
		const categoryCard = createCategoryCard(
			game,
			category
		);

		categoryGrid.append(categoryCard);
	}


	/*
	 * Gesamtfortschritt
	 */
	const progressContainer = createGameProgress();


	gamePage.append(
		gameHeader,
		categoryGrid,
		progressContainer
	);

	mainContent.append(gamePage);

	updateActiveGameNavigation();

	// Fortschrittswerte nachladen
	loadGameProgress(game);
}


/**
 * Erstellt einen einzelnen Kategorie-Button.
 *
 * @param {Object} game Spiel-Manifest
 * @param {Object} category Kategorie
 * @returns {HTMLButtonElement}
 */
function createCategoryCard(game, category) {
	const button = document.createElement("button");

	button.type = "button";
	button.className = "category-card";

	button.dataset.categoryId = category.id;


	/*
	 * Kategorie-Titel
	 */
	const title = document.createElement("h3");
	title.textContent = category.name;


	/*
	 * Beschreibung
	 */
	const description = document.createElement("p");

	description.className = "category-description";

	description.textContent =
		category.description ?? "";


	/*
	 * Fortschritt
	 */
	const progress = document.createElement("span");

	progress.className = "category-progress";
	progress.textContent = "0 / 0";

	progress.dataset.categoryProgress = category.id;


	button.append(
		title,
		description,
		progress
	);


	/*
	 * Kategorie öffnen
	 */
	button.addEventListener("click", () => {
		window.location.hash =
			`game/${encodeURIComponent(game.id)}/${encodeURIComponent(category.id)}`;
	});


	return button;
}


/**
 * Erstellt den Gesamtfortschritt eines Spiels.
 *
 * @returns {HTMLElement}
 */
function createGameProgress() {
	const container = document.createElement("div");

	container.className = "game-progress";


	/*
	 * Kopfzeile
	 */
	const header = document.createElement("div");

	header.className = "game-progress-header";


	const label = document.createElement("span");

	label.textContent = "Gesamtfortschritt";


	const count = document.createElement("strong");

	count.id = "game-progress-count";
	count.textContent = "0 / 0";


	header.append(
		label,
		count
	);


	/*
	 * Fortschrittsbalken
	 */
	const progressBar = document.createElement("div");

	progressBar.className = "progress-bar";

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


	const progressFill = document.createElement("div");

	progressFill.id = "game-progress-fill";
	progressFill.className = "progress-bar-fill";
	progressFill.style.width = "0%";


	progressBar.append(progressFill);


	/*
	 * Prozentanzeige
	 */
	const percentage = document.createElement("span");

	percentage.id = "game-progress-percent";
	percentage.className = "game-progress-percent";
	percentage.textContent = "0 %";


	container.append(
		header,
		progressBar,
		percentage
	);


	return container;
}


/**
 * Lädt alle Kategorien eines Spiels und berechnet daraus
 * den Gesamtfortschritt.
 *
 * @param {Object} game Spiel-Manifest
 */
async function loadGameProgress(game) {
	let totalCompleted = 0;
	let totalItems = 0;


	for (const category of game.categories) {
		try {
			const categoryData =
				await loadCategoryData(
					game.id,
					category
				);

			const progress =
				calculateCategoryProgress(
					categoryData
				);


			totalCompleted += progress.completed;
			totalItems += progress.total;


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
	 * auf ein anderes Spiel gewechselt wurde.
	 */
	if (currentGameId !== game.id) {
		return;
	}


	updateTotalProgress(
		totalCompleted,
		totalItems
	);
}


/**
 * Berechnet den Fortschritt einer Kategorie.
 *
 * Unterstützt beispielsweise:
 *
 * {
 *     "items": [...]
 * }
 *
 * oder:
 *
 * {
 *     "groups": [
 *         {
 *             "items": [...]
 *         }
 *     ]
 * }
 *
 * Ein Item gilt als abgeschlossen, wenn eines dieser
 * Felder true ist:
 *
 * found
 * completed
 * collected
 * unlocked
 *
 * @param {Object|Array} data Kategorie-Daten
 * @returns {{completed: number, total: number}}
 */
function calculateCategoryProgress(data) {
	/*
	 * Explizit angegebener Fortschritt hat Vorrang.
	 */
	if (
		data &&
		data.progress &&
		Number.isFinite(data.progress.completed) &&
		Number.isFinite(data.progress.total)
	) {
		return {
			completed: data.progress.completed,
			total: data.progress.total
		};
	}


	/*
	 * Direktes Items-Array
	 */
	if (Array.isArray(data?.items)) {
		return calculateItemsProgress(data.items);
	}


	/*
	 * Gruppen
	 */
	if (Array.isArray(data?.groups)) {
		return calculateGroupedProgress(data.groups);
	}


	/*
	 * Sections
	 */
	if (Array.isArray(data?.sections)) {
		return calculateGroupedProgress(data.sections);
	}


	/*
	 * Falls direkt ein Array geladen wurde
	 */
	if (Array.isArray(data)) {
		return calculateItemsProgress(data);
	}


	return {
		completed: 0,
		total: 0
	};
}


/**
 * Berechnet den Fortschritt eines Item-Arrays.
 *
 * @param {Array} items Items
 * @returns {{completed: number, total: number}}
 */
function calculateItemsProgress(items) {
	const total = items.length;

	const completed = items.filter(
		item => isItemCompleted(item)
	).length;


	return {
		completed,
		total
	};
}


/**
 * Berechnet den Fortschritt mehrerer Gruppen.
 *
 * @param {Array} groups Gruppen
 * @returns {{completed: number, total: number}}
 */
function calculateGroupedProgress(groups) {
	let completed = 0;
	let total = 0;


	for (const group of groups) {
		const progress =
			calculateCategoryProgress(group);

		completed += progress.completed;
		total += progress.total;
	}


	return {
		completed,
		total
	};
}


/**
 * Prüft, ob ein einzelnes Item abgeschlossen ist.
 *
 * @param {Object} item Item
 * @returns {boolean}
 */
function isItemCompleted(item) {
	if (!item || typeof item !== "object") {
		return false;
	}

	return (
		item.found === true ||
		item.completed === true ||
		item.collected === true ||
		item.unlocked === true
	);
}


/**
 * Aktualisiert die Fortschrittsanzeige einer Kategorie.
 *
 * @param {string} categoryId Kategorie-ID
 * @param {{completed: number, total: number}} progress Fortschritt
 */
function updateCategoryProgress(
	categoryId,
	progress
) {
	const element = document.querySelector(
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
		percent = Math.round(
			(completed / total) * 100
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


/**
 * Öffnet eine bestimmte Kategorie.
 *
 * @param {Object} game Spiel-Manifest
 * @param {Object} category Kategorie
 */
async function renderCategory(
	game,
	category
) {
	showLoading();

	try {
		const data =
			await loadCategoryData(
				game.id,
				category
			);

		mainContent.replaceChildren();


		const gamePage =
			document.createElement("section");

		gamePage.className = "game-page";


		/*
		 * Spieltitel
		 */
		const gameHeader =
			document.createElement("div");

		gameHeader.className =
			"game-header";


		const gameTitle =
			document.createElement("h2");

		gameTitle.className =
			"game-title";

		gameTitle.textContent =
			game.name;


		gameHeader.append(gameTitle);


		/*
		 * Zurück-Button
		 */
		const backButton =
			document.createElement("button");

		backButton.type = "button";
		backButton.className = "back-button";
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
			document.createElement("section");

		categoryContent.className =
			"category-content";


		const categoryTitle =
			document.createElement("h3");

		categoryTitle.textContent =
			category.name;


		categoryContent.append(
			categoryTitle
		);


		if (category.description) {
			const description =
				document.createElement("p");

			description.textContent =
				category.description;

			categoryContent.append(
				description
			);
		}


		renderCategoryData(
			categoryContent,
			data
		);


		gamePage.append(
			gameHeader,
			backButton,
			categoryContent
		);


		mainContent.append(gamePage);

		currentGameId = game.id;

		updateActiveGameNavigation();

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
 * Diese Funktion ist bewusst allgemein gehalten.
 * Sobald die endgültige Struktur deiner Kategorie-JSONs
 * feststeht, können wir diese Darstellung spezialisieren.
 *
 * @param {HTMLElement} container Ziel-Element
 * @param {Object|Array} data Kategorie-Daten
 */
function renderCategoryData(
	container,
	data
) {
	if (Array.isArray(data?.groups)) {
		for (const group of data.groups) {
			renderCategoryGroup(
				container,
				group
			);
		}

		return;
	}


	if (Array.isArray(data?.sections)) {
		for (const section of data.sections) {
			renderCategoryGroup(
				container,
				section
			);
		}

		return;
	}


	if (Array.isArray(data?.items)) {
		renderItemList(
			container,
			data.items
		);

		return;
	}


	if (Array.isArray(data)) {
		renderItemList(
			container,
			data
		);

		return;
	}


	const message =
		document.createElement("p");

	message.textContent =
		"Für diese Kategorie sind noch keine darstellbaren Einträge vorhanden.";

	container.append(message);
}


/**
 * Gibt eine einzelne Gruppe aus.
 *
 * @param {HTMLElement} container Ziel-Element
 * @param {Object} group Gruppe
 */
function renderCategoryGroup(
	container,
	group
) {
	const section =
		document.createElement("section");

	section.className =
		"category-group";


	if (group.name) {
		const title =
			document.createElement("h4");

		title.textContent =
			group.name;

		section.append(title);
	}


	if (group.description) {
		const description =
			document.createElement("p");

		description.textContent =
			group.description;

		section.append(description);
	}


	if (Array.isArray(group.items)) {
		renderItemList(
			section,
			group.items
		);
	}


	container.append(section);
}


/**
 * Gibt eine Liste von Items aus.
 *
 * @param {HTMLElement} container Ziel-Element
 * @param {Array} items Items
 */
function renderItemList(
	container,
	items
) {
	const list =
		document.createElement("ul");

	list.className =
		"tracker-list";


	for (const item of items) {
		const listItem =
			document.createElement("li");

		listItem.className =
			"tracker-item";


		/*
		 * Status
		 */
		if (isItemCompleted(item)) {
			listItem.classList.add(
				"is-completed"
			);
		}


		const name =
			document.createElement("span");

		name.className =
			"tracker-item-name";

		name.textContent =
			item.name ??
			item.title ??
			item.id ??
			"Unbenannter Eintrag";


		listItem.append(name);


		/*
		 * Optionale Beschreibung
		 */
		if (item.description) {
			const description =
				document.createElement("span");

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
				document.createElement("span");

			location.className =
				"tracker-item-location";

			location.textContent =
				item.location;

			listItem.append(
				location
			);
		}


		list.append(listItem);
	}


	container.append(list);
}


/**
 * Liest den aktuellen Hash aus.
 *
 * Beispiele:
 *
 * #game/theDivision2
 * #game/theDivision2/collectibles
 *
 * @returns {Array<string>}
 */
function getHashParts() {
	const hash =
		window.location.hash.substring(1);

	if (!hash) {
		return [];
	}

	return hash
		.split("/")
		.filter(Boolean)
		.map(part =>
			decodeURIComponent(part)
		);
}


/**
 * Lädt den Inhalt passend zur aktuellen URL.
 */
async function loadPageFromHash() {
	const parts = getHashParts();


	/*
	 * Startseite
	 */
	if (parts.length === 0) {
		currentGameId = null;

		mainContent.innerHTML =
			defaultContent;

		updateActiveGameNavigation();

		return;
	}


	/*
	 * Unbekannte Route
	 */
	if (parts[0] !== "game") {
		showError(
			"Die aufgerufene Seite existiert nicht."
		);

		return;
	}


	const gameId = parts[1];

	if (!gameId) {
		showError(
			"Es wurde kein Spiel angegeben."
		);

		return;
	}


	showLoading();


	try {
		const game =
			await loadGameManifest(
				gameId
			);


		/*
		 * Kategorie geöffnet
		 */
		if (parts[2]) {
			const categoryId =
				parts[2];


			const category =
				game.categories.find(
					entry =>
						entry.id === categoryId
				);


			if (!category) {
				showError(
					"Die angeforderte Kategorie existiert nicht."
				);

				return;
			}


			await renderCategory(
				game,
				category
			);

			return;
		}


		/*
		 * Spielübersicht
		 */
		renderGame(game);

	} catch (error) {
		console.error(error);

		showError(
			"Das Spiel konnte nicht geladen werden."
		);
	}
}


/**
 * Markiert das aktuell ausgewählte Spiel
 * in der Navigation.
 */
function updateActiveGameNavigation() {
	if (!gameNavigation) {
		return;
	}


	const links =
		gameNavigation.querySelectorAll(
			"[data-game-id]"
		);


	for (const link of links) {
		const isActive =
			link.dataset.gameId ===
			currentGameId;


		link.classList.toggle(
			"is-active",
			isActive
		);


		if (isActive) {
			link.setAttribute(
				"aria-current",
				"page"
			);
		} else {
			link.removeAttribute(
				"aria-current"
			);
		}
	}
}


/**
 * Initialisiert den Tracker.
 */
async function init() {
	await loadGameNavigation();

	await loadPageFromHash();
}


// Bei Änderung des Hashs neue Seite laden
window.addEventListener(
	"hashchange",
	loadPageFromHash
);


// Anwendung starten
init();
