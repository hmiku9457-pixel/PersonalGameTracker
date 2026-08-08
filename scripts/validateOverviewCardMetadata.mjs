import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataRoot = path.join(root, "data");
const manifestPaths = await findFiles(dataRoot, "manifest.json");
const errors = [];

for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(
        await fs.readFile(manifestPath, "utf8")
    );

    for (const entry of manifest.categories || []) {
        const label = path.relative(root, manifestPath) + " -> " + entry.id;

        if (!isLocalizedPair(entry.description)) {
            errors.push(label + ": description muss de und en enthalten");
        }

        if (!Number.isInteger(entry.itemCount) || entry.itemCount < 0) {
            errors.push(label + ": itemCount fehlt oder ist ungültig");
        }

        if (!isLocalizedPair(entry.itemLabel)) {
            errors.push(label + ": itemLabel muss de und en enthalten");
        }

        if (entry.type === "manifest") {
            if (!Number.isInteger(entry.groupCount) || entry.groupCount <= 0) {
                errors.push(label + ": Manifestkarte benötigt groupCount");
            }
        }

        if (entry.groupCount !== undefined) {
            if (!Number.isInteger(entry.groupCount) || entry.groupCount <= 0) {
                errors.push(label + ": groupCount ist ungültig");
            }

            if (!isLocalizedPair(entry.groupLabel)) {
                errors.push(label + ": groupLabel muss de und en enthalten");
            }
        }
    }
}

if (errors.length > 0) {
    throw new Error(
        "Ungültige Übersichtskarten-Metadaten:\n- " +
        errors.join("\n- ")
    );
}

console.log(
    "Übersichtskarten-Metadaten geprüft: " +
    manifestPaths.length +
    " Manifeste."
);

function isLocalizedPair(value) {
    return Boolean(
        value &&
        typeof value === "object" &&
        typeof value.de === "string" &&
        value.de.trim() &&
        typeof value.en === "string" &&
        value.en.trim()
    );
}

async function findFiles(directory, fileName) {
    const results = [];
    const entries = await fs.readdir(directory, {
        withFileTypes: true
    });

    for (const entry of entries) {
        const absolutePath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            results.push(...await findFiles(absolutePath, fileName));
        } else if (entry.name === fileName) {
            results.push(absolutePath);
        }
    }

    return results;
}
