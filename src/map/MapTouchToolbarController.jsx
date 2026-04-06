import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

const TOUCH_DOUBLE_TAP_WINDOW_MS = 360;
const TOUCH_DOUBLE_TAP_DISTANCE_PX = 28;

const deviceSupportsTouch = () => {
  if (typeof globalThis === "undefined") {
    return false;
  }

  return (
    globalThis.navigator.maxTouchPoints > 0 ||
    globalThis.matchMedia("(hover: none) and (pointer: coarse)").matches
  );
};

const MapTouchToolbarController = ({
  isToolbarHidden,
  onHideToolbar,
  onHideToolbarHint,
  onShowToolbar,
}) => {
  const map = useMap();
  const lastTouchRef = useRef({ time: 0, x: 0, y: 0 });

  useEffect(() => {
    if (!deviceSupportsTouch()) {
      return undefined;
    }

    const container = map.getContainer();

    const handlePointerDown = (event) => {
      if (event.pointerType !== "touch") {
        return;
      }

      if (!isToolbarHidden) {
        lastTouchRef.current = { time: 0, x: 0, y: 0 };
        onHideToolbar();
        onHideToolbarHint();
        return;
      }

      const currentTouch = {
        time: Date.now(),
        x: event.clientX,
        y: event.clientY,
      };
      const timeSincePreviousTap =
        currentTouch.time - lastTouchRef.current.time;
      const touchDistance = Math.hypot(
        currentTouch.x - lastTouchRef.current.x,
        currentTouch.y - lastTouchRef.current.y,
      );

      if (
        timeSincePreviousTap <= TOUCH_DOUBLE_TAP_WINDOW_MS &&
        touchDistance <= TOUCH_DOUBLE_TAP_DISTANCE_PX
      ) {
        event.preventDefault();
        lastTouchRef.current = { time: 0, x: 0, y: 0 };
        onShowToolbar();
        return;
      }

      lastTouchRef.current = currentTouch;
    };

    container.addEventListener("pointerdown", handlePointerDown, {
      passive: false,
    });

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isToolbarHidden, map, onHideToolbar, onHideToolbarHint, onShowToolbar]);

  useEffect(() => {
    if (isToolbarHidden) {
      map.doubleClickZoom.disable();

      return () => {
        map.doubleClickZoom.enable();
      };
    }

    map.doubleClickZoom.enable();
    return undefined;
  }, [isToolbarHidden, map]);

  return null;
};

export default MapTouchToolbarController;
