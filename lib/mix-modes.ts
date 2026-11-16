import { Entry, originalYear } from "./collection";
export type MixMode = "random" | "genre" | "style" | "era";
export type MixTarget = { mode: MixMode; value: string };
export const randomTarget: MixTarget = { mode: "random", value: "" };
export function targetReady(target: MixTarget) {
  return target.mode === "random" || !!target.value;
}
export function mixCandidates(
  entries: Entry[],
  target: MixTarget,
  corrections: Record<number, number>,
  masters: Record<number, number | null>,
) {
  if (!targetReady(target)) return [];
  return entries.filter((entry) => {
    if (target.mode === "random") return true;
    if (target.mode === "genre")
      return entry.basic_information.genres?.includes(target.value);
    if (target.mode === "style")
      return entry.basic_information.styles?.includes(target.value);
    const year = originalYear(entry, corrections, masters).year;
    return year !== null && Math.floor(year / 10) * 10 === Number(target.value);
  });
}
