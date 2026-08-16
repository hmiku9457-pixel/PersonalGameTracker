import {
	getActiveViewScope
} from "./viewScopeService.js";


const DATA_ROOT = "data";

const jsonCache = new Map();

/* Laufende JSON-Requests werden pro View-Scope geteilt. */
const viewJsonRequestCache =
	new Map();
const DEVELOPMENT_HOSTS =
	new Set([
		"localhost",
		"127.0.0.1",
		"[::1]"
	]);

/**
 * Friert geladene JSON-Daten nur in der lokalen Entwicklung ein.
 * Dadurch werden unbeabsichtigte Mutationen gecachter Daten sichtbar.
 *
 * @param {*} value
 * @returns {*}
 */
function prepareJsonForCache(value) {
	const hostname =
		globalThis.location?.hostname ??
		"";

	return DEVELOPMENT_HOSTS.has(hostname)
		? deepFreeze(value)
		: value;
}

function deepFreeze(value, visited = new WeakSet()) {
	if (
		!value ||
		typeof value !== "object" ||
		visited.has(value)
	) {
		return value;
	}

	visited.add(value);

	for (
		const nestedValue
		of Object.values(value)
	) {
		deepFreeze(
			nestedValue,
			visited
		);
	}

	return Object.freeze(value);
}


/**
 * Führt einen JSON-Request im aktuellen View-Scope aus.
 * Ein Routenwechsel bricht noch laufende Fetches ab.
 *
 * @param {string} path
 * @param {object} options
 * @param {boolean} options.optional
 * @returns {Promise<any|null>}
 */
async function requestJson(
	path,
	{
		optional = false
	} = {}
) {
	const viewScope =
		getActiveViewScope();

	const requestKey =
		`${optional ? "optional" : "required"}:${viewScope?.id ?? "global"}:${path}`;

	if (
		viewJsonRequestCache.has(
			requestKey
		)
	) {
		return viewJsonRequestCache.get(
			requestKey
		);
	}

	const request =
		(async () => {
			const response =
				await fetch(
					path,
					{
						signal:
							viewScope?.signal
					}
				);

			if (
				optional &&
				response.status === 404
			) {
				return null;
			}

			if (!response.ok) {
				throw new Error(
					`JSON konnte nicht geladen werden: ${path} (${response.status})`
				);
			}

			return prepareJsonForCache(
				await response.json()
			);
		})();

	viewJsonRequestCache.set(
		requestKey,
		request
	);

	try {
		return await request;
	}
	finally {
		if (
			viewJsonRequestCache.get(
				requestKey
			) === request
		) {
			viewJsonRequestCache.delete(
				requestKey
			);
		}
	}
}


/**
 * Lädt eine JSON-Datei.
 *
 * Bereits geladene Dateien werden während der aktuellen
 * Sitzung aus dem Cache gelesen.
 *
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function loadJson(path) {
	if (jsonCache.has(path)) {
		return jsonCache.get(path);
	}

	const data =
		await requestJson(path);

	jsonCache.set(path, data);

	return data;
}


/**
 * Lädt eine optionale JSON-Datei.
 *
 * Existiert die Datei nicht, wird null zurückgegeben.
 *
 * @param {string} path
 * @returns {Promise<any|null>}
 */
export async function loadOptionalJson(path) {
	if (jsonCache.has(path)) {
		return jsonCache.get(path);
	}

	const data =
		await requestJson(
			path,
			{
				optional: true
			}
		);

	if (data !== null) {
		jsonCache.set(path, data);
	}

	return data;
}


/**
 * Gibt den Datenpfad eines Spiels zurück.
 *
 * @param {string} gameId
 * @param {string} file
 * @returns {string}
 */
export function getDataPath(
	gameId,
	file = ""
) {

	const basePath =
		`${DATA_ROOT}/${gameId}`;


	if (!file) {
		return basePath;
	}


	return `${basePath}/${file}`;
}


/**
 * Lädt die globale Spieleliste.
 *
 * @returns {Promise<any>}
 */
export async function loadGames() {

	return loadJson(
		`${DATA_ROOT}/games.json`
	);
}


/**
 * Lädt das Hauptmanifest eines Spiels.
 *
 * @param {string} gameId
 * @returns {Promise<any>}
 */
export async function loadGameManifest(
	gameId
) {

	return loadManifest(
		gameId,
		"manifest.json"
	);
}


/**
 * Lädt ein beliebiges Manifest innerhalb
 * des Datenordners eines Spiels.
 *
 * Beispiele:
 *
 * manifest.json
 * collectibles/manifest.json
 * collectibles/comms/manifest.json
 *
 * @param {string} gameId
 * @param {string} manifestFile
 * @returns {Promise<any>}
 */
export async function loadManifest(
	gameId,
	manifestFile = "manifest.json"
) {

	return loadJson(
		getDataPath(
			gameId,
			manifestFile
		)
	);
}


/**
 * Lädt die Datendatei einer normalen Kategorie.
 *
 * category.file muss relativ zum Datenordner
 * des Spiels angegeben sein.
 *
 * @param {string} gameId
 * @param {Object|string} category
 * @returns {Promise<any>}
 */
export async function loadCategoryData(
	gameId,
	category
) {

	const file =
		typeof category === "string"
			? category
			: category?.file;


	if (!file) {
		throw new Error(
			"Für die Kategorie wurde keine Datei angegeben."
		);
	}


	return loadJson(
		getDataPath(
			gameId,
			file
		)
	);
}


/**
 * Löst einen Dateipfad relativ zur Position
 * des aktuellen Manifests auf.
 *
 * Beispiel:
 *
 * parentFile:
 * collectibles/manifest.json
 *
 * childFile:
 * echos.json
 *
 * Ergebnis:
 * collectibles/echos.json
 *
 * @param {string} parentFile
 * @param {string} childFile
 * @returns {string}
 */
export function resolveRelativeFile(
	parentFile,
	childFile
) {

	if (!childFile) {
		throw new Error(
			"Es wurde keine Zieldatei angegeben."
		);
	}


	const baseFile =
		parentFile ||
		"manifest.json";


	const dummyOrigin =
		"https://tracker.local/";


	const resolvedUrl =
		new URL(
			childFile,
			`${dummyOrigin}${baseFile}`
		);


	return resolvedUrl.pathname
		.replace(/^\/+/, "");
}
