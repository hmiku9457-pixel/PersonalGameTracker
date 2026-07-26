import {
	loadGameManifest,
	loadManifest,
	resolveRelativeFile
} from "./services/dataService.js";


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


const mainContent =
	document.getElementById(
		"main-content"
	);


const defaultContent =
	mainContent.innerHTML;


/**
 * Lädt die aktuelle Route anhand
 * des URL-Hashes.
 */
export async function loadPageFromHash() {

	const routeParts =
		getRouteParts();


	/*
	 * Kein Hash:
	 * normale Startseite anzeigen.
	 */

	if (routeParts.length === 0) {

		mainContent.innerHTML =
			defaultContent;


		updateActiveGameNavigation(
			null
		);


		return;
	}


	/*
	 * Unbekannte Route
	 */

	if (
		routeParts[0] !==
		"game"
	) {

		mainContent.innerHTML =
			defaultContent;


		updateActiveGameNavigation(
			null
		);


		return;
	}


	const gameId =
		routeParts[1];


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


		updateActiveGameNavigation(
			gameId
		);


		const categoryRoute =
			routeParts.slice(2);


		/*
		 * Nur das Spiel wurde aufgerufen.
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
		 * Unterkategorien / Manifeste auflösen.
		 */

		const resolvedRoute =
			await resolveGameRoute(
				game,
				categoryRoute
			);


		/*
		 * Ziel ist wieder ein Manifest.
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
		 * Ziel ist eine normale Item-Kategorie.
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

	} catch (error) {

		console.error(
			"Route konnte nicht geladen werden:",
			error
		);


		showError(
			error.message ||
			"Die Seite konnte nicht geladen werden."
		);
	}
}


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

			throw new Error(
				`Kategorie "${categoryId}" wurde nicht gefunden.`
			);
		}


		if (!entry.file) {

			throw new Error(
				`Für Kategorie "${categoryId}" wurde keine Datei angegeben.`
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
		 * Normale Kategorie darf nur
		 * das letzte Element der Route sein.
		 */

		if (
			!isLastRoutePart
		) {

			throw new Error(
				`Kategorie "${entry.name}" besitzt keine weiteren Unterkategorien.`
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


	throw new Error(
		"Die angeforderte Kategorie konnte nicht geladen werden."
	);
}


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
