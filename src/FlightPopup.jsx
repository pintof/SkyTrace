const FlightPopup = ({ callsign, country, altitude, velocity, heading }) => {
  return (
    <div className="flight-popup-card">
      <p className="flight-popup-eyebrow">Tracked aircraft</p>
      <h2 className="flight-popup-title">{callsign}</h2>
      <div className="flight-popup-grid">
        <div className="flight-popup-row">
          <span className="flight-popup-label">Country</span>
          <span className="flight-popup-value">{country}</span>
        </div>
        <div className="flight-popup-row">
          <span className="flight-popup-label">Altitude</span>
          <span className="flight-popup-value">{altitude} m</span>
        </div>
        <div className="flight-popup-row">
          <span className="flight-popup-label">Velocity</span>
          <span className="flight-popup-value">{velocity} m/s</span>
        </div>
        <div className="flight-popup-row">
          <span className="flight-popup-label">Heading</span>
          <span className="flight-popup-value">{heading}°</span>
        </div>
      </div>
    </div>
  );
};

export default FlightPopup;