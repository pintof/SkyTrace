import { useEffect, useRef } from "react";
import { isZoneTelegramAlertsEnabled } from "../zone-utils";

async function createZoneAlarm(audioContextRef) {
  const AudioContextConstructor =
    globalThis.AudioContext || globalThis.webkitAudioContext;

  if (!AudioContextConstructor) {
    return;
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContextConstructor();
  }

  const audioContext = audioContextRef.current;

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const noteSchedule = [
    { delay: 0, frequency: 880, duration: 0.11 },
    { delay: 0.17, frequency: 660, duration: 0.11 },
    { delay: 0.34, frequency: 880, duration: 0.16 },
  ];
  const baseTime = audioContext.currentTime;

  noteSchedule.forEach(({ delay, duration, frequency }) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, baseTime + delay);

    gainNode.gain.setValueAtTime(0.0001, baseTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.09, baseTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      baseTime + delay + duration,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(baseTime + delay);
    oscillator.stop(baseTime + delay + duration + 0.02);
  });
}

export function useZoneAlerts({
  activeZoneIndexes,
  callsign,
  markerPosition,
  polygons,
  pushNotification,
  pushZoneEventLog,
  sendZoneEntryTelegramAlert,
  trackedIcao24,
}) {
  const audioContextRef = useRef(null);
  const previousActiveZoneIndexesRef = useRef([]);
  const previousMarkerPositionKeyRef = useRef(null);

  useEffect(() => {
    const currentMarkerPositionKey = markerPosition
      ? `${markerPosition[0]}:${markerPosition[1]}`
      : null;
    const didMarkerMove =
      previousMarkerPositionKeyRef.current !== null &&
      previousMarkerPositionKeyRef.current !== currentMarkerPositionKey;

    if (didMarkerMove) {
      const newlyEnteredZoneIndexes = activeZoneIndexes.filter(
        (zoneIndex) =>
          !previousActiveZoneIndexesRef.current.includes(zoneIndex),
      );
      const newlyExitedZoneIndexes =
        previousActiveZoneIndexesRef.current.filter(
          (zoneIndex) => !activeZoneIndexes.includes(zoneIndex),
        );

      if (newlyEnteredZoneIndexes.length > 0) {
        createZoneAlarm(audioContextRef).catch(() => {});
      }

      newlyEnteredZoneIndexes.forEach((zoneIndex) => {
        const enteredAt = Date.now();
        const zone = polygons[zoneIndex];

        pushNotification(`${callsign} entered Zone ${zoneIndex + 1}.`);
        pushZoneEventLog({
          callsign,
          position: markerPosition,
          type: "entered",
          zoneIndex,
        });

        if (!isZoneTelegramAlertsEnabled(zone)) {
          return;
        }

        sendZoneEntryTelegramAlert({
          callsign,
          enteredAt,
          icao24: trackedIcao24,
          position: markerPosition,
          zoneIndex,
        }).catch((error) => {
          const backendMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Unknown Telegram delivery error.";

          console.error("Unable to send zone-entry Telegram alert.", error);
          pushNotification(`Telegram alert failed: ${backendMessage}`);
        });
      });

      newlyExitedZoneIndexes.forEach((zoneIndex) => {
        pushZoneEventLog({
          callsign,
          position: markerPosition,
          type: "exited",
          zoneIndex,
        });
      });
    }

    previousActiveZoneIndexesRef.current = activeZoneIndexes;
    previousMarkerPositionKeyRef.current = currentMarkerPositionKey;
  }, [
    activeZoneIndexes,
    callsign,
    markerPosition,
    polygons,
    pushNotification,
    pushZoneEventLog,
    sendZoneEntryTelegramAlert,
    trackedIcao24,
  ]);

  useEffect(() => {
    const audioContext = audioContextRef.current;

    return () => {
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    };
  }, []);
}
