/* =========================================================
   Personal Game Tracker
   Manifest Renderer Configuration
   ========================================================= */

/**
 * Zentrale Definition aller spezialisierten Manifest-Renderer.
 *
 * Die Konfiguration hält den Renderer-Vertrag an einer
 * gemeinsamen Stelle für die Runtime fest.
 */
export const MANIFEST_RENDERER_DEFINITIONS =
    Object.freeze({
        comms: Object.freeze({
            views: Object.freeze({
                "comms-overview":
                    Object.freeze({
                        requiredFields:
                            Object.freeze([])
                    }),

                map:
                    Object.freeze({
                        requiredFields:
                            Object.freeze([])
                    }),

                list:
                    Object.freeze({
                        requiredFields:
                            Object.freeze([
                                "dataFile"
                            ])
                    })
            })
        })
    });

const RESERVED_VIEW_RENDERERS =
    createReservedViewRendererMap();

/**
 * Löst Renderer, View und verpflichtende Felder aus einem
 * aufgelösten Manifest-Routenkontext auf.
 *
 * Prioritäten entsprechen der Runtime:
 *
 * - renderer/view: Route-Entry vor Zielmanifest
 * - View-spezifische Felder: Zielmanifest vor Route-Entry
 *
 * @param {object} context
 * @param {object|null} context.entry
 * @param {object|null} context.manifest
 * @returns {{
 *   configured: boolean,
 *   rendererName: string|null,
 *   viewName: string|null,
 *   definition: object|null,
 *   issues: Array<object>
 * }}
 */
export function resolveManifestRendererConfiguration({
    entry = null,
    manifest = null
} = {}) {
    const issues = [];

    const entryRenderer =
        readOptionalConfiguredString(
            entry,
            "renderer",
            "Route-Entry",
            issues
        );

    const manifestRenderer =
        readOptionalConfiguredString(
            manifest,
            "renderer",
            "Zielmanifest",
            issues
        );

    const entryView =
        readOptionalConfiguredString(
            entry,
            "view",
            "Route-Entry",
            issues
        );

    const manifestView =
        readOptionalConfiguredString(
            manifest,
            "view",
            "Zielmanifest",
            issues
        );

    if (
        entryRenderer &&
        manifestRenderer &&
        entryRenderer !== manifestRenderer
    ) {
        issues.push(
            createIssue(
                "RENDERER_CONFLICT",
                `Route-Entry und Zielmanifest verwenden unterschiedliche Renderer: "${entryRenderer}" / "${manifestRenderer}".`
            )
        );
    }

    if (
        entryView &&
        manifestView &&
        entryView !== manifestView
    ) {
        issues.push(
            createIssue(
                "VIEW_CONFLICT",
                `Route-Entry und Zielmanifest verwenden unterschiedliche Views: "${entryView}" / "${manifestView}".`
            )
        );
    }

    const rendererName =
        entryRenderer ??
        manifestRenderer;

    const viewName =
        entryView ??
        manifestView;

    if (!rendererName) {
        const owners =
            viewName
                ? RESERVED_VIEW_RENDERERS.get(
                    viewName
                ) ?? []
                : [];

        if (owners.length > 0) {
            issues.push(
                createIssue(
                    "RENDERER_REQUIRED",
                    `View "${viewName}" benötigt einen spezialisierten Renderer (${owners.join(", ")}).`
                )
            );
        }

        return {
            configured: false,
            rendererName: null,
            viewName: viewName ?? null,
            definition: null,
            issues
        };
    }

    const definition =
        MANIFEST_RENDERER_DEFINITIONS[
            rendererName
        ] ?? null;

    if (!definition) {
        issues.push(
            createIssue(
                "UNKNOWN_RENDERER",
                `Unbekannter Manifest-Renderer "${rendererName}".`
            )
        );

        return {
            configured: true,
            rendererName,
            viewName: viewName ?? null,
            definition: null,
            issues
        };
    }

    if (!viewName) {
        issues.push(
            createIssue(
                "VIEW_REQUIRED",
                `Renderer "${rendererName}" benötigt eine View.`
            )
        );

        return {
            configured: true,
            rendererName,
            viewName: null,
            definition,
            issues
        };
    }

    const viewDefinition =
        definition.views[
            viewName
        ] ?? null;

    if (!viewDefinition) {
        issues.push(
            createIssue(
                "UNSUPPORTED_VIEW",
                `Renderer "${rendererName}" unterstützt die View "${viewName}" nicht.`
            )
        );

        return {
            configured: true,
            rendererName,
            viewName,
            definition,
            issues
        };
    }

    for (
        const field
        of viewDefinition.requiredFields
    ) {
        const value =
            manifest?.[field] ??
            entry?.[field];

        if (
            typeof value !== "string" ||
            value.trim() === ""
        ) {
            issues.push(
                createIssue(
                    "REQUIRED_FIELD_MISSING",
                    `Renderer "${rendererName}" / View "${viewName}" benötigt das Feld "${field}".`,
                    field
                )
            );
        }
    }

    return {
        configured: true,
        rendererName,
        viewName,
        definition,
        issues
    };
}

/**
 * @param {object|null} owner
 * @param {string} field
 * @param {string} sourceLabel
 * @param {Array<object>} issues
 * @returns {string|null}
 */
function readOptionalConfiguredString(
    owner,
    field,
    sourceLabel,
    issues
) {
    if (
        !owner ||
        !Object.hasOwn(
            owner,
            field
        )
    ) {
        return null;
    }

    const value =
        owner[field];

    if (
        typeof value !== "string" ||
        value.trim() === ""
    ) {
        issues.push(
            createIssue(
                field === "renderer"
                    ? "INVALID_RENDERER"
                    : "INVALID_VIEW",
                `${sourceLabel} besitzt kein gültiges String-Feld "${field}".`,
                field
            )
        );

        return null;
    }

    return value.trim();
}

/**
 * @returns {Map<string, string[]>}
 */
function createReservedViewRendererMap() {
    const result =
        new Map();

    for (
        const [
            rendererName,
            definition
        ]
        of Object.entries(
            MANIFEST_RENDERER_DEFINITIONS
        )
    ) {
        for (
            const viewName
            of Object.keys(
                definition.views
            )
        ) {
            const owners =
                result.get(
                    viewName
                ) ?? [];

            owners.push(
                rendererName
            );

            result.set(
                viewName,
                owners
            );
        }
    }

    return result;
}

/**
 * @param {string} code
 * @param {string} message
 * @param {string|null} field
 * @returns {object}
 */
function createIssue(
    code,
    message,
    field = null
) {
    return {
        code,
        message,
        field
    };
}
