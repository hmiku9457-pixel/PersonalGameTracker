/* =========================================================
   Personal Game Tracker
   Supabase Progress Repository
   ========================================================= */

const PAGE_SIZE = 500;


/**
 * Gibt den zentralen Supabase Client zurück.
 *
 * @returns {object}
 */
function getClient() {
	const client = window.supabaseClient;

	if (!client) {
		throw new Error(
			"Supabase Client ist nicht verfügbar."
		);
	}

	return client;
}


/**
 * Prüft eine gameId.
 *
 * @param {string} gameId
 */
function validateGameId(gameId) {
	if (
		typeof gameId !== "string" ||
		gameId.trim() === ""
	) {
		throw new Error(
			"Ungültige gameId."
		);
	}
}


/**
 * Lädt alle Fortschrittsdatensätze eines Spiels
 * für den aktuell angemeldeten Benutzer.
 *
 * Die RLS-Regeln in Supabase stellen sicher,
 * dass ausschließlich Datensätze des aktuellen
 * Benutzers zurückgegeben werden.
 *
 * @param {string} gameId
 * @returns {Promise<{
 *     authenticated: boolean,
 *     rows: Array<object>
 * }>}
 */
export async function fetchGameProgressRows(gameId) {
	validateGameId(gameId);

	const client = getClient();


	/*
	 * -------------------------------------------------------
	 * Session prüfen
	 * -------------------------------------------------------
	 */

	const {
		data: sessionData,
		error: sessionError
	} = await client.auth.getSession();


	if (sessionError) {
		throw sessionError;
	}


	const session =
		sessionData?.session ?? null;


	/*
	 * Nicht angemeldete Benutzer besitzen keinen
	 * persönlichen Fortschritt.
	 *
	 * Wir führen deshalb gar keine Tabellenabfrage aus.
	 */
	if (!session?.user) {
		return {
			authenticated: false,
			rows: []
		};
	}


	/*
	 * -------------------------------------------------------
	 * Fortschritt laden
	 * -------------------------------------------------------
	 */

	const rows = [];

	let from = 0;


	while (true) {

		const to =
			from + PAGE_SIZE - 1;


		const {
			data,
			error
		} = await client
			.from("user_progress")
			.select(
				"game_id, category_id, item_id, created_at"
			)
			.eq(
				"game_id",
				gameId
			)
			.order(
				"category_id",
				{
					ascending: true
				}
			)
			.order(
				"item_id",
				{
					ascending: true
				}
			)
			.range(
				from,
				to
			);


		if (error) {
			throw error;
		}


		const page =
			Array.isArray(data)
				? data
				: [];


		rows.push(...page);


		/*
		 * Weniger als PAGE_SIZE Datensätze bedeutet,
		 * dass wir die letzte Seite erreicht haben.
		 */
		if (page.length < PAGE_SIZE) {
			break;
		}


		from += PAGE_SIZE;
	}


	return {
		authenticated: true,
		rows
	};
}
