import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createZoneStore,
  normalizeSavedZone,
  normalizeSavedZones,
} from "./zone-store.js";

test("normalizeSavedZone converts legacy polygon arrays into saved zone objects", () => {
  const zone = normalizeSavedZone([
    [51.5, -0.09],
    [51.51, -0.08],
    [51.49, -0.1],
  ]);

  assert.deepEqual(zone, {
    points: [
      [51.5, -0.09],
      [51.51, -0.08],
      [51.49, -0.1],
    ],
    telegramAlertsEnabled: true,
  });
});

test("normalizeSavedZones filters invalid and undersized zones", () => {
  const zones = normalizeSavedZones([
    {
      points: [
        [51.5, -0.09],
        [51.51, -0.08],
        [51.49, -0.1],
      ],
      telegramAlertsEnabled: false,
    },
    {
      points: [
        [51.5, -0.09],
        [51.51, -0.08],
      ],
    },
    {
      points: [
        [51.5, "bad"],
        [51.51, -0.08],
        [51.49, -0.1],
      ],
    },
  ]);

  assert.deepEqual(zones, [
    {
      points: [
        [51.5, -0.09],
        [51.51, -0.08],
        [51.49, -0.1],
      ],
      telegramAlertsEnabled: false,
    },
  ]);
});

test("zone store persists normalized zones to disk and reloads them", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "skytrace-zones-"));
  const filePath = path.join(tempDir, "zones.json");
  const store = createZoneStore({ filePath });

  const savedZones = await store.saveZones([
    {
      points: [
        [51.5, -0.09],
        [51.51, -0.08],
        [51.49, -0.1],
      ],
      telegramAlertsEnabled: true,
    },
    {
      points: [
        [51.5, -0.09],
        [51.51, -0.08],
      ],
    },
  ]);

  const loadedZones = await store.loadZones();

  assert.equal(savedZones.length, 1);
  assert.deepEqual(loadedZones, savedZones);
});
