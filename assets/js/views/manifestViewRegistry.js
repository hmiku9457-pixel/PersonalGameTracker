/* =========================================================
   Personal Game Tracker
   Manifest View Registry
   ========================================================= */

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
 * Der Router kennt dadurch keine konkreten Comms-Pfade mehr.
 *
 * @param {object} context
 * @returns {Promise<boolean>}
 */
export async function tryRenderManifestView(
    context
) {
    const rendererName =
        context?.resolvedRoute?.entry?.renderer ??
        context?.resolvedRoute?.manifest?.renderer;

    if (
        typeof rendererName !== "string" ||
        !rendererLoaders.has(rendererName)
    ) {
        return false;
    }

    const loadRenderer =
        rendererLoaders.get(
            rendererName
        );

    const renderer =
        await loadRenderer();

    await renderer(context);

    return true;
}
