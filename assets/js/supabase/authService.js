/* =========================================================
   Personal Game Tracker
   Auth Service
   ========================================================= */

(function initializeAuthService() {

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


	/**
	 * Bereinigt eine E-Mail-Adresse.
	 *
	 * @param {string} email
	 * @returns {string}
	 */
	function normalizeEmail(email) {
		return String(email ?? "")
			.trim()
			.toLowerCase();
	}


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
		return new URL("./", window.location.href).href;
	}


	/**
	 * Meldet einen bestehenden Benutzer an.
	 *
	 * @param {string} email
	 * @param {string} password
	 * @returns {Promise<object>}
	 */
	async function signIn(email, password) {
		const client = getClient();

		const { data, error } =
			await client.auth.signInWithPassword({
				email: normalizeEmail(email),
				password: password
			});

		if (error) {
			throw error;
		}

		return data;
	}


	/**
	 * Registriert einen neuen Benutzer.
	 *
	 * @param {string} email
	 * @param {string} password
	 * @returns {Promise<object>}
	 */
	async function signUp(email, password) {
		const client = getClient();

		const { data, error } =
			await client.auth.signUp({
				email: normalizeEmail(email),
				password: password,

				options: {
					emailRedirectTo: getAuthRedirectUrl()
				}
			});

		if (error) {
			throw error;
		}

		return data;
	}


	/**
	 * Meldet den aktuellen Benutzer auf diesem Gerät ab.
	 *
	 * Andere Geräte bleiben angemeldet.
	 *
	 * @returns {Promise<void>}
	 */
	async function signOut() {
		const client = getClient();

		const { error } = await client.auth.signOut({
			scope: "local"
		});

		if (error) {
			throw error;
		}
	}


	/**
	 * Gibt die aktuell gespeicherte Session zurück.
	 *
	 * @returns {Promise<object|null>}
	 */
	async function getSession() {
		const client = getClient();

		const { data, error } =
			await client.auth.getSession();

		if (error) {
			throw error;
		}

		return data.session ?? null;
	}


	/**
	 * Registriert einen Listener für Änderungen am
	 * Authentifizierungsstatus.
	 *
	 * @param {Function} callback
	 * @returns {Function} unsubscribe
	 */
	function onAuthStateChange(callback) {
		const client = getClient();

		const {
			data: {
				subscription
			}
		} = client.auth.onAuthStateChange(
			(event, session) => {
				callback(event, session);
			}
		);

		return function unsubscribe() {
			subscription.unsubscribe();
		};
	}


	/**
	 * Übersetzt häufige Auth-Fehler in eine
	 * benutzerfreundliche Meldung.
	 *
	 * @param {Error|object} error
	 * @returns {string}
	 */
	function getErrorMessage(error) {
		if (!error) {
			return "Ein unbekannter Fehler ist aufgetreten.";
		}

		const message =
			String(error.message ?? "").toLowerCase();


		if (
			message.includes("invalid login credentials")
		) {
			return "E-Mail-Adresse oder Passwort ist falsch.";
		}


		if (
			message.includes("email not confirmed")
		) {
			return "Bitte bestätige zuerst deine E-Mail-Adresse.";
		}


		if (
			message.includes("password")
			&& message.includes("characters")
		) {
			return "Das Passwort erfüllt die Anforderungen nicht.";
		}


		if (
			message.includes("rate limit")
			|| message.includes("rate_limit")
		) {
			return "Zu viele Anfragen. Bitte versuche es später erneut.";
		}


		if (
			message.includes("failed to fetch")
			|| message.includes("network")
		) {
			return "Supabase ist momentan nicht erreichbar.";
		}


		console.error(
			"[Auth] Nicht zugeordneter Fehler:",
			error
		);

		return "Die Anmeldung konnte nicht durchgeführt werden.";
	}


	window.authService = {
		signIn,
		signUp,
		signOut,
		getSession,
		onAuthStateChange,
		getErrorMessage
	};

})();
