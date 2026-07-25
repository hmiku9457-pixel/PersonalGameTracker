/* =========================================================
   Personal Game Tracker
   Supabase Client
   ========================================================= */

(function initializeSupabaseClient() {
	const SUPABASE_URL = "https://hvxlczxpqteydbdibugt.supabase.co";
	const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vQGunLNzPL5i0XUvKGevxg_orpi40lE";


	/**
	 * Prüft die grundlegende Supabase-Konfiguration.
	 */
	function validateConfig() {
		if (
			typeof SUPABASE_URL !== "string" ||
			!SUPABASE_URL.startsWith("https://") ||
			!SUPABASE_URL.includes(".supabase.co")
		) {
			throw new Error(
				"Ungültige Supabase Project URL."
			);
		}

		if (
			typeof SUPABASE_PUBLISHABLE_KEY !== "string" ||
			!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")
		) {
			throw new Error(
				"Ungültiger Supabase Publishable Key."
			);
		}
	}


	try {
		// Konfiguration prüfen
		validateConfig();


		// Prüfen, ob die Supabase-Bibliothek geladen wurde
		if (
			!window.supabase ||
			typeof window.supabase.createClient !== "function"
		) {
			throw new Error(
				"Supabase JavaScript SDK wurde nicht geladen."
			);
		}


		// Zentralen Supabase-Client erstellen
		const client = window.supabase.createClient(
			SUPABASE_URL,
			SUPABASE_PUBLISHABLE_KEY,
			{
				auth: {
					persistSession: true,
					autoRefreshToken: true,
					detectSessionInUrl: true
				}
			}
		);


		// Für andere JavaScript-Dateien bereitstellen
		window.supabaseClient = client;


		console.info(
			"[Supabase] Client erfolgreich initialisiert."
		);
	}
	catch (error) {
		window.supabaseClient = null;

		console.error(
			"[Supabase] Initialisierung fehlgeschlagen:",
			error
		);
	}
})();
