/* =========================================================
   Personal Game Tracker
   Supabase Connection Test
   ========================================================= */


/**
 * Testet die Verbindung zwischen Browser und Supabase.
 *
 * Da anonyme Benutzer absichtlich keine SELECT-Berechtigung
 * für user_progress besitzen, erwarten wir vor dem Login
 * einen PostgreSQL-Fehler 42501.
 */
async function testSupabaseConnection() {
	console.group("[Supabase-Test]");


	try {
		const client = window.supabaseClient;


		// Prüfen, ob der Client überhaupt vorhanden ist
		if (!client) {
			console.error(
				"Supabase Client ist nicht verfügbar."
			);

			return false;
		}


		console.info(
			"Supabase Client vorhanden."
		);


		// Testabfrage
		const { data, error } = await client
			.from("user_progress")
			.select("item_id")
			.limit(1);


		/*
		 * Erwarteter Fall:
		 *
		 * anon besitzt keine SELECT-Berechtigung.
		 * PostgreSQL antwortet deshalb mit 42501.
		 */
		if (error) {
			if (error.code === "42501") {
				console.info(
					"Verbindung zu Supabase erfolgreich."
				);

				console.info(
					"Anonymer Zugriff auf user_progress " +
					"wurde korrekt blockiert."
				);

				console.debug(
					"Erwartete Supabase-Antwort:",
					error
				);

				return true;
			}


			/*
			 * Ein anderer Fehler bedeutet:
			 * Verbindung oder Konfiguration prüfen.
			 */
			console.error(
				"Unerwarteter Supabase-Fehler:",
				error
			);

			return false;
		}


		/*
		 * Kein Fehler bedeutet:
		 * Der Request hat Supabase erfolgreich erreicht,
		 * anon besitzt aber offenbar SELECT-Rechte.
		 */
		console.warn(
			"Verbindung erfolgreich, aber der anonyme " +
			"SELECT wurde nicht auf Tabellenebene blockiert."
		);

		console.warn(
			"Das entspricht nicht unserer vorgesehenen " +
			"Phase-1-Konfiguration."
		);

		console.debug(
			"Antwort:",
			data
		);

		return true;
	}
	catch (error) {
		console.error(
			"Verbindungstest konnte nicht ausgeführt werden:",
			error
		);

		return false;
	}
	finally {
		console.groupEnd();
	}
}


/*
 * Test automatisch starten.
 */
testSupabaseConnection();
