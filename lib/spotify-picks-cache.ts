import type { spotifyConnectionScope } from "./spotify-session";
import type { spotifyRecommendations } from "./spotify-recommendations";

type Scope = ReturnType<typeof spotifyConnectionScope> & {
  collectionUsername: string;
};
type Picks = Awaited<ReturnType<typeof spotifyRecommendations>>;

export const spotifyPicksTtl = 10 * 60_000;
const limit = 32;
const cache = new Map<
  string,
  {
    picks: Picks;
    collectionUsername: string;
    expires: number;
    timer: ReturnType<typeof setTimeout>;
  }
>();

export function clearSpotifyPicks(key: string) {
  const entry = cache.get(key);
  if (entry) clearTimeout(entry.timer);
  cache.delete(key);
}

export function readSpotifyPicks(scope: Scope, now = Date.now()) {
  const entry = cache.get(scope.key);
  if (!entry) return;
  if (entry.expires > now && scope.expires > now)
    return entry.collectionUsername === scope.collectionUsername
      ? entry.picks
      : undefined;
  clearSpotifyPicks(scope.key);
}

export function cacheSpotifyPicks(
  scope: Scope,
  picks: Picks,
  now = Date.now(),
) {
  if (picks.warning || scope.expires <= now) return;
  clearSpotifyPicks(scope.key);
  const oldest = cache.keys().next().value;
  if (cache.size >= limit && oldest !== undefined) clearSpotifyPicks(oldest);
  const expires = Math.min(now + spotifyPicksTtl, scope.expires);
  const timer = setTimeout(() => cache.delete(scope.key), expires - now);
  timer.unref();
  cache.set(scope.key, {
    picks,
    collectionUsername: scope.collectionUsername,
    expires,
    timer,
  });
}
