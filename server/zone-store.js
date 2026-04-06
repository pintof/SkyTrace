import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultZoneStorePath = path.join(__dirname, "data", "zones.json");

function isValidCoordinatePair(point) {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    typeof point[0] === "number" &&
    Number.isFinite(point[0]) &&
    typeof point[1] === "number" &&
    Number.isFinite(point[1])
  );
}

export function normalizeSavedZone(zone) {
  let points = [];

  if (Array.isArray(zone)) {
    points = zone.filter(isValidCoordinatePair);
  } else if (Array.isArray(zone?.points)) {
    points = zone.points.filter(isValidCoordinatePair);
  }

  return {
    points,
    telegramAlertsEnabled:
      typeof zone?.telegramAlertsEnabled === "boolean"
        ? zone.telegramAlertsEnabled
        : true,
  };
}

export function normalizeSavedZones(zones) {
  if (!Array.isArray(zones)) {
    return [];
  }

  return zones
    .map(normalizeSavedZone)
    .filter((zone) => zone.points.length >= 3);
}

export function createZoneStore({ filePath = defaultZoneStorePath } = {}) {
  return {
    async loadZones() {
      try {
        const fileContents = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(fileContents);

        return normalizeSavedZones(parsed?.zones);
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return [];
        }

        throw error;
      }
    },

    async saveZones(zones) {
      const normalizedZones = normalizeSavedZones(zones);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        JSON.stringify({ zones: normalizedZones }, null, 2),
        "utf8",
      );

      return normalizedZones;
    },
  };
}

const zoneStore = createZoneStore();

export function loadSavedZones() {
  return zoneStore.loadZones();
}

export function saveSavedZones(zones) {
  return zoneStore.saveZones(zones);
}
