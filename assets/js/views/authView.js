/* =========================================================
   Personal Game Tracker
   Auth View
   ========================================================= */

import {
	getCurrentLanguage,
	LANGUAGE_CHANGE_EVENT
} from "../services/languageService.js";





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
