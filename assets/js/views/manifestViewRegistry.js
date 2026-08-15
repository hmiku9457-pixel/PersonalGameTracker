/* =========================================================
   Personal Game Tracker
   Manifest View Registry
   ========================================================= */

import {
    resolveManifestRendererConfiguration
} from "../config/manifestRendererConfig.js";

const rendererLoaders =
    new Map([
        [
            "comms",
            async () => {
                const module =
                    await import(
                        "./commsOverviewView.js"
                    );

                return module.renderConfiguredCommsView;
            }
        ]
    ]);

/**
 * Rendert eine über Manifest-Metadaten konfigurierte Spezialansicht.
 *
 * Kein Renderer:
 * generische Router-Ansicht verwenden.
 *
 * Ungültiger oder unbekannter Renderer:
 * kontrollierten Konfigurationsfehler auslösen.
 *
 * @param {object} context
 * @returns {Promise<boolean>}
 */
export async function tryRenderManifestView(
    context
) {
    const configuration =
        resolveManifestRendererConfiguration({
            entry:
                context?.resolvedRoute?.entry,
            manifest:
                context?.resolvedRoute?.manifest
        });

    if (
        configuration.issues.length >
        0
    ) {
        throw createRendererConfigurationError(
            configuration
        );
    }

    if (!configuration.configured) {
        return false;
    }

    const loadRenderer =
        rendererLoaders.get(
            configuration.rendererName
        );

    if (!loadRenderer) {
        const error =
            new Error(
                `Für Manifest-Renderer "${configuration.rendererName}" ist kein Runtime-Loader registriert.`
            );

        error.code =
            "MANIFEST_RENDERER_LOADER_MISSING";

        throw error;
    }

    const renderer =
        await loadRenderer();

    await renderer({
        ...context,
        rendererConfiguration:
            configuration
    });

    return true;
}

/**
 * @param {object} configuration
 * @returns {Error}
 */
function createRendererConfigurationError(
    configuration
) {
    const message =
        configuration.issues
            .map(
                issue =>
                    issue.message
            )
            .join(" ");

    const error =
        new Error(
            message ||
            "Ungültige Manifest-Renderer-Konfiguration."
        );

    error.code =
        "MANIFEST_RENDERER_CONFIG_INVALID";

    return error;
}
