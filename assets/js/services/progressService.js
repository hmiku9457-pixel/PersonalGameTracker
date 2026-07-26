/* =========================================================
   Personal Game Tracker
   Progress Service
   ========================================================= */

import {
	fetchGameProgressRows,
	insertProgressRow,
	deleteProgressRow
} from "../supabase/progressRepository.js";


import {
	getCurrentLanguage
} from "./languageService.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		invalidGameId:
			"Ungültige Spiel-ID.",

		invalidCategoryId:
			"Ungültige Kategorie-ID.",

		invalidItemId:
			"Das Item besitzt keine gültige ID.",

		progressUnavailable:
			"Fortschrittsdaten sind nicht verfügbar.",

		authRequired:
			"Bitte melde dich an, um deinen Fortschritt zu ändern.",

		permissionDenied:
			"Du hast keine Berechtigung, diesen Fortschritt zu ändern.",

		networkUnavailable:
			"Supabase ist momentan nicht erreichbar.",

		saveFailed:
			"Der Fortschritt konnte nicht gespeichert werden."
	},

	en: {
		invalidGameId:
			"Invalid game ID.",

		invalidCategoryId:
			"Invalid category ID.",

		invalidItemId:
			"The item does not have a valid ID.",

		progressUnavailable:
			"Progress data is not available.",

		authRequired:
			"Please sign in to change your progress.",

		permissionDenied:
			"You do not have permission to change this progress.",

		networkUnavailable:
			"Supabase is currently unavailable.",

		saveFailed:
			"Progress could not be saved."
	}
};


/**
 * Gibt einen lokalisierten UI-Text zurück.
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
   2. Fortschrittscache
   --------------------------------------------------------- */

/*
 * Cache pro Spiel.
 *
 * Dadurch wird beispielsweise für The Division 2 nicht
 * bei jeder einzelnen Kategorie erneut Supabase abgefragt.
 */
const progressCache =
	new Map();


/* ---------------------------------------------------------
   3. Fortschrittsstruktur
   --------------------------------------------------------- */

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


/* ---------------------------------------------------------
   4. Fortschritt laden
   --------------------------------------------------------- */

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
		const error =
			new Error(
				getUiText(
					"invalidGameId"
				)
			);


		error.code =
			"INVALID_GAME_ID";


		throw error;
	}


	/*
	 * Cache verwenden
	 */
	if (
		!force &&
		progressCache.has(gameId)
	) {
		return progressCache.get(
			gameId
		);
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


/* ---------------------------------------------------------
   5. Cache
   --------------------------------------------------------- */

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
		progressCache.delete(
			gameId
		);

		return;
	}


	progressCache.clear();
}


/* ---------------------------------------------------------
   6. Item-Status
   --------------------------------------------------------- */

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
		progressData.progress[
			item.id
		];


	if (
		typeof value === "boolean"
	) {
		return value;
	}


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


	return Boolean(
		value
	);
}


/**
 * Prüft, ob ein einzelnes Item abgeschlossen ist.
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


	if (
		externalStatus !== null
	) {
		return externalStatus;
	}


	return Boolean(
		item?.found ||
		item?.completed ||
		item?.collected ||
		item?.unlocked
	);
}


/* ---------------------------------------------------------
   7. Fortschritt berechnen
   --------------------------------------------------------- */

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


	let completed =
		0;


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
		total:
			items.length
	};
}


/**
 * Berechnet den Fortschritt gruppierter Daten.
 *
 * @param {Array<object>} groups
 * @param {object|null} progressData
 * @returns {{completed: number,total: number}}
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


	let completed =
		0;


	let total =
		0;


	for (const group of groups) {

		const result =
			calculateItemsProgress(
				group?.items ?? [],
				progressData
			);


		completed +=
			result.completed;


		total +=
			result.total;
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
 * @returns {{completed: number,total: number}}
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
	if (
		Array.isArray(
			data.items
		)
	) {
		return calculateItemsProgress(
			data.items,
			progressData
		);
	}


	/*
	 * Groups
	 */
	if (
		Array.isArray(
			data.groups
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
			data.sections
		)
	) {

		let completed =
			0;


		let total =
			0;


		for (
			const section
			of data.sections
		) {

			const result =
				calculateCategoryProgress(
					section,
					progressData
				);


			completed +=
				result.completed;


			total +=
				result.total;
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


/* ---------------------------------------------------------
   8. Fortschritt speichern
   --------------------------------------------------------- */

/**
 * Ändert den Fortschritt eines Items und speichert
 * die Änderung in Supabase.
 *
 * @param {string} gameId
 * @param {string} categoryId
 * @param {object} item
 * @param {boolean} completed
 * @param {object} progressData
 * @returns {Promise<object>}
 */
export async function setItemCompleted(
	gameId,
	categoryId,
	item,
	completed,
	progressData
) {
	if (
		typeof gameId !== "string" ||
		gameId.trim() === ""
	) {
		const error =
			new Error(
				getUiText(
					"invalidGameId"
				)
			);


		error.code =
			"INVALID_GAME_ID";


		throw error;
	}


	if (
		typeof categoryId !== "string" ||
		categoryId.trim() === ""
	) {
		const error =
			new Error(
				getUiText(
					"invalidCategoryId"
				)
			);


		error.code =
			"INVALID_CATEGORY_ID";


		throw error;
	}


	if (!item?.id) {

		const error =
			new Error(
				getUiText(
					"invalidItemId"
				)
			);


		error.code =
			"INVALID_ITEM_ID";


		throw error;
	}


	if (!progressData?.progress) {

		const error =
			new Error(
				getUiText(
					"progressUnavailable"
				)
			);


		error.code =
			"PROGRESS_UNAVAILABLE";


		throw error;
	}


	if (!progressData.authenticated) {

		const error =
			new Error(
				getUiText(
					"authRequired"
				)
			);


		error.code =
			"AUTH_REQUIRED";


		throw error;
	}


	const targetState =
		Boolean(
			completed
		);


	const currentState =
		Boolean(
			progressData.progress[
				item.id
			]
		);


	/*
	 * Gewünschter Zustand ist bereits vorhanden.
	 */
	if (
		currentState ===
		targetState
	) {
		return progressData;
	}


	/*
	 * In Supabase speichern.
	 */
	if (targetState) {

		await insertProgressRow(
			gameId,
			categoryId,
			item.id
		);

	}
	else {

		await deleteProgressRow(
			gameId,
			categoryId,
			item.id
		);

	}


	/*
	 * Lokalen Zustand erst nach erfolgreichem
	 * Request ändern.
	 */
	if (targetState) {

		progressData.progress[
			item.id
		] = true;

	}
	else {

		delete progressData.progress[
			item.id
		];

	}


	/*
	 * Cache aktualisieren.
	 */
	progressCache.set(
		gameId,
		progressData
	);


	return progressData;
}


/* ---------------------------------------------------------
   9. Fehlermeldungen
   --------------------------------------------------------- */

/**
 * Übersetzt Fehler beim Schreiben des Fortschritts
 * in benutzerfreundliche Meldungen.
 *
 * @param {Error|object} error
 * @returns {string}
 */
export function getProgressErrorMessage(
	error
) {
	if (!error) {
		return getUiText(
			"saveFailed"
		);
	}


	if (
		error.code ===
		"AUTH_REQUIRED"
	) {
		return getUiText(
			"authRequired"
		);
	}


	if (
		error.code ===
		"INVALID_GAME_ID"
	) {
		return getUiText(
			"invalidGameId"
		);
	}


	if (
		error.code ===
		"INVALID_CATEGORY_ID"
	) {
		return getUiText(
			"invalidCategoryId"
		);
	}


	if (
		error.code ===
		"INVALID_ITEM_ID"
	) {
		return getUiText(
			"invalidItemId"
		);
	}


	if (
		error.code ===
		"PROGRESS_UNAVAILABLE"
	) {
		return getUiText(
			"progressUnavailable"
		);
	}


	if (
		error.code ===
		"42501"
	) {
		return getUiText(
			"permissionDenied"
		);
	}


	const message =
		String(
			error.message ?? ""
		)
			.toLowerCase();


	if (
		message.includes(
			"failed to fetch"
		) ||
		message.includes(
			"network"
		)
	) {
		return getUiText(
			"networkUnavailable"
		);
	}


	return getUiText(
		"saveFailed"
	);
}
