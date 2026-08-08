import {
    access,
    readFile,
    readdir
} from "node:fs/promises";

import {
    dirname,
    extname,
    join,
    relative,
    resolve,
    sep
} from "node:path";

const ROOT = process.cwd();
const DATA_ROOT = resolve(ROOT, "data");
const ASSET_ROOTS = [
    resolve(ROOT, "assets/maps"),
    resolve(ROOT, "assets/thumbnails")
];

const errors = [];
const warnings = [];
const parsedJson = new Map();
const reachableJson = new Set();
const referencedAssets = new Set();
const gameItemIds = new Map();
const pendingChecks = [];

await validateAllJsonFiles();
await Promise.all(pendingChecks);
await validateGameManifests();
await validateRuntimeReferences();
await validateHtmlReferences();
await reportOrphanJson();
await reportOrphanAssets();

for (const warning of warnings) {
    console.warn(`[WARN] ${warning}`);
}

if (errors.length > 0) {
    for (const error of errors) {
        console.error(`[ERROR] ${error}`);
    }

    throw new Error(
        `Repository-Prüfung fehlgeschlagen: ${errors.length} Fehler, ${warnings.length} Warnungen.`
    );
}

console.info(
    `Repository-Prüfung erfolgreich: ${parsedJson.size} JSON-Dateien, ${warnings.length} Warnungen.`
);

async function validateAllJsonFiles() {
    const files = await collectFiles(
        DATA_ROOT,
        file => extname(file) === ".json"
    );

    for (const file of files) {
        try {
            const data = JSON.parse(
                await readFile(file, "utf8")
            );

            parsedJson.set(file, data);
            validateLocalizedValues(data, file, []);
            validateAssetReferences(data, file);
        }
        catch (error) {
            errors.push(
                `${display(file)} enthält ungültiges JSON: ${error.message}`
            );
        }
    }
}

async function validateGameManifests() {
    const gameDirectories = await readdir(
        DATA_ROOT,
        {
            withFileTypes: true
        }
    );

    for (const entry of gameDirectories) {
        if (!entry.isDirectory()) {
            continue;
        }

        const gameId = entry.name;
        const manifestFile = resolve(
            DATA_ROOT,
            gameId,
            "manifest.json"
        );

        if (!parsedJson.has(manifestFile)) {
            continue;
        }

        gameItemIds.set(gameId, new Map());

        const total = await validateManifestTree({
            gameId,
            manifestFile,
            stack: []
        });

        const manifest = parsedJson.get(manifestFile);
        validateDeclaredCount(
            manifest,
            total,
            manifestFile,
            "Manifest"
        );

        const duplicates = gameItemIds.get(gameId);

        for (const [itemId, files] of duplicates) {
            if (files.size > 1) {
                warnings.push(
                    `Item-ID "${itemId}" kommt im Spiel "${gameId}" in mehreren Dateien vor: ${[...files].map(display).join(", ")}`
                );
            }
        }
    }
}

async function validateManifestTree({
    gameId,
    manifestFile,
    stack
}) {
    assertInside(
        manifestFile,
        resolve(DATA_ROOT, gameId),
        `Manifestpfad für ${gameId}`
    );

    if (stack.includes(manifestFile)) {
        errors.push(
            `Manifestzyklus: ${[...stack, manifestFile].map(display).join(" -> ")}`
        );
        return 0;
    }

    const manifest = parsedJson.get(manifestFile);

    if (!manifest) {
        errors.push(
            `Referenziertes Manifest fehlt oder ist ungültig: ${display(manifestFile)}`
        );
        return 0;
    }

    reachableJson.add(manifestFile);
    validateObjectId(manifest, manifestFile, "Manifest", false);

    const categories = Array.isArray(manifest.categories)
        ? manifest.categories
        : [];

    if (!Array.isArray(manifest.categories)) {
        errors.push(
            `${display(manifestFile)} besitzt kein categories-Array.`
        );
    }

    validateUniqueIds(
        categories,
        manifestFile,
        "Manifest-Kategorie"
    );

    let total = 0;

    for (const category of categories) {
        validateObjectId(
            category,
            manifestFile,
            "Manifest-Kategorie",
            true
        );

        if (
            typeof category.file !== "string" ||
            category.file.trim() === ""
        ) {
            errors.push(
                `${display(manifestFile)}: Kategorie "${category.id ?? "?"}" besitzt keine gültige Datei.`
            );
            continue;
        }

        const target = resolveReference(
            manifestFile,
            category.file,
            resolve(DATA_ROOT, gameId),
            `Kategorie "${category.id}"`
        );

        if (!target) {
            continue;
        }

        if (category.type === "manifest") {
            const childTotal = await validateManifestTree({
                gameId,
                manifestFile: target,
                stack: [...stack, manifestFile]
            });

            validateDeclaredCount(
                category,
                childTotal,
                manifestFile,
                `Manifest-Kategorie "${category.id}"`
            );

            total += childTotal;
        }
        else {
            const categoryTotal = validateCategoryFile(
                gameId,
                category,
                target
            );

            validateDeclaredCount(
                category,
                categoryTotal,
                manifestFile,
                `Kategorie "${category.id}"`
            );

            total += categoryTotal;
        }

        if (category.dataFile) {
            const baseFiles =
                category.type === "manifest"
                    ? [target, manifestFile]
                    : [target];

            const dataFile = resolveReferenceCandidates(
                baseFiles,
                category.dataFile,
                resolve(DATA_ROOT, gameId),
                `dataFile von "${category.id}"`
            );

            if (dataFile) {
                reachableJson.add(dataFile);
            }
        }
    }

    if (
        typeof manifest.dataFile === "string" &&
        manifest.dataFile.trim() !== ""
    ) {
        const dataFile = resolveReference(
            manifestFile,
            manifest.dataFile,
            resolve(DATA_ROOT, gameId),
            `dataFile von Manifest "${manifest.id ?? "?"}"`
        );

        if (dataFile) {
            reachableJson.add(dataFile);

            if (manifest.view === "list") {
                const combinedTotal =
                    extractItems(
                        parsedJson.get(dataFile)
                    ).length;

                if (combinedTotal !== total) {
                    errors.push(
                        `${display(manifestFile)}: Listendatei enthält ${combinedTotal} Items, die Kategorien summieren sich auf ${total}.`
                    );
                }
            }
        }
    }

    if (
        typeof manifest.renderer === "string" &&
        manifest.renderer === "comms"
    ) {
        validateCommsManifest(manifest, manifestFile);
    }

    validateDeclaredCount(
        manifest,
        total,
        manifestFile,
        "Manifest"
    );

    return total;
}

function validateCategoryFile(
    gameId,
    category,
    file
) {
    const data = parsedJson.get(file);

    if (!data) {
        errors.push(
            `Referenzierte Kategoriedatei fehlt oder ist ungültig: ${display(file)}`
        );
        return 0;
    }

    reachableJson.add(file);

    const items = extractItems(data);
    const groups = Array.isArray(data?.groups)
        ? data.groups
        : [];

    validateUniqueIds(
        items,
        file,
        "Item"
    );

    validateUniqueIds(
        groups,
        file,
        "Gruppe"
    );

    for (const item of items) {
        validateObjectId(item, file, "Item", true);

        const itemId = typeof item?.id === "string"
            ? item.id.trim()
            : "";

        if (!itemId) {
            continue;
        }

        const locations = gameItemIds.get(gameId);
        const files = locations.get(itemId) ?? new Set();
        files.add(file);
        locations.set(itemId, files);
    }

    if (
        category.view === "list" &&
        typeof category.dataFile === "string"
    ) {
        const dataFile = resolveReference(
            file,
            category.dataFile,
            resolve(DATA_ROOT, gameId),
            `Listendatei von "${category.id}"`
        );

        if (dataFile) {
            const combinedData = parsedJson.get(dataFile);
            reachableJson.add(dataFile);

            if (combinedData) {
                return extractItems(combinedData).length;
            }
        }
    }

    return items.length;
}

function validateCommsManifest(manifest, file) {
    if (Array.isArray(manifest.sections)) {
        errors.push(
            `${display(file)} verwendet weiterhin das entfernte sections-Feld.`
        );
    }

    if (Array.isArray(manifest.files)) {
        errors.push(
            `${display(file)} verwendet weiterhin das entfernte files-Feld.`
        );
    }

    const allowedViews = new Set([
        "comms-overview",
        "map",
        "list"
    ]);

    if (
        typeof manifest.view === "string" &&
        !allowedViews.has(manifest.view)
    ) {
        errors.push(
            `${display(file)} verwendet die unbekannte Comms-View "${manifest.view}".`
        );
    }

    if (
        allowedViews.has(manifest.view) &&
        manifest.renderer !== "comms"
    ) {
        errors.push(
            `${display(file)} benötigt für die View "${manifest.view}" renderer "comms".`
        );
    }

    for (const category of manifest.categories ?? []) {
        if (typeof category?.manifest === "string") {
            errors.push(
                `${display(file)}: Comms-Eintrag "${category.id}" verwendet weiterhin manifest statt file.`
            );
        }

        if (
            allowedViews.has(category?.view) &&
            category.renderer !== "comms"
        ) {
            errors.push(
                `${display(file)}: Comms-Eintrag "${category.id}" benötigt renderer "comms".`
            );
        }
    }
}

function validateDeclaredCount(
    owner,
    actual,
    file,
    label
) {
    const declared = Number(owner?.itemCount);

    if (!Number.isInteger(declared) || declared < 0) {
        errors.push(
            `${display(file)}: ${label} besitzt keinen gültigen itemCount.`
        );
        return;
    }

    if (declared !== actual) {
        errors.push(
            `${display(file)}: ${label} meldet itemCount ${declared}, tatsächlich ${actual}.`
        );
    }
}

function extractItems(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.items)) {
        return data.items;
    }

    if (Array.isArray(data?.groups)) {
        return data.groups.flatMap(
            group => Array.isArray(group?.items)
                ? group.items
                : []
        );
    }

    if (Array.isArray(data?.sections)) {
        return data.sections.flatMap(extractItems);
    }

    return [];
}

function validateUniqueIds(entries, file, label) {
    const seen = new Set();

    for (const entry of entries) {
        const id = typeof entry?.id === "string"
            ? entry.id.trim()
            : "";

        if (!id) {
            continue;
        }

        if (seen.has(id)) {
            errors.push(
                `${display(file)} enthält eine doppelte ${label}-ID: "${id}".`
            );
        }

        seen.add(id);
    }
}

function validateObjectId(owner, file, label, required) {
    const value = owner?.id;

    if (
        required &&
        (typeof value !== "string" || value.trim() === "")
    ) {
        errors.push(
            `${display(file)} enthält ${label} ohne gültige ID.`
        );
    }
}

function validateLocalizedValues(value, file, path) {
    if (!value || typeof value !== "object") {
        return;
    }

    if (
        !Array.isArray(value) &&
        (Object.hasOwn(value, "de") ||
            Object.hasOwn(value, "en"))
    ) {
        const de = value.de;
        const en = value.en;

        if (
            de !== undefined &&
            typeof de !== "string"
        ) {
            errors.push(
                `${display(file)}: ${formatPath(path)}.de ist kein String.`
            );
        }

        if (
            en !== undefined &&
            typeof en !== "string"
        ) {
            errors.push(
                `${display(file)}: ${formatPath(path)}.en ist kein String.`
            );
        }

        if (de === undefined || en === undefined) {
            warnings.push(
                `${display(file)}: ${formatPath(path)} enthält nicht beide Sprachvarianten.`
            );
        }
    }

    validateOptionalCoordinates(
        value,
        file,
        path
    );

    for (const [key, nested] of Object.entries(value)) {
        validateLocalizedValues(
            nested,
            file,
            [...path, key]
        );
    }
}

function validateOptionalCoordinates(
    value,
    file,
    path
) {
    const coordinates =
        value?.coordinates;

    if (coordinates === undefined) {
        return;
    }

    if (coordinates === null) {
        return;
    }

    if (typeof coordinates !== "object") {
        errors.push(
            `${display(file)}: ${formatPath([...path, "coordinates"])} ist kein Objekt.`
        );
        return;
    }

    for (const axis of ["x", "y"]) {
        const coordinate =
            Number(coordinates[axis]);

        if (
            !Number.isFinite(coordinate) ||
            coordinate < 0 ||
            coordinate > 1
        ) {
            errors.push(
                `${display(file)}: ${formatPath([...path, "coordinates", axis])} muss zwischen 0 und 1 liegen.`
            );
        }
    }
}

function validateAssetReferences(value, sourceFile) {
    if (!value || typeof value !== "object") {
        return;
    }

    for (const [key, nested] of Object.entries(value)) {
        if (
            [
                "mapImage",
                "thumbnail",
                "poster",
                "image"
            ].includes(key) &&
            typeof nested === "string" &&
            isLocalAsset(nested)
        ) {
            const target = resolve(ROOT, nested.replace(/^\/+/, ""));
            referencedAssets.add(target);
            pendingChecks.push(
                checkExists(
                    target,
                    `${display(sourceFile)} -> ${nested}`
                )
            );
        }

        if (
            key === "media" &&
            nested &&
            typeof nested === "object" &&
            typeof nested.src === "string" &&
            isLocalAsset(nested.src)
        ) {
            const target = resolve(ROOT, nested.src.replace(/^\/+/, ""));
            referencedAssets.add(target);
            pendingChecks.push(
                checkExists(
                    target,
                    `${display(sourceFile)} -> ${nested.src}`
                )
            );
        }

        validateAssetReferences(nested, sourceFile);
    }
}

async function validateRuntimeReferences() {
    const forbidden = [
        {
            file: "assets/js/router.js",
            text: "tryRenderCommsRoute",
            message: "Router enthält weiterhin eine hart codierte Comms-Route."
        },
        {
            file: "assets/js/views/commsOverviewView.js",
            text: "COMMS_ROUTE_PREFIX",
            message: "Comms-View enthält weiterhin feste Routenpräfixe."
        },
        {
            file: "assets/js/views/commsOverviewView.js",
            text: "sectionManifest.files",
            message: "Comms-View verwendet das entfernte files-Feld."
        },
        {
            file: "assets/js/views/commsMapView.js",
            text: "sectionManifest.files",
            message: "Comms-Map verwendet das entfernte files-Feld."
        },
        {
            file: "assets/js/router.js",
            text: "beginJsonRequestScope",
            message: "Router verwendet weiterhin den alten JSON-Request-Scope."
        },
        {
            file: "assets/js/services/dataService.js",
            text: "beginJsonRequestScope",
            message: "Data Service enthält weiterhin den alten JSON-Request-Scope."
        },
        {
            file: "assets/js/services/dataService.js",
            text: "activeJsonRequestController",
            message: "Data Service enthält weiterhin den alten JSON-Abort-Controller."
        }
    ];

    for (const rule of forbidden) {
        const file = resolve(ROOT, rule.file);
        const source = await readFile(file, "utf8");

        if (source.includes(rule.text)) {
            errors.push(rule.message);
        }
    }

    const routerSource = await readFile(
        resolve(ROOT, "assets/js/router.js"),
        "utf8"
    );

    if (
        /(completeViewRender\(\s*viewScope\s*\);\s*){2,}/.test(
            routerSource
        )
    ) {
        errors.push(
            "Router enthält direkt aufeinanderfolgende doppelte Renderabschlüsse."
        );
    }

    const required = [
        "assets/js/services/viewScopeService.js",
        "assets/js/services/progressSummaryService.js",
        "assets/js/views/manifestViewRegistry.js",
        "tests/e2e/tracker.smoke.spec.mjs",
        "playwright.config.mjs"
    ];

    for (const file of required) {
        await checkExists(
            resolve(ROOT, file),
            `erforderliche Systemdatei ${file}`
        );
    }
}

async function validateHtmlReferences() {
    for (const htmlFile of ["index.html", "404.html"]) {
        const file = resolve(ROOT, htmlFile);
        const source = await readFile(file, "utf8");

        const references = [
            ...source.matchAll(
                /(?:src|href)="([^"#]+)"/g
            )
        ];

        for (const match of references) {
            const reference = match[1];

            if (!isLocalAsset(reference)) {
                continue;
            }

            const clean = reference
                .split("?")[0]
                .replace(/^\/+/, "");

            await checkExists(
                resolve(ROOT, clean),
                `${htmlFile} -> ${reference}`
            );
        }

        if (
            source.includes("cdn.jsdelivr.net/npm/@supabase/supabase-js") &&
            (!source.includes("integrity=\"sha384-") ||
                !source.includes("crossorigin=\"anonymous\""))
        ) {
            errors.push(
                `${htmlFile}: Supabase-CDN-Script besitzt kein vollständiges SRI.`
            );
        }
    }
}

async function reportOrphanJson() {
    for (const file of parsedJson.keys()) {
        if (
            file.endsWith(`${sep}games.json`) ||
            reachableJson.has(file)
        ) {
            continue;
        }

        warnings.push(
            `Nicht über ein Manifest erreichbare JSON-Datei: ${display(file)}`
        );
    }
}

async function reportOrphanAssets() {
    for (const root of ASSET_ROOTS) {
        try {
            const files = await collectFiles(
                root,
                file => true
            );

            for (const file of files) {
                if (!referencedAssets.has(file)) {
                    warnings.push(
                        `Möglicherweise unreferenziertes Asset: ${display(file)}`
                    );
                }
            }
        }
        catch {
            // Assetbereich ist optional.
        }
    }
}

function resolveReferenceCandidates(
    parentFiles,
    reference,
    allowedRoot,
    label
) {
    const candidates = [
        ...new Set(
            parentFiles.map(parentFile =>
                resolve(
                    dirname(parentFile),
                    reference
                )
            )
        )
    ];

    const allowedCandidates =
        candidates.filter(target =>
            target === allowedRoot ||
            target.startsWith(
                `${allowedRoot}${sep}`
            )
        );

    if (allowedCandidates.length === 0) {
        errors.push(
            `${label} verlässt den erlaubten Datenordner.`
        );
        return null;
    }

    const target =
        allowedCandidates.find(candidate =>
            parsedJson.has(candidate)
        );

    if (target) {
        return target;
    }

    errors.push(
        `${label} referenziert keine vorhandene JSON-Datei. Geprüft: ${allowedCandidates.map(display).join(", ")}`
    );

    return null;
}

function resolveReference(
    parentFile,
    reference,
    allowedRoot,
    label
) {
    const target = resolve(
        dirname(parentFile),
        reference
    );

    if (!assertInside(target, allowedRoot, label)) {
        return null;
    }

    if (!parsedJson.has(target)) {
        errors.push(
            `${label} referenziert eine fehlende JSON-Datei: ${display(target)}`
        );
        return null;
    }

    return target;
}

function assertInside(target, allowedRoot, label) {
    if (
        target === allowedRoot ||
        target.startsWith(`${allowedRoot}${sep}`)
    ) {
        return true;
    }

    errors.push(
        `${label} verlässt den erlaubten Datenordner: ${display(target)}`
    );
    return false;
}

async function checkExists(target, label) {
    try {
        await access(target);
        return true;
    }
    catch {
        errors.push(
            `Datei fehlt (${label}): ${display(target)}`
        );
        return false;
    }
}

async function collectFiles(directory, predicate) {
    const result = [];
    const entries = await readdir(
        directory,
        {
            withFileTypes: true
        }
    );

    for (const entry of entries) {
        const full = join(directory, entry.name);

        if (entry.isDirectory()) {
            result.push(
                ...await collectFiles(full, predicate)
            );
        }
        else if (predicate(full)) {
            result.push(full);
        }
    }

    return result;
}

function isLocalAsset(value) {
    return !(
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("//") ||
        value.startsWith("data:") ||
        value.startsWith("mailto:") ||
        value.startsWith("#") ||
        value.startsWith("javascript:")
    );
}

function display(file) {
    return relative(ROOT, file).replaceAll("\\", "/");
}

function formatPath(parts) {
    return parts.length > 0
        ? parts.join(".")
        : "<root>";
}

await import(
    "./validateOverviewCardMetadata.mjs"
);
