/* =========================================================
   Personal Game Tracker
   Router
   ========================================================= */

import {
	loadGameManifest,
	loadManifest,
	resolveRelativeFile
} from "./services/dataService.js";


import {
	getCurrentLanguage,
	getLocalizedText
} from "./services/languageService.js";


import {
	renderGamesOverview
} from "./views/gamesView.js";


import {
	renderGame
} from "./views/gameView.js";


import {
	renderCategory
} from "./views/categoryView.js";


import {
	showError,
	showLoading
} from "./views/commonView.js";


import {
	updateActiveGameNavigation
} from "./views/navigationView.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		noGame:
			"Es wurde kein Spiel angegeben.",

		categoryNotFound:
			'Kategorie "{category}" wurde nicht gefunden.',

		categoryFileMissing:
			'Für Kategorie "{category}" wurde keine Datei angegeben.',

		noSubcategories:
			'Kategorie "{category}" besitzt keine weiteren Unterkategorien.',

		categoryLoadFailed:
			"Die angeforderte Kategorie konnte nicht geladen werden.",

		pageLoadFailed:
			"Die Seite konnte nicht geladen werden."
	},

	en: {
		noGame:
			"No game was specified.",

		categoryNotFound:
			'Category "{category}" was not found.',

		categoryFileMissing:
			'No file was specified for category "{category}".',

		noSubcategories:
			'Category "{category}" does not contain any further subcategories.',

		categoryLoadFailed:
			"The requested category could not be loaded.",

		pageLoadFailed:
			"The page could not be loaded."
	}
};


/**
 * Gibt einen lokalisierten Router-Text zurück.
 *
 * Platzhalter wie:
 *
 * {category}
 *
 * werden automatisch ersetzt.
 *
 * @param {string} key
 * @param {Object} values
 * @returns {string}
 */
function getUiText(
	key,
	values = {}
) {
	const language =
		getCurrentLanguage();


	let text =
		UI_TEXT[language]?.[key] ??
		UI_TEXT.en?.[key] ??
		key;


	text =
		text.replace(
			/\{(\w+)\}/g,
			(match, placeholder) => {

				if (
					Object.prototype
						.hasOwnProperty.call(
							values,
							placeholder
						)
				) {
					return String(
						values[placeholder]
					);
				}


				return match;
			}
		);


	return text;
}


/* ---------------------------------------------------------
   2. Spieleübersicht
   --------------------------------------------------------- */

/**
 * Rendert die allgemeine Spieleübersicht.
 *
 * Diese Ansicht wird angezeigt:
 *
 * - wenn kein Hash vorhanden ist
 * - bei #games
 * - bei einer unbekannten Route
 */
async function renderHomePage() {

	updateActiveGameNavigation(
		null
	);


	await renderGamesOverview();
}


/* ---------------------------------------------------------
   3. Route laden
   --------------------------------------------------------- */

/**
 * Lädt die aktuelle Route anhand
 * des URL-Hashes.
 */
export async function loadPageFromHash() {

	const routeParts =
		getRouteParts();


	/*
	 * Kein Hash:
	 * Spieleübersicht anzeigen.
	 */
	if (
		routeParts.length === 0
	) {

		await renderHomePage();

		return;
	}


	/*
	 * Explizite Spieleübersicht:
	 *
	 * #games
	 */
	if (
		routeParts.length === 1 &&
		routeParts[0] === "games"
	) {

		await renderHomePage();

		return;
	}


	/*
	 * Unbekannte Route:
	 * ebenfalls Spieleübersicht anzeigen.
	 */
	if (
		routeParts[0] !==
		"game"
	) {

		await renderHomePage();

		return;
	}


	const gameId =
		routeParts[1];


	if (!gameId) {

		showError(
			getUiText(
				"noGame"
			)
		);

		return;
	}


	showLoading();


	try {

		const game =
			await loadGameManifest(
				gameId
			);


		updateActiveGameNavigation(
			gameId
		);


		const categoryRoute =
			routeParts.slice(2);


		/*
		 * Nur das Spiel wurde aufgerufen.
		 *
		 * Beispiel:
		 *
		 * #game/theDivision2
		 */
		if (
			categoryRoute.length ===
			0
		) {

			await renderGame(
				game
			);


			return;
		}


		/*
		 * Unterkategorien und Manifeste
		 * der Route auflösen.
		 *
		 * Beispiele:
		 *
		 * collectibles
		 * collectibles/echos
		 * collectibles/comms
		 */
		const resolvedRoute =
			await resolveGameRoute(
				game,
				categoryRoute
			);


		/*
		 * Das Ziel der Route ist wieder
		 * ein Manifest.
		 */
		if (
			resolvedRoute.type ===
			"manifest"
		) {

			await renderGame(
				game,
				{
					manifest:
						resolvedRoute.manifest,

					manifestFile:
						resolvedRoute.manifestFile,

					routeIds:
						categoryRoute,

					title:
						resolvedRoute.entry?.name ||
						resolvedRoute.manifest.name,

					description:
						resolvedRoute.entry?.description ||
						resolvedRoute.manifest.description ||
						""
				}
			);


			return;
		}


		/*
		 * Das Ziel der Route ist eine
		 * normale Item-Kategorie.
		 */
		const parentRoute =
			categoryRoute.slice(
				0,
				-1
			);


		const category = {
			...resolvedRoute.category,

			parentHash:
				buildGameHash(
					game.id,
					parentRoute
				)
		};


		await renderCategory(
			game,
			category
		);

	}
	catch (error) {

		console.error(
			"Route konnte nicht geladen werden:",
			error
		);


		/*
		 * Eigene Router-Fehler dürfen direkt
		 * angezeigt werden.
		 *
		 * Bei technischen Ladefehlern zeigen wir
		 * dagegen keine möglicherweise englische
		 * oder interne Fehlermeldung an.
		 */
		if (
			typeof error?.code === "string" &&
			error.code.startsWith(
				"ROUTER_"
			)
		) {
			showError(
				error.message
			);
		}
		else {
			showError(
				getUiText(
					"pageLoadFailed"
				)
			);
		}
	}
}


/* ---------------------------------------------------------
   4. Route auflösen
   --------------------------------------------------------- */

/**
 * Löst eine beliebig tiefe Kategorie-Route auf.
 *
 * Beispiel:
 *
 * collectibles
 * collectibles/echos
 * collectibles/comms
 *
 * @param {Object} game
 * @param {Array<string>} routeIds
 * @returns {Promise<Object>}
 */
async function resolveGameRoute(
	game,
	routeIds
) {

	let currentManifest =
		game;


	let currentManifestFile =
		"manifest.json";


	let lastEntry =
		null;


	for (
		let index = 0;
		index < routeIds.length;
		index++
	) {

		const categoryId =
			routeIds[index];


		const categories =
			Array.isArray(
				currentManifest.categories
			)
				? currentManifest.categories
				: [];


		const entry =
			categories.find(
				category =>
					category.id ===
					categoryId
			);


		if (!entry) {

			throw createRouterError(
				"ROUTER_CATEGORY_NOT_FOUND",
				"categoryNotFound",
				{
					category:
						categoryId
				}
			);
		}


		if (!entry.file) {

			throw createRouterError(
				"ROUTER_CATEGORY_FILE_MISSING",
				"categoryFileMissing",
				{
					category:
						getLocalizedText(
							entry.name,
							entry.id
						)
				}
			);
		}


		lastEntry =
			entry;


		const resolvedFile =
			resolveRelativeFile(
				currentManifestFile,
				entry.file
			);


		const isLastRoutePart =
			index ===
			routeIds.length - 1;


		/*
		 * Manifest-Eintrag
		 */
		if (
			entry.type ===
			"manifest"
		) {

			const childManifest =
				await loadManifest(
					game.id,
					resolvedFile
				);


			if (
				isLastRoutePart
			) {

				return {
					type:
						"manifest",

					manifest:
						childManifest,

					manifestFile:
						resolvedFile,

					entry
				};
			}


			currentManifest =
				childManifest;


			currentManifestFile =
				resolvedFile;


			continue;
		}


		/*
		 * Eine normale Kategorie darf nur
		 * das letzte Element der Route sein.
		 */
		if (
			!isLastRoutePart
		) {

			throw createRouterError(
				"ROUTER_NO_SUBCATEGORIES",
				"noSubcategories",
				{
					category:
						getLocalizedText(
							entry.name,
							entry.id
						)
				}
			);
		}


		return {
			type:
				"category",

			category: {
				...entry,

				file:
					resolvedFile
			},

			entry:
				lastEntry
		};
	}


	throw createRouterError(
		"ROUTER_CATEGORY_LOAD_FAILED",
		"categoryLoadFailed"
	);
}


/* ---------------------------------------------------------
   5. Router-Fehler
   --------------------------------------------------------- */

/**
 * Erstellt einen kontrollierten Router-Fehler.
 *
 * @param {string} code
 * @param {string} textKey
 * @param {Object} values
 * @returns {Error}
 */
function createRouterError(
	code,
	textKey,
	values = {}
) {
	const error =
		new Error(
			getUiText(
				textKey,
				values
			)
		);


	error.code =
		code;


	return error;
}


/* ---------------------------------------------------------
   6. Hash auslesen
   --------------------------------------------------------- */

/**
 * Zerlegt den aktuellen Hash.
 *
 * Beispiel:
 *
 * #game/theDivision2/collectibles/echos
 *
 * wird:
 *
 * [
 *   "game",
 *   "theDivision2",
 *   "collectibles",
 *   "echos"
 * ]
 *
 * @returns {Array<string>}
 */
function getRouteParts() {

	const hash =
		window.location.hash
			.replace(/^#/, "");


	if (!hash) {
		return [];
	}


	return hash
		.split("/")
		.filter(Boolean)
		.map(
			part =>
				decodeURIComponent(
					part
				)
		);
}


/* ---------------------------------------------------------
   7. Hash erzeugen
   --------------------------------------------------------- */

/**
 * Baut eine Spielroute.
 *
 * @param {string} gameId
 * @param {Array<string>} routeIds
 * @returns {string}
 */
function buildGameHash(
	gameId,
	routeIds = []
) {

	const parts = [
		"game",

		encodeURIComponent(
			gameId
		),

		...routeIds.map(
			routeId =>
				encodeURIComponent(
					routeId
				)
		)
	];


	return `#${parts.join("/")}`;
}
