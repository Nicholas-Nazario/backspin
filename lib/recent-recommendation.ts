import { originalYear, workKey, type Entry } from "./collection";
import type { YearContext } from "./recommendation";

export type RecentPlay = {
  albumId: string;
  album: string;
  artists: string[];
  playedAt: string;
  artworkUrl?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function artistKey(name: string) {
  return normalize(name.replace(/\s+\(\d+\)$/, ""));
}

export function recentRecommendations(
  entries: Entry[],
  plays: RecentPlay[],
  years: YearContext,
) {
  const albums = new Map<string, { play: RecentPlay; count: number }>();
  for (const play of [...plays].sort(
    (a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt),
  )) {
    const key = JSON.stringify([
      normalize(play.album),
      play.artists.map(artistKey).sort(),
    ]);
    const album = albums.get(key);
    if (album) album.count++;
    else albums.set(key, { play, count: 1 });
  }

  const records = entries.map((entry) => ({
    entry,
    key: workKey(entry),
    title: normalize(entry.basic_information.title),
    artists: entry.basic_information.artists.map(({ name }) => artistKey(name)),
    styles: entry.basic_information.styles ?? [],
    year: originalYear(entry, years.corrections, years.masters).year,
  }));
  const newest = Date.parse(albums.values().next().value?.play.playedAt ?? "");
  const lanes = [...albums.values()]
    .map(({ play, count }) => {
      const artists = play.artists
        .map(artistKey)
        .filter(
          (name) => name && !["various", "various artists"].includes(name),
        );
      const title = normalize(play.album);
      const sameArtist = (record: (typeof records)[number]) =>
        record.artists.some((name) => artists.includes(name));
      const seeds = records.filter(
        (record) => title && record.title === title && sameArtist(record),
      );
      const seedKeys = new Set(seeds.map((record) => record.key));
      const seedStyles = new Set(
        seeds.flatMap((record) => record.styles.map(normalize)),
      );
      const days = (newest - Date.parse(play.playedAt)) / 86400000;
      const weight = (1 + 0.1 * Math.min(count - 1, 2)) / (1 + days);

      return records
        .flatMap((record) => {
          const shared = [
            ...new Set(
              record.styles.filter((style) => seedStyles.has(normalize(style))),
            ),
          ];
          const artist = sameArtist(record);
          const exact = seedKeys.has(record.key);
          if (!exact && !artist && !shared.length) return [];
          const year = record.year;
          const nearby =
            year !== null &&
            seeds.some(
              (seed) => seed.year !== null && Math.abs(year - seed.year) <= 5,
            );
          const score =
            weight *
            (exact
              ? 5
              : 2 * Math.min(shared.length, 3) +
                (artist ? 1.5 : 0) +
                (nearby ? 0.5 : 0));
          const connection = exact
            ? { kind: "album" as const }
            : shared.length
              ? { kind: "style" as const, styles: shared }
              : {
                  kind: "artist" as const,
                  artists: play.artists.filter((name) =>
                    record.artists.includes(artistKey(name)),
                  ),
                };
          return [
            { entry: record.entry, key: record.key, play, connection, score },
          ];
        })
        .sort((a, b) => b.score - a.score);
    })
    .filter((lane) => lane.length)
    .sort((a, b) => b[0].score - a[0].score);

  const picks: (typeof lanes)[number] = [];
  const picked = new Set<string>();
  while (picks.length < 3) {
    const before = picks.length;
    for (const lane of lanes) {
      const next = lane.find(({ key }) => !picked.has(key));
      if (!next) continue;
      picks.push(next);
      picked.add(next.key);
      if (picks.length === 3) break;
    }
    if (picks.length === before) break;
  }
  return picks;
}
