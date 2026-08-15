import {
    mkdir,
    readFile,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    resolve
} from "node:path";

const ROOT = process.cwd();

const FILES = {
    rendererConfig:
        "assets/js/config/manifestRendererConfig.js",
    registry:
        "assets/js/views/manifestViewRegistry.js",
    commsOverview:
        "assets/js/views/commsOverviewView.js",
    commsMap:
        "assets/js/views/commsMapView.js",
    validator:
        "scripts/validateRepository.mjs",
    unitTest:
        "tests/unit/manifestRendererConfig.test.mjs",
    e2eTest:
        "tests/e2e/manifest-renderer-contract.spec.mjs",
    packageJson:
        "package.json",
    qualityWorkflow:
        ".github/workflows/repository-quality.yml"
};

await writeRepositoryFile(
    FILES.rendererConfig,
    `/* =========================================================
   Personal Game Tracker
   Manifest Renderer Configuration
   ========================================================= */

/**
 * Zentrale Definition aller spezialisierten Manifest-Renderer.
 *
 * Diese Datei enthält absichtlich ausschließlich browser- und
 * Node-kompatible Datenlogik. Dadurch verwenden Runtime und
 * Repository-Validator denselben Renderer-Vertrag.
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
                \`Route-Entry und Zielmanifest verwenden unterschiedliche Renderer: "\${entryRenderer}" / "\${manifestRenderer}".\`
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
                \`Route-Entry und Zielmanifest verwenden unterschiedliche Views: "\${entryView}" / "\${manifestView}".\`
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
                    \`View "\${viewName}" benötigt einen spezialisierten Renderer (\${owners.join(", ")}).\`
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
                \`Unbekannter Manifest-Renderer "\${rendererName}".\`
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
                \`Renderer "\${rendererName}" benötigt eine View.\`
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
                \`Renderer "\${rendererName}" unterstützt die View "\${viewName}" nicht.\`
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
                    \`Renderer "\${rendererName}" / View "\${viewName}" benötigt das Feld "\${field}".\`,
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
                \`\${sourceLabel} besitzt kein gültiges String-Feld "\${field}".\`,
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
`
);

await writeRepositoryFile(
    FILES.registry,
    `/* =========================================================
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
                \`Für Manifest-Renderer "\${configuration.rendererName}" ist kein Runtime-Loader registriert.\`
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
`
);

await patchCommsOverview();
await patchCommsMap();
await patchValidator();

await writeRepositoryFile(
    FILES.unitTest,
    `import assert from "node:assert/strict";
import test from "node:test";

import {
    resolveManifestRendererConfiguration
} from "../../assets/js/config/manifestRendererConfig.js";

test("ohne Renderer und Spezial-View bleibt die Route generisch", () => {
    const result =
        resolveManifestRendererConfiguration({
            entry: {
                id: "collectibles"
            },
            manifest: {
                id: "collectibles"
            }
        });

    assert.equal(
        result.configured,
        false
    );

    assert.deepEqual(
        result.issues,
        []
    );
});

test("unbekannte Renderer werden abgelehnt", () => {
    const result =
        resolveManifestRendererConfiguration({
            manifest: {
                renderer:
                    "unknown-renderer",
                view:
                    "comms-overview"
            }
        });

    assert.equal(
        result.configured,
        true
    );

    assert.ok(
        result.issues.some(
            issue =>
                issue.code ===
                "UNKNOWN_RENDERER"
        )
    );
});

test("reservierte Views benötigen einen Renderer", () => {
    const result =
        resolveManifestRendererConfiguration({
            manifest: {
                view:
                    "comms-overview"
            }
        });

    assert.ok(
        result.issues.some(
            issue =>
                issue.code ===
                "RENDERER_REQUIRED"
        )
    );
});

test("Comms-Listenansicht akzeptiert geerbtes dataFile aus dem Route-Entry", () => {
    const result =
        resolveManifestRendererConfiguration({
            entry: {
                renderer:
                    "comms",
                view:
                    "list",
                dataFile:
                    "allMissions.json"
            },
            manifest: {
                renderer:
                    "comms",
                view:
                    "list"
            }
        });

    assert.deepEqual(
        result.issues,
        []
    );

    assert.equal(
        result.rendererName,
        "comms"
    );

    assert.equal(
        result.viewName,
        "list"
    );
});

test("Comms-Listenansicht ohne dataFile wird abgelehnt", () => {
    const result =
        resolveManifestRendererConfiguration({
            entry: {
                renderer:
                    "comms",
                view:
                    "list"
            },
            manifest: {
                renderer:
                    "comms",
                view:
                    "list"
            }
        });

    assert.ok(
        result.issues.some(
            issue =>
                issue.code ===
                "REQUIRED_FIELD_MISSING" &&
                issue.field ===
                "dataFile"
        )
    );
});

test("widersprüchliche Renderer oder Views werden erkannt", () => {
    const result =
        resolveManifestRendererConfiguration({
            entry: {
                renderer:
                    "comms",
                view:
                    "map"
            },
            manifest: {
                renderer:
                    "other",
                view:
                    "list",
                dataFile:
                    "items.json"
            }
        });

    const codes =
        new Set(
            result.issues.map(
                issue =>
                    issue.code
            )
        );

    assert.ok(
        codes.has(
            "RENDERER_CONFLICT"
        )
    );

    assert.ok(
        codes.has(
            "VIEW_CONFLICT"
        )
    );
});
`
);

await writeRepositoryFile(
    FILES.e2eTest,
    `import {
    expect,
    test
} from "@playwright/test";

const COMMS_MANIFEST =
    "**/data/theDivision2/collectibles/comms/manifest.json";

const ROUTES = {
    comms:
        "#game/theDivision2/collectibles/comms",

    missions:
        "#game/theDivision2/collectibles/comms/missions"
};

test.beforeEach(async ({ page }) => {
    await installSupabaseMock(
        page
    );
});

test("unbekannter Manifest-Renderer fällt nicht auf die generische Ansicht zurück", async ({ page }) => {
    await mutateJsonResponse(
        page,
        COMMS_MANIFEST,
        manifest => ({
            ...manifest,
            renderer:
                "unknown-renderer"
        })
    );

    await page.goto(
        \`/\${ROUTES.comms}\`
    );

    await expect(
        page.locator(
            ".error-message"
        )
    ).toBeVisible();

    await expect(
        page.locator(
            ".comms-section-card"
        )
    ).toHaveCount(0);
});

test("Comms-Listenansicht ohne dataFile verwendet keinen stillen Missions-Fallback", async ({ page }) => {
    await mutateJsonResponse(
        page,
        COMMS_MANIFEST,
        manifest => ({
            ...manifest,
            categories:
                manifest.categories.map(
                    category => {
                        if (
                            category.id !==
                            "missions"
                        ) {
                            return category;
                        }

                        const copy = {
                            ...category
                        };

                        delete copy.dataFile;

                        return copy;
                    }
                )
        })
    );

    await page.goto(
        \`/\${ROUTES.missions}\`
    );

    await expect(
        page.locator(
            ".error-message"
        )
    ).toBeVisible();

    await expect(
        page.locator(
            ".tracker-item"
        )
    ).toHaveCount(0);
});

async function mutateJsonResponse(
    page,
    urlPattern,
    mutate
) {
    await page.route(
        urlPattern,
        async route => {
            const response =
                await route.fetch();

            const json =
                await response.json();

            await route.fulfill({
                response,
                json:
                    mutate(
                        json
                    )
            });
        }
    );
}

async function installSupabaseMock(page) {
    await page.addInitScript(() => {
        function result(
            data = []
        ) {
            const query = {
                select() {
                    return query;
                },

                eq() {
                    return query;
                },

                order() {
                    return query;
                },

                range() {
                    return query;
                },

                insert() {
                    return query;
                },

                delete() {
                    return query;
                },

                maybeSingle() {
                    return Promise.resolve({
                        data:
                            data[0] ??
                            null,
                        error:
                            null
                    });
                },

                then(resolve) {
                    return Promise.resolve({
                        data,
                        error:
                            null
                    }).then(
                        resolve
                    );
                }
            };

            return query;
        }

        window.supabase = {
            createClient() {
                return {
                    auth: {
                        async getSession() {
                            return {
                                data: {
                                    session:
                                        null
                                },
                                error:
                                    null
                            };
                        },

                        onAuthStateChange() {
                            return {
                                data: {
                                    subscription: {
                                        unsubscribe() {}
                                    }
                                }
                            };
                        },

                        async signInWithPassword() {
                            return {
                                data: {},
                                error:
                                    null
                            };
                        },

                        async signUp() {
                            return {
                                data: {},
                                error:
                                    null
                            };
                        },

                        async signOut() {
                            return {
                                error:
                                    null
                            };
                        }
                    },

                    from() {
                        return result([]);
                    }
                };
            }
        };
    });

    await page.route(
        "https://cdn.jsdelivr.net/**",
        route =>
            route.abort()
    );
}
`
);

await patchPackageJson();
await patchQualityWorkflow();

console.info(
    "Paket 1 angewendet: Manifest-Renderer-Vertrag gehärtet."
);

async function patchCommsOverview() {
    const file =
        FILES.commsOverview;

    await replaceOnce(
        file,
        `import {
    getActiveViewScope,
    isViewScopeCurrent
} from "../services/viewScopeService.js";`,
        `import {
    isViewScopeCurrent
} from "../services/viewScopeService.js";`
    );

    await replaceOnce(
        file,
        `/**
 * Übernimmt die speziellen Comms-Routen.
 *
 * Unterstützt:
 *
 * #game/theDivision2/collectibles/comms
 * #game/theDivision2/collectibles/comms/washington
 * #game/theDivision2/collectibles/comms/newYork
 * #game/theDivision2/collectibles/comms/brooklyn
 * #game/theDivision2/collectibles/comms/missions
 *
 * Tiefere Routen werden absichtlich wieder an den generischen
 * Router übergeben.
 *
 * @param {object} game
 * @param {string[]} routeIds
 * @returns {Promise<boolean>}
 */`,
        `/**
 * Rendert eine über renderer "comms" konfigurierte Manifestansicht.
 *
 * Die zulässigen Views und Pflichtfelder werden zentral durch
 * manifestRendererConfig.js definiert und bereits vor diesem
 * Renderer validiert.
 *
 * @param {object} context
 * @returns {Promise<void>}
 */`
    );

    await replaceOnce(
        file,
        `export async function renderConfiguredCommsView({
    game,
    resolvedRoute,
    routeIds
}) {`,
        `export async function renderConfiguredCommsView({
    game,
    resolvedRoute,
    routeIds,
    viewScope
}) {`
    );

    await replaceOnce(
        file,
        `        await renderCommsOverview(
            game,
            resolvedRoute.manifest,
            routeIds,
            resolvedRoute.manifestFile
        );`,
        `        await renderCommsOverview(
            game,
            resolvedRoute.manifest,
            routeIds,
            resolvedRoute.manifestFile,
            viewScope
        );`
    );

    await replaceOnce(
        file,
        `    if (view === "list") {
        await renderCategory(`,
        `    if (view === "list") {
        const dataFile =
            sectionManifest.dataFile ??
            section.dataFile;

        if (
            typeof dataFile !== "string" ||
            dataFile.trim() === ""
        ) {
            throw new Error(
                \`Für die Comms-Listenansicht "\${section.id ?? "?"}" fehlt dataFile.\`
            );
        }

        await renderCategory(`
    );

    await replaceOnce(
        file,
        `                file: resolveRelativeFile(
                    sectionManifestFile,
                    sectionManifest.dataFile ??
                    section.dataFile ??
                    "allMissions.json"
                ),`,
        `                file: resolveRelativeFile(
                    sectionManifestFile,
                    dataFile
                ),`
    );

    await replaceOnce(
        file,
        `            sectionManifest,
            sectionManifestFile,
            routeIds
        );`,
        `            sectionManifest,
            sectionManifestFile,
            routeIds,
            viewScope
        );`
    );

    await replaceOnce(
        file,
        `async function renderCommsOverview(
    game,
    commsManifest,
    routeIds,
    manifestFile
) {
    const viewScope =
        getActiveViewScope();

    showLoading();`,
        `async function renderCommsOverview(
    game,
    commsManifest,
    routeIds,
    manifestFile,
    viewScope
) {
    showLoading();`
    );

    await replaceOnce(
        file,
        `/**
 * Prüft, ob es sich um eine Comms-Route handelt.
 *
 * @param {string[]} routeIds
 * @returns {boolean}
 */

/**
 * Baut einen Hash für eine Spielroute.`,
        `/**
 * Baut einen Hash für eine Spielroute.`
    );
}

async function patchCommsMap() {
    const file =
        FILES.commsMap;

    await replaceOnce(
        file,
        `export async function renderCommsMapView(
    game,
    commsManifest,
    section,
    sectionManifest,
    sectionManifestFile,
    routeIds
) {
	/* Map-Ressourcen beim Routenwechsel freigeben. */
	registerViewCleanup(
		() => {
			if (activeMapObjectUrl) {
				URL.revokeObjectURL(
					activeMapObjectUrl
				);
				activeMapObjectUrl =
					null;
			}
		},
		getActiveViewScope()
	);

	const viewScope =
		getActiveViewScope();

	const fallbackController =`,
        `export async function renderCommsMapView(
    game,
    commsManifest,
    section,
    sectionManifest,
    sectionManifestFile,
    routeIds,
    suppliedViewScope = null
) {
	const viewScope =
		suppliedViewScope ??
		getActiveViewScope();

	/* Map-Ressourcen beim Routenwechsel freigeben. */
	registerViewCleanup(
		() => {
			if (activeMapObjectUrl) {
				URL.revokeObjectURL(
					activeMapObjectUrl
				);
				activeMapObjectUrl =
					null;
			}
		},
		viewScope
	);

	const fallbackController =`
    );
}

async function patchValidator() {
    const file =
        FILES.validator;

    await replaceOnce(
        file,
        `} from "node:path";

const ROOT = process.cwd();`,
        `} from "node:path";

import {
    resolveManifestRendererConfiguration
} from "../assets/js/config/manifestRendererConfig.js";

const ROOT = process.cwd();`
    );

    await replaceOnce(
        file,
        `async function validateManifestTree({
    gameId,
    manifestFile,
    stack
}) {`,
        `async function validateManifestTree({
    gameId,
    manifestFile,
    stack,
    routeEntry = null,
    routeEntryFile = null
}) {`
    );

    await replaceOnce(
        file,
        `    reachableJson.add(manifestFile);
    validateObjectId(manifest, manifestFile, "Manifest", false);
    const categories = Array.isArray(manifest.categories)`,
        `    reachableJson.add(manifestFile);
    validateObjectId(manifest, manifestFile, "Manifest", false);

    const rendererConfiguration =
        resolveManifestRendererConfiguration({
            entry:
                routeEntry,
            manifest
        });

    for (
        const issue
        of rendererConfiguration.issues
    ) {
        const routeSource =
            routeEntryFile
                ? \` (Route aus \${display(routeEntryFile)})\`
                : "";

        errors.push(
            \`\${display(manifestFile)}\${routeSource}: \${issue.message}\`
        );
    }

    if (
        rendererConfiguration.rendererName ===
        "comms"
    ) {
        validateCommsManifest(
            manifest,
            manifestFile
        );
    }

    const categories = Array.isArray(manifest.categories)`
    );

    await replaceOnce(
        file,
        `            const childTotal = await validateManifestTree({
                gameId,
                manifestFile: target,
                stack: [...stack, manifestFile]
            });`,
        `            const childTotal = await validateManifestTree({
                gameId,
                manifestFile: target,
                stack: [...stack, manifestFile],
                routeEntry:
                    category,
                routeEntryFile:
                    manifestFile
            });`
    );

    await replaceOnce(
        file,
        `    if (
        typeof manifest.renderer === "string" &&
        manifest.renderer === "comms"
    ) {
        validateCommsManifest(manifest, manifestFile);
    }

`,
        ``
    );

    await replaceOnce(
        file,
        `    const allowedViews = new Set([
        "comms-overview",
        "map",
        "list"
    ]);

    if (
        typeof manifest.view === "string" &&
        !allowedViews.has(manifest.view)
    ) {
        errors.push(
            \`\${display(file)} verwendet die unbekannte Comms-View "\${manifest.view}".\`
        );
    }
    if (
        allowedViews.has(manifest.view) &&
        manifest.renderer !== "comms"
    ) {
        errors.push(
            \`\${display(file)} benötigt für die View "\${manifest.view}" renderer "comms".\`
        );
    }

`,
        ``
    );

    await replaceOnce(
        file,
        `        if (
            allowedViews.has(category?.view) &&
            category.renderer !== "comms"
        ) {
            errors.push(
                \`\${display(file)}: Comms-Eintrag "\${category.id}" benötigt renderer "comms".\`
            );
        }
`,
        ``
    );

    await replaceOnce(
        file,
        `        {
            file: "assets/js/views/commsOverviewView.js",
            text: "sectionManifest.files",
            message: "Comms-View verwendet das entfernte files-Feld."
        },`,
        `        {
            file: "assets/js/views/commsOverviewView.js",
            text: "sectionManifest.files",
            message: "Comms-View verwendet das entfernte files-Feld."
        },
        {
            file: "assets/js/views/commsOverviewView.js",
            text: "\\"allMissions.json\\"",
            message: "Comms-View enthält weiterhin den stillen allMissions-Fallback."
        },`
    );

    await replaceOnce(
        file,
        `        "assets/js/services/progressSummaryService.js",
        "assets/js/views/manifestViewRegistry.js",
        "tests/e2e/tracker.smoke.spec.mjs",
        "playwright.config.mjs"`,
        `        "assets/js/services/progressSummaryService.js",
        "assets/js/config/manifestRendererConfig.js",
        "assets/js/views/manifestViewRegistry.js",
        "tests/unit/manifestRendererConfig.test.mjs",
        "tests/e2e/manifest-renderer-contract.spec.mjs",
        "tests/e2e/tracker.smoke.spec.mjs",
        "playwright.config.mjs"`
    );
}

async function patchPackageJson() {
    const file =
        resolve(
            ROOT,
            FILES.packageJson
        );

    const packageJson =
        JSON.parse(
            await readFile(
                file,
                "utf8"
            )
        );

    packageJson.scripts ??= {};

    packageJson.scripts[
        "test:unit"
    ] =
        "node --test tests/unit/*.test.mjs";

    await writeFile(
        file,
        JSON.stringify(
            packageJson,
            null,
            2
        ) + "\n",
        "utf8"
    );
}

async function patchQualityWorkflow() {
    await replaceOnce(
        FILES.qualityWorkflow,
        `      - name: Repository validieren
        run: npm run validate:data
      - name: JavaScript-Syntax prüfen`,
        `      - name: Repository validieren
        run: npm run validate:data

      - name: Unit-Tests ausführen
        run: npm run test:unit

      - name: JavaScript-Syntax prüfen`
    );
}

async function replaceOnce(
    relativeFile,
    before,
    after
) {
    const file =
        resolve(
            ROOT,
            relativeFile
        );

    const source =
        await readFile(
            file,
            "utf8"
        );

    if (
        after &&
        source.includes(
            after
        )
    ) {
        console.info(
            `[SKIP] ${relativeFile}: Änderung bereits vorhanden.`
        );

        return;
    }

    const firstIndex =
        source.indexOf(
            before
        );

    if (firstIndex < 0) {
        throw new Error(
            `${relativeFile}: erwarteter Ausgangsblock wurde nicht gefunden. Paket passt nicht zum aktuellen Repository-Stand.`
        );
    }

    const secondIndex =
        source.indexOf(
            before,
            firstIndex +
            before.length
        );

    if (secondIndex >= 0) {
        throw new Error(
            `${relativeFile}: Ausgangsblock ist nicht eindeutig.`
        );
    }

    const updated =
        source.slice(
            0,
            firstIndex
        ) +
        after +
        source.slice(
            firstIndex +
            before.length
        );

    await writeFile(
        file,
        updated,
        "utf8"
    );

    console.info(
        `[OK] ${relativeFile}`
    );
}

async function writeRepositoryFile(
    relativeFile,
    content
) {
    const file =
        resolve(
            ROOT,
            relativeFile
        );

    await mkdir(
        dirname(
            file
        ),
        {
            recursive:
                true
        }
    );

    await writeFile(
        file,
        content,
        "utf8"
    );

    console.info(
        `[WRITE] ${relativeFile}`
    );
}
