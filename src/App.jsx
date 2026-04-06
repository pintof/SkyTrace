import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "./App.css";
import BrandLogo from "./BrandLogo";
import NotificationStack from "./components/NotificationStack";
import SavedZonesPanel from "./components/SavedZonesPanel";
import TrackingForm from "./components/TrackingForm";
import ZoneLogPanel from "./components/ZoneLogPanel";
import FlightPopup from "./FlightPopup";
import { createFlightMarkerIcon } from "./flightMarkerIcon";
import { useAircraftTracking } from "./hooks/useAircraftTracking";
import { useFlightPath } from "./hooks/useFlightPath";
import { useNotifications } from "./hooks/useNotifications";
import { useSavedZones } from "./hooks/useSavedZones";
import { useZoneAlerts } from "./hooks/useZoneAlerts";
import { useZoneEventLog } from "./hooks/useZoneEventLog";
import MapTouchToolbarController from "./map/MapTouchToolbarController";
import PolygonDrawingLayer from "./map/PolygonDrawingLayer";
import { getZonePoints, isPointInsidePolygon } from "./zone-utils";

const APP_NAME = "SkyTrace";
const APP_TAGLINE = "Live airspace monitoring with zone alerts";

const OPEN_SKY_INDEX = {
  icao24: 0,
  callsign: 1,
  timePos: 3,
  lastSeen: 4,
  lng: 5,
  lat: 6,
  grounded: 8,
  speed: 9,
};

const RecenterMap = ({ position, enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (enabled) {
      map.setView(position, map.getZoom());
    }
  }, [enabled, map, position]);

  return null;
};

const sendZoneEntryTelegramAlert = async (payload) => {
  await axios.post("/api/alerts/telegram/zone-entry", payload);
};

const getLogToggleLabel = (isLogVisible, eventCount) => {
  if (isLogVisible) {
    return "Hide Log";
  }

  return eventCount > 0 ? `View Log (${eventCount})` : "View Log";
};

const getDrawingStatusMessage = ({
  draftPointCount,
  isDrawing,
  polygonCount,
  selectedPolygonIndex,
}) => {
  if (isDrawing) {
    return `Drawing mode on. ${draftPointCount} point${draftPointCount === 1 ? "" : "s"} placed.`;
  }

  if (selectedPolygonIndex !== null) {
    return `Zone ${selectedPolygonIndex + 1} selected.`;
  }

  return `${polygonCount} zone${polygonCount === 1 ? "" : "s"} saved.`;
};

const StatusPanel = ({
  appName,
  isLoadingStatus,
  statusCopy,
  statusTitle,
  statusTimestamp,
  telemetryStatusTimestamp,
  trafficStatusTimestamp,
}) => (
  <output
    className={`status-panel${isLoadingStatus ? " status-panel-loading" : ""}`}
  >
    <div className="status-panel-logo-wrap">
      <BrandLogo
        animated={isLoadingStatus}
        className="brand-logo status-panel-logo"
      />
    </div>
    <p className="status-panel-eyebrow">{appName}</p>
    <h2 className="status-panel-title">
      <span>{statusTitle}</span>
      {isLoadingStatus ? (
        <span className="status-panel-title-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : null}
    </h2>
    <p className="status-panel-copy">{statusCopy}</p>
    {isLoadingStatus ? (
      <div className="status-panel-skeleton" aria-hidden="true">
        <span className="status-panel-skeleton-line status-panel-skeleton-line-wide" />
        <span className="status-panel-skeleton-line" />
      </div>
    ) : null}
    <div className="status-panel-timestamps">
      <p className="status-panel-timestamp">{trafficStatusTimestamp}</p>
      {telemetryStatusTimestamp ? (
        <p className="status-panel-timestamp">{telemetryStatusTimestamp}</p>
      ) : (
        <p className="status-panel-timestamp">{statusTimestamp}</p>
      )}
    </div>
  </output>
);

const App = () => {
  const [isTouchToolbarHidden, setIsTouchToolbarHidden] = useState(false);
  const [isLogVisible, setIsLogVisible] = useState(false);
  const hasShownTouchToolbarHintRef = useRef(false);

  const { dismissNotification, notifications, pushNotification } =
    useNotifications();
  const { clearZoneEventLog, pushZoneEventLog, zoneEventLog } = useZoneEventLog(
    { pushNotification },
  );
  const tracking = useAircraftTracking({
    openSkyIndex: OPEN_SKY_INDEX,
    pushNotification,
  });
  const zones = useSavedZones({ pushNotification });

  const activeZoneIndexes = useMemo(() => {
    if (!tracking.markerPosition) {
      return [];
    }

    return zones.polygons.reduce((matchingIndexes, zone, index) => {
      if (isPointInsidePolygon(tracking.markerPosition, getZonePoints(zone))) {
        matchingIndexes.push(index);
      }

      return matchingIndexes;
    }, []);
  }, [tracking.markerPosition, zones.polygons]);

  const flightMarkerIcon = useMemo(
    () =>
      createFlightMarkerIcon({
        heading: tracking.markerHeading,
        isInZone: activeZoneIndexes.length > 0,
      }),
    [activeZoneIndexes.length, tracking.markerHeading],
  );

  const { flightPath, isFlightPathVisible, setIsFlightPathVisible } =
    useFlightPath({
      activeIcao24: tracking.activeIcao24,
      markerPosition: tracking.markerPosition,
    });

  useZoneAlerts({
    activeZoneIndexes,
    callsign: tracking.callsign,
    markerPosition: tracking.markerPosition,
    polygons: zones.polygons,
    pushNotification,
    pushZoneEventLog,
    sendZoneEntryTelegramAlert,
    trackedIcao24: tracking.trackedIcao24,
  });

  useEffect(() => {
    if (tracking.manualTrackedIcao24) {
      zones.setSelectedPolygonIndex(null);
    }
  }, [tracking.manualTrackedIcao24, zones]);

  const pushTouchToolbarHint = useCallback(() => {
    if (hasShownTouchToolbarHintRef.current) {
      return;
    }

    hasShownTouchToolbarHintRef.current = true;
    pushNotification("Panel hidden. Double-tap the map to bring it back.");
  }, [pushNotification]);

  const drawingStatusMessage = getDrawingStatusMessage({
    draftPointCount: zones.draftPolygon.length,
    isDrawing: zones.isDrawing,
    polygonCount: zones.polygons.length,
    selectedPolygonIndex: zones.selectedPolygonIndex,
  });
  const logToggleLabel = getLogToggleLabel(isLogVisible, zoneEventLog.length);
  const drawButtonClassName = zones.isDrawing
    ? "drawing-button"
    : "drawing-button drawing-button-primary";
  const finishButtonClassName = zones.isDrawing
    ? "drawing-button drawing-button-primary"
    : "drawing-button";

  return (
    <div className="map-shell">
      <div className="brand-panel">
        <div className="brand-panel-logo-wrap">
          <BrandLogo />
        </div>
        <div className="brand-panel-copy">
          <p className="brand-panel-eyebrow">Flight tracker</p>
          <h1 className="brand-panel-title">{APP_NAME}</h1>
          <p className="brand-panel-tagline">{APP_TAGLINE}</p>
        </div>
      </div>

      {tracking.isStatusVisible ? (
        <StatusPanel
          appName={APP_NAME}
          isLoadingStatus={tracking.isLoadingStatus}
          statusCopy={tracking.statusCopy}
          statusTimestamp={tracking.statusTimestamp}
          statusTitle={tracking.statusTitle}
          telemetryStatusTimestamp={tracking.telemetryStatusTimestamp}
          trafficStatusTimestamp={tracking.trafficStatusTimestamp}
        />
      ) : null}

      <NotificationStack
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      <div
        className={`drawing-toolbar${isTouchToolbarHidden ? " drawing-toolbar-touch-hidden" : ""}`}
      >
        <TrackingForm
          activeAircraftState={tracking.activeAircraftState}
          icao24Input={tracking.icao24Input}
          isSubmittingIcao24={tracking.isSubmittingIcao24}
          manualTrackedIcao24={tracking.manualTrackedIcao24}
          onChangeIcao24Input={tracking.setIcao24Input}
          onSubmit={tracking.submitIcao24}
          openSkyIndex={OPEN_SKY_INDEX}
        />

        <div>
          <p className="drawing-toolbar-eyebrow">Zone tools</p>
          <h2 className="drawing-toolbar-title">Sketch an area on the map</h2>
          <p className="drawing-toolbar-copy">
            Tap or click the map to place vertices, then finish the zone when it
            has at least three points.
          </p>
        </div>
        <div className="drawing-toolbar-actions">
          <button
            className={drawButtonClassName}
            onClick={zones.startDrawing}
            type="button"
          >
            {zones.isDrawing ? "Restart Drawing" : "Draw Zone"}
          </button>
          <button
            className={finishButtonClassName}
            disabled={zones.draftPolygon.length < 3}
            onClick={zones.finishDrawing}
            type="button"
          >
            Finish
          </button>
          <button
            className="drawing-button"
            disabled={!zones.isDrawing && zones.draftPolygon.length === 0}
            onClick={zones.cancelDrawing}
            type="button"
          >
            Cancel
          </button>
          <button
            className="drawing-button drawing-button-danger"
            disabled={
              zones.polygons.length === 0 && zones.draftPolygon.length === 0
            }
            onClick={zones.clearPolygons}
            type="button"
          >
            Clear All
          </button>
          <button
            className="drawing-button"
            onClick={() => setIsLogVisible((currentValue) => !currentValue)}
            type="button"
          >
            {logToggleLabel}
          </button>
        </div>
        <p className="drawing-toolbar-status">{drawingStatusMessage}</p>

        <SavedZonesPanel
          onRemovePolygon={zones.removePolygon}
          onSelectPolygon={zones.setSelectedPolygonIndex}
          onTogglePolygonTelegramAlerts={zones.togglePolygonTelegramAlerts}
          polygons={zones.polygons}
          selectedPolygonIndex={zones.selectedPolygonIndex}
        />

        {isLogVisible ? (
          <ZoneLogPanel events={zoneEventLog} onClearLog={clearZoneEventLog} />
        ) : null}
      </div>

      <MapContainer center={tracking.position} zoom={13}>
        <MapTouchToolbarController
          isToolbarHidden={isTouchToolbarHidden}
          onHideToolbarHint={pushTouchToolbarHint}
          onHideToolbar={() => setIsTouchToolbarHidden(true)}
          onShowToolbar={() => setIsTouchToolbarHidden(false)}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap enabled={!zones.isDrawing} position={tracking.position} />
        <PolygonDrawingLayer
          activeZoneIndexes={activeZoneIndexes}
          draftPolygon={zones.draftPolygon}
          isDrawing={zones.isDrawing}
          polygons={zones.polygons}
          selectedPolygonIndex={zones.selectedPolygonIndex}
          setSelectedPolygonIndex={zones.setSelectedPolygonIndex}
          setDraftPolygon={zones.setDraftPolygon}
        />
        {isFlightPathVisible && flightPath.length >= 2 ? (
          <Polyline
            pathOptions={{
              color: "#2563eb",
              opacity: 0.8,
              weight: 4,
            }}
            positions={flightPath}
          />
        ) : null}
        <Marker
          eventHandlers={{
            popupopen() {
              setIsFlightPathVisible(true);
            },
            popupclose() {
              setIsFlightPathVisible(false);
            },
          }}
          icon={flightMarkerIcon}
          position={tracking.position}
        >
          <Popup className="flight-popup" closeButton={false} offset={[0, -28]}>
            <FlightPopup
              altitude={tracking.altitude}
              callsign={tracking.callsign}
              country={tracking.country}
              heading={tracking.heading}
              velocity={tracking.velocity}
            />
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default App;
