"use client";

import { useEffect, useReducer, useState, type RefObject } from "react";
import {
  initialRoomMotion,
  roomMotionReducer,
  motionDurationMilliseconds,
} from "../../lib/room-motion";

export function useRoomMotion(
  currentId: number | null,
  enabled: boolean,
  scene: RefObject<HTMLDivElement | null>,
) {
  // Start still until browser preferences have been read; avoid an animated first frame.
  const [environment, setEnvironment] = useState({
    reduced: true,
    visible: false,
    compact: true,
  });
  const [state, dispatch] = useReducer(
    roomMotionReducer,
    currentId,
    initialRoomMotion,
  );

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia(
      "(max-width: 700px), (max-aspect-ratio: 1/1), (max-height: 500px)",
    );
    function update() {
      setEnvironment({
        reduced: reduced.matches,
        compact: compact.matches,
        visible: !document.hidden,
      });
    }
    update();
    reduced.addEventListener("change", update);
    compact.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      reduced.removeEventListener("change", update);
      compact.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const active = enabled && !environment.reduced && environment.visible;
  const animateChanges = active && !environment.compact;
  useEffect(() => {
    dispatch({ type: "select", id: currentId, animate: animateChanges });
  }, [currentId, animateChanges]);

  useEffect(() => {
    if (!animateChanges || state.phase === "idle") return;
    const { phase, targetId } = state;
    // CSS owns the choreography durations. Read once per phase, never per frame.
    const duration = scene.current
      ? motionDurationMilliseconds(
          getComputedStyle(scene.current).getPropertyValue("--swap-duration"),
        )
      : 0;
    if (!Number.isFinite(duration) || duration <= 0) {
      dispatch({ type: "select", id: targetId, animate: false });
      return;
    }
    const timer = setTimeout(
      () => dispatch({ type: "advance", phase, targetId }),
      duration,
    );
    return () => clearTimeout(timer);
  }, [state.phase, state.targetId, animateChanges, scene]);

  return {
    active,
    reduced: environment.reduced,
    compact: environment.compact,
    // Disabled motion/expired data clears any old presentation synchronously.
    displayedId:
      animateChanges && currentId !== null ? state.displayedId : currentId,
    phase:
      animateChanges && currentId !== null ? state.phase : ("idle" as const),
    occupiedSlot: state.occupiedSlot,
  };
}
