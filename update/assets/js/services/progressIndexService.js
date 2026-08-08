/* =========================================================
   Personal Game Tracker
   Progress Index Service
   ========================================================= */

import {
    getDataPath,
    loadJson
} from "./dataService.js";

/**
 * Lädt den statisch erzeugten Item-ID-Index eines Spiels.
 *
 * @param {string} gameId
 * @returns {Promise<object>}
 */
export async function loadProgressIndex(gameId) {
    return loadJson(
        getDataPath(
            gameId,
            "progressIndex.json"
        )
    );
}

/**
 * Gibt alle Item-IDs einer Kategoriedatei zurück.
 *
 * @param {string} gameId
 * @param {string} categoryFile
 * @returns {Promise<Array<string>|null>}
 */
export async function getProgressItemIds(
    gameId,
    categoryFile
) {
    if (
        typeof categoryFile !== "string" ||
        categoryFile.trim() === ""
    ) {
        return null;
    }

    const index =
        await loadProgressIndex(gameId);

    const normalizedFile =
        categoryFile
            .replaceAll("\\", "/")
            .replace(/^\/+/, "");

    const itemIds =
        index?.files?.[normalizedFile];

    return Array.isArray(itemIds)
        ? itemIds
        : null;
}
