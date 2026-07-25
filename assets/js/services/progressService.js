/* =========================================================
   Personal Game Tracker
   Progress Service
   ========================================================= */

import {
	fetchGameProgressRows
} from "../supabase/progressRepository.js";


/*
 * Cache pro Spiel.
 *
 * Dadurch wird beispielsweise für The Division 2 nicht
 * bei jeder einzelnen Kategorie erneut Supabase abgefragt.
 */
const progressCache = new Map();


/**
 * Erzeugt eine leere Fortschrittsstruktur.
 *
 * @param {string} gameId
 * @param {boolean} authenticated
 * @param {boolean} available
 * @returns {object}
 */
function createEmptyProgressData(
	gameId,
	authenticated = false,
	available = true
) {
	return {
		source: "supabase",

		gameId,

		authenticated,
		available,

		progress: {}
	};
}


/**
 * Wandelt Supabase-Datensätze in das bisherige
 * Progress-Format des Trackers um.
 *
 * Beispiel:
 *
 * {
 *     progress: {
 *         "division2.exotic.capacitor": true
 *     }
 * }
 *
 * Dadurch bleiben bestehende Views kompatibel.
 *
 * @param {string} gameId
 * @param {Array<object>} rows
 * @param {boolean} authenticated
 * @returns {object}
 */
function convertRowsToProgressData(
	gameId,
	rows,
	authenticated
) {
	const progressData =
		createEmptyProgressData(
			gameId,
			authenticated,
			true
		);


	for (const row of rows) {

		if (!row?.item_id) {
			continue;
		}


		progressData.progress[
			row.item_id
		] = true;
	}


	return progressData;
}


/**
 * Lädt den Fortschritt eines Spiels.
 *
 * @param {string} gameId
 * @param {object} options
 * @param {boolean} options.force
 * @returns {Promise<object>}
 */
export async function loadGameProgressData(
	gameId,
	{
		force = false
	} = {}
) {
	if (
		typeof gameId !== "string" ||
		gameId.trim() === ""
	) {
		throw new Error(
			"Ungültige gameId."
		);
	}


	/*
	 * Cache verwenden
	 */
	if (
		!force &&
		progressCache.has(gameId)
	) {
		return progressCache.get(gameId);
	}


	try {

		const {
			authenticated,
			rows
		} = await fetchGameProgressRows(
			gameId
		);


		const progressData =
			convertRowsToProgressData(
				gameId,
				rows,
				authenticated
			);


		progressCache.set(
			gameId,
			progressData
		);


		console.info(
			`[Progress] ${rows.length} Einträge für "${gameId}" geladen.`
		);


		return progressData;
	}
	catch (error) {

		console.error(
			`[Progress] Fortschritt für "${gameId}" konnte nicht geladen werden:`,
			error
		);


		/*
		 * Wichtig:
		 *
		 * Ein Supabase-Fehler darf nicht verhindern,
		 * dass die lokalen JSON-Spieldaten dargestellt
		 * werden.
		 *
		 * Deshalb liefern wir eine leere Progress-Struktur.
		 *
		 * available: false zeigt später der UI, dass
		 * Supabase nicht erreichbar war.
		 */
		return {
			...createEmptyProgressData(
				gameId,
				false,
				false
			),

			error
		};
	}
}


/**
 * Löscht den Fortschrittscache.
 *
 * Ohne gameId wird der gesamte Cache gelöscht.
 *
 * @param {string|null} gameId
 */
export function clearProgressCache(
	gameId = null
) {
	if (gameId) {
		progressCache.delete(gameId);

		return;
	}


	progressCache.clear();
}


/**
 * Sucht einen extern gespeicherten Status für ein Item.
 *
 * @param {object} item
 * @param {object|null} progressData
 * @returns {boolean|null}
 */
export function getExternalItemStatus(
	item,
	progressData
) {
	if (
		!item?.id ||
		!progressData?.progress
	) {
		return null;
	}


	if (
		!Object.prototype.hasOwnProperty.call(
			progressData.progress,
			item.id
		)
	) {
		return null;
	}


	const value =
		progressData.progress[item.id];


	/*
	 * Neues Supabase-Format
	 */
	if (typeof value === "boolean") {
		return value;
	}


	/*
	 * Kompatibilität mit möglichen älteren
	 * Statusobjekten.
	 */
	if (
		value &&
		typeof value === "object"
	) {
		return Boolean(
			value.found ||
			value.completed ||
			value.collected ||
			value.unlocked
		);
	}


	return Boolean(value);
}


/**
 * Prüft, ob ein einzelnes Item abgeschlossen ist.
 *
 * Externe Fortschrittsdaten haben Vorrang vor
 * Statusfeldern innerhalb der Stammdaten.
 *
 * @param {object} item
 * @param {object|null} progressData
 * @returns {boolean}
 */
export function isItemCompleted(
	item,
	progressData = null
) {
	const externalStatus =
		getExternalItemStatus(
			item,
			progressData
		);


	if (externalStatus !== null) {
		return externalStatus;
	}


	return Boolean(
		item?.found ||
		item?.completed ||
		item?.collected ||
		item?.unlocked
	);
}


/**
 * Berechnet den Fortschritt einer Liste von Items.
 *
 * @param {Array<object>} items
 * @param {object|null} progressData
 * @returns {{completed: number, total: number}}
 */
export function calculateItemsProgress(
	items,
	progressData = null
) {
	if (!Array.isArray(items)) {
		return {
			completed: 0,
			total: 0
		};
	}


	let completed = 0;


	for (const item of items) {

		if (
			isItemCompleted(
				item,
				progressData
			)
		) {
			completed++;
		}
	}


	return {
		completed,
		total: items.length
	};
}


/**
 * Berechnet den Fortschritt gruppierter Daten.
 *
 * @param {Array<object>} groups
 * @param {object|null} progressData
 * @returns {{completed: number, total: number}}
 */
export function calculateGroupedProgress(
	groups,
	progressData = null
) {
	if (!Array.isArray(groups)) {
		return {
			completed: 0,
			total: 0
		};
	}


	let completed = 0;
	let total = 0;


	for (const group of groups) {

		const result =
			calculateItemsProgress(
				group?.items ?? [],
				progressData
			);


		completed += result.completed;
		total += result.total;
	}


	return {
		completed,
		total
	};
}


/**
 * Berechnet den Fortschritt einer Kategorie.
 *
 * Unterstützt weiterhin die universellen
 * Datenstrukturen des Trackers.
 *
 * @param {object|Array} data
 * @param {object|null} progressData
 * @returns {{completed: number, total: number}}
 */
export function calculateCategoryProgress(
	data,
	progressData = null
) {
	if (!data) {
		return {
			completed: 0,
			total: 0
		};
	}


	/*
	 * Direktes Array
	 */
	if (Array.isArray(data)) {
		return calculateItemsProgress(
			data,
			progressData
		);
	}


	/*
	 * Items
	 */
	if (Array.isArray(data.items)) {
		return calculateItemsProgress(
			data.items,
			progressData
		);
	}


	/*
	 * Groups
	 */
	if (Array.isArray(data.groups)) {
		return calculateGroupedProgress(
			data.groups,
			progressData
		);
	}


	/*
	 * Sections
	 */
	if (Array.isArray(data.sections)) {

		let completed = 0;
		let total = 0;


		for (const section of data.sections) {

			const result =
				calculateCategoryProgress(
					section,
					progressData
				);


			completed += result.completed;
			total += result.total;
		}


		return {
			completed,
			total
		};
	}


	return {
		completed: 0,
		total: 0
	};
}


/**
 * Ändert den Fortschritt momentan ausschließlich
 * im bereits geladenen Objekt.
 *
 * Die Persistierung in Supabase folgt in Phase 5.
 *
 * @param {string} gameId
 * @param {object} item
 * @param {boolean} completed
 * @param {object} progressData
 * @returns {object}
 */
export function setItemCompleted(
	gameId,
	item,
	completed,
	progressData
) {
	if (
		!item?.id ||
		!progressData?.progress
	) {
		return progressData;
	}


	progressData.progress[item.id] =
		Boolean(completed);


	progressCache.set(
		gameId,
		progressData
	);


	return progressData;
}
