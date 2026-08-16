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


import {
	calculateCategoryProgress,
	calculateGroupedProgress,
	calculateItemsProgress,
	getCompletedCountForCategory,
	getExternalItemStatus,
	isItemCompleted
} from "./progressCalculationService.js";

export {
	calculateCategoryProgress,
	calculateGroupedProgress,
	calculateItemsProgress,
	getCompletedCountForCategory,
	getExternalItemStatus,
	isItemCompleted
};


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


/* Laufende Requests desselben Spiels teilen sich ein Promise. */
const progressRequestCache =
	new Map();


/* Verhindert, dass alte Requests einen geleerten Cache erneut füllen. */
let progressCacheGeneration =
	0;


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

		progress: {},

		completedByCategory: {}
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


		const categoryId =
			typeof row.category_id === "string"
				? row.category_id.trim()
				: "";


		if (categoryId) {
			progressData.completedByCategory[
				categoryId
			] =
				(progressData.completedByCategory[categoryId] ?? 0) +
				1;
		}
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

	if (
		!force &&
		progressCache.has(gameId)
	) {
		return progressCache.get(
			gameId
		);
	}

	if (
		!force &&
		progressRequestCache.has(gameId)
	) {
		return progressRequestCache.get(
			gameId
		);
	}

	const requestGeneration =
		progressCacheGeneration;

	const request =
		(async () => {
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

				if (
					requestGeneration ===
					progressCacheGeneration &&
					progressRequestCache.get(gameId) ===
					request
				) {
					progressCache.set(
						gameId,
						progressData
					);
				}

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
		})();

	progressRequestCache.set(
		gameId,
		request
	);

	try {
		return await request;
	}
	finally {
		if (
			progressRequestCache.get(gameId) ===
			request
		) {
			progressRequestCache.delete(
				gameId
			);
		}
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
	progressCacheGeneration++;

	if (gameId) {
		progressCache.delete(
			gameId
		);

		progressRequestCache.delete(
			gameId
		);

		return;
	}

	progressCache.clear();
	progressRequestCache.clear();
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
	 * Kategorieindex nach erfolgreichem Request aktualisieren.
	 */
	progressData.completedByCategory ??= {};

	const previousCategoryCount =
		getCompletedCountForCategory(
			progressData,
			categoryId
		);

	/*
	 * currentState wurde vor dem erfolgreichen Supabase-Request ermittelt.
	 * Nach dem Early Return oben ist sicher, dass sich der Zustand ändert.
	 */
	progressData.completedByCategory[
		categoryId
	] = targetState
		? previousCategoryCount + 1
		: Math.max(
			0,
			previousCategoryCount - 1
		);
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
