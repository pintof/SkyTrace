import { useCallback, useEffect, useReducer } from "react";

const MAX_FLIGHT_PATH_POINTS = 120;

const arePositionsEqual = (leftPosition, rightPosition) => {
  if (!leftPosition || !rightPosition) {
    return false;
  }

  return (
    leftPosition[0] === rightPosition[0] && leftPosition[1] === rightPosition[1]
  );
};

function flightPathReducer(state, action) {
  switch (action.type) {
    case "reset": {
      return {
        flightPath: [],
        isFlightPathVisible: false,
      };
    }

    case "append": {
      const { markerPosition } = action;
      const lastPoint = state.flightPath.at(-1);

      if (arePositionsEqual(lastPoint, markerPosition)) {
        return state;
      }

      const nextFlightPath = [...state.flightPath, markerPosition].slice(
        -MAX_FLIGHT_PATH_POINTS,
      );

      return {
        ...state,
        flightPath: nextFlightPath,
      };
    }

    case "set-visibility": {
      return {
        ...state,
        isFlightPathVisible: action.isVisible,
      };
    }

    default: {
      return state;
    }
  }
}

export function useFlightPath({ activeIcao24, markerPosition }) {
  const [state, dispatchFlightPath] = useReducer(flightPathReducer, {
    flightPath: [],
    isFlightPathVisible: false,
  });

  useEffect(() => {
    dispatchFlightPath({ type: "reset" });
  }, [activeIcao24]);

  useEffect(() => {
    if (!markerPosition) {
      return;
    }

    dispatchFlightPath({ type: "append", markerPosition });
  }, [markerPosition]);

  const setIsFlightPathVisible = useCallback((isVisible) => {
    dispatchFlightPath({ isVisible, type: "set-visibility" });
  }, []);

  return {
    flightPath: state.flightPath,
    isFlightPathVisible: state.isFlightPathVisible,
    setIsFlightPathVisible,
  };
}
