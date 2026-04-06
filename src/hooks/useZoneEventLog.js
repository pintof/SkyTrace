import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

const createZoneEvent = ({ callsign, position, type, zoneIndex }) => ({
  callsign,
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  position,
  timestamp: Date.now(),
  type,
  zoneIndex,
});

async function fetchZoneEvents() {
  const { data } = await axios.get("/api/zone-events");
  return Array.isArray(data?.events) ? data.events : [];
}

async function persistZoneEvents(events) {
  const { data } = await axios.put("/api/zone-events", { events });
  return Array.isArray(data?.events) ? data.events : [];
}

export function useZoneEventLog({ pushNotification }) {
  const [zoneEventLog, setZoneEventLog] = useState([]);
  const hasHydratedZoneEventLogRef = useRef(false);
  const hasShownLoadErrorRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateZoneEventLog = async () => {
      try {
        const savedEvents = await fetchZoneEvents();

        if (isMounted) {
          setZoneEventLog(savedEvents);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Unable to load zone event log.", error);

        if (!hasShownLoadErrorRef.current) {
          hasShownLoadErrorRef.current = true;
          pushNotification(
            "Zone log could not be loaded. Working locally only.",
          );
        }
      } finally {
        if (isMounted) {
          hasHydratedZoneEventLogRef.current = true;
        }
      }
    };

    hydrateZoneEventLog();

    return () => {
      isMounted = false;
    };
  }, [pushNotification]);

  useEffect(() => {
    if (!hasHydratedZoneEventLogRef.current) {
      return;
    }

    persistZoneEvents(zoneEventLog).catch((error) => {
      console.error("Unable to save zone event log.", error);
      pushNotification("Zone log could not be persisted.");
    });
  }, [pushNotification, zoneEventLog]);

  const clearZoneEventLog = useCallback(() => {
    setZoneEventLog([]);
  }, []);

  const pushZoneEventLog = useCallback((event) => {
    setZoneEventLog((currentEvents) => [
      createZoneEvent(event),
      ...currentEvents,
    ]);
  }, []);

  return {
    clearZoneEventLog,
    pushZoneEventLog,
    zoneEventLog,
  };
}
