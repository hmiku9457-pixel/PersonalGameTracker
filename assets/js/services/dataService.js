const DATA_ROOT = "data";

const jsonCache = new Map();
const jsonRequestCache = new Map();

let activeJsonRequestController = null;

/**
 * Beginnt einen neuen Request-Bereich für die aktuelle Route.
 * Noch laufende JSON-Requests der vorherigen Route werden abgebrochen.
 *
 * @returns {AbortSignal}
 */
export function beginJsonRequestScope() {
	if (activeJsonRequestController) {
		activeJsonRequestController.abort();
	}

	activeJsonRequestController =
		new AbortController();

	return activeJsonRequestController.signal;
}

function getActiveJsonRequestSignal() {
	return activeJsonRequestController?.signal ?? null;
}

function getPendingJsonRequest(cacheKey, signal) {
	const entry = jsonRequestCache.get(cacheKey);

	if (!entry) {
		return null;
	}

	if (
		entry.signal === signal &&
		!entry.signal?.aborted
	) {
		return entry.promise;
	}

	jsonRequestCache.delete(cacheKey);
	return null;
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

	const signal =
		getActiveJsonRequestSignal();

	const cacheKey =
		`required:${path}`;

	const pendingRequest =
		getPendingJsonRequest(
			cacheKey,
			signal
		);

	if (pendingRequest) {
		return pendingRequest;
	}

	const request = (async () => {
		const response = await fetch(
			path,
			signal
				? { signal }
				: undefined
		);

		if (!response.ok) {
			throw new Error(
				`JSON konnte nicht geladen werden: ${path} (${response.status})`
			);
		}

		const data =
			await response.json();

		jsonCache.set(path, data);
		return data;
	})();

	jsonRequestCache.set(
		cacheKey,
		{
			promise: request,
			signal
		}
	);

	try {
		return await request;
	}
	finally {
		const entry =
			jsonRequestCache.get(
				cacheKey
			);

		if (entry?.promise === request) {
			jsonRequestCache.delete(
				cacheKey
			);
		}
	}
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

	const signal =
		getActiveJsonRequestSignal();

	const cacheKey =
		`optional:${path}`;

	const pendingRequest =
		getPendingJsonRequest(
			cacheKey,
			signal
		);

	if (pendingRequest) {
		return pendingRequest;
	}

	const request = (async () => {
		const response = await fetch(
			path,
			signal
				? { signal }
				: undefined
		);

		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			throw new Error(
				`JSON konnte nicht geladen werden: ${path} (${response.status})`
			);
		}

		const data =
			await response.json();

		jsonCache.set(path, data);
		return data;
	})();

	jsonRequestCache.set(
		cacheKey,
		{
			promise: request,
			signal
		}
	);

	try {
		return await request;
	}
	finally {
		const entry =
			jsonRequestCache.get(
				cacheKey
			);

		if (entry?.promise === request) {
			jsonRequestCache.delete(
				cacheKey
			);
		}
	}
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
