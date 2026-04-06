import { divIcon } from "leaflet";

const createFlightMarkerHtml = ({ heading, isInZone }) => {
  const shellClass = isInZone
    ? "flight-marker-shell flight-marker-shell-alert"
    : "flight-marker-shell";
  const planeClass = isInZone
    ? "flight-marker-plane flight-marker-plane-alert"
    : "flight-marker-plane";

  return [
    `<div class="${shellClass}">`,
    '<span class="flight-marker-pulse"></span>',
    `<div class="${planeClass}" style="transform: rotate(${heading}deg);">`,
    '<svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">',
    '<path class="flight-marker-shadow" d="M49 88c-3.5 0-6.6-1.6-8.9-4.8l-4-5.5c-1.6-2.1-1.8-4.9-.6-7.3l2.9-5.5V49.7l-21.2 7.8c-3.4 1.3-7.2.4-9.7-2.2l-6.8-7c-1.8-1.9-2.4-4.6-1.5-7.1.8-2.4 2.8-4.3 5.3-5.1l33.9-10.6V9.9c0-5.2 4-9.1 9.4-9.1 5.4 0 9.4 3.8 9.4 9.1v15.4L91.2 36c2.5.8 4.5 2.7 5.3 5.1.9 2.5.3 5.2-1.5 7.1l-6.8 7c-2.5 2.6-6.3 3.5-9.7 2.2l-21.2-7.8v15.2l2.9 5.5c1.2 2.3 1 5.1-.6 7.3l-4 5.5C55.6 86.4 52.5 88 49 88Z" />',
    '<path class="flight-marker-body" d="M48 5c-2.9 0-4.8 2-4.8 4.9v20.1L10.5 40.2c-2.8.9-3.5 4.5-1.3 6.7l6.8 7c1.3 1.4 3.3 1.8 5.2 1.1l22-8.2v22.4l-4.6 8.8c-.4.8-.4 1.7.2 2.5l4 5.5c1.3 1.8 4 1.8 5.3 0l4-5.5c.6-.8.6-1.7.2-2.5l-4.6-8.8V46.8l22 8.2c1.9.7 3.9.3 5.2-1.1l6.8-7c2.2-2.2 1.5-5.8-1.3-6.7L52.8 30V9.9C52.8 7 50.9 5 48 5Z" />',
    '<path class="flight-marker-wing" d="M48 32.7 18.6 42l5 5.2 24.4-8.7 24.4 8.7 5-5.2Z" />',
    '<path class="flight-marker-tail" d="M48 58.4 43.6 67h8.8Z" />',
    '<circle class="flight-marker-window" cx="48" cy="16.5" r="2.8" />',
    '<circle class="flight-marker-window" cx="48" cy="24.5" r="2.2" />',
    "</svg>",
    "</div>",
    "</div>",
  ].join("");
};

export const createFlightMarkerIcon = ({ heading, isInZone }) =>
  divIcon({
    className: "flight-marker-icon",
    html: createFlightMarkerHtml({ heading, isInZone }),
    iconSize: [76, 76],
    iconAnchor: [38, 38],
    popupAnchor: [0, -40],
  });
