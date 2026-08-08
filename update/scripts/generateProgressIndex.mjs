import {
    access,
    readFile,
    readdir,
    writeFile
} from "node:fs/promises";

import {
    dirname,
    relative,
    resolve,
    sep
} from "node:path";

const ROOT = process.cwd();
const DATA_ROOT = resolve(ROOT, "data");
const CHECK_ONLY = process.argv.includes("--check");
const errors = [];

const gameDirectories = (
    await readdir(DATA_ROOT, { withFileTypes: true })
)
    .filter(entry => entry.isDirectory())
    .sort((left, right) =>
        left.name.localeCompare(right.name)
    );

for (const directory of gameDirectories) {
    const gameId = directory.name;
    const gameRoot = resolve(DATA_ROOT, gameId);
    const manifestFile = resolve(
        gameRoot,
        "manifest.json"
    );

    if (!await exists(manifestFile)) {
        continue;
    }

    const files = new Map();

    await traverseManifest({
        gameRoot,
        manifestFile,
        files,
        stack: []
    });

    const index = {
        schemaVersion: 1,
        gameId,
        files: Object.fromEntries(
            [...files.entries()]
                .sort(([left], [right]) =>
                    left.localeCompare(right)
                )
        )
    };

    const outputFile = resolve(
        gameRoot,
        "progressIndex.json"
    );

    const expected =
        `${JSON.stringify(index, null, 2)}\n`;

    if (CHECK_ONLY) {
        let current = null;

        try {
            current = await readFile(
                outputFile,
                "utf8"
            );
        }
        catch {
            errors.push(
                `${display(outputFile)} fehlt. ` +
                "Führe npm run generate:progress-index aus."
            );

            continue;
        }

        if (
            normalize(current) !==
            normalize(expected)
        ) {
            errors.push(
                `${display(outputFile)} ist veraltet. ` +
                "Führe npm run generate:progress-index aus."
            );
        }
    }
    else {
        await writeFile(
            outputFile,
            expected,
            "utf8"
        );

        console.info(
            `[Progress Index] ${gameId}: ` +
            `${files.size} Kategoriedateien.`
        );
    }
}

if (errors.length > 0) {
    for (const error of errors) {
        console.error(`[ERROR] ${error}`);
    }

    process.exitCode = 1;
}
else if (CHECK_ONLY) {
    console.info(
        "Alle Fortschrittsindizes sind aktuell."
    );
}

async function traverseManifest({
    gameRoot,
    manifestFile,
    files,
    stack
}) {
    assertInside(
        manifestFile,
        gameRoot
    );

    if (stack.includes(manifestFile)) {
        throw new Error(
            "Manifestzyklus: " +
            [...stack, manifestFile]
                .map(display)
                .join(" -> ")
        );
    }

    const manifest = JSON.parse(
        await readFile(
            manifestFile,
            "utf8"
        )
    );

    const categories =
        Array.isArray(manifest.categories)
            ? manifest.categories
            : [];

    for (const category of categories) {
        if (
            typeof category?.file !== "string" ||
            category.file.trim() === ""
        ) {
            throw new Error(
                `${display(manifestFile)}: ` +
                "Kategorie ohne gültige Datei."
            );
        }

        const target = resolve(
            dirname(manifestFile),
            category.file
        );

        assertInside(
            target,
            gameRoot
        );

        if (category.type === "manifest") {
            await traverseManifest({
                gameRoot,
                manifestFile: target,
                files,
                stack: [
                    ...stack,
                    manifestFile
                ]
            });

            continue;
        }

        const data = JSON.parse(
            await readFile(
                target,
                "utf8"
            )
        );

        const itemIds = [
            ...new Set(
                extractItems(data)
                    .map(item =>
                        typeof item?.id === "string"
                            ? item.id.trim()
                            : ""
                    )
                    .filter(Boolean)
            )
        ];

        files.set(
            toPosix(
                relative(
                    gameRoot,
                    target
                )
            ),
            itemIds
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
            group =>
                Array.isArray(group?.items)
                    ? group.items
                    : []
        );
    }

    if (Array.isArray(data?.sections)) {
        return data.sections.flatMap(
            extractItems
        );
    }

    return [];
}

function assertInside(target, root) {
    if (
        target === root ||
        target.startsWith(
            `${root}${sep}`
        )
    ) {
        return;
    }

    throw new Error(
        "Pfad verlässt den Spielordner: " +
        display(target)
    );
}

async function exists(file) {
    try {
        await access(file);
        return true;
    }
    catch {
        return false;
    }
}

function normalize(value) {
    return String(value)
        .replace(/\r\n/g, "\n")
        .trimEnd();
}

function toPosix(value) {
    return value.replaceAll("\\", "/");
}

function display(file) {
    return toPosix(
        relative(ROOT, file)
    );
}
