import {
	loadGames
} from "../services/dataService.js";


/**
 * Gibt den Container der Spiele-Navigation zurück.
 *
 * @returns {HTMLElement|null}
 */
function getGameNavigation() {
	return document.getElementById(
		"game-navigation"
	);
}


/**
 * Erstellt die Spiele-Navigation.
 */
export async function loadGameNavigation() {
	const gameNavigation =
		getGameNavigation();


	if (!gameNavigation) {
		console.warn(
			"Element #game-navigation wurde nicht gefunden."
		);

		return;
	}


	try {
		const games =
			await loadGames();


		gameNavigation.replaceChildren();


		for (const game of games) {
			const listItem =
				document.createElement(
					"li"
				);


			const link =
				document.createElement(
					"a"
				);


			link.href =
				`#game/${encodeURIComponent(game.id)}`;


			link.textContent =
				game.name;


			link.dataset.gameId =
				game.id;


			listItem.append(link);

			gameNavigation.append(
				listItem
			);
		}


		updateActiveGameNavigation(
			null
		);

	} catch (error) {
		console.error(error);


		gameNavigation.replaceChildren();


		const listItem =
			document.createElement(
				"li"
			);


		listItem.textContent =
			"Spiele konnten nicht geladen werden.";


		gameNavigation.append(
			listItem
		);
	}
}


/**
 * Markiert das aktuell ausgewählte Spiel
 * in der Navigation.
 *
 * @param {string|null} currentGameId Aktuelle Spiel-ID
 */
export function updateActiveGameNavigation(
	currentGameId = null
) {
	const gameNavigation =
		getGameNavigation();


	if (!gameNavigation) {
		return;
	}


	const links =
		gameNavigation.querySelectorAll(
			"[data-game-id]"
		);


	for (const link of links) {
		const isActive =
			link.dataset.gameId ===
			currentGameId;


		link.classList.toggle(
			"is-active",
			isActive
		);


		if (isActive) {
			link.setAttribute(
				"aria-current",
				"page"
			);

		} else {
			link.removeAttribute(
				"aria-current"
			);
		}
	}
}
