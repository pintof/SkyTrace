import { formatEventPosition, formatEventTime } from "../zone-utils";

const ZoneLogPanel = ({ events, onClearLog }) => (
  <div className="zone-log-panel">
    <div className="zone-log-header">
      <div>
        <p className="zone-log-eyebrow">Zone history</p>
        <h3 className="zone-log-title">Entry and exit log</h3>
      </div>
      <button
        className="zone-log-clear"
        disabled={events.length === 0}
        onClick={onClearLog}
        type="button"
      >
        Clear Log
      </button>
    </div>

    {events.length > 0 ? (
      <div className="zone-log-list">
        {events.map((event) => (
          <div className="zone-log-item" key={event.id}>
            <div className="zone-log-topline">
              <span className={`zone-log-badge zone-log-badge-${event.type}`}>
                {event.type}
              </span>
              <span className="zone-log-time">
                {formatEventTime(event.timestamp)}
              </span>
            </div>
            <p className="zone-log-main">
              {event.callsign} {event.type} Zone {event.zoneIndex + 1}
            </p>
            <p className="zone-log-meta">
              Position: {formatEventPosition(event.position)}
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p className="zone-log-empty">No zone entries or exits recorded yet.</p>
    )}
  </div>
);

export default ZoneLogPanel;
