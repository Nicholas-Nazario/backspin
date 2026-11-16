import { Entry, originalYear, workKey } from "./collection";

export type VarietyLevel = 0 | 1 | 2;
export type Variety = {
  artists: VarietyLevel;
  genres: VarietyLevel;
  eras: VarietyLevel;
};
export type SetOptions = Variety & { count: number; seed: number };

// A seed makes a selection repeatable for the same collection and options.
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function albumCount(entries: Entry[]) {
  return new Set(entries.map(workKey)).size;
}

function artistNames(entry: Entry) {
  return entry.basic_information.artists
    .map((artist) =>
      artist.name
        .replace(/ \(\d+\)$/, "")
        .trim()
        .toLowerCase(),
    )
    .filter((name) => name && name !== "various" && name !== "various artists");
}

export function randomSet(
  entries: Entry[],
  options: SetOptions,
  corrections: Record<number, number> = {},
  masters: Record<number, number | null> = {},
  context: Entry[] = [],
): Entry[] {
  if (!Number.isInteger(options.count) || options.count < 1) return [];
  const random = seededRandom(options.seed);
  const works = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = workKey(entry);
    const copies = works.get(key) || [];
    if (!copies.some((copy) => copy.instance_id === entry.instance_id))
      copies.push(entry);
    works.set(key, copies);
  }
  // Sample albums uniformly first so owning multiple editions doesn't increase an album's chance.
  const candidates = [...works.values()].map(
    (copies) => copies[Math.floor(random() * copies.length)],
  );
  for (let i = candidates.length - 1; i > 0; i--) {
    const other = Math.floor(random() * (i + 1));
    [candidates[i], candidates[other]] = [candidates[other], candidates[i]];
  }
  const selected: Entry[] = [];
  const artists = new Set<string>(),
    genres = new Set<string>(),
    eras = new Set<number>();
  const decade = (entry: Entry) => {
    const year = originalYear(entry, corrections, masters).year;
    return year === null ? null : Math.floor(year / 10) * 10;
  };
  const strength = (level: VarietyLevel) => [0, 0.55, 2][level];
  context.forEach((entry) => {
    artistNames(entry).forEach((artist) => artists.add(artist));
    (entry.basic_information.genres || []).forEach((genre) =>
      genres.add(genre.toLowerCase()),
    );
    const era = decade(entry);
    if (era !== null) eras.add(era);
  });
  const novelty = (values: string[], seen: Set<string>) =>
    values.length
      ? values.filter((value) => !seen.has(value)).length / values.length
      : 0;
  while (candidates.length && selected.length < options.count) {
    let index = 0;
    if (
      (selected.length || context.length) &&
      (options.artists || options.genres || options.eras)
    ) {
      let best = -Infinity;
      candidates.forEach((entry, candidateIndex) => {
        const era = decade(entry);
        const score =
          (options.artists
            ? strength(options.artists) * novelty(artistNames(entry), artists)
            : 0) +
          (options.genres
            ? strength(options.genres) *
              novelty(
                [
                  ...new Set(
                    (entry.basic_information.genres || []).map((g) =>
                      g.toLowerCase(),
                    ),
                  ),
                ],
                genres,
              )
            : 0) +
          (options.eras && era !== null && !eras.has(era)
            ? strength(options.eras)
            : 0) +
          random();
        if (score > best) {
          best = score;
          index = candidateIndex;
        }
      });
    }
    const entry = candidates.splice(index, 1)[0];
    selected.push(entry);
    artistNames(entry).forEach((artist) => artists.add(artist));
    (entry.basic_information.genres || []).forEach((genre) =>
      genres.add(genre.toLowerCase()),
    );
    const era = decade(entry);
    if (era !== null) eras.add(era);
  }
  return selected;
}
