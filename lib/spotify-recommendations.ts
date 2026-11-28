import { albumKey } from "./album-matching";
import type { Entry } from "./collection";
import { findDiscogsAlbum, type CatalogTimings } from "./discogs-album";
import { UpstreamError, type Token } from "./discogs";
import {
  missingCatalogAlbums,
  recentRecommendations,
  type CatalogAlbum,
  type RecentPlay,
} from "./recent-recommendation";
import type { YearContext } from "./recommendation";

export async function spotifyRecommendations(
  entries: Entry[],
  plays: RecentPlay[],
  years: YearContext,
  token: Token,
  signal: AbortSignal,
  findAlbum?: typeof findDiscogsAlbum,
  timings?: CatalogTimings,
) {
  const catalog = new Map<string, CatalogAlbum>();
  let warning: string | undefined;
  for (const play of missingCatalogAlbums(entries, plays)) {
    signal.throwIfAborted();
    try {
      const album = await (findAlbum ?? findDiscogsAlbum)(
        play.album,
        play.artists,
        token,
        signal,
        undefined,
        timings,
      );
      if (album) catalog.set(albumKey(play.album, play.artists), album);
    } catch (error) {
      signal.throwIfAborted();
      warning =
        error instanceof UpstreamError && error.status === 429
          ? "Discogs limited catalog requests. Some possible matches are missing."
          : "Discogs couldn’t finish the catalog search. Some possible matches are missing.";
      break;
    }
  }
  return {
    ...recentRecommendations(entries, plays, years, catalog),
    hasRecentPlays: plays.length > 0,
    warning,
  };
}
