import {
	getDataPath,
	loadOptionalJson
} from "./dataService.js";


// Dateiname für lokalen Test-Fortschritt
const MOCK_PROGRESS_FILE =
	"mockProgress.json";


// Präfix für localStorage
const STORAGE_PREFIX =
	"personal-game-tracker";


/**
 * Erstellt den localStorage-Schlüssel
 * für ein Spiel.
 *
 * @param {string} gameId
 * @returns {string}
 */
function getProgressStorageKey(gameId) {
	return `${STORAGE_PREFIX}:${gameId}:progress`;
}


/**
 * Lädt lokal gespeicherten Fortschritt.
 *
 * @param {string} gameId
 * @returns {Object}
 */
function loadLocalProgress(gameId) {
	const storageKey =
		getProgressStorageKey(gameId);

	const storedData =
		localStorage.getItem(
			storageKey
		);


	if (!storedData) {
		return {};
	}


	try {
		const progress =
			JSON.parse(storedData);


		if (
			!progress ||
			typeof progress !== "object" ||
			Array.isArray(progress)
		) {
			return {};
		}


		return progress;

	} catch (error) {
		console.warn(
			`Lokaler Fortschritt für "${gameId}" konnte nicht gelesen werden.`,
			error
		);

		return {};
	}
}


/**
 * Speichert Fortschritt lokal.
 *
 * @param {string} gameId
 * @param {Object} progress
 */
function saveLocalProgress(
	gameId,
	progress
) {
	const storageKey =
		getProgressStorageKey(gameId);


	try {
		localStorage.setItem(
			storageKey,
			JSON.stringify(progress)
		);

	} catch (error) {
		console.error(
			`Fortschritt für "${gameId}" konnte nicht gespeichert werden.`,
			error
		);
	}
}


/**
 * Lädt die Fortschrittsdaten eines Spiels.
 *
 * Für den aktuellen Testbetrieb wird zunächst
 *
 * data/<gameId>/mockProgress.json
 *
 * geladen.
 *
 * Anschließend werden lokal gespeicherte Änderungen
 * darübergelegt.
 *
 * Dadurch dient mockProgress.json als Ausgangszustand,
 * während Änderungen des Benutzers im localStorage
 * erhalten bleiben.
 *
 * @param {string} gameId
 * @returns {Promise<Object>}
 */
export async function loadGameProgressData(
	gameId
) {
	const path =
		`${getDataPath()}/${gameId}/${MOCK_PROGRESS_FILE}`;


	let mockData = null;


	try {
		mockData =
			await loadOptionalJson(
				path
			);

	} catch (error) {
		console.warn(
			`Fortschrittsdaten für "${gameId}" konnten nicht geladen werden.`,
			error
		);
	}


	/*
	 * Eigenes Objekt erzeugen, damit die gecachte
	 * mockProgress.json nicht direkt verändert wird.
	 */
	const progressData = {
		gameId,

		progress: {
			...(
				mockData?.progress &&
				typeof mockData.progress === "object" &&
				!Array.isArray(mockData.progress)
					? mockData.progress
					: {}
			)
		}
	};


	/*
	 * Lokal gespeicherten Fortschritt darüberlegen.
	 */
	const localProgress =
		loadLocalProgress(gameId);


	progressData.progress = {
		...progressData.progress,
		...localProgress
	};


	return progressData;
}


/**
 * Setzt den Fortschrittsstatus eines einzelnen Items.
 *
 * @param {string} gameId
 * @param {Object} item
 * @param {boolean} completed
 * @param {Object} progressData
 */
export function setItemCompleted(
	gameId,
	item,
	completed,
	progressData
) {
	if (
		!item ||
		typeof item !== "object" ||
		!item.id
	) {
		console.warn(
			"Ein Item ohne ID kann nicht gespeichert werden."
		);

		return;
	}


	if (
		!progressData.progress ||
		typeof progressData.progress !== "object" ||
		Array.isArray(progressData.progress)
	) {
		progressData.progress = {};
	}


	progressData.progress[item.id] =
		Boolean(completed);


	/*
	 * Nur das Progress-Mapping speichern.
	 */
	saveLocalProgress(
		gameId,
		progressData.progress
	);
}


/**
 * Berechnet den Fortschritt einer Kategorie.
 *
 * Unterstützt:
 *
 * {
 *     "items": [...]
 * }
 *
 * {
 *     "groups": [...]
 * }
 *
 * {
 *     "sections": [...]
 * }
 *
 * sowie direkte Arrays.
 *
 * @param {Object|Array} data
 * @param {Object|null} progressData
 * @returns {{completed: number, total: number}}
 */
export function calculateCategoryProgress(
	data,
	progressData = null
) {
	/*
	 * Explizit angegebener Gesamtfortschritt
	 * hat Vorrang.
	 */
	if (
		data &&
		data.progress &&
		Number.isFinite(
			data.progress.completed
		) &&
		Number.isFinite(
			data.progress.total
		)
	) {
		return {
			completed:
				data.progress.completed,

			total:
				data.progress.total
		};
	}


	if (
		Array.isArray(
			data?.items
		)
	) {
		return calculateItemsProgress(
			data.items,
			progressData
		);
	}


	if (
		Array.isArray(
			data?.groups
		)
	) {
		return calculateGroupedProgress(
			data.groups,
			progressData
		);
	}


	if (
		Array.isArray(
			data?.sections
		)
	) {
		return calculateGroupedProgress(
			data.sections,
			progressData
		);
	}


	if (Array.isArray(data)) {
		return calculateItemsProgress(
			data,
			progressData
		);
	}


	return {
		completed: 0,
		total: 0
	};
}


/**
 * Berechnet den Fortschritt eines Item-Arrays.
 *
 * @param {Array} items
 * @param {Object|null} progressData
 * @returns {{completed: number, total: number}}
 */
export function calculateItemsProgress(
	items,
	progressData = null
) {
	const total =
		items.length;


	const completed =
		items.filter(
			item =>
				isItemCompleted(
					item,
					progressData
				)
		).length;


	return {
		completed,
		total
	};
}


/**
 * Berechnet den Fortschritt mehrerer Gruppen.
 *
 * @param {Array} groups
 * @param {Object|null} progressData
 * @returns {{completed: number, total: number}}
 */
export function calculateGroupedProgress(
	groups,
	progressData = null
) {
	let completed = 0;
	let total = 0;


	for (const group of groups) {
		const progress =
			calculateCategoryProgress(
				group,
				progressData
			);


		completed +=
			progress.completed;


		total +=
			progress.total;
	}


	return {
		completed,
		total
	};
}


/**
 * Liest einen externen Fortschrittsstatus
 * für ein einzelnes Item.
 *
 * @param {Object} item
 * @param {Object|null} progressData
 * @returns {boolean|null}
 */
export function getExternalItemStatus(
	item,
	progressData
) {
	if (
		!item ||
		typeof item !== "object" ||
		!item.id
	) {
		return null;
	}


	if (
		!progressData ||
		typeof progressData !== "object"
	) {
		return null;
	}


	const progressMap =
		progressData.progress &&
		typeof progressData.progress === "object" &&
		!Array.isArray(
			progressData.progress
		)
			? progressData.progress
			: progressData;


	if (
		!Object.prototype.hasOwnProperty.call(
			progressMap,
			item.id
		)
	) {
		return null;
	}


	const value =
		progressMap[item.id];


	if (
		typeof value ===
		"boolean"
	) {
		return value;
	}


	/*
	 * Statusobjekte weiterhin unterstützen.
	 */
	if (
		value &&
		typeof value === "object"
	) {
		const statusFields = [
			"found",
			"completed",
			"collected",
			"unlocked"
		];


		for (
			const field of statusFields
		) {
			if (
				Object.prototype.hasOwnProperty.call(
					value,
					field
				)
			) {
				return (
					value[field] === true
				);
			}
		}
	}


	return null;
}


/**
 * Prüft, ob ein Item abgeschlossen ist.
 *
 * Priorität:
 *
 * 1. Externe Fortschrittsdaten
 * 2. Status direkt im Item
 *
 * @param {Object} item
 * @param {Object|null} progressData
 * @returns {boolean}
 */
export function isItemCompleted(
	item,
	progressData = null
) {
	if (
		!item ||
		typeof item !== "object"
	) {
		return false;
	}


	const externalStatus =
		getExternalItemStatus(
			item,
			progressData
		);


	if (
		externalStatus !== null
	) {
		return externalStatus;
	}


	return (
		item.found === true ||
		item.completed === true ||
		item.collected === true ||
		item.unlocked === true
	);
}
