import { sendZoneEntryTelegramAlert } from "./telegram-alerts.js";
import { sendOpenSkyRequest } from "./opensky-proxy.js";
import { loadZoneEvents, saveZoneEvents } from "./zone-event-store.js";
import { loadSavedZones, saveSavedZones } from "./zone-store.js";

function formatTelegramAlertContext({ callsign, icao24, zoneIndex }) {
  const normalizedCallsign = callsign?.trim() || "Unknown aircraft";
  const normalizedIcao24 = icao24?.trim().toUpperCase() || "Unknown ICAO24";
  const zoneLabel = Number.isInteger(zoneIndex)
    ? `Zone ${zoneIndex + 1}`
    : "Unknown zone";

  return `${normalizedCallsign} (${normalizedIcao24}) -> ${zoneLabel}`;
}

function formatTelegramAlertDetail(label, value) {
  return value ? ` (${label} ${value})` : "";
}

export function registerRoutes(app) {
  app.get("/api/zone-events", async (_req, res) => {
    try {
      const events = await loadZoneEvents();

      return res.status(200).json({ events });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to load zone event log",
        message:
          error instanceof Error ? error.message : "Unknown server error",
      });
    }
  });

  app.put("/api/zone-events", async (req, res) => {
    try {
      const events = await saveZoneEvents(req.body?.events);

      return res.status(200).json({ events });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to save zone event log",
        message:
          error instanceof Error ? error.message : "Unknown server error",
      });
    }
  });

  app.get("/api/zones", async (_req, res) => {
    try {
      const zones = await loadSavedZones();

      return res.status(200).json({ zones });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to load saved zones",
        message:
          error instanceof Error ? error.message : "Unknown server error",
      });
    }
  });

  app.put("/api/zones", async (req, res) => {
    try {
      const zones = await saveSavedZones(req.body?.zones);

      return res.status(200).json({ zones });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to save zones",
        message:
          error instanceof Error ? error.message : "Unknown server error",
      });
    }
  });

  app.get("/api/opensky/*splat", async (req, res) => {
    try {
      await sendOpenSkyRequest(req, res);
    } catch (error) {
      console.error(error);
      res.status(502).json({
        error: "Unable to contact OpenSky",
        message:
          error instanceof Error ? error.message : "Unknown server error",
      });
    }
  });

  app.post("/api/alerts/telegram/zone-entry", async (req, res) => {
    try {
      const {
        callsign = "",
        enteredAt,
        icao24 = "",
        position,
        zoneIndex,
      } = req.body || {};

      if (!Number.isInteger(zoneIndex) || zoneIndex < 0) {
        return res.status(400).json({
          error: "Invalid zone alert payload",
          message: "zoneIndex must be a non-negative integer.",
        });
      }

      const alertContext = formatTelegramAlertContext({
        callsign,
        icao24,
        zoneIndex,
      });

      const result = await sendZoneEntryTelegramAlert({
        callsign,
        enteredAt,
        icao24,
        position,
        zoneIndex,
      });

      if (result.status === "sent") {
        const messageDetail = formatTelegramAlertDetail(
          "message",
          result.messageId,
        );

        console.info(`[telegram-alert] sent ${alertContext}${messageDetail}`);
        return res.status(200).json(result);
      }

      const reasonDetail = formatTelegramAlertDetail("reason", result.reason);

      console.info(
        `[telegram-alert] ${result.status} ${alertContext}${reasonDetail}`,
      );

      return res.status(202).json(result);
    } catch (error) {
      const { callsign = "", icao24 = "", zoneIndex } = req.body || {};
      const alertContext = formatTelegramAlertContext({
        callsign,
        icao24,
        zoneIndex,
      });

      console.error(`[telegram-alert] failed ${alertContext}`);
      console.error(error);
      return res.status(502).json({
        error: "Unable to send Telegram alert",
        message:
          error instanceof Error ? error.message : "Unknown server error",
      });
    }
  });
}
