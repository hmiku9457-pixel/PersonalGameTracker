import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const SCRIPT_FILE = fileURLToPath(import.meta.url);

await patchCommsMapView();
await patchRepositoryValidator();

await fs.rm(SCRIPT_FILE);
console.log("Comms-Karten-Hotfix erfolgreich angewendet.");

async function patchCommsMapView() {
    const file = path.join(
        ROOT,
        "assets/js/views/commsMapView.js"
    );
    let source = await readRequired(file);

    const obsoleteReference = "sectionManifest.files";
    const currentReference = "sectionManifest.categories";
    const obsoleteCount = countOccurrences(
        source,
        obsoleteReference
    );

    if (obsoleteCount > 0) {
        source = source.replaceAll(
            obsoleteReference,
            currentReference
        );
        console.log(
            `Comms Map: ${obsoleteCount} veraltete Manifest-Referenz(en) ersetzt.`
        );
    }
    else if (!source.includes(currentReference)) {
        throw new Error(
            "Comms Map: Weder sectionManifest.files noch sectionManifest.categories wurde gefunden."
        );
    }
    else {
        console.log(
            "Comms Map: Kategorien-Referenz war bereits aktuell."
        );
    }

    if (source.includes(obsoleteReference)) {
        throw new Error(
            "Comms Map: sectionManifest.files ist nach dem Patch weiterhin vorhanden."
        );
    }

    await writeText(file, source);
}

async function patchRepositoryValidator() {
    const file = path.join(
        ROOT,
        "scripts/validateRepository.mjs"
    );
    let source = await readRequired(file);

    const call = "await validateCommsRuntimeReferences();";
    if (!source.includes(call)) {
        const anchor = "await validateCommsShape();";
        if (!source.includes(anchor)) {
            throw new Error(
                "Validator: Aufruf von validateCommsShape() wurde nicht gefunden."
            );
        }
        source = source.replace(
            anchor,
            `${anchor}\n${call}`
        );
    }

    const functionName =
        "async function validateCommsRuntimeReferences()";
    if (!source.includes(functionName)) {
        const anchor =
            "async function validateHtmlReferences() {";
        if (!source.includes(anchor)) {
            throw new Error(
                "Validator: Einfügepunkt vor validateHtmlReferences() wurde nicht gefunden."
            );
        }

        const validationFunction = `async function validateCommsRuntimeReferences() {
    const checks = [
        {
            file: "assets/js/views/commsMapView.js",
            forbidden: [
                "sectionManifest.files"
            ]
        },
        {
            file: "assets/js/views/commsOverviewView.js",
            forbidden: [
                "commsManifest.sections",
                "section.manifest",
                "sectionManifest.files"
            ]
        }
    ];

    for (const check of checks) {
        const absolute = path.resolve(
            ROOT,
            check.file
        );
        let source;

        try {
            source = await fs.readFile(
                absolute,
                "utf8"
            );
        }
        catch (error) {
            errors.push(
                \`${"${check.file}"}: Datei konnte nicht gelesen werden (\${error.message}).\`
            );
            continue;
        }

        for (const forbidden of check.forbidden) {
            if (source.includes(forbidden)) {
                errors.push(
                    \`${"${check.file}"}: veraltete Comms-Manifest-Referenz \"\${forbidden}\".\`
                );
            }
        }
    }
}

`;

        source = source.replace(
            anchor,
            validationFunction + anchor
        );
    }

    await writeText(file, source);
    console.log(
        "Repository-Validator um Comms-Laufzeitprüfung ergänzt."
    );
}

async function readRequired(file) {
    try {
        return await fs.readFile(file, "utf8");
    }
    catch (error) {
        throw new Error(
            `${relative(file)} konnte nicht gelesen werden: ${error.message}`
        );
    }
}

async function writeText(file, source) {
    const normalized = source
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .replace(/\n*$/, "\n");

    await fs.writeFile(
        file,
        normalized,
        "utf8"
    );
}

function countOccurrences(source, needle) {
    if (needle === "") {
        return 0;
    }

    return source.split(needle).length - 1;
}

function relative(file) {
    return path.relative(ROOT, file)
        .split(path.sep)
        .join("/");
}
