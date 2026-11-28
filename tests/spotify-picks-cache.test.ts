import assert from "node:assert/strict";
import test from "node:test";
import {
  cacheSpotifyPicks,
  clearSpotifyPicks,
  readSpotifyPicks,
  spotifyPicksTtl,
} from "../lib/spotify-picks-cache";

test("completed picks are scoped to the connection and collection and expire after ten minutes", () => {
  assert.equal(spotifyPicksTtl, 10 * 60_000);
  const now = Date.now();
  const scope = {
    key: "fixture",
    collectionUsername: "listener",
    expires: now + spotifyPicksTtl * 2,
  };
  const picks = {
    recommended: [],
    onShelf: [],
    hasRecentPlays: false,
    warning: undefined,
  };
  cacheSpotifyPicks(scope, picks, now);
  assert.equal(readSpotifyPicks(scope, now + spotifyPicksTtl - 1), picks);
  assert.equal(
    readSpotifyPicks({ ...scope, key: "other-connection" }, now),
    undefined,
  );
  assert.equal(
    readSpotifyPicks({ ...scope, collectionUsername: "tosker" }, now),
    undefined,
  );
  assert.equal(readSpotifyPicks(scope, now + spotifyPicksTtl), undefined);
});

test("partial results are not cached and connection expiry takes precedence", () => {
  const now = Date.now();
  const scope = {
    key: "ending",
    collectionUsername: "listener",
    expires: now + 1000,
  };
  const picks = {
    recommended: [],
    onShelf: [],
    hasRecentPlays: true,
    warning: undefined,
  };
  cacheSpotifyPicks(scope, { ...picks, warning: "Incomplete" }, now);
  assert.equal(readSpotifyPicks(scope, now), undefined);
  cacheSpotifyPicks(scope, picks, now);
  assert.equal(readSpotifyPicks(scope, scope.expires), undefined);
  cacheSpotifyPicks(scope, picks, now);
  clearSpotifyPicks(scope.key);
  assert.equal(readSpotifyPicks(scope, now), undefined);
});
