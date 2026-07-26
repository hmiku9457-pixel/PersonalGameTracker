/* =========================================================
   Personal Game Tracker
   Auth Service
   ========================================================= */

(function initializeAuthService() {

	/* ---------------------------------------------------------
	   1. UI-Texte
	   --------------------------------------------------------- */

	const ERROR_TEXT = {
		de: {
			unknown:
				"Ein unbekannter Fehler ist aufgetreten.",

			invalidCredentials:
				"E-Mail-Adresse oder Passwort ist falsch.",

			emailNotConfirmed:
				"Bitte bestätige zuerst deine E-Mail-Adresse.",

			passwordRequirements:
				"Das Passwort erfüllt die Anforderungen nicht.",

			rateLimit:
				"Zu viele Anfragen. Bitte versuche es später erneut.",

			network:
				"Supabase ist momentan nicht erreichbar.",

			authFailed:
				"Die Anmeldung konnte nicht durchgeführt werden."
		},

		en: {
			unknown:
				"An unknown error occurred.",

			invalidCredentials:
				"Email address or password is incorrect.",

			emailNotConfirmed:
				"Please confirm your email address first.",

			passwordRequirements:
				"The password does not meet the requirements.",

			rateLimit:
				"Too many requests. Please try again later.",

			network:
				"Supabase is currently unavailable.",

			authFailed:
				"Authentication could not be completed."
		}
	};


	/**
	 * Ermittelt die aktuell ausgewählte Sprache.
	 *
	 * languageService.js hält das lang-Attribut des
	 * HTML-Dokuments synchron mit der Sprachauswahl.
	 *
	 * @returns {"de"|"en"}
	 */
	function getCurrentLanguage() {
		const language =
			document.documentElement.lang
				?.trim()
				.toLowerCase()
				.split("-")[0];


		return language === "de"
			? "de"
			: "en";
	}


	/**
	 * Gibt einen lokalisierten Fehlertext zurück.
	 *
	 * @param {string} key
	 * @returns {string}
	 */
	function getErrorText(key) {
		const language =
			getCurrentLanguage();


		return (
			ERROR_TEXT[language]?.[key] ??
			ERROR_TEXT.en?.[key] ??
			key
		);
	}


	/* ---------------------------------------------------------
	   2. Supabase Client
	   --------------------------------------------------------- */

	/**
	 * Gibt den zentralen Supabase Client zurück.
	 *
	 * @returns {object}
	 */
	function getClient() {
		if (!window.supabaseClient) {
			throw new Error(
				"Supabase Client ist nicht verfügbar."
			);
		}

		return window.supabaseClient;
	}


	/* ---------------------------------------------------------
	   3. E-Mail
	   --------------------------------------------------------- */

	/**
	 * Bereinigt eine E-Mail-Adresse.
	 *
	 * @param {string} email
	 * @returns {string}
	 */
	function normalizeEmail(email) {
		return String(
			email ?? ""
		)
			.trim()
			.toLowerCase();
	}


	/* ---------------------------------------------------------
	   4. Redirect
	   --------------------------------------------------------- */

	/**
	 * Ermittelt die Basis-URL der aktuellen Anwendung.
	 *
	 * Beispiele:
	 *
	 * https://username.github.io/personal-game-tracker/
	 * http://127.0.0.1:5500/
	 *
	 * @returns {string}
	 */
	function getAuthRedirectUrl() {
		return new URL(
			"./",
			window.location.href
		).href;
	}


	/* ---------------------------------------------------------
	   5. Login
	   --------------------------------------------------------- */

	/**
	 * Meldet einen bestehenden Benutzer an.
	 *
	 * @param {string} email
	 * @param {string} password
	 * @returns {Promise<object>}
	 */
	async function signIn(
		email,
		password
	) {
		const client =
			getClient();


		const {
			data,
			error
		} =
			await client.auth
				.signInWithPassword({
					email:
						normalizeEmail(
							email
						),

					password:
						password
				});


		if (error) {
			throw error;
		}


		return data;
	}


	/* ---------------------------------------------------------
	   6. Registrierung
	   --------------------------------------------------------- */

	/**
	 * Registriert einen neuen Benutzer.
	 *
	 * @param {string} email
	 * @param {string} password
	 * @returns {Promise<object>}
	 */
	async function signUp(
		email,
		password
	) {
		const client =
			getClient();


		const {
			data,
			error
		} =
			await client.auth
				.signUp({
					email:
						normalizeEmail(
							email
						),

					password:
						password,

					options: {
						emailRedirectTo:
							getAuthRedirectUrl()
					}
				});


		if (error) {
			throw error;
		}


		return data;
	}


	/* ---------------------------------------------------------
	   7. Logout
	   --------------------------------------------------------- */

	/**
	 * Meldet den aktuellen Benutzer auf diesem Gerät ab.
	 *
	 * Andere Geräte bleiben angemeldet.
	 *
	 * @returns {Promise<void>}
	 */
	async function signOut() {
		const client =
			getClient();


		const {
			error
		} =
			await client.auth
				.signOut({
					scope: "local"
				});


		if (error) {
			throw error;
		}
	}


	/* ---------------------------------------------------------
	   8. Session
	   --------------------------------------------------------- */

	/**
	 * Gibt die aktuell gespeicherte Session zurück.
	 *
	 * @returns {Promise<object|null>}
	 */
	async function getSession() {
		const client =
			getClient();


		const {
			data,
			error
		} =
			await client.auth
				.getSession();


		if (error) {
			throw error;
		}


		return data.session ??
			null;
	}


	/* ---------------------------------------------------------
	   9. Auth-State
	   --------------------------------------------------------- */

	/**
	 * Registriert einen Listener für Änderungen am
	 * Authentifizierungsstatus.
	 *
	 * @param {Function} callback
	 * @returns {Function} unsubscribe
	 */
	function onAuthStateChange(
		callback
	) {
		const client =
			getClient();


		const {
			data: {
				subscription
			}
		} =
			client.auth
				.onAuthStateChange(
					(
						event,
						session
					) => {

						callback(
							event,
							session
						);

					}
				);


		return function unsubscribe() {
			subscription.unsubscribe();
		};
	}


	/* ---------------------------------------------------------
	   10. Fehlermeldungen
	   --------------------------------------------------------- */

	/**
	 * Übersetzt häufige Auth-Fehler in eine
	 * benutzerfreundliche Meldung.
	 *
	 * Die Sprache wird erst beim Auftreten des
	 * Fehlers ermittelt. Dadurch funktioniert ein
	 * Sprachwechsel ohne Neuladen der Seite.
	 *
	 * @param {Error|object} error
	 * @returns {string}
	 */
	function getErrorMessage(error) {
		if (!error) {
			return getErrorText(
				"unknown"
			);
		}


		const message =
			String(
				error.message ?? ""
			)
				.toLowerCase();


		/*
		 * Falsche Zugangsdaten
		 */
		if (
			message.includes(
				"invalid login credentials"
			)
		) {
			return getErrorText(
				"invalidCredentials"
			);
		}


		/*
		 * E-Mail noch nicht bestätigt
		 */
		if (
			message.includes(
				"email not confirmed"
			)
		) {
			return getErrorText(
				"emailNotConfirmed"
			);
		}


		/*
		 * Passwortanforderungen
		 */
		if (
			message.includes(
				"password"
			) &&
			message.includes(
				"characters"
			)
		) {
			return getErrorText(
				"passwordRequirements"
			);
		}


		/*
		 * Zu viele Requests
		 */
		if (
			message.includes(
				"rate limit"
			) ||
			message.includes(
				"rate_limit"
			)
		) {
			return getErrorText(
				"rateLimit"
			);
		}


		/*
		 * Netzwerk / Supabase nicht erreichbar
		 */
		if (
			message.includes(
				"failed to fetch"
			) ||
			message.includes(
				"network"
			)
		) {
			return getErrorText(
				"network"
			);
		}


		/*
		 * Unbekannte technische Fehler weiterhin
		 * vollständig in der Konsole ausgeben.
		 */
		console.error(
			"[Auth] Nicht zugeordneter Fehler:",
			error
		);


		return getErrorText(
			"authFailed"
		);
	}


	/* ---------------------------------------------------------
	   11. Öffentliche API
	   --------------------------------------------------------- */

	window.authService = {
		signIn,
		signUp,
		signOut,
		getSession,
		onAuthStateChange,
		getErrorMessage
	};

})();
