/* =========================================================
   Personal Game Tracker
   Auth View
   ========================================================= */

import {
	getCurrentLanguage,
	LANGUAGE_CHANGE_EVENT
} from "../services/languageService.js";


/* ---------------------------------------------------------
   1. UI-Texte
   --------------------------------------------------------- */

const UI_TEXT = {
	de: {
		login: "Anmelden",
		register: "Registrieren",

		accountNavigation: "Benutzerkonto",

		email: "E-Mail-Adresse",
		password: "Passwort",
		passwordRepeat: "Passwort wiederholen",

		createAccount: "Account erstellen",

		closeDialog: "Anmeldung schließen",

		user: "Benutzer",

		passwordMismatch:
			"Die eingegebenen Passwörter stimmen nicht überein.",

		accountCreated:
			"Account erstellt. Bitte bestätige deine E-Mail-Adresse über den zugesendeten Link.",

		logoutFailed:
			"Die Abmeldung konnte nicht durchgeführt werden."
	},

	en: {
		login: "Sign in",
		register: "Register",

		accountNavigation: "User account",

		email: "Email address",
		password: "Password",
		passwordRepeat: "Repeat password",

		createAccount: "Create account",

		closeDialog: "Close sign-in dialog",

		user: "User",

		passwordMismatch:
			"The entered passwords do not match.",

		accountCreated:
			"Account created. Please confirm your email address using the link that was sent to you.",

		logoutFailed:
			"Sign out could not be completed."
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
   2. Auth View initialisieren
   --------------------------------------------------------- */

(function initializeAuthView() {

	const authService =
		window.authService;


	/*
	 * -------------------------------------------------------
	 * DOM-Elemente
	 * -------------------------------------------------------
	 */

	const loggedOutContainer =
		document.getElementById(
			"account-logged-out"
		);


	const loggedInContainer =
		document.getElementById(
			"account-logged-in"
		);


	const accountUsername =
		document.getElementById(
			"account-username"
		);


	const loginButton =
		document.getElementById(
			"login-button"
		);


	const logoutButton =
		document.getElementById(
			"logout-button"
		);


	const authDialog =
		document.getElementById(
			"auth-dialog"
		);


	const authDialogTitle =
		document.getElementById(
			"auth-dialog-title"
		);


	const authCloseButton =
		document.getElementById(
			"auth-close-button"
		);


	const loginForm =
		document.getElementById(
			"login-form"
		);


	const registerForm =
		document.getElementById(
			"register-form"
		);


	const loginEmail =
		document.getElementById(
			"login-email"
		);


	const loginPassword =
		document.getElementById(
			"login-password"
		);


	const registerEmail =
		document.getElementById(
			"register-email"
		);


	const registerPassword =
		document.getElementById(
			"register-password"
		);


	const registerPasswordRepeat =
		document.getElementById(
			"register-password-repeat"
		);


	const authMessage =
		document.getElementById(
			"auth-message"
		);


	const authTabs =
		document.querySelectorAll(
			"[data-auth-mode]"
		);


	const authTabsContainer =
		document.querySelector(
			".auth-tabs"
		);


	/*
	 * Formular-Beschriftungen
	 */

	const loginEmailLabel =
		document.querySelector(
			'label[for="login-email"]'
		);


	const loginPasswordLabel =
		document.querySelector(
			'label[for="login-password"]'
		);


	const registerEmailLabel =
		document.querySelector(
			'label[for="register-email"]'
		);


	const registerPasswordLabel =
		document.querySelector(
			'label[for="register-password"]'
		);


	const registerPasswordRepeatLabel =
		document.querySelector(
			'label[for="register-password-repeat"]'
		);


	const loginSubmitButton =
		loginForm?.querySelector(
			'button[type="submit"]'
		);


	const registerSubmitButton =
		registerForm?.querySelector(
			'button[type="submit"]'
		);


	/*
	 * -------------------------------------------------------
	 * Zustand
	 * -------------------------------------------------------
	 */

	let currentAuthMode =
		"login";


	let currentSession =
		null;


	/*
	 * -------------------------------------------------------
	 * Hilfsfunktionen
	 * -------------------------------------------------------
	 */

	function validateDependencies() {
		if (!authService) {
			throw new Error(
				"Auth Service wurde nicht geladen."
			);
		}


		if (
			!loggedOutContainer ||
			!loggedInContainer ||
			!accountUsername ||
			!loginButton ||
			!logoutButton ||
			!authDialog ||
			!authDialogTitle ||
			!authCloseButton ||
			!loginForm ||
			!registerForm ||
			!loginEmail ||
			!loginPassword ||
			!registerEmail ||
			!registerPassword ||
			!registerPasswordRepeat ||
			!authMessage
		) {
			throw new Error(
				"Benötigte Auth-Elemente fehlen im DOM."
			);
		}
	}


	/**
	 * Zeigt eine Meldung im Auth-Dialog.
	 *
	 * Freie Meldungen, beispielsweise vom Auth-Service,
	 * werden unverändert ausgegeben.
	 *
	 * @param {string} message
	 * @param {"info"|"success"|"error"} type
	 */
	function showMessage(
		message,
		type = "info"
	) {
		authMessage.textContent =
			message;


		authMessage.dataset.type =
			type;


		authMessage.removeAttribute(
			"data-message-key"
		);


		authMessage.hidden =
			false;
	}


	/**
	 * Zeigt eine lokalisierte Meldung anhand
	 * eines UI-Schlüssels an.
	 *
	 * Der Schlüssel wird gespeichert, damit die
	 * Meldung bei einem Sprachwechsel ebenfalls
	 * aktualisiert werden kann.
	 *
	 * @param {string} key
	 * @param {"info"|"success"|"error"} type
	 */
	function showUiMessage(
		key,
		type = "info"
	) {
		authMessage.textContent =
			getUiText(
				key
			);


		authMessage.dataset.type =
			type;


		authMessage.dataset.messageKey =
			key;


		authMessage.hidden =
			false;
	}


	function clearMessage() {
		authMessage.textContent =
			"";


		authMessage.removeAttribute(
			"data-type"
		);


		authMessage.removeAttribute(
			"data-message-key"
		);


		authMessage.hidden =
			true;
	}


	/**
	 * Aktiviert bzw. deaktiviert ein Formular.
	 *
	 * @param {HTMLFormElement} form
	 * @param {boolean} busy
	 */
	function setFormBusy(
		form,
		busy
	) {
		const elements =
			form.querySelectorAll(
				"input, button"
			);


		elements.forEach(
			(element) => {
				element.disabled =
					busy;
			}
		);
	}


	/*
	 * -------------------------------------------------------
	 * UI übersetzen
	 * -------------------------------------------------------
	 */

	/**
	 * Aktualisiert alle sichtbaren Texte des
	 * Auth-Dialogs.
	 */
	function updateAuthUiText() {

		/*
		 * Dialogtitel entsprechend dem
		 * aktuell geöffneten Modus.
		 */
		authDialogTitle.textContent =
			currentAuthMode === "login"
				? getUiText("login")
				: getUiText("register");


		/*
		 * Schließen-Button
		 */
		authCloseButton.setAttribute(
			"aria-label",
			getUiText(
				"closeDialog"
			)
		);


		/*
		 * Tab-Leiste
		 */
		if (authTabsContainer) {
			authTabsContainer.setAttribute(
				"aria-label",
				getUiText(
					"accountNavigation"
				)
			);
		}


		for (
			const tab
			of authTabs
		) {
			if (
				tab.dataset.authMode ===
				"login"
			) {
				tab.textContent =
					getUiText(
						"login"
					);
			}


			if (
				tab.dataset.authMode ===
				"register"
			) {
				tab.textContent =
					getUiText(
						"register"
					);
			}
		}


		/*
		 * Login-Formular
		 */
		if (loginEmailLabel) {
			loginEmailLabel.textContent =
				getUiText(
					"email"
				);
		}


		if (loginPasswordLabel) {
			loginPasswordLabel.textContent =
				getUiText(
					"password"
				);
		}


		if (loginSubmitButton) {
			loginSubmitButton.textContent =
				getUiText(
					"login"
				);
		}


		/*
		 * Registrierungsformular
		 */
		if (registerEmailLabel) {
			registerEmailLabel.textContent =
				getUiText(
					"email"
				);
		}


		if (registerPasswordLabel) {
			registerPasswordLabel.textContent =
				getUiText(
					"password"
				);
		}


		if (
			registerPasswordRepeatLabel
		) {
			registerPasswordRepeatLabel.textContent =
				getUiText(
					"passwordRepeat"
				);
		}


		if (registerSubmitButton) {
			registerSubmitButton.textContent =
				getUiText(
					"createAccount"
				);
		}


		/*
		 * Falls aktuell eine intern erzeugte
		 * Meldung sichtbar ist, wird sie ebenfalls
		 * neu übersetzt.
		 */
		const messageKey =
			authMessage.dataset.messageKey;


		if (
			messageKey &&
			!authMessage.hidden
		) {
			authMessage.textContent =
				getUiText(
					messageKey
				);
		}


		/*
		 * Fallback-Benutzername neu rendern.
		 */
		renderSession(
			currentSession
		);
	}


	/*
	 * -------------------------------------------------------
	 * Login / Registrierung umschalten
	 * -------------------------------------------------------
	 */

	function setAuthMode(mode) {
		clearMessage();


		currentAuthMode =
			mode === "register"
				? "register"
				: "login";


		const isLogin =
			currentAuthMode ===
			"login";


		loginForm.hidden =
			!isLogin;


		registerForm.hidden =
			isLogin;


		authDialogTitle.textContent =
			isLogin
				? getUiText("login")
				: getUiText("register");


		authTabs.forEach(
			(tab) => {

				const tabIsActive =
					tab.dataset.authMode ===
					currentAuthMode;


				tab.classList.toggle(
					"active",
					tabIsActive
				);


				tab.setAttribute(
					"aria-selected",
					String(tabIsActive)
				);

			}
		);


		window.setTimeout(
			() => {

				if (isLogin) {
					loginEmail.focus();
				}
				else {
					registerEmail.focus();
				}

			},
			0
		);
	}


	/*
	 * -------------------------------------------------------
	 * Dialog
	 * -------------------------------------------------------
	 */

	function openAuthDialog() {
		setAuthMode(
			"login"
		);


		if (!authDialog.open) {
			authDialog.showModal();
		}
	}


	function closeAuthDialog() {
		if (authDialog.open) {
			authDialog.close();
		}


		clearMessage();


		loginPassword.value =
			"";


		registerPassword.value =
			"";


		registerPasswordRepeat.value =
			"";
	}


	/*
	 * -------------------------------------------------------
	 * Session
	 * -------------------------------------------------------
	 */

	/**
	 * Stellt den aktuellen
	 * Authentifizierungsstatus dar.
	 *
	 * @param {object|null} session
	 */
	function renderSession(session) {
		currentSession =
			session ?? null;


		const user =
			currentSession?.user ??
			null;


		const isLoggedIn =
			Boolean(user);


		loggedOutContainer.hidden =
			isLoggedIn;


		loggedInContainer.hidden =
			!isLoggedIn;


		if (isLoggedIn) {
			accountUsername.textContent =
				user.email ??
				getUiText(
					"user"
				);
		}
		else {
			accountUsername.textContent =
				getUiText(
					"user"
				);
		}
	}


	/*
	 * -------------------------------------------------------
	 * Login
	 * -------------------------------------------------------
	 */

	async function handleLogin(event) {
		event.preventDefault();


		clearMessage();


		setFormBusy(
			loginForm,
			true
		);


		try {

			await authService.signIn(
				loginEmail.value,
				loginPassword.value
			);


			loginForm.reset();


			closeAuthDialog();

		}
		catch (error) {

			console.error(
				"[Auth] Login fehlgeschlagen:",
				error
			);


			showMessage(
				authService.getErrorMessage(
					error
				),
				"error"
			);

		}
		finally {

			setFormBusy(
				loginForm,
				false
			);

		}
	}


	/*
	 * -------------------------------------------------------
	 * Registrierung
	 * -------------------------------------------------------
	 */

	async function handleRegistration(
		event
	) {
		event.preventDefault();


		clearMessage();


		const password =
			registerPassword.value;


		const passwordRepeat =
			registerPasswordRepeat.value;


		if (
			password !==
			passwordRepeat
		) {

			showUiMessage(
				"passwordMismatch",
				"error"
			);


			return;
		}


		setFormBusy(
			registerForm,
			true
		);


		try {

			const data =
				await authService.signUp(
					registerEmail.value,
					password
				);


			/*
			 * Wenn E-Mail-Bestätigung deaktiviert ist,
			 * liefert Supabase direkt eine Session.
			 */
			if (data.session) {

				registerForm.reset();


				closeAuthDialog();


				return;
			}


			/*
			 * Standardfall bei aktivierter
			 * E-Mail-Bestätigung.
			 */
			registerForm.reset();


			showUiMessage(
				"accountCreated",
				"success"
			);

		}
		catch (error) {

			console.error(
				"[Auth] Registrierung fehlgeschlagen:",
				error
			);


			showMessage(
				authService.getErrorMessage(
					error
				),
				"error"
			);

		}
		finally {

			setFormBusy(
				registerForm,
				false
			);

		}
	}


	/*
	 * -------------------------------------------------------
	 * Logout
	 * -------------------------------------------------------
	 */

	async function handleLogout() {

		logoutButton.disabled =
			true;


		try {

			await authService.signOut();

		}
		catch (error) {

			console.error(
				"[Auth] Logout fehlgeschlagen:",
				error
			);


			window.alert(
				getUiText(
					"logoutFailed"
				)
			);

		}
		finally {

			logoutButton.disabled =
				false;

		}
	}


	/*
	 * -------------------------------------------------------
	 * Auth Events
	 * -------------------------------------------------------
	 */

	function handleAuthStateChange(
		event,
		session
	) {
		console.info(
			`[Auth] Status geändert: ${event}`
		);


		renderSession(
			session
		);


		if (
			event ===
			"SIGNED_IN"
		) {
			console.info(
				"[Auth] Benutzer angemeldet:",
				session?.user?.email
			);
		}


		if (
			event ===
			"SIGNED_OUT"
		) {
			console.info(
				"[Auth] Benutzer abgemeldet."
			);
		}


		/*
		 * Andere Anwendungsteile über einen echten
		 * Benutzerwechsel informieren.
		 */
		if (
			event === "SIGNED_IN" ||
			event === "SIGNED_OUT"
		) {
			window.setTimeout(
				() => {

					window.dispatchEvent(
						new CustomEvent(
							"auth-session-changed",
							{
								detail: {
									event,
									session
								}
							}
						)
					);

				},
				0
			);
		}
	}


	/*
	 * -------------------------------------------------------
	 * Sprachwechsel
	 * -------------------------------------------------------
	 */

	function handleLanguageChange() {
		updateAuthUiText();
	}


	/*
	 * -------------------------------------------------------
	 * Event Listener
	 * -------------------------------------------------------
	 */

	function registerEventListeners() {

		loginButton.addEventListener(
			"click",
			openAuthDialog
		);


		authCloseButton.addEventListener(
			"click",
			closeAuthDialog
		);


		loginForm.addEventListener(
			"submit",
			handleLogin
		);


		registerForm.addEventListener(
			"submit",
			handleRegistration
		);


		logoutButton.addEventListener(
			"click",
			handleLogout
		);


		authTabs.forEach(
			(tab) => {

				tab.addEventListener(
					"click",
					() => {

						setAuthMode(
							tab.dataset.authMode
						);

					}
				);

			}
		);


		/*
		 * Klick auf den abgedunkelten Hintergrund
		 * schließt den Dialog.
		 */
		authDialog.addEventListener(
			"click",
			(event) => {

				if (
					event.target ===
					authDialog
				) {
					closeAuthDialog();
				}

			}
		);


		/*
		 * Sprachwechsel beobachten.
		 */
		window.addEventListener(
			LANGUAGE_CHANGE_EVENT,
			handleLanguageChange
		);
	}


	/*
	 * -------------------------------------------------------
	 * Initialisierung
	 * -------------------------------------------------------
	 */

	async function initialize() {

		try {

			validateDependencies();


			registerEventListeners();


			/*
			 * Texte bereits vor dem ersten Öffnen
			 * des Dialogs auf die aktuelle Sprache
			 * setzen.
			 */
			updateAuthUiText();


			/*
			 * Bereits gespeicherte Session nach Reload
			 * wiederherstellen.
			 */
			const session =
				await authService.getSession();


			renderSession(
				session
			);


			/*
			 * Ab jetzt auf alle Änderungen reagieren.
			 */
			authService.onAuthStateChange(
				handleAuthStateChange
			);


			console.info(
				"[Auth] Authentifizierung initialisiert."
			);

		}
		catch (error) {

			console.error(
				"[Auth] Initialisierung fehlgeschlagen:",
				error
			);

		}
	}


	initialize();

})();
