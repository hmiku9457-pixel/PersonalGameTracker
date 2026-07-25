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


	mainContent.innerHTML = `
		<div class="loading">
			<p>Inhalt wird geladen ...</p>
		</div>
	`;
}


/**
 * Zeigt eine Fehlermeldung an.
 *
 * @param {string} message Fehlermeldung
 */
export function showError(
	message =
		"Der Inhalt konnte nicht geladen werden."
) {
	const mainContent =
		getMainContent();


	if (!mainContent) {
		console.warn(
			"Element #main-content wurde nicht gefunden."
		);

		return;
	}


	mainContent.innerHTML = `
		<section class="error-message">
			<h2>Fehler</h2>
			<p>${message}</p>
		</section>
	`;
}
