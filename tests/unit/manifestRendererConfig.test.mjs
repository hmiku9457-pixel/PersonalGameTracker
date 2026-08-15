import assert from "node:assert/strict";
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
