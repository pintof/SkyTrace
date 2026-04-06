import { isZoneTelegramAlertsEnabled } from "../zone-utils";

const getZoneKey = (zone) =>
  (Array.isArray(zone?.points) ? zone.points : zone)
    .map(([latitude, longitude]) => `${latitude}:${longitude}`)
    .join("|");

const SavedZonesPanel = ({
  polygons,
  selectedPolygonIndex,
  onRemovePolygon,
  onSelectPolygon,
  onTogglePolygonTelegramAlerts,
}) => {
  if (polygons.length === 0) {
    return null;
  }

  return (
    <div className="polygon-list">
      <p className="polygon-list-title">Saved zones</p>
      <div className="polygon-list-items">
        {polygons.map((zone, index) => {
          const telegramAlertsEnabled = isZoneTelegramAlertsEnabled(zone);
          const itemClassName = `polygon-list-item${selectedPolygonIndex === index ? " polygon-list-item-selected" : ""}`;
          const alertStatusClassName = `polygon-list-alert-status${telegramAlertsEnabled ? " polygon-list-alert-status-enabled" : " polygon-list-alert-status-disabled"}`;
          const toggleClassName = `polygon-list-toggle${telegramAlertsEnabled ? " polygon-list-toggle-enabled" : ""}`;

          return (
            <div className={itemClassName} key={getZoneKey(zone)}>
              <button
                className="polygon-list-select"
                onClick={() => onSelectPolygon(index)}
                type="button"
              >
                <span className="polygon-list-name">Zone {index + 1}</span>
                <span className={alertStatusClassName}>
                  Telegram alerts {telegramAlertsEnabled ? "on" : "off"}
                </span>
              </button>
              <div className="polygon-list-actions">
                <button
                  aria-checked={telegramAlertsEnabled}
                  className={toggleClassName}
                  onClick={() => onTogglePolygonTelegramAlerts(index)}
                  role="switch"
                  type="button"
                >
                  <span className="polygon-list-toggle-track">
                    <span className="polygon-list-toggle-thumb" />
                  </span>
                  <span className="polygon-list-toggle-label">
                    Mobile Alert
                  </span>
                </button>
                <button
                  aria-label={`Delete zone ${index + 1}`}
                  className="polygon-list-delete"
                  onClick={() => onRemovePolygon(index)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SavedZonesPanel;
