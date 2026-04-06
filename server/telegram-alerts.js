const DEFAULT_TELEGRAM_ALERT_COOLDOWN_MS = 60_000;

function isTelegramAlertsEnabled() {
  const rawValue = process.env.TELEGRAM_ALERTS_ENABLED || "";

  return /^(1|true|yes|on)$/i.test(rawValue.trim());
}

function getTelegramAlertConfig() {
  return {
    enabled: isTelegramAlertsEnabled(),
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
    chatId: process.env.TELEGRAM_CHAT_ID?.trim() || "",
    cooldownMs:
      Number(process.env.TELEGRAM_ALERT_COOLDOWN_MS) > 0
        ? Number(process.env.TELEGRAM_ALERT_COOLDOWN_MS)
        : DEFAULT_TELEGRAM_ALERT_COOLDOWN_MS,
  };
}

export function getTelegramAlertStatus() {
  const config = getTelegramAlertConfig();
  const isConfigured = Boolean(config.botToken && config.chatId);

  return {
    cooldownMs: config.cooldownMs,
    enabled: config.enabled,
    configured: isConfigured,
    ready: config.enabled && isConfigured,
  };
}

function formatCoordinate(value) {
  return typeof value === "number" ? value.toFixed(4) : null;
}

function createCooldownKey({ icao24, callsign, zoneIndex }) {
  const normalizedAircraftKey =
    icao24?.trim().toLowerCase() || callsign?.trim().toLowerCase() || "unknown";

  return `${normalizedAircraftKey}:${zoneIndex}`;
}

export function formatZoneEntryTelegramAlert({
  callsign,
  enteredAt,
  icao24,
  position,
  zoneIndex,
}) {
  const normalizedCallsign = callsign?.trim() || "Unknown aircraft";
  const normalizedIcao24 = icao24?.trim().toUpperCase() || "Unknown ICAO24";
  const zoneNumber = Number.isInteger(zoneIndex) ? zoneIndex + 1 : "?";
  const latitude = Array.isArray(position)
    ? formatCoordinate(position[0])
    : null;
  const longitude = Array.isArray(position)
    ? formatCoordinate(position[1])
    : null;
  const formattedTimestamp = new Date(
    typeof enteredAt === "number" ? enteredAt : Date.now(),
  ).toISOString();
  const positionLine =
    latitude !== null && longitude !== null
      ? `Position: ${latitude}, ${longitude}`
      : "Position: Unknown";

  return [
    "SkyTrace zone alert",
    `Aircraft: ${normalizedCallsign}`,
    `ICAO24: ${normalizedIcao24}`,
    `Zone: ${zoneNumber}`,
    `Timestamp: ${formattedTimestamp}`,
    positionLine,
  ].join("\n");
}

export function createTelegramAlertService({
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  const cooldowns = new Map();

  return {
    resetCooldowns() {
      cooldowns.clear();
    },
    async sendZoneEntryAlert(payload) {
      const config = getTelegramAlertConfig();

      if (!config.enabled) {
        return { status: "disabled", reason: "Telegram alerts are disabled." };
      }

      if (!config.botToken || !config.chatId) {
        return {
          status: "disabled",
          reason: "Telegram alerts are not fully configured.",
        };
      }

      if (typeof fetchImpl !== "function") {
        throw new TypeError("Fetch API is not available for Telegram alerts.");
      }

      const cooldownKey = createCooldownKey(payload);
      const currentTime = now();
      const previousSentAt = cooldowns.get(cooldownKey);

      if (
        typeof previousSentAt === "number" &&
        currentTime - previousSentAt < config.cooldownMs
      ) {
        return { status: "skipped", reason: "cooldown-active" };
      }

      const response = await fetchImpl(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          body: JSON.stringify({
            chat_id: config.chatId,
            disable_notification: false,
            text: formatZoneEntryTelegramAlert(payload),
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Telegram sendMessage failed with ${response.status}: ${errorBody}`,
        );
      }

      const responseBody = await response.json();
      cooldowns.set(cooldownKey, currentTime);

      return {
        status: "sent",
        messageId: responseBody?.result?.message_id || null,
      };
    },
  };
}

const telegramAlertService = createTelegramAlertService();

export function sendZoneEntryTelegramAlert(payload) {
  return telegramAlertService.sendZoneEntryAlert(payload);
}

export function resetTelegramAlertCooldowns() {
  telegramAlertService.resetCooldowns();
}
