/* =========================================================
   Personal Game Tracker
   Language View
   ========================================================= */

import {
	getCurrentLanguage,
	setLanguage,
	LANGUAGE_CHANGE_EVENT
} from "../services/languageService.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		language:
			"Sprache",

		selectLanguage:
			"Sprache auswählen",

		games:
			"Spiele",

		gamesNavigation:
			"Spiele",

		login:
			"Anmelden",

		logout:
			"Abmelden",

		account:
			"Account"
	},

	en: {
		language:
			"Language",

		selectLanguage:
			"Select language",

		games:
			"Games",

		gamesNavigation:
			"Games",

		login:
			"Sign in",

		logout:
			"Sign out",

		account:
			"Account"
	}
};


/**
 * Gibt einen UI-Text in der aktuell
 * ausgewählten Sprache zurück.
 *
 * @param {string} key
 * @returns {string}
 */
function getUiText(
	key
) {
	const language =
		getCurrentLanguage();


	return (
		UI_TEXT[language]?.[key] ??
		UI_TEXT.en?.[key] ??
		key
	);
}


/* ---------------------------------------------------------
   2. Initialisierung
   --------------------------------------------------------- */

/**
 * Initialisiert die Sprachauswahl und
 * die statischen Texte der Oberfläche.
 */
export function initLanguageView() {

	const languageSelect =
		document.getElementById(
			"language-select"
		);


	if (!languageSelect) {

		console.warn(
			"Sprachauswahl wurde im DOM nicht gefunden."
		);

		return;
	}


	/*
	 * Bereits gespeicherte beziehungsweise
	 * automatisch erkannte Sprache anzeigen.
	 */
	updateLanguageSelect(
		languageSelect
	);


	/*
	 * Benutzer ändert die Sprache.
	 */
	languageSelect.addEventListener(
		"change",
		() => {

			handleLanguageChange(
				languageSelect
			);
		}
	);


	/*
	 * Falls die Sprache geändert wird:
	 *
	 * - Select synchronisieren
	 * - statische UI-Texte aktualisieren
	 */
	window.addEventListener(
		LANGUAGE_CHANGE_EVENT,
		() => {

			updateLanguageSelect(
				languageSelect
			);


			updateStaticUiText();
		}
	);


	/*
	 * Initiale Texte setzen.
	 */
	updateStaticUiText();
}


/* ---------------------------------------------------------
   3. Sprachwechsel
   --------------------------------------------------------- */

/**
 * Verarbeitet eine Änderung über das Select.
 *
 * @param {HTMLSelectElement} languageSelect
 */
function handleLanguageChange(
	languageSelect
) {

	const selectedLanguage =
		languageSelect.value;


	const success =
		setLanguage(
			selectedLanguage
		);


	/*
	 * Falls ein ungültiger Wert gesetzt wurde,
	 * wird wieder die tatsächliche Sprache angezeigt.
	 */
	if (!success) {

		updateLanguageSelect(
			languageSelect
		);
	}
}


/* ---------------------------------------------------------
   4. Select aktualisieren
   --------------------------------------------------------- */

/**
 * Synchronisiert das Auswahlfeld mit der
 * aktuell eingestellten Sprache.
 *
 * @param {HTMLSelectElement} languageSelect
 */
function updateLanguageSelect(
	languageSelect
) {

	languageSelect.value =
		getCurrentLanguage();
}


/* ---------------------------------------------------------
   5. Statische UI-Texte
   --------------------------------------------------------- */

/**
 * Aktualisiert alle statischen Texte,
 * die direkt aus der index.html stammen.
 *
 * Dynamische Spiel-, Kategorie- und Item-Texte
 * werden von ihren jeweiligen Views behandelt.
 */
function updateStaticUiText() {

	/*
	 * -----------------------------------------------------
	 * Sprachmodul
	 * -----------------------------------------------------
	 */

	const languageLabel =
		document.querySelector(
			".language-label"
		);


	const languageSelect =
		document.getElementById(
			"language-select"
		);


	if (languageLabel) {

		languageLabel.textContent =
			getUiText(
				"language"
			);
	}


	if (languageSelect) {

		languageSelect.setAttribute(
			"aria-label",
			getUiText(
				"selectLanguage"
			)
		);
	}


	/*
	 * -----------------------------------------------------
	 * Account-Modul
	 * -----------------------------------------------------
	 */

	const loginButton =
		document.getElementById(
			"login-button"
		);


	const accountButton =
		document.getElementById(
			"account-button"
		);


	const logoutButton =
		document.getElementById(
			"logout-button"
		);


	if (loginButton) {

		loginButton.textContent =
			getUiText(
				"login"
			);
	}


	if (accountButton) {

		accountButton.textContent =
			getUiText(
				"account"
			);
	}


	if (logoutButton) {

		logoutButton.textContent =
			getUiText(
				"logout"
			);
	}


	/*
	 * -----------------------------------------------------
	 * Spiele-Navigation
	 * -----------------------------------------------------
	 */

	const sidebarNavigation =
		document.querySelector(
			".sidebar nav"
		);


	const gamesOverviewLink =
		document.getElementById(
			"games-overview-link"
		);


	/*
	 * Wichtig:
	 *
	 * Nicht den Inhalt des <h2>-Elements ersetzen.
	 * Sonst würde das darin enthaltene <a>-Element
	 * aus dem DOM entfernt.
	 */
	if (gamesOverviewLink) {

		gamesOverviewLink.textContent =
			getUiText(
				"games"
			);


		gamesOverviewLink.href =
			"#games";
	}


	if (sidebarNavigation) {

		sidebarNavigation.setAttribute(
			"aria-label",
			getUiText(
				"gamesNavigation"
			)
		);
	}
}
