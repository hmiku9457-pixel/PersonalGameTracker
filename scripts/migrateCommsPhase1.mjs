#!/usr/bin/env node

/**
 * Personal Game Tracker – The Division 2 Comms Phase 1 migration
 *
 * Reads the current split Comms data, assigns every item to one of the new
 * sections (Washington, New York, Brooklyn, Missions), preserves every item ID,
 * adds a coordinate-ready location object and writes a validated V2 structure.
 *
 * The current live `comms` directory is never changed by this script.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

const DEFAULT_INPUT = path.join(
  REPO_ROOT,
  "data",
  "theDivision2",
  "collectibles",
  "comms"
);

const DEFAULT_OUTPUT = path.join(
  REPO_ROOT,
  "data",
  "theDivision2",
  "collectibles",
  "commsV2"
);

const DEFAULT_OVERRIDES = path.join(SCRIPT_DIR, "comms-region-overrides.json");

const REGION_CONFIG = Object.freeze({
  washington: {
    id: "washington",
    name: { de: "Washington, D.C.", en: "Washington, D.C." },
    view: "map",
    map: "washington"
  },
  newYork: {
    id: "newYork",
    name: { de: "New York", en: "New York" },
    view: "map",
    map: "newYork"
  },
  brooklyn: {
    id: "brooklyn",
    name: { de: "Brooklyn", en: "Brooklyn" },
    view: "map",
    map: "brooklyn"
  },
  missions: {
    id: "missions",
    name: { de: "Missionen", en: "Missions" },
    view: "list",
    map: null
  }
});

const VALID_REGIONS = new Set(Object.keys(REGION_CONFIG));

const SOURCE_DEFAULTS = Object.freeze({
  coreFactionsAndInstitutions: "washington",
  washingtonWorld: "washington",
  washingtonSettlements: "washington",
  washingtonProfiles: "washington",
  newYorkWorld: "newYork",
  newYorkProfiles: "newYork",
  battleForBrooklyn: "brooklyn",
  specialOperations: "missions",
  manhuntsLegacy: "missions",
  manhuntsReconstruction: "missions",
  manhuntsRogueNetwork: "missions",
  manhuntsCurrent: "missions",
  incursionAndBTSU: "missions",
  descent: "missions"
});

const EXPLICIT_WORLD_ACQUISITION = [
  "frei auffindbar",
  "audiogerät",
  "audio device",
  "open-world-collectible",
  "open world collectible"
];

const MISSION_ACQUISITION = [
  "missionsgebunden",
  "mission reward",
  "missionsbelohnung",
  "automatische belohnung",
  "automatisch freigeschaltet",
  "boss-drop",
  "boss drop",
  "bossbelohnung",
  "manhunt-belohnung",
  "manhunt reward",
  "descent-belohnung",
  "descent reward",
  "incursion-belohnung",
  "incursion reward",
  "retaliation-belohnung",
  "retaliation reward",
  "aktivitätsbelohnung",
  "activity reward"
];

const MISSION_ACTIVITY = [
  "mission",
  "einsatz",
  "stronghold",
  "festung",
  "manhunt",
  "descent",
  "incursion",
  "retaliation",
  "raid",
  "classified assignment",
  "geheimer auftrag",
  "expedition",
  "kenly college",
  "pentagon",
  "darpa",
  "coney island",
  "camp white oak",
  "manning national zoo",
  "tidal basin",
  "the summit",
  "countdown"
];

const BROOKLYN_TERMS = [
  "brooklyn",
  "dumbo",
  "brooklyn heights",
  "brooklyn bridge"
];

const NEW_YORK_TERMS = [
  "new york",
  "lower manhattan",
  "battery park",
  "civic center",
  "financial district",
  "two bridges",
  "haven"
];

function parseArguments(argv) {
  const result = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    overrides: DEFAULT_OVERRIDES,
    clean: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--input") {
      result.input = path.resolve(argv[++index] ?? "");
    } else if (argument === "--output") {
      result.output = path.resolve(argv[++index] ?? "");
    } else if (argument === "--overrides") {
      result.overrides = path.resolve(argv[++index] ?? "");
    } else if (argument === "--no-clean") {
      result.clean = false;
    } else if (argument === "--help" || argument === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unbekanntes Argument: ${argument}`);
    }
  }

  return result;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/migrateCommsPhase1.mjs [options]

Options:
  --input <path>       Existing Comms directory
  --output <path>      Target V2 directory
  --overrides <path>   Optional item/group override JSON
  --no-clean           Do not remove an existing output directory first
  -h, --help           Show this help
`);
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(value, terms) {
  const normalized = normalize(value);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function detailsToMap(item) {
  const entries = Array.isArray(item.details) ? item.details : [];
  const map = new Map();

  for (const detail of entries) {
    const key = normalize(detail?.label);
    if (!key) continue;
    map.set(key, String(detail?.value ?? ""));
  }

  return map;
}

function firstDetail(details, labels) {
  for (const label of labels) {
    const value = details.get(normalize(label));
    if (value) return value;
  }
  return "";
}

function getSourceId(category, fileName) {
  if (category?.id) return category.id;
  return path.basename(fileName, path.extname(fileName));
}

function validateOverrideRegion(region, context) {
  if (!VALID_REGIONS.has(region)) {
    throw new Error(
      `${context} verweist auf die ungültige Region „${region}“. ` +
      `Erlaubt: ${[...VALID_REGIONS].join(", ")}`
    );
  }
}

function classifyItem({ item, group, sourceId, overrides }) {
  const itemOverride = overrides.items?.[item.id];
  if (itemOverride) {
    validateOverrideRegion(itemOverride, `Item-Override ${item.id}`);
    return { region: itemOverride, reason: "item-override", ambiguous: false };
  }

  const groupOverride = overrides.groups?.[group.id];
  if (groupOverride) {
    validateOverrideRegion(groupOverride, `Gruppen-Override ${group.id}`);
    return { region: groupOverride, reason: "group-override", ambiguous: false };
  }

  const details = detailsToMap(item);
  const acquisition = firstDetail(details, ["Erwerbsart", "Acquisition"]);
  const activity = firstDetail(details, ["Aktivität", "Activity"]);
  const area = firstDetail(details, ["Gebiet", "Bereich", "Region", "Area"]);
  const collection = firstDetail(details, ["Sammlung", "Collection"]);

  const combinedLocationText = [
    area,
    collection,
    item.description,
    item.name
  ].join(" | ");

  const explicitWorld = includesAny(acquisition, EXPLICIT_WORLD_ACQUISITION);
  const explicitMission =
    includesAny(acquisition, MISSION_ACQUISITION) ||
    includesAny(activity, MISSION_ACTIVITY);

  // A clearly identified free-world device wins over nearby mission names,
  // e.g. an item located outside a Stronghold entrance.
  if (!explicitWorld && explicitMission) {
    return { region: "missions", reason: "mission-metadata", ambiguous: false };
  }

  // Coney Island and the Pentagon do not belong to the planned Lower Manhattan
  // map and therefore remain in the list-only Missions section.
  if (includesAny(area, ["coney island", "pentagon", "darpa"])) {
    return { region: "missions", reason: "separate-mission-map", ambiguous: false };
  }

  if (includesAny(combinedLocationText, BROOKLYN_TERMS)) {
    return { region: "brooklyn", reason: "brooklyn-location", ambiguous: false };
  }

  if (includesAny(combinedLocationText, NEW_YORK_TERMS)) {
    return { region: "newYork", reason: "new-york-location", ambiguous: false };
  }

  const sourceDefault = SOURCE_DEFAULTS[sourceId];
  if (sourceDefault) {
    return {
      region: sourceDefault,
      reason: "source-default",
      ambiguous: !area && !activity && !acquisition
    };
  }

  return {
    region: "washington",
    reason: "fallback-washington",
    ambiguous: true
  };
}

async function readJson(filePath) {
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Datei konnte nicht gelesen werden: ${filePath}\n${error.message}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Ungültiges JSON: ${filePath}\n${error.message}`);
  }
}

async function readOverrides(filePath) {
  try {
    const data = await readJson(filePath);
    return {
      items: data.items ?? {},
      groups: data.groups ?? {}
    };
  } catch (error) {
    if (error.cause?.code === "ENOENT" || error.message.includes("konnte nicht gelesen")) {
      return { items: {}, groups: {} };
    }
    throw error;
  }
}

function clone(value) {
  return structuredClone(value);
}

function ensureLocation(item, region) {
  const config = REGION_CONFIG[region];
  const nextItem = clone(item);

  nextItem.location = {
    ...(typeof nextItem.location === "object" && nextItem.location !== null
      ? nextItem.location
      : {}),
    region,
    map: config.map,
    coordinates: nextItem.location?.coordinates ?? null
  };

  return nextItem;
}

function createOutputFile(sourceData, sourceId, fileName, region, groups) {
  const itemCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  return {
    ...clone(sourceData),
    id: `${sourceData.id ?? `comms-${sourceId}`}-${region}`,
    name: `${sourceData.name ?? sourceId} – ${REGION_CONFIG[region].name.de}`,
    description:
      `${sourceData.description ?? "Comms aus The Division 2."} ` +
      `Für die neue Bereichsansicht gefiltert: ${REGION_CONFIG[region].name.de}.`,
    lastUpdated: "2026-08-04",
    dataStatus: {
      ...(sourceData.dataStatus ?? {}),
      scope: "individual-items",
      migrationVersion: "comms-phase1-v2",
      sourceFile: fileName,
      destination: region,
      itemCount,
      groupCount: groups.length,
      coordinatesCompleted: groups.reduce(
        (sum, group) =>
          sum + group.items.filter((item) => item.location?.coordinates !== null).length,
        0
      )
    },
    groups
  };
}

function buildRegionManifest(region, files) {
  const config = REGION_CONFIG[region];
  const itemCount = files.reduce((sum, file) => sum + file.itemCount, 0);
  const groupCount = files.reduce((sum, file) => sum + file.groupCount, 0);

  return {
    id: `comms-${region}`,
    name: config.name,
    description:
      region === "missions"
        ? {
            de: "Missions-, Manhunt-, Incursion-, Descent- und weitere aktivitätsgebundene Comms.",
            en: "Mission, Manhunt, Incursion, Descent and other activity-bound Comms."
          }
        : {
            de: `Frei auffindbare Comms auf der Karte von ${config.name.de}.`,
            en: `Freely discoverable Comms on the ${config.name.en} map.`
          },
    lastUpdated: "2026-08-04",
    view: config.view,
    map: config.map,
    dataStatus: {
      scope: "region-manifest",
      itemCount,
      groupCount,
      fileCount: files.length,
      coordinatesCompleted: 0
    },
    files
  };
}

function buildRootManifest(regionManifests, sourceManifest) {
  const sections = Object.keys(REGION_CONFIG).map((region) => {
    const config = REGION_CONFIG[region];
    const manifest = regionManifests[region];

    return {
      id: config.id,
      name: config.name,
      view: config.view,
      map: config.map,
      manifest: `${region}/manifest.json`,
      itemCount: manifest.dataStatus.itemCount,
      groupCount: manifest.dataStatus.groupCount
    };
  });

  const itemCount = sections.reduce((sum, section) => sum + section.itemCount, 0);

  return {
    id: "comms",
    name: { de: "Comms", en: "Comms" },
    description: {
      de: "Comms nach Washington, New York, Brooklyn und Missionen gegliedert.",
      en: "Comms organized into Washington, New York, Brooklyn and Missions."
    },
    lastUpdated: "2026-08-04",
    dataStatus: {
      scope: "section-manifest",
      migrationVersion: "comms-phase1-v2",
      sourceItemCount: sourceManifest.dataStatus?.itemCount ?? itemCount,
      itemCount,
      sectionCount: sections.length,
      itemIdsPreserved: true,
      coordinatesCompleted: 0
    },
    sections
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createEmptyBuckets() {
  return Object.fromEntries(
    Object.keys(REGION_CONFIG).map((region) => [region, new Map()])
  );
}

async function migrate(options) {
  const sourceManifestPath = path.join(options.input, "manifest.json");
  const sourceManifest = await readJson(sourceManifestPath);
  const overrides = await readOverrides(options.overrides);

  if (!Array.isArray(sourceManifest.categories)) {
    throw new Error(
      `Das Quellmanifest enthält kein categories-Array: ${sourceManifestPath}`
    );
  }

  if (path.resolve(options.input) === path.resolve(options.output)) {
    throw new Error("Input und Output dürfen nicht identisch sein.");
  }

  if (options.clean) {
    await fs.rm(options.output, { recursive: true, force: true });
  }
  await fs.mkdir(options.output, { recursive: true });

  const buckets = createEmptyBuckets();
  const inputIds = [];
  const outputIds = [];
  const ambiguous = [];
  const assignments = [];
  const sourceSummary = [];

  for (const category of sourceManifest.categories) {
    const fileName = category.file;
    const sourceId = getSourceId(category, fileName);
    const sourcePath = path.join(options.input, fileName);
    const sourceData = await readJson(sourcePath);

    if (!Array.isArray(sourceData.groups)) {
      throw new Error(`groups-Array fehlt in ${sourcePath}`);
    }

    const perRegionGroups = Object.fromEntries(
      Object.keys(REGION_CONFIG).map((region) => [region, []])
    );

    for (const group of sourceData.groups) {
      if (!Array.isArray(group.items)) {
        throw new Error(`items-Array fehlt in Gruppe ${group.id} (${fileName})`);
      }

      const itemsByRegion = Object.fromEntries(
        Object.keys(REGION_CONFIG).map((region) => [region, []])
      );

      for (const item of group.items) {
        if (!item?.id) {
          throw new Error(`Item ohne ID in Gruppe ${group.id} (${fileName})`);
        }

        inputIds.push(item.id);
        const classification = classifyItem({
          item,
          group,
          sourceId,
          overrides
        });

        const migratedItem = ensureLocation(item, classification.region);
        itemsByRegion[classification.region].push(migratedItem);
        outputIds.push(migratedItem.id);

        assignments.push({
          itemId: item.id,
          groupId: group.id,
          sourceFile: fileName,
          region: classification.region,
          reason: classification.reason
        });

        if (classification.ambiguous) {
          ambiguous.push({
            itemId: item.id,
            itemName: item.name,
            groupId: group.id,
            sourceFile: fileName,
            assignedRegion: classification.region,
            reason: classification.reason
          });
        }
      }

      for (const region of Object.keys(REGION_CONFIG)) {
        if (itemsByRegion[region].length === 0) continue;
        perRegionGroups[region].push({
          ...clone(group),
          items: itemsByRegion[region]
        });
      }
    }

    const destinations = [];

    for (const region of Object.keys(REGION_CONFIG)) {
      const groups = perRegionGroups[region];
      if (groups.length === 0) continue;

      const outputFile = createOutputFile(
        sourceData,
        sourceId,
        fileName,
        region,
        groups
      );

      buckets[region].set(fileName, outputFile);
      destinations.push({
        region,
        itemCount: outputFile.dataStatus.itemCount,
        groupCount: outputFile.dataStatus.groupCount
      });
    }

    sourceSummary.push({
      sourceId,
      sourceFile: fileName,
      destinations
    });
  }

  const inputSet = new Set(inputIds);
  const outputSet = new Set(outputIds);
  const duplicateInputIds = inputIds.filter(
    (id, index) => inputIds.indexOf(id) !== index
  );
  const duplicateOutputIds = outputIds.filter(
    (id, index) => outputIds.indexOf(id) !== index
  );
  const missingIds = [...inputSet].filter((id) => !outputSet.has(id));
  const unexpectedIds = [...outputSet].filter((id) => !inputSet.has(id));

  if (duplicateInputIds.length > 0) {
    throw new Error(
      `Die Quelldaten enthalten doppelte Item-IDs: ${[...new Set(duplicateInputIds)].join(", ")}`
    );
  }

  if (
    duplicateOutputIds.length > 0 ||
    missingIds.length > 0 ||
    unexpectedIds.length > 0 ||
    inputIds.length !== outputIds.length
  ) {
    throw new Error(
      "ID-Validierung fehlgeschlagen. Details stehen nach Behebung im Migrationsskript."
    );
  }

  const regionManifests = {};

  for (const region of Object.keys(REGION_CONFIG)) {
    const manifestEntries = [];

    for (const [fileName, outputFile] of buckets[region]) {
      await writeJson(path.join(options.output, region, fileName), outputFile);

      manifestEntries.push({
        id: path.basename(fileName, ".json"),
        name: outputFile.name,
        file: fileName,
        itemCount: outputFile.dataStatus.itemCount,
        groupCount: outputFile.dataStatus.groupCount
      });
    }

    regionManifests[region] = buildRegionManifest(region, manifestEntries);
    await writeJson(
      path.join(options.output, region, "manifest.json"),
      regionManifests[region]
    );
  }

  const rootManifest = buildRootManifest(regionManifests, sourceManifest);
  await writeJson(path.join(options.output, "manifest.json"), rootManifest);

  const report = {
    migrationVersion: "comms-phase1-v2",
    generatedAt: new Date().toISOString(),
    inputDirectory: options.input,
    outputDirectory: options.output,
    validation: {
      valid: true,
      inputItemCount: inputIds.length,
      outputItemCount: outputIds.length,
      uniqueInputIds: inputSet.size,
      uniqueOutputIds: outputSet.size,
      itemIdsPreserved: true,
      duplicateInputIds: [],
      duplicateOutputIds: [],
      missingIds: [],
      unexpectedIds: []
    },
    regions: Object.fromEntries(
      Object.keys(REGION_CONFIG).map((region) => [
        region,
        {
          itemCount: regionManifests[region].dataStatus.itemCount,
          groupCount: regionManifests[region].dataStatus.groupCount,
          fileCount: regionManifests[region].dataStatus.fileCount
        }
      ])
    ),
    ambiguousCount: ambiguous.length,
    ambiguous,
    sourceSummary,
    assignments
  };

  await writeJson(path.join(options.output, "migration-report.json"), report);

  console.log("Comms Phase 1 erfolgreich erzeugt.");
  console.log(`Input:  ${options.input}`);
  console.log(`Output: ${options.output}`);
  console.log(`Items:  ${inputIds.length} / ${outputIds.length}`);
  console.log(`IDs:    vollständig und unverändert`);
  console.log(`Prüffälle: ${ambiguous.length}`);

  for (const region of Object.keys(REGION_CONFIG)) {
    const stats = report.regions[region];
    console.log(
      `${region.padEnd(10)} ${String(stats.itemCount).padStart(4)} Items, ` +
      `${String(stats.groupCount).padStart(2)} Gruppen, ${stats.fileCount} Dateien`
    );
  }
}

try {
  const options = parseArguments(process.argv.slice(2));
  await migrate(options);
} catch (error) {
  console.error("\nMigration fehlgeschlagen:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
