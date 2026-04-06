import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createZoneEventStore,
  normalizeZoneEvent,
  normalizeZoneEvents,
} from "./zone-event-store.js";

test("normalizeZoneEvent keeps valid zone event fields", () => {
  const event = normalizeZoneEvent({
    callsign: " TEST123 ",
    id: "evt-1",
    position: [51.5, -0.09],
    timestamp: 1_710_000_000_000,
    type: "entered",
    zoneIndex: 2,
  });

  assert.deepEqual(event, {
    callsign: "TEST123",
    id: "evt-1",
    position: [51.5, -0.09],
    timestamp: 1_710_000_000_000,
    type: "entered",
    zoneIndex: 2,
  });
});

test("normalizeZoneEvents filters invalid entries and sorts newest first", () => {
  const events = normalizeZoneEvents([
    {
      callsign: "A",
      id: "old",
      position: [51.5, -0.09],
      timestamp: 100,
      type: "entered",
      zoneIndex: 0,
    },
    {
      callsign: "B",
      id: "new",
      position: [51.6, -0.08],
      timestamp: 200,
      type: "exited",
      zoneIndex: 1,
    },
    {
      callsign: "ignored",
      type: "entered",
      zoneIndex: -1,
    },
  ]);

  assert.deepEqual(events, [
    {
      callsign: "B",
      id: "new",
      position: [51.6, -0.08],
      timestamp: 200,
      type: "exited",
      zoneIndex: 1,
    },
    {
      callsign: "A",
      id: "old",
      position: [51.5, -0.09],
      timestamp: 100,
      type: "entered",
      zoneIndex: 0,
    },
  ]);
});

test("zone event store persists normalized events to disk and reloads them", async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "skytrace-zone-events-"),
  );
  const filePath = path.join(tempDir, "zone-events.json");
  const store = createZoneEventStore({ filePath });

  const savedEvents = await store.saveZoneEvents([
    {
      callsign: "TEST123",
      id: "evt-2",
      position: [51.5, -0.09],
      timestamp: 200,
      type: "entered",
      zoneIndex: 0,
    },
    {
      callsign: "ignored",
      id: "evt-bad",
      position: [51.5, -0.09],
      timestamp: 300,
      type: "entered",
      zoneIndex: -1,
    },
    {
      callsign: "TEST123",
      id: "evt-1",
      position: [51.51, -0.08],
      timestamp: 100,
      type: "exited",
      zoneIndex: 0,
    },
  ]);

  const loadedEvents = await store.loadZoneEvents();

  assert.deepEqual(savedEvents, [
    {
      callsign: "TEST123",
      id: "evt-2",
      position: [51.5, -0.09],
      timestamp: 200,
      type: "entered",
      zoneIndex: 0,
    },
    {
      callsign: "TEST123",
      id: "evt-1",
      position: [51.51, -0.08],
      timestamp: 100,
      type: "exited",
      zoneIndex: 0,
    },
  ]);
  assert.deepEqual(loadedEvents, savedEvents);
});
