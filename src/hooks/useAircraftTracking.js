import axios from "axios";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const fetchAircraftState = async ({ queryKey }) => {
  const icao24 = queryKey[0];
  const requestUrl = icao24
    ? `/api/opensky/api/states/all?icao24=${icao24}`
    : "/api/opensky/api/states/all";
  const { data } = await axios.get(requestUrl);
  return data;
};

const getFirstAircraftState = (aircraftStateData) => {
  if (!Array.isArray(aircraftStateData?.states)) {
    return null;
  }

  return aircraftStateData.states.find(Array.isArray) ?? null;
};

const formatStatusCheckTime = (timestamp) => {
  if (!timestamp) {
    return "Waiting for first response";
  }

  return `Last checked ${new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
};

const formatLabeledStatusTime = (label, timestamp) => {
  if (!timestamp) {
    return `${label}: waiting for first response`;
  }

  return `${label}: ${new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
};

const isAircraftStateInMotionFactory = (openSkyIndex) => (state) => {
  if (!Array.isArray(state)) {
    return false;
  }

  const currentUnixTime = Math.floor(Date.now() / 1000);
  const longitude = state[openSkyIndex.lng];
  const latitude = state[openSkyIndex.lat];
  const velocity = state[openSkyIndex.speed];
  const isOnGround = state[openSkyIndex.grounded];
  const lastContact =
    state[openSkyIndex.lastSeen] ?? state[openSkyIndex.timePos];

  const hasValidPosition =
    typeof latitude === "number" && typeof longitude === "number";
  const hasRecentContact =
    typeof lastContact === "number" && currentUnixTime - lastContact <= 60;
  const isMoving = typeof velocity === "number" && velocity > 30;

  return hasValidPosition && hasRecentContact && !isOnGround && isMoving;
};

const findAircraftInMotion = (
  allStatesData,
  openSkyIndex,
  isAircraftStateInMotion,
) => {
  if (!allStatesData?.states?.length) {
    return "";
  }

  for (const state of allStatesData.states) {
    if (isAircraftStateInMotion(state)) {
      return state[openSkyIndex.icao24];
    }
  }

  return "";
};

const getStatusTitle = ({
  isFindingAircraft,
  isLoadingTrackedAircraft,
  manualTrackedIcao24,
}) => {
  if (isFindingAircraft) {
    return "Scanning live traffic";
  }

  if (isLoadingTrackedAircraft && manualTrackedIcao24) {
    return "Locking onto selected aircraft";
  }

  if (isLoadingTrackedAircraft) {
    return "Locking onto aircraft";
  }

  return "No active aircraft found";
};

const getStatusCopy = ({ isFindingAircraft, isLoadingTrackedAircraft }) => {
  if (isFindingAircraft) {
    return "SkyTrace is checking the OpenSky feed and looking for a recently moving aircraft.";
  }

  if (isLoadingTrackedAircraft) {
    return "A flight was found. Fetching its live position, heading, and telemetry now.";
  }

  return "No recently moving aircraft is available from the current feed yet. Leave the map open and SkyTrace will keep watching.";
};

export function useAircraftTracking({ openSkyIndex, pushNotification }) {
  const [icao24Input, setIcao24Input] = useState("");
  const [manualTrackedIcao24, setManualTrackedIcao24] = useState("");
  const [isSubmittingIcao24, setIsSubmittingIcao24] = useState(false);

  const isAircraftStateInMotion = useMemo(
    () => isAircraftStateInMotionFactory(openSkyIndex),
    [openSkyIndex],
  );

  const allAircraftQuery = useQuery({
    queryKey: [""],
    queryFn: fetchAircraftState,
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });

  if (allAircraftQuery.isError) {
    console.log(allAircraftQuery.error);
  }

  const icao24InMotion = findAircraftInMotion(
    allAircraftQuery.data,
    openSkyIndex,
    isAircraftStateInMotion,
  );
  const activeIcao24 = manualTrackedIcao24 || icao24InMotion;

  const trackedAircraftQuery = useQuery({
    queryKey: [activeIcao24],
    queryFn: fetchAircraftState,
    enabled: Boolean(activeIcao24),
    refetchInterval: 2000,
    refetchOnWindowFocus: false,
  });

  if (trackedAircraftQuery.isError) {
    console.log(trackedAircraftQuery.error);
  }

  const isFindingAircraft = !allAircraftQuery.data && !allAircraftQuery.isError;
  const isLoadingTrackedAircraft =
    Boolean(activeIcao24) &&
    !trackedAircraftQuery.data &&
    !trackedAircraftQuery.isError;
  const isLoadingStatus = isFindingAircraft || isLoadingTrackedAircraft;
  const isStatusVisible =
    isFindingAircraft || isLoadingTrackedAircraft || !activeIcao24;
  const statusTitle = getStatusTitle({
    isFindingAircraft,
    isLoadingTrackedAircraft,
    manualTrackedIcao24,
  });
  const statusCopy = getStatusCopy({
    isFindingAircraft,
    isLoadingTrackedAircraft,
  });
  const statusTimestamp = formatStatusCheckTime(allAircraftQuery.dataUpdatedAt);
  const trafficStatusTimestamp = formatLabeledStatusTime(
    "Traffic scan",
    allAircraftQuery.dataUpdatedAt,
  );
  const telemetryStatusTimestamp = icao24InMotion
    ? formatLabeledStatusTime("Telemetry", trackedAircraftQuery.dataUpdatedAt)
    : null;

  const activeAircraftState = getFirstAircraftState(trackedAircraftQuery.data);
  const trackedIcao24 =
    activeAircraftState?.[openSkyIndex.icao24] || activeIcao24;
  const nextLatitude = trackedAircraftQuery.data?.states?.[0]?.[6];
  const nextLongitude = trackedAircraftQuery.data?.states?.[0]?.[5];
  const position = useMemo(
    () =>
      typeof nextLatitude === "number" && typeof nextLongitude === "number"
        ? [nextLatitude, nextLongitude]
        : [51.505, -0.09],
    [nextLatitude, nextLongitude],
  );
  const markerPosition = useMemo(
    () =>
      typeof nextLatitude === "number" && typeof nextLongitude === "number"
        ? [nextLatitude, nextLongitude]
        : null,
    [nextLatitude, nextLongitude],
  );

  const submitIcao24 = async (event) => {
    event.preventDefault();

    const normalizedIcao24 = icao24Input.trim().toLowerCase();

    if (!/^[0-9a-f]{6}$/.test(normalizedIcao24)) {
      pushNotification("Enter a valid 6-character ICAO24 hex code.");
      return;
    }

    setIsSubmittingIcao24(true);

    try {
      const { data: manualAircraftData } = await axios.get(
        `/api/opensky/api/states/all?icao24=${normalizedIcao24}`,
      );
      const manualAircraftState = getFirstAircraftState(manualAircraftData);

      if (!isAircraftStateInMotion(manualAircraftState)) {
        pushNotification(
          `${normalizedIcao24.toUpperCase()} is not currently in motion.`,
        );
        return;
      }

      const manualCallsign =
        manualAircraftState?.[openSkyIndex.callsign]?.trim();
      setManualTrackedIcao24(normalizedIcao24);
      setIcao24Input(normalizedIcao24);
      pushNotification(
        manualCallsign
          ? `Now tracking ${manualCallsign} (${normalizedIcao24.toUpperCase()}).`
          : `Now tracking ${normalizedIcao24.toUpperCase()}.`,
      );
    } catch (submissionError) {
      console.error(submissionError);
      pushNotification("Unable to validate that ICAO24 right now.");
    } finally {
      setIsSubmittingIcao24(false);
    }
  };

  return {
    activeAircraftState,
    activeIcao24,
    altitude: trackedAircraftQuery.data?.states?.[0]?.[7] || "Unknown",
    callsign: trackedAircraftQuery.data?.states?.[0]?.[1] || "Unknown",
    country: trackedAircraftQuery.data?.states?.[0]?.[2] || "Unknown",
    heading: trackedAircraftQuery.data?.states?.[0]?.[10] || "Unknown",
    icao24Input,
    isLoadingStatus,
    isStatusVisible,
    isSubmittingIcao24,
    manualTrackedIcao24,
    markerHeading:
      typeof trackedAircraftQuery.data?.states?.[0]?.[10] === "number"
        ? trackedAircraftQuery.data.states[0][10]
        : 0,
    markerPosition,
    position,
    setIcao24Input,
    statusCopy,
    statusTimestamp,
    statusTitle,
    submitIcao24,
    telemetryStatusTimestamp,
    trackedIcao24,
    trafficStatusTimestamp,
    velocity:
      trackedAircraftQuery.data?.states?.[0]?.[openSkyIndex.speed] || "Unknown",
  };
}
