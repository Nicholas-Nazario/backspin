"use client";

import { useEffect, useState } from "react";
import {
  roomLightingAt,
  type LightingPreference,
} from "../../lib/room-lighting";

export function useRoomLighting(preference: LightingPreference) {
  // The room mounts from a client action, so its first frame uses the device clock.
  const [automaticLighting, setAutomaticLighting] = useState(() =>
    roomLightingAt(new Date()),
  );

  useEffect(() => {
    if (preference !== "auto") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function update() {
      clearTimeout(timer);
      if (document.hidden) return;
      setAutomaticLighting(roomLightingAt(new Date()));
      timer = setTimeout(update, 60000 - (Date.now() % 60000));
    }
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, [preference]);

  return preference === "auto" ? automaticLighting : preference;
}
