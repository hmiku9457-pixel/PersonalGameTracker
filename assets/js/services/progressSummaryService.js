/* =========================================================
   Personal Game Tracker
   Progress Summary Service
   ========================================================= */

import {
    loadManifest,
    resolveRelativeFile
} from "./dataService.js";

import {
    getCompletedCountForCategory
} from "./progressService.js";

import {
    getProgressItemIds
} from "./progressIndexService.js";

/**
 * Berechnet den Fortschritt eines Manifest-Eintrags aus Manifest-Metadaten
 * und einem statischen Item-ID-Index. Dadurch müssen die großen
 * Kategorie-JSONs nicht geladen werden, während historische category_id-
 * Werte in Supabase die Anzeige nicht mehr verfälschen.
 *
 * @param {string} gameId
 * @param {object} entry
 * @param {string} parentManifestFile
 * @param {object|null} progressData
 * @returns {Promise<{completed:number,total:number}>}
 */
export async function calculateManifestEntryProgress(
    gameId,
    entry,
    parentManifestFile,
    progressData
) {
    if (!entry || typeof entry !== "object") {
        return emptyProgress();
    }

    const resolvedFile =
        resolveRelativeFile(
            parentManifestFile,
            entry.file
        );

    if (entry.type === "manifest") {
        const manifest =
            await loadManifest(
                gameId,
                resolvedFile
            );

        return calculateManifestProgressFromMetadata(
            gameId,
            manifest,
            resolvedFile,
            progressData
        );
    }

    const declaredTotal =
        normalizeCount(entry.itemCount);

    const indexedItemIds =
        await getProgressItemIds(
            gameId,
            resolvedFile
        );

    if (indexedItemIds) {
        const total =
            declaredTotal ??
            indexedItemIds.length;

        const completed =
            Math.min(
                total,
                countCompletedItemIds(
                    progressData,
                    indexedItemIds
                )
            );

        return {
            completed,
            total
        };
    }

    /*
     * Rückwärtskompatibler Fallback für Spiele ohne Index.
     */
    const total =
        declaredTotal ?? 0;

    const completed =
        Math.min(
            total,
            getCompletedCountForCategory(
                progressData,
                entry.id
            )
        );

    return {
        completed,
        total
    };
}

/**
 * Berechnet den Fortschritt eines vollständigen Manifests rekursiv.
 * Es werden nur kleine Manifest- und Indexdateien geladen.
 *
 * @param {string} gameId
 * @param {object} manifest
 * @param {string} manifestFile
 * @param {object|null} progressData
 * @returns {Promise<{completed:number,total:number}>}
 */
export async function calculateManifestProgressFromMetadata(
    gameId,
    manifest,
    manifestFile,
    progressData
) {
    const categories =
        Array.isArray(manifest?.categories)
            ? manifest.categories
            : [];

    const results =
        await Promise.all(
            categories.map(entry =>
                calculateManifestEntryProgress(
                    gameId,
                    entry,
                    manifestFile,
                    progressData
                )
            )
        );

    return results.reduce(
        (summary, progress) => ({
            completed:
                summary.completed +
                progress.completed,
            total:
                summary.total +
                progress.total
        }),
        emptyProgress()
    );
}

function countCompletedItemIds(
    progressData,
    itemIds
) {
    if (!progressData?.progress) {
        return 0;
    }

    let completed = 0;

    for (const itemId of itemIds) {
        if (progressData.progress[itemId]) {
            completed++;
        }
    }

    return completed;
}

function normalizeCount(value) {
    const count = Number(value);

    return Number.isInteger(count) &&
        count >= 0
            ? count
            : null;
}

function emptyProgress() {
    return {
        completed: 0,
        total: 0
    };
}
