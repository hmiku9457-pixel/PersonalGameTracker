import {
    readFile,
    writeFile
} from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const controllerPath = path.join(
    root,
    "assets/js/views/commsMapController.js"
);
const mapViewPath = path.join(
    root,
    "assets/js/views/commsMapView.js"
);
const cssPath = path.join(
    root,
    "assets/css/tracker.css"
);

await patchController();
await patchMapView();
await patchCss();

console.log("Comms Phase 4 Hotfix wurde angewendet.");

async function patchController() {
    let source = await readFile(controllerPath, "utf8");

    // Die Steuerung darf nicht innerhalb des verschiebbaren Viewports liegen.
    // Sonst erreichen Klicks auf Reset/Vollbild auch dessen Pointer- und
    // Doppelklick-Handler und lösen zusätzliche Karteninteraktionen aus.
    if (!/const controls = createMapControls\(\s*area,\s*uiText\s*\);/.test(source)) {
        source = replaceRequired(
            source,
            /const controls = createMapControls\(\s*viewport,\s*uiText\s*\);/,
            [
                "const controls = createMapControls(",
                "        area,",
                "        uiText",
                "    );"
            ].join("\n"),
            "Container der Kartensteuerung"
        );
    }

    // Browser-eigenes Ziehen von Bildern und SVGs vollständig unterbinden.
    if (!source.includes('"dragstart"')) {
        source = replaceRequired(
            source,
            /([ \t]*)viewport\.addEventListener\(\s*"dblclick",/,
            [
                "$1viewport.addEventListener(",
                '$1    "dragstart",',
                "$1    (event) => event.preventDefault(),",
                "$1    { signal }",
                "$1);",
                "$1viewport.addEventListener(",
                '$1    "dblclick",'
            ].join("\n"),
            "Dragstart-Schutz"
        );
    }

    // Pointerdown muss die native Browser-Interaktion stoppen, bevor
    // Pointer Capture und die eigene Pan-Logik beginnen.
    if (!/event\.preventDefault\(\);\s*viewport\.setPointerCapture/.test(source)) {
        source = replaceRequired(
            source,
            /([ \t]*)viewport\.setPointerCapture\(event\.pointerId\);/,
            [
                "$1event.preventDefault();",
                "$1viewport.setPointerCapture(event.pointerId);"
            ].join("\n"),
            "preventDefault vor Pointer Capture"
        );
    }

    // Ein verlorenes Pointer Capture muss denselben Aufräumweg wie
    // pointerup/pointercancel verwenden, damit ein zweiter Drag sicher klappt.
    if (!source.includes('"lostpointercapture"')) {
        source = replaceRequired(
            source,
            /([ \t]*)viewport\.addEventListener\(\s*"pointercancel",\s*finishPointer,\s*\{ signal \}\s*\);/,
            [
                '$1viewport.addEventListener(',
                '$1    "pointercancel",',
                '$1    finishPointer,',
                '$1    { signal }',
                '$1);',
                '$1viewport.addEventListener(',
                '$1    "lostpointercapture",',
                '$1    finishPointer,',
                '$1    { signal }',
                '$1);'
            ].join("\n"),
            "lostpointercapture-Handler"
        );
    }

    await writeFile(controllerPath, source, "utf8");
    console.log("assets/js/views/commsMapController.js wurde korrigiert.");
}

async function patchMapView() {
    let source = await readFile(mapViewPath, "utf8");

    if (!source.includes("image.draggable = false;")) {
        source = replaceRequired(
            source,
            /([ \t]*)image\.className = "comms-map-image";/,
            [
                '$1image.className = "comms-map-image";',
                "$1image.draggable = false;"
            ].join("\n"),
            "draggable-Eigenschaft des Kartenbildes"
        );
    }

    await writeFile(mapViewPath, source, "utf8");
    console.log("assets/js/views/commsMapView.js wurde korrigiert.");
}

async function patchCss() {
    let source = await readFile(cssPath, "utf8");
    const marker = "/* === COMMS PHASE 4 HOTFIX START === */";

    if (!source.includes(marker)) {
        source = `${source.trimEnd()}\n\n${marker}\n` +
`/* Bedienleiste ist kein Teil der verschiebbaren Kartenfläche. */
.comms-map-controls {
    cursor: default;
    touch-action: manipulation;
    user-select: none;
}

/* Native Browser-Drag-Gesten dürfen die eigene Pan-Logik nicht übernehmen. */
.comms-map-canvas,
.comms-map-image {
    -webkit-user-drag: none;
    user-select: none;
}
/* === COMMS PHASE 4 HOTFIX END === */\n`;
    }

    await writeFile(cssPath, source, "utf8");
    console.log("assets/css/tracker.css wurde ergänzt.");
}

function replaceRequired(source, pattern, replacement, description) {
    if (!pattern.test(source)) {
        throw new Error(
            `${description} konnte nicht gefunden werden.`
        );
    }

    return source.replace(pattern, replacement);
}
