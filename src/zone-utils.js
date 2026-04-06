export const createSavedZone = (points) => ({
  points,
  telegramAlertsEnabled: true,
});

export const getZonePoints = (zone) => {
  if (Array.isArray(zone)) {
    return zone;
  }

  return Array.isArray(zone?.points) ? zone.points : [];
};

export const isZoneTelegramAlertsEnabled = (zone) => {
  if (typeof zone?.telegramAlertsEnabled === "boolean") {
    return zone.telegramAlertsEnabled;
  }

  return true;
};

export const isPointInsidePolygon = (point, polygon) => {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  const [latitude, longitude] = point;
  let isInside = false;

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index++
  ) {
    const [currentLatitude, currentLongitude] = polygon[index];
    const [previousLatitude, previousLongitude] = polygon[previousIndex];

    const intersects =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
};

export const formatEventTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const formatEventPosition = (position) => {
  if (!position) {
    return "Unknown position";
  }

  return `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`;
};
