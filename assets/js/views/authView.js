/* =========================================================
   Personal Game Tracker
   Auth View
   ========================================================= */

import {
    getCurrentLanguage,
    LANGUAGE_CHANGE_EVENT
} from "../services/languageService.js";


const UI_TEXT = {
    de: {
        login: "Anmelden",
        register: "Registrieren",
        email: "E-Mail-Adresse",
        password: "Passwort",
        passwordRepeat: "Passwort wiederholen",
        createAccount: "Account erstellen",
        logout: "Abmelden",
        user: "Benutzer",
        close: "Anmeldung schließen",
        passwordMismatch:
            "Die Passwörter stimmen nicht überein.",
        accountCreated:
            "Account erstellt. Bitte bestätige gegebenenfalls noch deine E-Mail-Adresse.",
        logoutFailed:
            "Abmelden fehlgeschlagen."
    },

    en: {
        login: "Sign in",
        register: "Register",
        email: "Email address",
        password: "Password",
        passwordRepeat: "Repeat password",
        createAccount: "Create account",
        logout: "Sign out",
        user: "User",
        close: "Close sign-in dialog",
        passwordMismatch:
            "The passwords do not match.",
        accountCreated:
            "Account created. Please confirm your email address if required.",
        logoutFailed:
            "Sign out failed."
    }
};


let currentSession =
    null;

let currentAuthMode =
    "login";


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


const loggedOutContainer =
    document.getElementById(
        "account-logged-out"
    );

const loggedInContainer =
    document.getElementById(
        "account-logged-in"
    );

const loginButton =
    document.getElementById(
        "login-button"
    );

const logoutButton =
    document.getElementById(
        "logout-button"
    );

const accountUsername =
    document.getElementById(
        "account-username"
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

const authTabs =
    Array.from(
        document.querySelectorAll(
            ".auth-tab"
        )
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


function validateDependencies() {
    const missing = [];

    const requiredElements = {
        loggedOutContainer,
        loggedInContainer,
        loginButton,
        logoutButton,
        accountUsername,
        authDialog,
        authDialogTitle,
        authCloseButton,
        loginForm,
        registerForm,
        loginEmail,
        loginPassword,
        registerEmail,
        registerPassword,
        registerPasswordRepeat,
        authMessage
    };

    for (
        const [
            name,
            element
        ]
        of Object.entries(
            requiredElements
        )
    ) {
        if (!element) {
            missing.push(
                name
            );
        }
    }

    if (
        authTabs.length !==
        2
    ) {
        missing.push(
            "authTabs"
        );
    }

    if (
        !window.authService
    ) {
        missing.push(
            "authService"
        );
    }

    if (
        missing.length >
        0
    ) {
        throw new Error(
            "Auth-Abhängigkeiten fehlen: " +
            missing.join(", ")
        );
    }
}


function clearMessage() {
    authMessage.hidden =
        true;

    authMessage.textContent =
        "";

    authMessage.removeAttribute(
        "data-type"
    );

    delete authMessage.dataset
        .messageKey;
}


function showMessage(
    text,
    type = "info"
) {
    authMessage.textContent =
        text;

    authMessage.dataset.type =
        type;

    authMessage.hidden =
        false;
}


function showUiMessage(
    key,
    type = "info"
) {
    authMessage.dataset.messageKey =
        key;

    showMessage(
        getUiText(
            key
        ),
        type
    );
}


function setFormBusy(
    form,
    busy
) {
    for (
        const element
        of form.elements
    ) {
        element.disabled =
            busy;
    }
}


function setAuthMode(
    mode
) {
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
            ? getUiText(
                "login"
            )
            : getUiText(
                "register"
            );

    for (
        const tab
        of authTabs
    ) {
        const active =
            tab.dataset.authMode ===
            currentAuthMode;

        tab.classList.toggle(
            "active",
            active
        );
    }
}


function openAuthDialog() {
    setAuthMode(
        "login"
    );

    if (
        !authDialog.open
    ) {
        authDialog.showModal();
    }

    window.setTimeout(
        () => {
            loginEmail.focus();
        },
        0
    );
}


function closeAuthDialog() {
    if (
        authDialog.open
    ) {
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


function renderSession(
    session
) {
    currentSession =
        session ?? null;

    const user =
        currentSession?.user ??
        null;

    const isLoggedIn =
        Boolean(
            user
        );

    loggedOutContainer.hidden =
        isLoggedIn;

    loggedInContainer.hidden =
        !isLoggedIn;

    accountUsername.textContent =
        isLoggedIn
            ? (
                user.email ??
                getUiText(
                    "user"
                )
            )
            : getUiText(
                "user"
            );
}


function updateAuthUiText() {
    loginButton.textContent =
        getUiText(
            "login"
        );

    logoutButton.textContent =
        getUiText(
            "logout"
        );

    authCloseButton.setAttribute(
        "aria-label",
        getUiText(
            "close"
        )
    );

    for (
        const tab
        of authTabs
    ) {
        tab.textContent =
            getUiText(
                tab.dataset.authMode ===
                "register"
                    ? "register"
                    : "login"
            );
    }

    const loginLabels =
        loginForm.querySelectorAll(
            "label"
        );

    if (
        loginLabels[0]
    ) {
        loginLabels[0].textContent =
            getUiText(
                "email"
            );
    }

    if (
        loginLabels[1]
    ) {
        loginLabels[1].textContent =
            getUiText(
                "password"
            );
    }

    const registerLabels =
        registerForm.querySelectorAll(
            "label"
        );

    if (
        registerLabels[0]
    ) {
        registerLabels[0].textContent =
            getUiText(
                "email"
            );
    }

    if (
        registerLabels[1]
    ) {
        registerLabels[1].textContent =
            getUiText(
                "password"
            );
    }

    if (
        registerLabels[2]
    ) {
        registerLabels[2].textContent =
            getUiText(
                "passwordRepeat"
            );
    }

    const loginSubmit =
        loginForm.querySelector(
            '.auth-submit-button'
        );

    if (
        loginSubmit
    ) {
        loginSubmit.textContent =
            getUiText(
                "login"
            );
    }

    const registerSubmit =
        registerForm.querySelector(
            '.auth-submit-button'
        );

    if (
        registerSubmit
    ) {
        registerSubmit.textContent =
            getUiText(
                "createAccount"
            );
    }

    setAuthMode(
        currentAuthMode
    );

    renderSession(
        currentSession
    );
}


async function handleLogin(
    event
) {
    event.preventDefault();

    clearMessage();

    setFormBusy(
        loginForm,
        true
    );

    try {
        await window.authService.signIn(
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
            window.authService
                .getErrorMessage(
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


async function handleRegistration(
    event
) {
    event.preventDefault();

    clearMessage();

    const password =
        registerPassword.value;

    if (
        password !==
        registerPasswordRepeat.value
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
            await window.authService.signUp(
                registerEmail.value,
                password
            );

        registerForm.reset();

        if (
            data.session
        ) {
            closeAuthDialog();
            return;
        }

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
            window.authService
                .getErrorMessage(
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


async function handleLogout() {
    logoutButton.disabled =
        true;

    try {
        await window.authService
            .signOut();
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


function handleAuthStateChange(
    event,
    session
) {
    renderSession(
        session
    );

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


function registerEventListeners() {
    loginButton.addEventListener(
        "click",
        openAuthDialog
    );

    logoutButton.addEventListener(
        "click",
        handleLogout
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

    for (
        const tab
        of authTabs
    ) {
        tab.addEventListener(
            "click",
            () => {
                setAuthMode(
                    tab.dataset.authMode
                );
            }
        );
    }

    authDialog.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                authDialog
            ) {
                closeAuthDialog();
            }
        }
    );

    window.addEventListener(
        LANGUAGE_CHANGE_EVENT,
        updateAuthUiText
    );
}


async function initialize() {
    try {
        validateDependencies();

        registerEventListeners();

        updateAuthUiText();

        const session =
            await window.authService
                .getSession();

        renderSession(
            session
        );

        window.authService
            .onAuthStateChange(
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
