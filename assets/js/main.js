const mainContent = document.getElementById("main-content");
const navigationLinks = document.querySelectorAll("[data-page]");

// Standardinhalt der Startseite speichern
const defaultContent = mainContent.innerHTML;


/**
 * Lädt eine HTML-Datei in den Main-Bereich.
 *
 * @param {string} pagePath Pfad zur HTML-Datei
 */
async function loadPage(pagePath) {
	try {
		const response = await fetch(pagePath);

		if (!response.ok) {
			throw new Error(
				`Seite konnte nicht geladen werden: ${response.status}`
			);
		}

		const html = await response.text();

		// HTML-Datei auswerten
		const parser = new DOMParser();
		const documentContent = parser.parseFromString(html, "text/html");

		// Main-Bereich der geladenen Seite suchen
		const loadedMain = documentContent.querySelector("main");

		if (loadedMain) {
			mainContent.innerHTML = loadedMain.innerHTML;
		} else {
			mainContent.innerHTML = html;
		}

	} catch (error) {
		console.error(error);

		mainContent.innerHTML = `
			<h2>Fehler</h2>
			<p>Die Seite konnte nicht geladen werden.</p>
		`;
	}
}


/**
 * Prüft die URL und lädt die entsprechende Seite.
 */
function loadPageFromHash() {
	const pagePath = decodeURIComponent(
		window.location.hash.substring(1)
	);

	if (!pagePath) {
		mainContent.innerHTML = defaultContent;
		return;
	}

	loadPage(pagePath);
}


// Navigation abfangen
navigationLinks.forEach(link => {
	link.addEventListener("click", event => {
		event.preventDefault();

		const pagePath = link.dataset.page;

		window.location.hash = pagePath;
	});
});


// Auf Änderungen der URL reagieren
window.addEventListener("hashchange", loadPageFromHash);


// Beim ersten Laden prüfen,
// ob bereits eine Seite in der URL steht
loadPageFromHash();
