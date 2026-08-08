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

/**
 * Berechnet den Fortschritt eines Manifest-Eintrags ausschließlich
 * aus Manifest-Metadaten und dem Kategorieindex des Fortschritts.
 * Vollständige Item-JSON-Dateien werden dafür nicht geladen.
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

    if (entry.type === "manifest") {
        const manifestFile =
            resolveRelativeFile(
                parentManifestFile,
                entry.file
            );

        const manifest =
            await loadManifest(
                gameId,
                manifestFile
            );

        return calculateManifestProgressFromMetadata(
            gameId,
            manifest,
            manifestFile,
            progressData
        );
    }

    const total =
        normalizeCount(
            entry.itemCount
        );

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
 * Es werden nur weitere Manifeste geladen.
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
        Array.isArray(
            manifest?.categories
        )
            ? manifest.categories
            : [];

    const results =
        await Promise.all(
            categories.map(
                entry =>
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

function normalizeCount(value) {
    const count =
        Number(value);

    return Number.isInteger(count) &&
        count >= 0
            ? count
            : 0;
}

function emptyProgress() {
    return {
        completed: 0,
        total: 0
    };
}
