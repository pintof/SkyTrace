import test from "node:test";
import assert from "node:assert/strict";

import {
  createTelegramAlertService,
  formatZoneEntryTelegramAlert,
} from "./telegram-alerts.js";

function withTelegramEnv() {
  process.env.TELEGRAM_ALERTS_ENABLED = "true";
  process.env.TELEGRAM_BOT_TOKEN = "bot-token";
  process.env.TELEGRAM_CHAT_ID = "123456789";
  process.env.TELEGRAM_ALERT_COOLDOWN_MS = "60000";
}

test.afterEach(() => {
  delete process.env.TELEGRAM_ALERTS_ENABLED;
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_ALERT_COOLDOWN_MS;
});

test("formatZoneEntryTelegramAlert includes the aircraft, zone, time, and coordinates", () => {
  const message = formatZoneEntryTelegramAlert({
    callsign: "DAL123 ",
    enteredAt: Date.UTC(2026, 3, 6, 12, 30, 0),
    icao24: "39de4f",
    position: [51.5074, -0.1278],
    zoneIndex: 1,
  });

  assert.match(message, /DAL123/);
  assert.match(message, /39DE4F/);
  assert.match(message, /Zone: 2/);
  assert.match(message, /2026-04-06T12:30:00.000Z/);
  assert.match(message, /51.5074, -0.1278/);
});

test("createTelegramAlertService returns disabled when alerts are off", async () => {
  let fetchCalls = 0;
  const service = createTelegramAlertService({
    async fetchImpl() {
      fetchCalls += 1;
      return {
        ok: true,
        async json() {
          return { result: { message_id: 1 } };
        },
      };
    },
  });

  const result = await service.sendZoneEntryAlert({ zoneIndex: 0 });

  assert.equal(result.status, "disabled");
  assert.equal(fetchCalls, 0);
});

test("createTelegramAlertService sends a Telegram message when configured", async () => {
  withTelegramEnv();

  const fetchCalls = [];
  const service = createTelegramAlertService({
    async fetchImpl(url, options) {
      fetchCalls.push({ url, options });

      return {
        ok: true,
        async json() {
          return { result: { message_id: 321 } };
        },
      };
    },
  });

  const result = await service.sendZoneEntryAlert({
    callsign: "DAL123",
    enteredAt: Date.UTC(2026, 3, 6, 12, 30, 0),
    icao24: "39de4f",
    position: [51.5074, -0.1278],
    zoneIndex: 0,
  });

  assert.equal(result.status, "sent");
  assert.equal(result.messageId, 321);
  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0].url,
    "https://api.telegram.org/botbot-token/sendMessage",
  );
  assert.equal(fetchCalls[0].options.method, "POST");

  const body = JSON.parse(fetchCalls[0].options.body);
  assert.equal(body.chat_id, "123456789");
  assert.match(body.text, /Zone: 1/);
});

test("createTelegramAlertService skips duplicate alerts during cooldown", async () => {
  withTelegramEnv();

  let currentTime = 1000;
  const fetchCalls = [];
  const service = createTelegramAlertService({
    async fetchImpl(url, options) {
      fetchCalls.push({ url, options });

      return {
        ok: true,
        async json() {
          return { result: { message_id: fetchCalls.length } };
        },
      };
    },
    now() {
      return currentTime;
    },
  });

  const firstResult = await service.sendZoneEntryAlert({
    callsign: "DAL123",
    icao24: "39de4f",
    zoneIndex: 0,
  });
  const secondResult = await service.sendZoneEntryAlert({
    callsign: "DAL123",
    icao24: "39de4f",
    zoneIndex: 0,
  });

  currentTime += 60_001;

  const thirdResult = await service.sendZoneEntryAlert({
    callsign: "DAL123",
    icao24: "39de4f",
    zoneIndex: 0,
  });

  assert.equal(firstResult.status, "sent");
  assert.equal(secondResult.status, "skipped");
  assert.equal(thirdResult.status, "sent");
  assert.equal(fetchCalls.length, 2);
});
