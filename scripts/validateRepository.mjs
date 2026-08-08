import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];
const warnings = [];
const parsedJson = new Map();
const countMemo = new Map();

await validateAllJson();
await validateManifests();
await validateCommsShape();
await validateHtmlReferences();
await inspectDuplicateItemIds();

if (warnings.length > 0) {
    console.warn("\nWarnungen:");
    for (const warning of warnings) {
        console.warn(`- ${warning}`);
    }
}

if (errors.length > 0) {
    console.error("\nRepository-Prüfung fehlgeschlagen:");
    for (const error of errors) {
        console.error(`- ${error}`);
    }
    process.exitCode = 1;
}
else {
    console.log("\nRepository-Prüfung erfolgreich.");
    console.log(`Geprüfte JSON-Dateien: ${parsedJson.size}`);
}

async function validateAllJson() {
    const files = await listFiles(
        path.join(ROOT, "data"),
        file => file.endsWith(".json")
    );

    for (const file of files) {
        try {
            const data = JSON.parse(
                await fs.readFile(file, "utf8")
            );
            parsedJson.set(path.resolve(file), data);
        }
        catch (error) {
            errors.push(
                `${relative(file)}: ungültiges JSON (${error.message})`
            );
        }
    }
}

async function validateManifests() {
    const manifests = [...parsedJson.keys()]
        .filter(file => path.basename(file) === "manifest.json");

    for (const manifestFile of manifests) {
        try {
            const actual = await countManifest(
                manifestFile,
                new Set()
            );
            const manifest = parsedJson.get(manifestFile);
            const declared = Number(manifest?.itemCount);

            if (!Number.isInteger(declared) || declared < 0) {
                errors.push(
                    `${relative(manifestFile)}: itemCount fehlt oder ist ungültig.`
                );
            }
            else if (declared !== actual) {
                errors.push(
                    `${relative(manifestFile)}: itemCount ${declared} stimmt nicht mit ${actual} überein.`
                );
            }
        }
        catch (error) {
            errors.push(
                `${relative(manifestFile)}: ${error.message}`
            );
        }
    }
}

async function countManifest(manifestFile, stack) {
    const normalized = path.resolve(manifestFile);

    if (countMemo.has(normalized)) {
        return countMemo.get(normalized);
    }

    if (stack.has(normalized)) {
        throw new Error("Manifest-Zyklus erkannt.");
    }

    const manifest = parsedJson.get(normalized);
    if (!manifest) {
        throw new Error("Manifest ist nicht lesbar.");
    }

    stack.add(normalized);
    const categories = Array.isArray(manifest.categories)
        ? manifest.categories
        : [];

    let total = 0;

    for (const entry of categories) {
        if (!entry?.id) {
            errors.push(
                `${relative(normalized)}: Kategorie ohne id.`
            );
        }

        if (!entry?.file) {
            errors.push(
                `${relative(normalized)}: Kategorie ${entry?.id ?? "<unbekannt>"} ohne file.`
            );
            continue;
        }

        const target = path.resolve(
            path.dirname(normalized),
            entry.file
        );

        if (!parsedJson.has(target)) {
            errors.push(
                `${relative(normalized)}: Referenz fehlt: ${relative(target)}`
            );
            continue;
        }

        let count;
        if (
            entry.type === "manifest" ||
            path.basename(target) === "manifest.json"
        ) {
            count = await countManifest(target, stack);
        }
        else {
            count = countItems(parsedJson.get(target));
        }

        const declared = Number(entry.itemCount);
        if (!Number.isInteger(declared) || declared < 0) {
            errors.push(
                `${relative(normalized)}: ${entry.id} besitzt keinen gültigen itemCount.`
            );
        }
        else if (declared !== count) {
            errors.push(
                `${relative(normalized)}: ${entry.id}.itemCount ${declared} stimmt nicht mit ${count} überein.`
            );
        }

        total += count;
    }

    stack.delete(normalized);
    countMemo.set(normalized, total);
    return total;
}

async function validateCommsShape() {
    const root = path.resolve(
        ROOT,
        "data/theDivision2/collectibles/comms"
    );

    const manifests = [...parsedJson.keys()]
        .filter(file =>
            file.startsWith(root + path.sep) &&
            path.basename(file) === "manifest.json"
        );

    for (const file of manifests) {
        const manifest = parsedJson.get(file);

        if (Object.prototype.hasOwnProperty.call(manifest, "sections")) {
            errors.push(
                `${relative(file)}: sections ist nach der Konsolidierung nicht mehr zulässig.`
            );
        }

        if (Object.prototype.hasOwnProperty.call(manifest, "files")) {
            errors.push(
                `${relative(file)}: files ist nach der Konsolidierung nicht mehr zulässig.`
            );
        }
    }
}

async function validateHtmlReferences() {
    for (const htmlFile of ["index.html", "404.html"]) {
        const absolute = path.resolve(ROOT, htmlFile);
        let html;

        try {
            html = await fs.readFile(absolute, "utf8");
        }
        catch {
            errors.push(`${htmlFile}: Datei fehlt.`);
            continue;
        }

        const regex = /(?:src|href)=["']([^"'#?]+)["']/g;
        for (const match of html.matchAll(regex)) {
            const reference = match[1];

            if (
                /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference) ||
                reference === "/"
            ) {
                continue;
            }

            const cleanReference = reference.replace(/^\.\//, "");
            const target = path.resolve(
                path.dirname(absolute),
                cleanReference
            );

            try {
                await fs.access(target);
            }
            catch {
                errors.push(
                    `${htmlFile}: lokale Referenz fehlt: ${reference}`
                );
            }
        }
    }
}

async function inspectDuplicateItemIds() {
    const gamesRoot = path.resolve(ROOT, "data");
    const byGame = new Map();

    for (const [file, data] of parsedJson) {
        if (
            path.basename(file) === "manifest.json" ||
            path.basename(file) === "allMissions.json" ||
            path.basename(file) === "mockProgress.json" ||
            file === path.join(gamesRoot, "games.json")
        ) {
            continue;
        }

        const relativeFile = path.relative(gamesRoot, file);
        const gameId = relativeFile.split(path.sep)[0];
        const ids = collectItemIds(data);

        if (!byGame.has(gameId)) {
            byGame.set(gameId, new Map());
        }

        const gameIds = byGame.get(gameId);
        for (const id of ids) {
            const files = gameIds.get(id) ?? [];
            files.push(relative(file));
            gameIds.set(id, files);
        }
    }

    for (const [gameId, ids] of byGame) {
        for (const [id, files] of ids) {
            if (files.length > 1) {
                warnings.push(
                    `${gameId}: Item-ID "${id}" kommt mehrfach vor (${[...new Set(files)].join(", ")}).`
                );
            }
        }
    }
}

function countItems(value) {
    if (Array.isArray(value)) {
        return value.length;
    }

    if (!value || typeof value !== "object") {
        return 0;
    }

    if (Array.isArray(value.items)) {
        return value.items.length;
    }

    if (Array.isArray(value.groups)) {
        return value.groups.reduce(
            (sum, group) => sum + countItems(group),
            0
        );
    }

    if (Array.isArray(value.sections)) {
        return value.sections.reduce(
            (sum, section) => sum + countItems(section),
            0
        );
    }

    return 0;
}

function collectItemIds(value) {
    const result = [];

    function visit(node) {
        if (Array.isArray(node)) {
            for (const entry of node) {
                visit(entry);
            }
            return;
        }

        if (!node || typeof node !== "object") {
            return;
        }

        if (
            typeof node.id === "string" &&
            !Array.isArray(node.categories) &&
            !Array.isArray(node.groups) &&
            !Array.isArray(node.sections) &&
            !Array.isArray(node.items)
        ) {
            result.push(node.id);
        }

        for (const key of ["items", "groups", "sections"]) {
            if (Array.isArray(node[key])) {
                visit(node[key]);
            }
        }
    }

    visit(value);
    return result;
}

async function listFiles(directory, predicate) {
    const result = [];

    async function walk(current) {
        const entries = await fs.readdir(
            current,
            { withFileTypes: true }
        );

        for (const entry of entries) {
            const target = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await walk(target);
            }
            else if (entry.isFile() && predicate(target)) {
                result.push(target);
            }
        }
    }

    await walk(directory);
    return result;
}

function relative(file) {
    return path.relative(ROOT, file)
        .split(path.sep)
        .join("/");
}
