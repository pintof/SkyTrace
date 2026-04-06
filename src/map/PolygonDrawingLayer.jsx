import { CircleMarker, Polygon, Polyline, useMapEvents } from "react-leaflet";
import { getZonePoints } from "../zone-utils";

const getPolygonPathOptions = ({
  activeZoneIndexes,
  index,
  selectedPolygonIndex,
}) => {
  if (activeZoneIndexes.includes(index) && selectedPolygonIndex === index) {
    return {
      color: "#7c2d12",
      fillColor: "#f97316",
      fillOpacity: 0.48,
      weight: 4,
    };
  }

  if (activeZoneIndexes.includes(index)) {
    return {
      color: "#dc2626",
      fillColor: "#fb7185",
      fillOpacity: 0.36,
      weight: 4,
    };
  }

  if (selectedPolygonIndex === index) {
    return {
      color: "#c2410c",
      fillColor: "#fb923c",
      fillOpacity: 0.32,
      weight: 4,
    };
  }

  return {
    color: "#0f766e",
    fillColor: "#14b8a6",
    fillOpacity: 0.2,
    weight: 3,
  };
};

const getZoneKey = (zone) =>
  getZonePoints(zone)
    .map(([latitude, longitude]) => `${latitude}:${longitude}`)
    .join("|");

const getVertexKey = ([latitude, longitude]) => `${latitude}:${longitude}`;

const PolygonDrawingLayer = ({
  activeZoneIndexes,
  draftPolygon,
  isDrawing,
  polygons,
  selectedPolygonIndex,
  setSelectedPolygonIndex,
  setDraftPolygon,
}) => {
  useMapEvents({
    click(event) {
      if (!isDrawing) {
        return;
      }

      setDraftPolygon((currentPolygon) => [
        ...currentPolygon,
        [event.latlng.lat, event.latlng.lng],
      ]);
    },
  });

  return (
    <>
      {polygons.map((zone, index) => (
        <Polygon
          key={getZoneKey(zone)}
          eventHandlers={{
            click() {
              setSelectedPolygonIndex(index);
            },
          }}
          pathOptions={getPolygonPathOptions({
            activeZoneIndexes,
            index,
            selectedPolygonIndex,
          })}
          positions={getZonePoints(zone)}
        />
      ))}

      {draftPolygon.length >= 2 ? (
        <Polyline
          pathOptions={{
            color: "#f97316",
            dashArray: "8 8",
            weight: 3,
          }}
          positions={draftPolygon}
        />
      ) : null}

      {draftPolygon.length >= 3 ? (
        <Polygon
          pathOptions={{
            color: "#f97316",
            fillColor: "#fb923c",
            fillOpacity: 0.2,
            weight: 2,
          }}
          positions={draftPolygon}
        />
      ) : null}

      {draftPolygon.map((vertex) => (
        <CircleMarker
          key={getVertexKey(vertex)}
          center={vertex}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#f97316",
            fillOpacity: 1,
            weight: 2,
          }}
          radius={6}
        />
      ))}
    </>
  );
};

export default PolygonDrawingLayer;
