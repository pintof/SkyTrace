import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSavedZone,
  getZonePoints,
  isZoneTelegramAlertsEnabled,
} from "../zone-utils";

async function fetchSavedZones() {
  const { data } = await axios.get("/api/zones");
  return Array.isArray(data?.zones) ? data.zones : [];
}

async function persistSavedZones(zones) {
  const { data } = await axios.put("/api/zones", { zones });
  return Array.isArray(data?.zones) ? data.zones : [];
}

export function useSavedZones({ pushNotification }) {
  const [draftPolygon, setDraftPolygon] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [selectedPolygonIndex, setSelectedPolygonIndex] = useState(null);
  const hasHydratedZonesRef = useRef(false);
  const hasShownLoadErrorRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateSavedZones = async () => {
      try {
        const savedZones = await fetchSavedZones();

        if (isMounted) {
          setPolygons(savedZones);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Unable to load saved zones.", error);

        if (!hasShownLoadErrorRef.current) {
          hasShownLoadErrorRef.current = true;
          pushNotification(
            "Saved zones could not be loaded. Working locally only.",
          );
        }
      } finally {
        if (isMounted) {
          hasHydratedZonesRef.current = true;
        }
      }
    };

    hydrateSavedZones();

    return () => {
      isMounted = false;
    };
  }, [pushNotification]);

  useEffect(() => {
    if (!hasHydratedZonesRef.current) {
      return;
    }

    persistSavedZones(polygons).catch((error) => {
      console.error("Unable to save zones.", error);
      pushNotification("Saved zones could not be persisted.");
    });
  }, [polygons, pushNotification]);

  const startDrawing = useCallback(() => {
    setDraftPolygon([]);
    setIsDrawing(true);
    setSelectedPolygonIndex(null);
  }, []);

  const cancelDrawing = useCallback(() => {
    setDraftPolygon([]);
    setIsDrawing(false);
  }, []);

  const finishDrawing = useCallback(() => {
    if (draftPolygon.length < 3) {
      return;
    }

    const nextPolygonIndex = polygons.length;
    setPolygons((currentPolygons) => [
      ...currentPolygons,
      createSavedZone(draftPolygon),
    ]);
    setSelectedPolygonIndex(nextPolygonIndex);
    setDraftPolygon([]);
    setIsDrawing(false);
  }, [draftPolygon, polygons.length]);

  const clearPolygons = useCallback(() => {
    setDraftPolygon([]);
    setPolygons([]);
    setIsDrawing(false);
    setSelectedPolygonIndex(null);
  }, []);

  const removePolygon = useCallback((polygonIndex) => {
    setPolygons((currentPolygons) =>
      currentPolygons.filter((_, index) => index !== polygonIndex),
    );

    setSelectedPolygonIndex((currentIndex) => {
      if (currentIndex === null || currentIndex === polygonIndex) {
        return null;
      }

      return currentIndex > polygonIndex ? currentIndex - 1 : currentIndex;
    });
  }, []);

  const togglePolygonTelegramAlerts = useCallback((polygonIndex) => {
    setPolygons((currentPolygons) =>
      currentPolygons.map((zone, index) => {
        if (index !== polygonIndex) {
          return zone;
        }

        return {
          points: getZonePoints(zone),
          telegramAlertsEnabled: !isZoneTelegramAlertsEnabled(zone),
        };
      }),
    );
  }, []);

  return {
    cancelDrawing,
    clearPolygons,
    draftPolygon,
    finishDrawing,
    isDrawing,
    polygons,
    removePolygon,
    selectedPolygonIndex,
    setDraftPolygon,
    setSelectedPolygonIndex,
    startDrawing,
    togglePolygonTelegramAlerts,
  };
}
