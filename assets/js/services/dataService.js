// Basisordner für alle JSON-Daten
const DATA_PATH = "data";


// Bereits geladene JSON-Dateien zwischenspeichern
const jsonCache = new Map();


/**
 * Lädt eine JSON-Datei.
 *
 * Bereits geladene Dateien werden aus dem Cache
 * zurückgegeben.
 *
 * @param {string} path Pfad zur JSON-Datei
 * @returns {Promise<any>}
 */
export async function loadJson(path) {
	if (jsonCache.has(path)) {
		return jsonCache.get(path);
	}


	const response =
		await fetch(path);


	if (!response.ok) {
		throw new Error(
			`JSON-Datei konnte nicht geladen werden: ${path} (${response.status})`
		);
	}


	const data =
		await response.json();


	jsonCache.set(
		path,
		data
	);


	return data;
}


/**
 * Lädt eine optionale JSON-Datei.
 *
 * Existiert die Datei nicht (404), wird null
 * zurückgegeben.
 *
 * Andere Fehler werden weiterhin geworfen.
 *
 * Das wird beispielsweise für mockProgress.json
 * verwendet.
 *
 * @param {string} path Pfad zur JSON-Datei
 * @returns {Promise<any|null>}
 */
export async function loadOptionalJson(path) {
	if (jsonCache.has(path)) {
		return jsonCache.get(path);
	}


	const response =
		await fetch(path);


	if (response.status === 404) {
		jsonCache.set(
			path,
			null
		);

		return null;
	}


	if (!response.ok) {
		throw new Error(
			`JSON-Datei konnte nicht geladen werden: ${path} (${response.status})`
		);
	}


	const data =
		await response.json();


	jsonCache.set(
		path,
		data
	);


	return data;
}


/**
 * Lädt die Liste aller Spiele.
 *
 * Erwartete Struktur von data/games.json:
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
export async function loadGames() {
	const games =
		await loadJson(
			`${DATA_PATH}/games.json`
		);


	if (!Array.isArray(games)) {
		throw new Error(
			"games.json muss ein Array enthalten."
		);
	}


	return games;
}


/**
 * Lädt das Manifest eines Spiels.
 *
 * @param {string} gameId ID des Spiels
 * @returns {Promise<Object>}
 */
export async function loadGameManifest(
	gameId
) {
	const path =
		`${DATA_PATH}/${gameId}/manifest.json`;


	const manifest =
		await loadJson(path);


	/*
	 * Falls im Manifest keine ID angegeben wurde,
	 * wird die Ordner-ID verwendet.
	 */
	if (!manifest.id) {
		manifest.id =
			gameId;
	}


	/*
	 * Sicherstellen, dass categories immer
	 * ein Array ist.
	 */
	if (
		!Array.isArray(
			manifest.categories
		)
	) {
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
export async function loadCategoryData(
	gameId,
	category
) {
	if (!category.file) {
		throw new Error(
			`Für die Kategorie "${category.name}" wurde keine Datei angegeben.`
		);
	}


	const path =
		`${DATA_PATH}/${gameId}/${category.file}`;


	return loadJson(path);
}


/**
 * Liefert den Basisordner der Spieldaten.
 *
 * Wird beispielsweise vom Progress-Service benötigt.
 *
 * @returns {string}
 */
export function getDataPath() {
	return DATA_PATH;
}
