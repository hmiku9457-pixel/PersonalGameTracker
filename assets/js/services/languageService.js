/* =========================================================
   Personal Game Tracker
   Language Service
   ========================================================= */


/* ---------------------------------------------------------
   1. Konstanten
   --------------------------------------------------------- */

const STORAGE_KEY = "personalGameTracker.language";

const DEFAULT_LANGUAGE = "en";

const SUPPORTED_LANGUAGES = [
	"de",
	"en"
];

export const LANGUAGE_CHANGE_EVENT =
	"tracker:languagechange";


/* ---------------------------------------------------------
   2. Aktuelle Sprache
   --------------------------------------------------------- */

let currentLanguage =
	loadInitialLanguage();


/**
 * Gibt die aktuell verwendete Sprache zurück.
 *
 * @returns {"de"|"en"}
 */
export function getCurrentLanguage() {
	return currentLanguage;
}


/**
 * Setzt die aktuelle Sprache.
 *
 * Die Sprache wird:
 * - im Speicher hinterlegt
 * - im <html lang=""> Attribut gesetzt
 * - über ein Event an die Anwendung gemeldet
 *
 * @param {string} language
 * @returns {boolean}
 */
export function setLanguage(language) {
	const normalizedLanguage =
		normalizeLanguage(language);

	if (!normalizedLanguage) {
		console.warn(
			`Nicht unterstützte Sprache: ${language}`
		);

		return false;
	}


	/*
	 * Keine Änderung notwendig.
	 */
	if (normalizedLanguage === currentLanguage) {
		updateDocumentLanguage();

		return true;
	}


	currentLanguage =
		normalizedLanguage;


	saveLanguage(
		currentLanguage
	);


	updateDocumentLanguage();


	window.dispatchEvent(
		new CustomEvent(
			LANGUAGE_CHANGE_EVENT,
			{
				detail: {
					language: currentLanguage
				}
			}
		)
	);


	return true;
}


/* ---------------------------------------------------------
   3. Lokalisierte Texte
   --------------------------------------------------------- */

/**
 * Liefert einen Text passend zur aktuell gewählten Sprache.
 *
 * Unterstützt sowohl die bisherige JSON-Struktur:
 *
 * "name": "Enkindle"
 *
 * als auch die neue Struktur:
 *
 * "name": {
 *     "de": "Entfachen",
 *     "en": "Enkindle"
 * }
 *
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
export function getLocalizedText(
	value,
	fallback = ""
) {

	/*
	 * Kein Wert vorhanden.
	 */
	if (
		value === null ||
		value === undefined
	) {
		return fallback;
	}


	/*
	 * Bisherige JSON-Struktur.
	 *
	 * Alte Strings funktionieren dadurch
	 * weiterhin unverändert.
	 */
	if (
		typeof value === "string" ||
		typeof value === "number"
	) {
		return String(value);
	}


	/*
	 * Neue mehrsprachige JSON-Struktur.
	 */
	if (
		typeof value === "object" &&
		!Array.isArray(value)
	) {

		/*
		 * Bevorzugte Sprache.
		 */
		const preferredValue =
			value[currentLanguage];

		if (
			isUsableText(
				preferredValue
			)
		) {
			return String(
				preferredValue
			);
		}


		/*
		 * Fallback auf die jeweils
		 * andere unterstützte Sprache.
		 */
		const fallbackLanguage =
			currentLanguage === "de"
				? "en"
				: "de";

		const fallbackValue =
			value[fallbackLanguage];

		if (
			isUsableText(
				fallbackValue
			)
		) {
			return String(
				fallbackValue
			);
		}


		/*
		 * Falls später einmal ein Objekt
		 * nur eine einzelne andere Sprache
		 * enthält, wird der erste verwendbare
		 * Text genommen.
		 */
		for (
			const objectValue
			of Object.values(value)
		) {
			if (
				isUsableText(
					objectValue
				)
			) {
				return String(
					objectValue
				);
			}
		}
	}


	return fallback;
}


/**
 * Gibt den passenden Locale-Code zurück.
 *
 * Dieser kann später beispielsweise für
 * alphabetische Sortierungen verwendet werden.
 *
 * @returns {string}
 */
export function getCurrentLocale() {
	return currentLanguage === "de"
		? "de-DE"
		: "en-US";
}


/**
 * Prüft, ob eine Sprache unterstützt wird.
 *
 * @param {string} language
 * @returns {boolean}
 */
export function isSupportedLanguage(
	language
) {
	return Boolean(
		normalizeLanguage(language)
	);
}


/* ---------------------------------------------------------
   4. Initialisierung
   --------------------------------------------------------- */

/**
 * Ermittelt die Sprache beim Laden der Seite.
 *
 * Reihenfolge:
 *
 * 1. Bereits gespeicherte Auswahl
 * 2. Browsersprache
 * 3. Standardsprache
 *
 * @returns {"de"|"en"}
 */
function loadInitialLanguage() {

	/*
	 * Bereits gespeicherte Sprache.
	 */
	const savedLanguage =
		loadSavedLanguage();

	if (savedLanguage) {
		return savedLanguage;
	}


	/*
	 * Browsersprache verwenden.
	 */
	const browserLanguage =
		detectBrowserLanguage();

	if (browserLanguage) {
		return browserLanguage;
	}


	return DEFAULT_LANGUAGE;
}


/**
 * Liest die gespeicherte Sprache.
 *
 * @returns {"de"|"en"|null}
 */
function loadSavedLanguage() {
	try {
		const savedLanguage =
			localStorage.getItem(
				STORAGE_KEY
			);

		return normalizeLanguage(
			savedLanguage
		);
	} catch (error) {
		console.warn(
			"Gespeicherte Sprache konnte nicht gelesen werden:",
			error
		);

		return null;
	}
}


/**
 * Speichert die Sprache lokal.
 *
 * @param {"de"|"en"} language
 */
function saveLanguage(language) {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			language
		);
	} catch (error) {
		console.warn(
			"Sprache konnte nicht gespeichert werden:",
			error
		);
	}
}


/**
 * Ermittelt Deutsch oder Englisch anhand
 * der Sprache des Browsers.
 *
 * Deutsche Browser erhalten Deutsch.
 * Alle anderen Browser erhalten Englisch.
 *
 * @returns {"de"|"en"}
 */
function detectBrowserLanguage() {
	const browserLanguages =
		Array.isArray(
			navigator.languages
		) &&
		navigator.languages.length > 0
			? navigator.languages
			: [navigator.language];


	for (
		const browserLanguage
		of browserLanguages
	) {
		const normalizedLanguage =
			normalizeLanguage(
				browserLanguage
			);

		if (normalizedLanguage) {
			return normalizedLanguage;
		}
	}


	return DEFAULT_LANGUAGE;
}


/* ---------------------------------------------------------
   5. Hilfsfunktionen
   --------------------------------------------------------- */

/**
 * Normalisiert einen Sprachcode.
 *
 * Beispiele:
 *
 * de      -> de
 * de-DE   -> de
 * de-AT   -> de
 * en      -> en
 * en-US   -> en
 * en-GB   -> en
 *
 * @param {*} language
 * @returns {"de"|"en"|null}
 */
function normalizeLanguage(language) {
	if (
		typeof language !== "string"
	) {
		return null;
	}


	const normalizedLanguage =
		language
			.trim()
			.toLowerCase()
			.split("-")[0];


	if (
		SUPPORTED_LANGUAGES.includes(
			normalizedLanguage
		)
	) {
		return normalizedLanguage;
	}


	return null;
}


/**
 * Aktualisiert das lang-Attribut des
 * HTML-Dokuments.
 */
function updateDocumentLanguage() {
	document.documentElement.lang =
		currentLanguage;
}


/**
 * Prüft, ob ein Wert als Text verwendet
 * werden kann.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isUsableText(value) {
	return (
		typeof value === "string" &&
		value.trim() !== ""
	) || (
		typeof value === "number"
	);
}


/* ---------------------------------------------------------
   6. Initialen Dokumentstatus setzen
   --------------------------------------------------------- */

updateDocumentLanguage();
