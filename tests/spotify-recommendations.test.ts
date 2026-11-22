import assert from "node:assert/strict";
import test from "node:test";
import { UpstreamError } from "../lib/discogs";
import { spotifyRecommendations } from "../lib/spotify-recommendations";

const entries = [
  {
    id: 1,
    instance_id: 1,
    basic_information: {
      title: "Owned",
      artists: [{ name: "Artist" }],
      styles: ["Ambient"],
    },
  },
];
const plays = Array.from({ length: 8 }, (_, index) => ({
  albumId: `album${index}`,
  album: `Album ${index}`,
  artists: ["Another Artist"],
  playedAt: "2026-11-22T16:00:00Z",
}));
const token = { key: "fixture", secret: "fixture" };

test("one server result ranks all distinct eligible recent releases", async () => {
  const searched: string[] = [];
  const results = await spotifyRecommendations(
    entries,
    [...plays, plays[0]],
    { masters: {} },
    token,
    new AbortController().signal,
    async (title) => {
      searched.push(title);
      return title === "Album 7"
        ? { genres: [], styles: ["Ambient"], year: null }
        : null;
    },
  );
  assert.deepEqual(
    searched,
    plays.map(({ album }) => album),
  );
  assert.equal(results.recommended[0].matches[0].play.album, "Album 7");
  assert.equal(results.warning, undefined);
});

test("rate limits preserve completed matches and stop additional searches", async () => {
  const searched: string[] = [];
  const results = await spotifyRecommendations(
    entries,
    plays,
    { masters: {} },
    token,
    new AbortController().signal,
    async (title) => {
      searched.push(title);
      if (title === "Album 1") throw new UpstreamError(429);
      return { genres: [], styles: ["Ambient"], year: null };
    },
  );
  assert.deepEqual(searched, ["Album 0", "Album 1"]);
  assert.match(results.warning ?? "", /limited catalog requests/);
  assert.equal(results.recommended[0].matches[0].play.album, "Album 0");
});
