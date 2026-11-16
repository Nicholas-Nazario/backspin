import { Entry, workKey } from "./collection";
import { randomSet, SetOptions } from "./random-set";

export function reshuffleMix(
  entries: Entry[],
  currentIds: number[],
  pinnedIds: number[],
  options: SetOptions,
  corrections: Record<number, number> = {},
  masters: Record<number, number | null> = {},
) {
  const current = currentIds.flatMap((id) => {
    const entry = entries.find((e) => e.instance_id === id);
    return entry ? [entry] : [];
  });
  const pins = current.filter((entry) => pinnedIds.includes(entry.instance_id));
  if (options.count < pins.length)
    throw new RangeError("The mix must have room for every pinned record.");
  const excluded = new Set(pins.map(workKey));
  const fresh = randomSet(
    entries.filter((e) => !excluded.has(workKey(e))),
    { ...options, count: options.count - pins.length },
    corrections,
    masters,
    pins,
  );
  const result: Array<Entry | undefined> = Array(pins.length + fresh.length);
  // Hold pinned slots when possible; shrinking moves only pins that no longer fit.
  const displaced: Entry[] = [];
  current.forEach((entry) => {
    const index = currentIds.indexOf(entry.instance_id);
    if (pinnedIds.includes(entry.instance_id)) {
      if (index < result.length) result[index] = entry;
      else displaced.push(entry);
    }
  });
  const fill = [...displaced, ...fresh];
  for (let index = 0; index < result.length; index++)
    if (!result[index]) result[index] = fill.shift();
  return result as Entry[];
}

export function swapMixRecord(
  entries: Entry[],
  currentIds: number[],
  instanceId: number,
  options: SetOptions,
  corrections: Record<number, number> = {},
  masters: Record<number, number | null> = {},
) {
  const current = currentIds.flatMap((id) => {
    const entry = entries.find((e) => e.instance_id === id);
    return entry ? [entry] : [];
  });
  const excluded = new Set(current.map(workKey));
  return (
    randomSet(
      entries.filter((entry) => !excluded.has(workKey(entry))),
      { ...options, count: 1 },
      corrections,
      masters,
      current.filter((entry) => entry.instance_id !== instanceId),
    )[0] || null
  );
}

export function reorderMixRecord(
  ids: number[],
  instanceId: number,
  targetId: number,
) {
  const next = [...ids],
    from = next.indexOf(instanceId),
    to = next.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return next;
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
