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
   1. Initialisierung
   --------------------------------------------------------- */

/**
 * Initialisiert die Sprachauswahl im Header.
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
	 * Bereits gespeicherte bzw.
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
	 * Falls die Sprache an einer anderen
	 * Stelle der Anwendung geändert wird,
	 * bleibt das Select synchron.
	 */
	window.addEventListener(
		LANGUAGE_CHANGE_EVENT,
		() => {
			updateLanguageSelect(
				languageSelect
			);

			updateLanguageModuleText();
		}
	);


	updateLanguageModuleText();
}


/* ---------------------------------------------------------
   2. Sprachwechsel
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
	 * Falls ein ungültiger Wert gesetzt
	 * worden sein sollte, wird wieder die
	 * tatsächliche Sprache angezeigt.
	 */
	if (!success) {
		updateLanguageSelect(
			languageSelect
		);
	}
}


/* ---------------------------------------------------------
   3. Select aktualisieren
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
   4. Texte des Sprachmoduls
   --------------------------------------------------------- */

/**
 * Übersetzt die Beschriftung der
 * Sprachauswahl selbst.
 *
 * Andere Teile der Oberfläche werden später
 * über die jeweiligen Views lokalisiert.
 */
function updateLanguageModuleText() {
	const language =
		getCurrentLanguage();


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
			language === "de"
				? "Sprache"
				: "Language";
	}


	if (languageSelect) {
		languageSelect.setAttribute(
			"aria-label",
			language === "de"
				? "Sprache auswählen"
				: "Select language"
		);
	}
}
