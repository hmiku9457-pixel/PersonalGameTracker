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
 * Prüft eine ID.
 *
 * @param {string} value
 * @param {string} name
 */
function validateId(value, name) {
	if (
		typeof value !== "string" ||
		value.trim() === ""
	) {
		throw new Error(
			`Ungültige ${name}.`
		);
	}
}


/**
 * Gibt den aktuell angemeldeten Benutzer zurück.
 *
 * @returns {Promise<object>}
 */
async function getAuthenticatedUser() {
	const client = getClient();

	const {
		data,
		error
	} = await client.auth.getSession();


	if (error) {
		throw error;
	}


	const user =
		data?.session?.user ?? null;


	if (!user) {
		const authError =
			new Error(
				"Für diese Aktion ist eine Anmeldung erforderlich."
			);

		authError.code = "AUTH_REQUIRED";

		throw authError;
	}


	return user;
}


/**
 * Lädt alle Fortschrittsdatensätze eines Spiels
 * für den aktuell angemeldeten Benutzer.
 *
 * @param {string} gameId
 * @returns {Promise<{
 *     authenticated: boolean,
 *     rows: Array<object>
 * }>}
 */
export async function fetchGameProgressRows(gameId) {
	validateId(gameId, "gameId");

	const client = getClient();


	const {
		data: sessionData,
		error: sessionError
	} = await client.auth.getSession();


	if (sessionError) {
		throw sessionError;
	}


	const session =
		sessionData?.session ?? null;


	if (!session?.user) {
		return {
			authenticated: false,
			rows: []
		};
	}


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


/**
 * Markiert ein Item als abgeschlossen.
 *
 * @param {string} gameId
 * @param {string} categoryId
 * @param {string} itemId
 */
export async function insertProgressRow(
	gameId,
	categoryId,
	itemId
) {
	validateId(gameId, "gameId");
	validateId(categoryId, "categoryId");
	validateId(itemId, "itemId");


	const client = getClient();
	const user = await getAuthenticatedUser();


	const {
		error
	} = await client
		.from("user_progress")
		.insert({
			user_id: user.id,
			game_id: gameId,
			category_id: categoryId,
			item_id: itemId
		});


	if (error) {

		/*
		 * 23505 = Unique Violation.
		 *
		 * Unser zusammengesetzter Primärschlüssel
		 * verhindert doppelte Einträge.
		 *
		 * Ist der Datensatz bereits vorhanden,
		 * betrachten wir den gewünschten Zustand
		 * bereits als erreicht.
		 */
		if (error.code === "23505") {
			return;
		}


		throw error;
	}
}


/**
 * Entfernt die Markierung eines Items.
 *
 * @param {string} gameId
 * @param {string} categoryId
 * @param {string} itemId
 */
export async function deleteProgressRow(
	gameId,
	categoryId,
	itemId
) {
	validateId(gameId, "gameId");
	validateId(categoryId, "categoryId");
	validateId(itemId, "itemId");


	const client = getClient();
	const user = await getAuthenticatedUser();


	const {
		error
	} = await client
		.from("user_progress")
		.delete()
		.eq(
			"user_id",
			user.id
		)
		.eq(
			"game_id",
			gameId
		)
		.eq(
			"category_id",
			categoryId
		)
		.eq(
			"item_id",
			itemId
		);


	if (error) {
		throw error;
	}
}
