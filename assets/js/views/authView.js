/* =========================================================
   Personal Game Tracker
   Auth View
   ========================================================= */

(function initializeAuthView() {

	const authService = window.authService;


	/*
	 * -------------------------------------------------------
	 * DOM-Elemente
	 * -------------------------------------------------------
	 */

	const loggedOutContainer =
		document.getElementById("account-logged-out");

	const loggedInContainer =
		document.getElementById("account-logged-in");

	const accountUsername =
		document.getElementById("account-username");

	const loginButton =
		document.getElementById("login-button");

	const logoutButton =
		document.getElementById("logout-button");


	const authDialog =
		document.getElementById("auth-dialog");

	const authDialogTitle =
		document.getElementById("auth-dialog-title");

	const authCloseButton =
		document.getElementById("auth-close-button");


	const loginForm =
		document.getElementById("login-form");

	const registerForm =
		document.getElementById("register-form");


	const loginEmail =
		document.getElementById("login-email");

	const loginPassword =
		document.getElementById("login-password");


	const registerEmail =
		document.getElementById("register-email");

	const registerPassword =
		document.getElementById("register-password");

	const registerPasswordRepeat =
		document.getElementById(
			"register-password-repeat"
		);


	const authMessage =
		document.getElementById("auth-message");


	const authTabs =
		document.querySelectorAll("[data-auth-mode]");


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
			!loginForm ||
			!registerForm
		) {
			throw new Error(
				"Benötigte Auth-Elemente fehlen im DOM."
			);
		}
	}


	/**
	 * Zeigt eine Meldung im Auth-Dialog.
	 *
	 * @param {string} message
	 * @param {"info"|"success"|"error"} type
	 */
	function showMessage(
		message,
		type = "info"
	) {
		authMessage.textContent = message;

		authMessage.dataset.type = type;
		authMessage.hidden = false;
	}


	function clearMessage() {
		authMessage.textContent = "";
		authMessage.removeAttribute("data-type");
		authMessage.hidden = true;
	}


	/**
	 * Aktiviert bzw. deaktiviert ein Formular.
	 *
	 * @param {HTMLFormElement} form
	 * @param {boolean} busy
	 */
	function setFormBusy(form, busy) {
		const elements =
			form.querySelectorAll(
				"input, button"
			);

		elements.forEach((element) => {
			element.disabled = busy;
		});
	}


	/*
	 * -------------------------------------------------------
	 * Login / Registrierung umschalten
	 * -------------------------------------------------------
	 */

	function setAuthMode(mode) {
		clearMessage();

		const isLogin =
			mode === "login";


		loginForm.hidden = !isLogin;
		registerForm.hidden = isLogin;


		authDialogTitle.textContent =
			isLogin
				? "Anmelden"
				: "Registrieren";


		authTabs.forEach((tab) => {

			const tabIsActive =
				tab.dataset.authMode === mode;

			tab.classList.toggle(
				"active",
				tabIsActive
			);

			tab.setAttribute(
				"aria-selected",
				String(tabIsActive)
			);
		});


		window.setTimeout(() => {

			if (isLogin) {
				loginEmail.focus();
			}
			else {
				registerEmail.focus();
			}

		}, 0);
	}


	/*
	 * -------------------------------------------------------
	 * Dialog
	 * -------------------------------------------------------
	 */

	function openAuthDialog() {
		setAuthMode("login");

		if (!authDialog.open) {
			authDialog.showModal();
		}
	}


	function closeAuthDialog() {
		if (authDialog.open) {
			authDialog.close();
		}

		clearMessage();

		loginPassword.value = "";
		registerPassword.value = "";
		registerPasswordRepeat.value = "";
	}


	/**
	 * Stellt den aktuellen Authentifizierungsstatus dar.
	 *
	 * @param {object|null} session
	 */
	function renderSession(session) {
		const user = session?.user ?? null;
	
		const isLoggedIn = Boolean(user);
	
	
		loggedOutContainer.hidden = isLoggedIn;
		loggedInContainer.hidden = !isLoggedIn;
	
	
		if (isLoggedIn) {
			accountUsername.textContent =
				user.email ?? "Benutzer";
		}
		else {
			accountUsername.textContent =
				"Benutzer";
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
		setFormBusy(loginForm, true);


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
				authService.getErrorMessage(error),
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

	async function handleRegistration(event) {
		event.preventDefault();

		clearMessage();


		const password =
			registerPassword.value;

		const passwordRepeat =
			registerPasswordRepeat.value;


		if (password !== passwordRepeat) {

			showMessage(
				"Die eingegebenen Passwörter stimmen nicht überein.",
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

			showMessage(
				"Account erstellt. Bitte bestätige deine E-Mail-Adresse über den zugesendeten Link.",
				"success"
			);
		}
		catch (error) {

			console.error(
				"[Auth] Registrierung fehlgeschlagen:",
				error
			);

			showMessage(
				authService.getErrorMessage(error),
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

		logoutButton.disabled = true;


		try {

			await authService.signOut();
		}
		catch (error) {

			console.error(
				"[Auth] Logout fehlgeschlagen:",
				error
			);

			window.alert(
				"Die Abmeldung konnte nicht durchgeführt werden."
			);
		}
		finally {

			logoutButton.disabled = false;
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


		renderSession(session);


		if (event === "SIGNED_IN") {

			console.info(
				"[Auth] Benutzer angemeldet:",
				session?.user?.email
			);
		}


		if (event === "SIGNED_OUT") {

			console.info(
				"[Auth] Benutzer abgemeldet."
			);
		}
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


		authTabs.forEach((tab) => {

			tab.addEventListener(
				"click",
				() => {

					setAuthMode(
						tab.dataset.authMode
					);
				}
			);

		});


		/*
		 * Klick auf den abgedunkelten Hintergrund
		 * schließt den Dialog.
		 */
		authDialog.addEventListener(
			"click",
			(event) => {

				if (event.target === authDialog) {
					closeAuthDialog();
				}
			}
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
			 * Bereits gespeicherte Session nach Reload
			 * wiederherstellen.
			 */
			const session =
				await authService.getSession();

			renderSession(session);


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
