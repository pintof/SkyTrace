import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultZoneEventStorePath = path.join(
  __dirname,
  "data",
  "zone-events.json",
);

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

function normalizeZoneEventType(type) {
  return type === "entered" || type === "exited" ? type : null;
}

export function normalizeZoneEvent(event) {
  const type = normalizeZoneEventType(event?.type);

  if (!type || !Number.isInteger(event?.zoneIndex) || event.zoneIndex < 0) {
    return null;
  }

  return {
    callsign:
      typeof event?.callsign === "string" && event.callsign.trim()
        ? event.callsign.trim()
        : "Unknown aircraft",
    id:
      typeof event?.id === "string" && event.id.trim()
        ? event.id.trim()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    position: isValidCoordinatePair(event?.position) ? event.position : null,
    timestamp:
      typeof event?.timestamp === "number" && Number.isFinite(event.timestamp)
        ? event.timestamp
        : Date.now(),
    type,
    zoneIndex: event.zoneIndex,
  };
}

export function normalizeZoneEvents(events) {
  if (!Array.isArray(events)) {
    return [];
  }

  return events
    .map(normalizeZoneEvent)
    .filter((event) => event !== null)
    .sort(
      (leftEvent, rightEvent) => rightEvent.timestamp - leftEvent.timestamp,
    );
}

export function createZoneEventStore({
  filePath = defaultZoneEventStorePath,
} = {}) {
  return {
    async loadZoneEvents() {
      try {
        const fileContents = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(fileContents);

        return normalizeZoneEvents(parsed?.events);
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

    async saveZoneEvents(events) {
      const normalizedEvents = normalizeZoneEvents(events);

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        JSON.stringify({ events: normalizedEvents }, null, 2),
        "utf8",
      );

      return normalizedEvents;
    },
  };
}

const zoneEventStore = createZoneEventStore();

export function loadZoneEvents() {
  return zoneEventStore.loadZoneEvents();
}

export function saveZoneEvents(events) {
  return zoneEventStore.saveZoneEvents(events);
}
