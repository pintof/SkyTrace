const TrackingForm = ({
  activeAircraftState,
  icao24Input,
  isSubmittingIcao24,
  manualTrackedIcao24,
  onChangeIcao24Input,
  onSubmit,
  openSkyIndex,
}) => {
  let trackingMessage =
    "Automatic tracking will keep following the next aircraft in motion.";

  if (manualTrackedIcao24) {
    trackingMessage = `Tracking enabled for ${manualTrackedIcao24.toUpperCase()}.`;
  } else if (activeAircraftState?.[openSkyIndex.icao24]) {
    trackingMessage = `Tracking Aircraft ${activeAircraftState[openSkyIndex.icao24].toUpperCase()}.`;
  }

  return (
    <form className="icao24-form" onSubmit={onSubmit}>
      <label className="icao24-label" htmlFor="icao24-input">
        Track a specific aircraft
      </label>
      <div className="icao24-controls">
        <input
          autoCapitalize="none"
          autoCorrect="off"
          className="icao24-input"
          id="icao24-input"
          maxLength={6}
          onChange={(event) => onChangeIcao24Input(event.target.value)}
          placeholder="Enter Aircraft ICAO24"
          spellCheck={false}
          type="text"
          value={icao24Input}
        />
        <button
          className="drawing-button"
          disabled={isSubmittingIcao24}
          type="submit"
        >
          {isSubmittingIcao24 ? "Checking..." : "Track"}
        </button>
      </div>
      <p className="icao24-meta">{trackingMessage}</p>
    </form>
  );
};

export default TrackingForm;
