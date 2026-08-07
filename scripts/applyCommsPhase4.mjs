/* =========================================================
   Personal Game Tracker
   Apply Comms Phase 4
   ========================================================= */

import {
    copyFile,
    readFile,
    writeFile
} from "node:fs/promises";
import {
    dirname,
    join,
    resolve
} from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(
    fileURLToPath(import.meta.url)
);
const repositoryRoot = resolve(
    scriptDirectory,
    ".."
);

const mapViewFile = join(
    repositoryRoot,
    "assets/js/views/commsMapView.js"
);
const controllerTargetFile = join(
    repositoryRoot,
    "assets/js/views/commsMapController.js"
);
const controllerSourceFile = join(
    scriptDirectory,
    "phase4-files/commsMapController.js"
);
const trackerCssFile = join(
    repositoryRoot,
    "assets/css/tracker.css"
);
const phase4CssFile = join(
    scriptDirectory,
    "phase4-files/comms-phase4.css"
);

const CSS_START =
    "/* === COMMS PHASE 4 START === */";
const CSS_END =
    "/* === COMMS PHASE 4 END === */";

await copyFile(
    controllerSourceFile,
    controllerTargetFile
);
console.log(
    "assets/js/views/commsMapController.js wurde erstellt."
);

let mapView = await readFile(
    mapViewFile,
    "utf8"
);
mapView = patchMapView(mapView);
await writeFile(
    mapViewFile,
    mapView,
    "utf8"
);
console.log(
    "assets/js/views/commsMapView.js wurde erweitert."
);

const phase4Css = (
    await readFile(
        phase4CssFile,
        "utf8"
    )
).trim();
let trackerCss = await readFile(
    trackerCssFile,
    "utf8"
);
trackerCss = removeMarkedBlock(
    trackerCss,
    CSS_START,
    CSS_END
).trimEnd();
trackerCss += [
    "",
    "",
    CSS_START,
    phase4Css,
    CSS_END,
    ""
].join("\n");

await writeFile(
    trackerCssFile,
    trackerCss,
    "utf8"
);
console.log(
    "assets/css/tracker.css wurde erweitert."
);

validateResult(mapView, trackerCss);
console.log("Comms Phase 4 wurde erfolgreich angewendet.");


function patchMapView(source) {
    let result = source;

    if (!result.includes("./commsMapController.js")) {
        result = replaceOnce(
            result,
            `import {\n    updateActiveGameNavigation\n} from "./navigationView.js";`,
            `import {\n    updateActiveGameNavigation\n} from "./navigationView.js";\n\nimport {\n    createCommsMapController\n} from "./commsMapController.js";`,
            "Import des Kartencontrollers"
        );
    }

    if (!result.includes("zoomIn: \"Karte vergrößern\"")) {
        result = replaceOnce(
            result,
            `        markerPending:\n            "Noch keine Koordinaten hinterlegt. Die Marker folgen in einer späteren Phase.",\n        loadError:`,
            `        markerPending:\n            "Noch keine Koordinaten hinterlegt. Die Marker folgen in einer späteren Phase.",\n        zoomIn: "Karte vergrößern",\n        zoomOut: "Karte verkleinern",\n        resetMap: "Kartenansicht zurücksetzen",\n        enterFullscreen: "Vollbild öffnen",\n        exitFullscreen: "Vollbild schließen",\n        mapInstructions:\n            "Karte mit Mausrad oder Tasten zoomen und durch Ziehen verschieben.",\n        loadError:`,
            "deutsche UI-Texte"
        );
    }

    if (!result.includes("zoomIn: \"Zoom in\"")) {
        result = replaceOnce(
            result,
            `        markerPending:\n            "No coordinates have been added yet. Markers will follow in a later phase.",\n        loadError:`,
            `        markerPending:\n            "No coordinates have been added yet. Markers will follow in a later phase.",\n        zoomIn: "Zoom in",\n        zoomOut: "Zoom out",\n        resetMap: "Reset map view",\n        enterFullscreen: "Open fullscreen",\n        exitFullscreen: "Exit fullscreen",\n        mapInstructions:\n            "Zoom with the mouse wheel or keyboard and drag to move the map.",\n        loadError:`,
            "englische UI-Texte"
        );
    }

   if (!result.includes("createCommsMapController({")) {
       const initializationPattern =
           /^([ \t]*)panelState\.applyInitialState\(\);[ \t]*\r?\n(?:[ \t]*\r?\n)?[ \t]*await loadMapImage\(\s*mapArea\.image,\s*mapArea\.emptyState,\s*sectionManifest\.mapImage\s*\?\?\s*section\.mapImage\s*\?\?\s*"",\s*activeViewController\.signal\s*\);/m;
   
       const initializationMatch =
           result.match(initializationPattern);
   
       if (!initializationMatch) {
           throw new Error(
               "Initialisierung der Kartensteuerung konnte nicht gefunden werden."
           );
       }
   
       const indent = initializationMatch[1];
   
       const replacement = [
           `${indent}panelState.applyInitialState();`,
           "",
           `${indent}const mapController = createCommsMapController({`,
           `${indent}    sectionId: section.id,`,
           `${indent}    area: mapArea.element,`,
           `${indent}    viewport: mapArea.viewport,`,
           `${indent}    canvas: mapArea.canvas,`,
           `${indent}    uiText,`,
           `${indent}    signal: activeViewController.signal`,
           `${indent}});`,
           "",
           `${indent}const mapLoaded = await loadMapImage(`,
           `${indent}    mapArea.image,`,
           `${indent}    mapArea.emptyState,`,
           `${indent}    sectionManifest.mapImage ?? section.mapImage ?? "",`,
           `${indent}    activeViewController.signal`,
           `${indent});`,
           `${indent}mapController.setMapAvailable(mapLoaded);`
       ].join("\n");
   
       result = result.replace(
           initializationPattern,
           replacement
       );
   }

    if (!result.includes("viewport.tabIndex = 0;")) {
        result = replaceOnce(
            result,
            `    const viewport = document.createElement("div");\n    viewport.className = "comms-map-viewport";`,
            `    const viewport = document.createElement("div");\n    viewport.className = "comms-map-viewport";\n    viewport.tabIndex = 0;\n    viewport.setAttribute(\n        "aria-label",\n        uiText.mapInstructions\n    );`,
            "Fokuskonfiguration des Kartenbereichs"
        );
    }

    if (!result.includes("image.draggable = false;")) {
        result = replaceOnce(
            result,
            `    image.className = "comms-map-image";\n    image.hidden = true;`,
            `    image.className = "comms-map-image";\n    image.hidden = true;\n    image.draggable = false;`,
            "Deaktivierung des nativen Bild-Draggers"
        );
    }

    if (!result.includes("        viewport,\n        canvas,")) {
        result = replaceOnce(
            result,
            `    return {\n        element: area,\n        image,\n        emptyState\n    };`,
            `    return {\n        element: area,\n        viewport,\n        canvas,\n        image,\n        emptyState\n    };`,
            "Rückgabe der Karten-DOM-Elemente"
        );
    }

    result = patchLoadMapImage(result);
    return result;
}


function patchLoadMapImage(source) {
    const functionStart = source.indexOf(
        "async function loadMapImage("
    );
    const functionEnd = source.indexOf(
        "\n\n\nfunction countItems",
        functionStart
    );

    if (functionStart < 0 || functionEnd < 0) {
        throw new Error(
            "Die Funktion loadMapImage wurde nicht gefunden."
        );
    }

    let functionSource = source.slice(
        functionStart,
        functionEnd
    );

    if (!functionSource.includes("return true;")) {
        functionSource = replaceOnce(
            functionSource,
            `        image.hidden = true;\n        emptyState.hidden = false;\n        return;`,
            `        image.hidden = true;\n        emptyState.hidden = false;\n        return false;`,
            "Rückgabewert für fehlende Kartenquelle"
        );

        functionSource = replaceOnce(
            functionSource,
            `        image.src = activeMapObjectUrl;\n        image.hidden = false;\n        emptyState.hidden = true;`,
            `        image.src = activeMapObjectUrl;\n        image.hidden = false;\n        emptyState.hidden = true;\n\n        try {\n            await image.decode();\n        }\n        catch (error) {\n            console.debug(\n                "Kartenbild wurde ohne decode()-Bestätigung angezeigt.",\n                error\n            );\n        }\n\n        return true;`,
            "Rückgabewert für erfolgreiches Kartenbild"
        );

        functionSource = replaceOnce(
            functionSource,
            `        if (error?.name === "AbortError") {\n            return;\n        }`,
            `        if (error?.name === "AbortError") {\n            return false;\n        }`,
            "Rückgabewert für abgebrochenes Laden"
        );

        functionSource = replaceOnce(
            functionSource,
            `        image.hidden = true;\n        emptyState.hidden = false;\n    }\n}`,
            `        image.hidden = true;\n        emptyState.hidden = false;\n        return false;\n    }\n}`,
            "Rückgabewert für fehlerhaftes Kartenbild"
        );
    }

    return (
        source.slice(0, functionStart) +
        functionSource +
        source.slice(functionEnd)
    );
}


function replaceOnce(
    source,
    search,
    replacement,
    description
) {
    const firstIndex = source.indexOf(search);

    if (firstIndex < 0) {
        throw new Error(
            `${description} konnte nicht gefunden werden.`
        );
    }

    if (
        source.indexOf(
            search,
            firstIndex + search.length
        ) >= 0
    ) {
        throw new Error(
            `${description} wurde mehrfach gefunden.`
        );
    }

    return source.replace(
        search,
        replacement
    );
}


function removeMarkedBlock(
    source,
    startMarker,
    endMarker
) {
    const start = source.indexOf(startMarker);

    if (start < 0) {
        return source;
    }

    const end = source.indexOf(
        endMarker,
        start
    );

    if (end < 0) {
        throw new Error(
            `CSS-Endmarker fehlt: ${endMarker}`
        );
    }

    return (
        source.slice(0, start) +
        source.slice(end + endMarker.length)
    );
}


function validateResult(
    mapViewSource,
    cssSource
) {
    const requiredJavaScript = [
        "./commsMapController.js",
        "createCommsMapController({",
        "mapController.setMapAvailable(mapLoaded)",
        "viewport.tabIndex = 0;",
        "return true;",
        "return false;"
    ];

    for (const token of requiredJavaScript) {
        if (!mapViewSource.includes(token)) {
            throw new Error(
                `JavaScript-Prüfung fehlgeschlagen: ${token}`
            );
        }
    }

    const requiredCss = [
        CSS_START,
        ".comms-map-controls",
        ".comms-map-area:fullscreen",
        "touch-action: none"
    ];

    for (const token of requiredCss) {
        if (!cssSource.includes(token)) {
            throw new Error(
                `CSS-Prüfung fehlgeschlagen: ${token}`
            );
        }
    }
}
