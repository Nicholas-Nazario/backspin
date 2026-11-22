import { albumKey, artistKey, artistKeys, normalize } from "./album-matching";
import { originalYear, workKey, type Entry } from "./collection";
import type { YearContext } from "./recommendation";

export const genreMatchYearWindow = 5;

export type RecentPlay = {
  albumId: string;
  album: string;
  artists: string[];
  playedAt: string;
  artworkUrl?: string;
};

export type Connection =
  | { kind: "album" }
  | { kind: "style"; styles: string[] }
  | { kind: "genre-era"; genres: string[] }
  | { kind: "artist"; artists: string[] };

type AlbumMatch = {
  entry: Entry;
  play: RecentPlay;
  connection: Connection;
  score: number;
  sourceYear: number | null;
  recordYear: number | null;
};

export type ShelfPick = {
  key: string;
  entry: Entry;
  year: number | null;
};

export type RecentPick = ShelfPick & {
  matches: Pick<AlbumMatch, "play" | "connection" | "sourceYear">[];
};

export type CatalogAlbum = {
  styles: string[];
  genres: string[];
  year: number | null;
};

export function missingCatalogAlbums(entries: Entry[], plays: RecentPlay[]) {
  const owned = new Set(
    entries.map(({ basic_information: record }) =>
      albumKey(
        record.title,
        record.artists.map(({ name }) => name),
      ),
    ),
  );
  const missing = new Map<string, RecentPlay>();
  for (const play of plays) {
    const key = albumKey(play.album, play.artists);
    if (!owned.has(key) && !missing.has(key) && artistKeys(play.artists).length)
      missing.set(key, play);
  }
  return [...missing.values()];
}

export function recentRecommendations(
  entries: Entry[],
  plays: RecentPlay[],
  years: YearContext,
  catalog: ReadonlyMap<string, CatalogAlbum> = new Map(),
) {
  const albums = new Map<string, { play: RecentPlay; count: number }>();
  for (const play of [...plays].sort(
    (a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt),
  )) {
    const key = albumKey(play.album, play.artists);
    const album = albums.get(key);
    if (album) album.count++;
    else albums.set(key, { play, count: 1 });
  }

  const records = entries.map((entry) => ({
    entry,
    key: workKey(entry),
    album: albumKey(
      entry.basic_information.title,
      entry.basic_information.artists.map(({ name }) => name),
    ),
    artists: entry.basic_information.artists.map(({ name }) => artistKey(name)),
    styles: entry.basic_information.styles ?? [],
    genres: entry.basic_information.genres ?? [],
    year: originalYear(entry, years.masters).year,
  }));
  const newest = Date.parse(albums.values().next().value?.play.playedAt ?? "");
  const matchesByWork = new Map<string, AlbumMatch[]>();

  for (const [key, { play, count }] of albums) {
    const artists = artistKeys(play.artists);
    const seeds = artists.length
      ? records.filter((record) => record.album === key)
      : [];
    const seedKeys = new Set(seeds.map((record) => record.key));
    const metadata = seeds.length
      ? seeds
      : [catalog.get(key)].filter((album) => album !== undefined);
    const seedStyles = new Set(
      metadata.flatMap((album) => album.styles.map(normalize)),
    );
    const seedGenres = new Set(
      metadata.flatMap((album) => album.genres.map(normalize)),
    );
    const knownSourceYear =
      metadata.find((album) => album.year !== null)?.year ?? null;
    const days = (newest - Date.parse(play.playedAt)) / 86400000;
    const weight = (1 + 0.1 * Math.min(count - 1, 2)) / (1 + days);
    const albumMatches = new Map<string, AlbumMatch>();

    for (const record of records) {
      const shared = [
        ...new Set(
          record.styles.filter((style) => seedStyles.has(normalize(style))),
        ),
      ];
      const sharedArtists = play.artists.filter((name) => {
        const key = artistKey(name);
        return artists.includes(key) && record.artists.includes(key);
      });
      const exact = seedKeys.has(record.key);
      const year = record.year;
      const nearbyYear =
        year === null
          ? undefined
          : metadata.find(
              (album) =>
                album.year !== null &&
                Math.abs(year - album.year) <= genreMatchYearWindow,
            )?.year;
      const nearby = nearbyYear != null;
      const sharedGenres = record.genres.filter((genre) =>
        seedGenres.has(normalize(genre)),
      );
      const genreEra =
        nearby && sharedGenres.length
          ? {
              kind: "genre-era" as const,
              genres: sharedGenres,
            }
          : null;
      const score =
        weight *
        (exact
          ? 5
          : 2 * Math.min(shared.length, 3) +
            (sharedArtists.length ? 1.5 : 0) +
            (genreEra ? 1 : 0) +
            (nearby ? 0.5 : 0));
      const connection: Connection | null = exact
        ? { kind: "album" }
        : shared.length
          ? { kind: "style", styles: shared }
          : sharedArtists.length
            ? { kind: "artist", artists: sharedArtists }
            : genreEra;
      if (!connection) continue;
      const previous = albumMatches.get(record.key);
      if (!previous || score > previous.score) {
        albumMatches.set(record.key, {
          entry: record.entry,
          play,
          connection,
          score,
          sourceYear: nearbyYear ?? knownSourceYear,
          recordYear: year,
        });
      }
    }

    for (const [key, match] of albumMatches) {
      const matches = matchesByWork.get(key);
      if (matches) matches.push(match);
      else matchesByWork.set(key, [match]);
    }
  }

  const onShelf: ShelfPick[] = [];
  const ranked: { pick: RecentPick; score: number }[] = [];
  for (const [key, matches] of matchesByWork) {
    matches.sort((a, b) => b.score - a.score);
    const exact = matches.find((match) => match.connection.kind === "album");
    if (exact) {
      onShelf.push({ key, entry: exact.entry, year: exact.recordYear });
      continue;
    }
    const [strongest, ...supporting] = matches;
    const support = supporting.reduce((sum, match) => sum + match.score, 0);
    // Keep the strongest link decisive and limit the contribution of weaker evidence.
    const score =
      strongest.score + Math.min(strongest.score * 0.2, support * 0.1);
    ranked.push({
      pick: {
        key,
        entry: strongest.entry,
        year: strongest.recordYear,
        matches: matches.map(({ play, connection, sourceYear }) => ({
          play,
          connection,
          sourceYear,
        })),
      },
      score,
    });
  }

  return {
    onShelf,
    recommended: ranked
      .sort((a, b) => b.score - a.score)
      .map(({ pick }) => pick),
  };
}
