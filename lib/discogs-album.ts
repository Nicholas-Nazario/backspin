import { z } from "zod";
import { albumTitle, artistKey, artistKeys, normalize } from "./album-matching";
import { request, type Token } from "./discogs";
import { snapshotCatalogAlbum } from "./discogs-master-index";
import { createCatalogCache } from "./discogs-cache";
import type { CatalogAlbum } from "./recent-recommendation";

const resultSchema = z.object({
  id: z.number(),
  type: z.literal("master"),
  title: z.string(),
  genre: z.array(z.string()).optional(),
  style: z.array(z.string()).optional(),
  year: z.union([z.string(), z.number()]).optional(),
});

const searches = createCatalogCache<CatalogAlbum | null>();

export type CatalogTimings = {
  snapshotMs: number;
  snapshotMatches: number;
  snapshotMisses: number;
  snapshotAmbiguous: number;
  liveDiscogsMs: number;
  liveDiscogsRequests: number;
  liveDiscogsMatches: number;
  liveDiscogsNoMatch: number;
  liveDiscogsErrors: number;
};

function debugCatalogOutcome(
  outcome: string,
  title: string,
  artists: string[],
) {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.BACKSPIN_DEBUG_CATALOG === "1"
  )
    console.info(
      "spotify.catalog.debug",
      JSON.stringify({ outcome, title, artists }),
    );
}

export async function findDiscogsAlbum(
  title: string,
  artists: string[],
  token: Token,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  timings?: CatalogTimings,
): Promise<CatalogAlbum | null> {
  if (!artistKeys(artists).length) return null;
  const snapshotStarted = performance.now();
  let indexed: ReturnType<typeof snapshotCatalogAlbum>;
  try {
    indexed = snapshotCatalogAlbum(title, artists);
  } finally {
    if (timings) timings.snapshotMs += performance.now() - snapshotStarted;
  }
  if (indexed) {
    if (timings) timings.snapshotMatches++;
    return indexed;
  }
  if (indexed === null) {
    if (timings) timings.snapshotAmbiguous++;
    debugCatalogOutcome("snapshot-ambiguous", title, artists);
    return null;
  }
  if (timings) timings.snapshotMisses++;
  debugCatalogOutcome("snapshot-miss", title, artists);
  const album = albumTitle(title);
  const params = new URLSearchParams({
    type: "master",
    q: `${artists.join(" ")} ${album}`,
    per_page: "20",
  });
  signal.throwIfAborted();
  const key = JSON.stringify([artists, album]);
  const { value } = await searches.load(key, async () => {
    const liveStarted = performance.now();
    if (timings) timings.liveDiscogsRequests++;
    try {
      const response = await request(
        "/database/search?" + params,
        token,
        "GET",
        {},
        fetcher,
        signal,
      );
      const match = matchAlbum(await response.json(), album, artists);
      if (match) {
        if (timings) timings.liveDiscogsMatches++;
      } else {
        if (timings) timings.liveDiscogsNoMatch++;
        debugCatalogOutcome("live-no-match", title, artists);
      }
      return match;
    } catch (error) {
      if (timings) timings.liveDiscogsErrors++;
      debugCatalogOutcome("live-error", title, artists);
      throw error;
    } finally {
      if (timings) timings.liveDiscogsMs += performance.now() - liveStarted;
    }
  });
  return value;
}

function matchAlbum(
  value: unknown,
  album: string,
  artists: string[],
): CatalogAlbum | null {
  const { results } = z.object({ results: z.array(z.unknown()) }).parse(value);
  const expectedCredit = artistKey(artists.join(" "));
  const expectedTitle = normalize(album);
  const matches = new Map<number, z.infer<typeof resultSchema>>();
  for (const result of results) {
    const parsed = resultSchema.safeParse(result);
    if (!parsed.success) continue;
    const candidate = parsed.data;
    const parts = candidate.title.split(" - ");
    const matchesCredit = parts
      .slice(1)
      .some(
        (_, index) =>
          artistKey(parts.slice(0, index + 1).join(" - ")) === expectedCredit &&
          normalize(albumTitle(parts.slice(index + 1).join(" - "))) ===
            expectedTitle,
      );
    if (matchesCredit) matches.set(candidate.id, candidate);
  }
  if (matches.size !== 1) return null;
  const match = [...matches.values()][0];
  const year = Number(match.year);
  return {
    genres: match.genre ?? [],
    styles: match.style ?? [],
    year: Number.isInteger(year) && year >= 1000 && year <= 9999 ? year : null,
  };
}
