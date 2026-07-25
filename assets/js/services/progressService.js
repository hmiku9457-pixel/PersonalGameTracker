import {
	getDataPath,
	loadOptionalJson
} from "./dataService.js";


// Dateiname für lokalen Test-Fortschritt
const MOCK_PROGRESS_FILE =
	"mockProgress.json";


/**
 * Lädt die Fortschrittsdaten eines Spiels.
 *
 * Für den aktuellen Testbetrieb wird automatisch nach
 *
 * data/<gameId>/mockProgress.json
 *
 * gesucht.
 *
 * Existiert keine mockProgress.json, wird null
 * zurückgegeben.
 *
 * Später kann diese Funktion durch eine Supabase-
 * Implementierung ersetzt oder erweitert werden.
 *
 * @param {string} gameId ID des Spiels
 * @returns {Promise<Object|null>}
 */
export async function loadGameProgressData(
	gameId
) {
	const path =
		`${getDataPath()}/${gameId}/${MOCK_PROGRESS_FILE}`;


	try {
		return await loadOptionalJson(
			path
		);

	} catch (error) {
		console.warn(
			`Fortschrittsdaten für "${gameId}" konnten nicht geladen werden.`,
			error
		);

		return null;
	}
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
 * oder:
 *
 * {
 *     "sections": [...]
 * }
 *
 * Fortschrittswerte können aus einer externen
 * Fortschrittsdatei kommen oder direkt im Item stehen.
 *
 * @param {Object|Array} data Kategorie-Daten
 * @param {Object|null} progressData Externe Fortschrittsdaten
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


	/*
	 * Direktes Items-Array
	 */
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


	/*
	 * Gruppen
	 */
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


	/*
	 * Sections
	 */
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


	/*
	 * Falls direkt ein Array geladen wurde
	 */
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
 * @param {Array} items Items
 * @param {Object|null} progressData Externe Fortschrittsdaten
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
 * @param {Array} groups Gruppen
 * @param {Object|null} progressData Externe Fortschrittsdaten
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
 * Unterstützte Struktur:
 *
 * {
 *     "progress": {
 *         "division2.exotic.capacitor": true
 *     }
 * }
 *
 * Alternativ werden auch Statusobjekte unterstützt:
 *
 * {
 *     "progress": {
 *         "item-id": {
 *             "found": true
 *         }
 *     }
 * }
 *
 * Rückgabe:
 *
 * true  = abgeschlossen
 * false = nicht abgeschlossen
 * null  = kein externer Status vorhanden
 *
 * @param {Object} item Item
 * @param {Object|null} progressData Externe Fortschrittsdaten
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


	/*
	 * Standardstruktur:
	 *
	 * {
	 *     "progress": {
	 *         "item-id": true
	 *     }
	 * }
	 *
	 * Zusätzlich wird auch ein direktes Mapping
	 * akzeptiert.
	 */
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


	/*
	 * Einfacher Boolean
	 */
	if (
		typeof value ===
		"boolean"
	) {
		return value;
	}


	/*
	 * Optional auch Statusobjekte unterstützen.
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
 * Prüft, ob ein einzelnes Item abgeschlossen ist.
 *
 * Priorität:
 *
 * 1. Externe Fortschrittsdaten
 *    z. B. mockProgress.json
 *
 * 2. Status direkt im Item
 *
 * Unterstützte Statusfelder:
 *
 * found
 * completed
 * collected
 * unlocked
 *
 * @param {Object} item Item
 * @param {Object|null} progressData Externe Fortschrittsdaten
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


	/*
	 * Externer Status hat Vorrang.
	 */
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


	/*
	 * Fallback auf Status direkt im Item.
	 */
	return (
		item.found === true ||
		item.completed === true ||
		item.collected === true ||
		item.unlocked === true
	);
}
