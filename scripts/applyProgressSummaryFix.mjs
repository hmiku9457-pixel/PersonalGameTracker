import {
    cp,
    readFile,
    writeFile
} from "node:fs/promises";

import {
    join
} from "node:path";

const ROOT = process.cwd();
const UPDATE_ROOT = join(ROOT, "update");

await cp(
    join(UPDATE_ROOT, "assets"),
    join(ROOT, "assets"),
    {
        recursive: true,
        force: true
    }
);

await cp(
    join(UPDATE_ROOT, "scripts"),
    join(ROOT, "scripts"),
    {
        recursive: true,
        force: true
    }
);

await cp(
    join(UPDATE_ROOT, "tests"),
    join(ROOT, "tests"),
    {
        recursive: true,
        force: true
    }
);

const packageFile = join(ROOT, "package.json");
const packageJson = JSON.parse(
    await readFile(packageFile, "utf8")
);

packageJson.scripts ??= {};
packageJson.scripts["generate:progress-index"] =
    "node scripts/generateProgressIndex.mjs";
packageJson.scripts["check:progress-index"] =
    "node scripts/generateProgressIndex.mjs --check";

await writeFile(
    packageFile,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8"
);

console.info("Progress-Summary-Fix wurde angewendet.");
