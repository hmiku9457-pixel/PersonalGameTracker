/* =========================================================
   Personal Game Tracker
   Common View
   ========================================================= */

import {
	getCurrentLanguage
} from "../services/languageService.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		loading:
			"Inhalt wird geladen ...",

		errorTitle:
			"Fehler",

		defaultError:
			"Der Inhalt konnte nicht geladen werden."
	},

	en: {
		loading:
			"Loading content ...",

		errorTitle:
			"Error",

		defaultError:
			"The content could not be loaded."
	}
};


/**
 * Gibt einen UI-Text in der aktuell
 * ausgewählten Sprache zurück.
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
   2. Main-Container
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
   3. Ladezustand
   --------------------------------------------------------- */

/**
 * Zeigt einen Ladehinweis im Main-Bereich an.
 */
export function showLoading() {
	const mainContent =
		getMainContent();


	if (!mainContent) {
		console.warn(
			"Element #main-content wurde nicht gefunden."
		);

		return;
	}


	const loading =
		document.createElement(
			"div"
		);


	loading.className =
		"loading";


	const message =
		document.createElement(
			"p"
		);


	message.textContent =
		getUiText(
			"loading"
		);


	loading.append(
		message
	);


	mainContent.replaceChildren(
		loading
	);
}


/* ---------------------------------------------------------
   4. Fehlerzustand
   --------------------------------------------------------- */

/**
 * Zeigt eine Fehlermeldung an.
 *
 * Wird keine eigene Nachricht übergeben,
 * wird eine lokalisierte Standardmeldung
 * verwendet.
 *
 * @param {string|null} message Fehlermeldung
 */
export function showError(
	message = null
) {
	const mainContent =
		getMainContent();


	if (!mainContent) {
		console.warn(
			"Element #main-content wurde nicht gefunden."
		);

		return;
	}


	const errorSection =
		document.createElement(
			"section"
		);


	errorSection.className =
		"error-message";


	const title =
		document.createElement(
			"h2"
		);


	title.textContent =
		getUiText(
			"errorTitle"
		);


	const description =
		document.createElement(
			"p"
		);


	description.textContent =
		message ||
		getUiText(
			"defaultError"
		);


	errorSection.append(
		title,
		description
	);


	mainContent.replaceChildren(
		errorSection
	);
}
