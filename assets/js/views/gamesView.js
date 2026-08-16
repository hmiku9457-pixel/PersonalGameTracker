/* =========================================================
   Personal Game Tracker
   Games View
   ========================================================= */

import {
	buildGameHash
} from "../services/routeHashService.js";

import {
	loadGameProgressData
} from "../services/progressService.js";


import {
	getCurrentLanguage,
	getLocalizedText
} from "../services/languageService.js";


import {
	showError,
	showLoading
} from "./commonView.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		title:
			"Spiele",

		description:
			"Wähle ein Spiel aus, um dessen Kategorien und Fortschritt anzuzeigen.",

		noGames:
			"Es sind aktuell keine Spiele verfügbar.",

		loadFailed:
			"Die Spieleübersicht konnte nicht geladen werden.",

		progressLabel:
			"Gesamtfortschritt für {game}"
	},

	en: {
		title:
			"Games",

		description:
			"Select a game to view its categories and progress.",

		noGames:
			"No games are currently available.",

		loadFailed:
			"The games overview could not be loaded.",

		progressLabel:
			"Overall progress for {game}"
	}
};


/**
 * Gibt einen lokalisierten Text
 * der Spieleübersicht zurück.
 *
 * Platzhalter wie:
 *
 * {game}
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
   2. DOM
   --------------------------------------------------------- */

/**
 * Gibt den Main-Container zurück.
 *
 * @returns {HTMLElement|null}
 */
function getMainContent() {

	return document.getElementById(
		"main-content"
	);
}


/* ---------------------------------------------------------
   3. Spieleübersicht rendern
   --------------------------------------------------------- */

/**
 * Rendert alle verfügbaren Spiele
 * als anklickbare Karten.
 */
export async function renderGamesOverview() {
	const viewScope =
		getActiveViewScope();

	const fallbackController =
		new AbortController();

	const signal =
		viewScope?.signal ??
		fallbackController.signal;

	registerViewCleanup(
		() => fallbackController.abort(),
		viewScope
	);


	const mainContent =
		getMainContent();


	if (!mainContent) {

		console.warn(
			"Element #main-content wurde nicht gefunden."
		);

		return;
	}


	showLoading();


	try {

		const games =
			await loadGames();


		if (
		viewScope &&
		!isViewScopeCurrent(viewScope)
	) {
		return;
	}

	mainContent.replaceChildren();


		const gamesPage =
			document.createElement(
				"section"
			);


		gamesPage.className =
			"games-page";


		/*
		 * ---------------------------------------------------
		 * Seitenkopf
		 * ---------------------------------------------------
		 */

		const header =
			document.createElement(
				"header"
			);


		header.className =
			"games-header";


		const title =
			document.createElement(
				"h2"
			);


		title.className =
			"games-title";


		title.textContent =
			getUiText(
				"title"
			);


		const description =
			document.createElement(
				"p"
			);


		description.className =
			"games-description";


		description.textContent =
			getUiText(
				"description"
			);


		header.append(
			title,
			description
		);


		gamesPage.append(
			header
		);


		/*
		 * ---------------------------------------------------
		 * Gültige Spiele ermitteln
		 * ---------------------------------------------------
		 */

		const validGames =
			Array.isArray(
				games
			)
				? games.filter(
					game =>
						game &&
						typeof game.id ===
							"string" &&
						game.id.trim() !==
							""
				)
				: [];


		/*
		 * ---------------------------------------------------
		 * Keine Spiele vorhanden
		 * ---------------------------------------------------
		 */

		if (
			validGames.length === 0
		) {

			const emptyMessage =
				document.createElement(
					"p"
				);


			emptyMessage.className =
				"games-empty-message";


			emptyMessage.textContent =
				getUiText(
					"noGames"
				);


			gamesPage.append(
				emptyMessage
			);


			mainContent.append(
				gamesPage
			);


			return;
		}


		/*
		 * ---------------------------------------------------
		 * Spiele-Karten
		 * ---------------------------------------------------
		 */

		const gamesGrid =
			document.createElement(
				"div"
			);


		gamesGrid.className =
			"games-grid";


		const gameCards = [];


		for (
			const game
			of validGames
		) {

			const card =
				createGameCard(
					game
				);


			gameCards.push({
				game,
				card
			});


			gamesGrid.append(
				card
			);
		}


		gamesPage.append(
			gamesGrid
		);


		mainContent.append(
			gamesPage
		);


		/*
		 * ---------------------------------------------------
		 * Fortschritt aller Spiele laden
		 * ---------------------------------------------------
		 *
		 * Die Karten werden zuerst angezeigt.
		 * Anschließend werden die Fortschrittswerte
		 * parallel nachgeladen.
		 */

		await Promise.allSettled(
			gameCards.map(
				({ game, card }) =>
					loadGameCardProgress(
						game,
						card
					)
			)
		);

	}
	catch (error) {
		/* View-Abbruch durch Routenwechsel */
		if (
			error?.name === "AbortError" ||
			(viewScope &&
				!isViewScopeCurrent(viewScope))
		) {
			return;
		}


		console.error(
			"Spieleübersicht konnte nicht geladen werden:",
			error
		);


		showError(
			getUiText(
				"loadFailed"
			)
		);
	}
}


/* ---------------------------------------------------------
   4. Spiele-Karte erstellen
   --------------------------------------------------------- */

/**
 * Erstellt eine anklickbare Karte
 * für ein einzelnes Spiel.
 *
 * @param {Object} game
 * @returns {HTMLAnchorElement}
 */
function createGameCard(
	game
) {

	const gameName =
		getLocalizedText(
			game.name,
			game.id
		);


	const link =
		document.createElement(
			"a"
		);


	link.className =
		"game-card";


	link.href =
		buildGameHash(
			game.id
		);


	link.dataset.gameId =
		game.id;


	link.setAttribute(
		"aria-label",
		gameName
	);


	/*
	 * -----------------------------------------------------
	 * Hintergrundmedium
	 * -----------------------------------------------------
	 */

	const mediaContainer =
		document.createElement(
			"div"
		);


	mediaContainer.className =
		"game-card-media";


	const mediaElement =
		createGameMedia(
			game,
			mediaContainer
		);


	if (mediaElement) {

		mediaContainer.append(
			mediaElement
		);

	}
	else {

		mediaContainer.classList.add(
			"is-empty"
		);
	}


	/*
	 * -----------------------------------------------------
	 * Unterer Inhaltsbereich
	 * -----------------------------------------------------
	 */

	const overlay =
		document.createElement(
			"div"
		);


	overlay.className =
		"game-card-overlay";


	const content =
		document.createElement(
			"div"
		);


	content.className =
		"game-card-content";


	const title =
		document.createElement(
			"h3"
		);


	title.className =
		"game-card-title";


	title.textContent =
		gameName;


	const progress =
		createGameCardProgress(
			gameName
		);


	content.append(
		title,
		progress
	);


	overlay.append(
		content
	);


	link.append(
		mediaContainer,
		overlay
	);


	return link;
}


/* ---------------------------------------------------------
   5. Hintergrundmedium
   --------------------------------------------------------- */

/**
 * Erstellt das Hintergrundmedium einer Karte.
 *
 * Falls das Medium nicht geladen werden kann,
 * wird es entfernt und der Platzhalter angezeigt.
 *
 * @param {Object} game
 * @param {HTMLElement} mediaContainer
 * @returns {HTMLImageElement|HTMLVideoElement|null}
 */
function createGameMedia(
	game,
	mediaContainer
) {

	const media =
		getGameMediaConfig(
			game
		);


	if (!media) {
		return null;
	}


	if (
		media.type ===
		"video"
	) {

		const video =
			document.createElement(
				"video"
			);


		video.className =
			"game-card-media-element";


		video.autoplay =
			true;


		video.loop =
			true;


		video.muted =
			true;


		video.playsInline =
			true;


		video.preload =
			"metadata";


		video.setAttribute(
			"aria-hidden",
			"true"
		);


		/*
		 * Fehlerhaften Video-Pfad abfangen.
		 */
		video.addEventListener(
			"error",
			() => {

				video.remove();


				mediaContainer.classList.add(
					"is-empty"
				);
			},
			{
				once: true
			}
		);


		if (
			typeof media.poster === "string" &&
			media.poster.trim() !== ""
		) {

			video.poster =
				media.poster;
		}


		applyMediaDisplayOptions(
			video,
			media
		);


		/*
		 * src erst nach dem Error-Listener setzen.
		 */
		video.src =
			media.src;


		return video;
	}


	const image =
		document.createElement(
			"img"
		);


	image.className =
		"game-card-media-element";


	image.alt =
		"";


	image.loading =
		"lazy";


	image.decoding =
		"async";


	/*
	 * Fehlerhaften Bild- oder GIF-Pfad abfangen.
	 */
	image.addEventListener(
		"error",
		() => {

			image.remove();


			mediaContainer.classList.add(
				"is-empty"
			);
		},
		{
			once: true
		}
	);


	applyMediaDisplayOptions(
		image,
		media
	);


	/*
	 * src erst nach dem Error-Listener setzen.
	 */
	image.src =
		media.src;


	return image;
}


/**
 * Ermittelt die Medienkonfiguration eines Spiels.
 *
 * Unterstützte Varianten:
 *
 * "media": "assets/images/games/game.webp"
 *
 * oder:
 *
 * "media": {
 *     "type": "image",
 *     "src": "assets/images/games/game.webp",
 *     "position": "center"
 * }
 *
 * Zusätzlich wird aus Kompatibilitätsgründen
 * auch ein einfaches "image"-Feld unterstützt.
 *
 * @param {Object} game
 * @returns {Object|null}
 */
function getGameMediaConfig(
	game
) {

	/*
	 * Medium explizit deaktiviert:
	 * Es wird keine Datei angefragt.
	 */
	if (
		game.media &&
		typeof game.media === "object" &&
		game.media.enabled === false
	) {
		return null;
	}


	if (
		typeof game.media === "string" &&
		game.media.trim() !== ""
	) {

		return {
			type:
				inferMediaType(
					game.media
				),

			src:
				game.media
		};
	}


	if (
		game.media &&
		typeof game.media === "object" &&
		typeof game.media.src === "string" &&
		game.media.src.trim() !== ""
	) {

		return {
			...game.media,

			type:
				game.media.type ||
				inferMediaType(
					game.media.src
				),

			src:
				game.media.src
		};
	}


	if (
		typeof game.image === "string" &&
		game.image.trim() !== ""
	) {

		return {
			type:
				"image",

			src:
				game.image
		};
	}


	return null;
}


/**
 * Erkennt anhand der Dateiendung,
 * ob es sich um ein Bild oder Video handelt.
 *
 * GIF-Dateien werden als Bilder behandelt.
 *
 * @param {string} source
 * @returns {"image"|"video"}
 */
function inferMediaType(
	source
) {

	const cleanSource =
		String(
			source
		)
			.split("?")[0]
			.split("#")[0]
			.toLowerCase();


	if (
		cleanSource.endsWith(".webm") ||
		cleanSource.endsWith(".mp4") ||
		cleanSource.endsWith(".ogg") ||
		cleanSource.endsWith(".ogv")
	) {
		return "video";
	}


	return "image";
}


/**
 * Übernimmt optionale Einstellungen
 * für Position und Skalierung.
 *
 * @param {HTMLElement} element
 * @param {Object} media
 */
function applyMediaDisplayOptions(
	element,
	media
) {

	if (
		typeof media.position === "string" &&
		media.position.trim() !== ""
	) {

		element.style.objectPosition =
			media.position;
	}


	if (
		typeof media.fit === "string" &&
		media.fit.trim() !== ""
	) {

		element.style.objectFit =
			media.fit;
	}
}


/* ---------------------------------------------------------
   6. Fortschrittsanzeige erstellen
   --------------------------------------------------------- */

/**
 * Erstellt den Fortschrittsbalken
 * innerhalb einer Spiele-Karte.
 *
 * Der Fortschritt ist zunächst verborgen.
 * Er wird erst angezeigt, wenn persönliche
 * Fortschrittsdaten verfügbar sind.
 *
 * @param {string} gameName
 * @returns {HTMLElement}
 */
function createGameCardProgress(
	gameName
) {

	const container =
		document.createElement(
			"div"
		);


	container.className =
		"game-card-progress";


	container.hidden =
		true;


	const progressBar =
		document.createElement(
			"div"
		);


	progressBar.className =
		"game-card-progress-bar";


	progressBar.setAttribute(
		"role",
		"progressbar"
	);


	progressBar.setAttribute(
		"aria-label",
		getUiText(
			"progressLabel",
			{
				game:
					gameName
			}
		)
	);


	progressBar.setAttribute(
		"aria-valuemin",
		"0"
	);


	progressBar.setAttribute(
		"aria-valuemax",
		"100"
	);


	progressBar.setAttribute(
		"aria-valuenow",
		"0"
	);


	const progressFill =
		document.createElement(
			"div"
		);


	progressFill.className =
		"game-card-progress-fill";


	progressFill.style.width =
		"0%";


	const progressCount =
		document.createElement(
			"span"
		);


	progressCount.className =
		"game-card-progress-count";


	progressCount.textContent =
		"0/0";


	progressBar.append(
		progressFill,
		progressCount
	);


	container.append(
		progressBar
	);


	return container;
}


/* ---------------------------------------------------------
   7. Fortschritt eines Spiels laden
   --------------------------------------------------------- */

/**
 * Lädt und berechnet den Gesamtfortschritt
 * eines einzelnen Spiels.
 *
 * @param {Object} game
 * @param {HTMLElement} card
 */
async function loadGameCardProgress(
	game,
	card
) {
	try {
		const [
			progressData,
			manifest
		] = await Promise.all([
			loadGameProgressData(
				game.id
			),
			loadGameManifest(
				game.id
			)
		]);

		if (
			!progressData ||
			!progressData.available
		) {
			return;
		}

		const progress =
			await calculateManifestProgressFromMetadata(
				game.id,
				manifest,
				"manifest.json",
				progressData
			);

		updateGameCardProgress(
			card,
			game,
			progress
		);
	}
	catch (error) {
		if (error?.name === "AbortError") {
			return;
		}

		console.error(
			`Gesamtfortschritt für Spiel "${game.id}" konnte nicht geladen werden.`,
			error
		);
	}
}


/* ---------------------------------------------------------
   8. Fortschrittsanzeige aktualisieren
   --------------------------------------------------------- */

/**
 * Aktualisiert den Fortschrittsbalken
 * einer Spiele-Karte.
 *
 * @param {HTMLElement} card
 * @param {Object} game
 * @param {{completed:number,total:number}} progress
 */
function updateGameCardProgress(
	card,
	game,
	progress
) {

	const completed =
		Number.isFinite(
			progress.completed
		)
			? progress.completed
			: 0;


	const total =
		Number.isFinite(
			progress.total
		)
			? progress.total
			: 0;


	const percent =
		total > 0
			? Math.min(
				100,
				Math.max(
					0,
					Math.round(
						(completed / total) *
							100
					)
				)
			)
			: 0;


	const progressContainer =
		card.querySelector(
			".game-card-progress"
		);


	const progressBar =
		card.querySelector(
			".game-card-progress-bar"
		);


	const progressFill =
		card.querySelector(
			".game-card-progress-fill"
		);


	const progressCount =
		card.querySelector(
			".game-card-progress-count"
		);


	if (
		!progressContainer ||
		!progressBar ||
		!progressFill ||
		!progressCount
	) {
		return;
	}


	progressCount.textContent =
		`${completed}/${total}`;


	progressFill.style.width =
		`${percent}%`;


	progressBar.setAttribute(
		"aria-valuenow",
		String(
			percent
		)
	);


	progressBar.setAttribute(
		"aria-valuetext",
		`${completed}/${total}`
	);


	progressContainer.hidden =
		false;


	progressContainer.classList.toggle(
		"is-complete",
		total > 0 &&
		completed >= total
	);


	card.dataset.progressCompleted =
		String(
			completed
		);


	card.dataset.progressTotal =
		String(
			total
		);


	card.dataset.progressPercent =
		String(
			percent
		);
}
