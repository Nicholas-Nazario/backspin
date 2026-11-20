export const roomLightings = ["dawn", "day", "dusk", "night"] as const;
export type RoomLighting = (typeof roomLightings)[number];
export type LightingPreference = "auto" | RoomLighting;

/** Device-local clock ranges, matching the approved lighting studies. */
export function roomLightingAt(time: Date): RoomLighting {
  const hour = time.getHours();
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}
