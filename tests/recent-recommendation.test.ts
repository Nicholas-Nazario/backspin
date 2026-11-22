import { albumKey } from "../lib/album-matching";

import assert from "node:assert/strict";
import test from "node:test";
import type { Entry } from "../lib/collection";
import {
  recentRecommendations,
  type RecentPlay,
} from "../lib/recent-recommendation";

function record(
  id: number,
  title: string,
  artist: string,
  styles: string[],
  master = id,
): Entry {
  return {
    id,
    instance_id: id,
    basic_information: {
      title,
      artists: [{ name: artist }],
      styles,
      master_id: master,
    },
  };
}

const plays: RecentPlay[] = [
  {
    albumId: "funk",
    album: "Brasilian Skies",
    artists: ["Masayoshi Takanaka"],
    playedAt: "2026-11-22T16:00:00Z",
  },
  {
    albumId: "ambient",
    album: "Structures from Silence",
    artists: ["Steve Roach"],
    playedAt: "2026-11-22T15:00:00Z",
  },
];

const years = { masters: { 1: 1978, 3: 1979, 4: 1984 } };

test("exact matches have their own section and exclude duplicate pressings", () => {
  const entries = [
    record(1, "Brasilian Skies", "Masayoshi Takanaka (2)", ["Jazz-Funk"]),
    record(2, "Brasilian Skies", "Masayoshi Takanaka", ["Jazz-Funk"], 1),
    record(3, "Sunburst", "Other Artist", ["Jazz-Funk"]),
    record(4, "Structures from Silence", "Steve Roach", ["Ambient"]),
  ];
  const picks = recentRecommendations(
    entries,
    [...Array(48).fill(plays[0]), plays[1]],
    years,
  );
  assert.deepEqual(
    picks.onShelf.map(({ entry }) => entry.id),
    [1, 4],
  );
  assert.deepEqual(picks.recommended[0].matches[0].connection, {
    kind: "style",
    styles: ["Jazz-Funk"],
  });
  assert.deepEqual(Object.keys(picks.onShelf[0]).sort(), [
    "entry",
    "key",
    "year",
  ]);
});

test("artist-only matches do not spread styles and unrelated title matches are ignored", () => {
  const entries = [
    record(1, "Jolly Jive", "Masayoshi Takanaka", ["Jazz-Funk"]),
    record(2, "Brasilian Skies", "Other Artist", ["Jazz-Funk"]),
    record(3, "Sunburst", "Another Artist", ["Jazz-Funk"]),
  ];
  assert.deepEqual(
    recentRecommendations(entries, plays, years).recommended.map(
      ({ entry }) => entry.id,
    ),
    [1],
  );
  assert.deepEqual(
    recentRecommendations(entries.slice(1), plays, years).recommended,
    [],
  );
  assert.deepEqual(recentRecommendations(entries, [], years), {
    onShelf: [],
    recommended: [],
  });
});

test("separate source albums boost a recommendation and the ranker returns all matches", () => {
  const entries = [
    record(1, "Brasilian Skies", "Masayoshi Takanaka", ["Jazz-Funk"]),
    record(4, "Structures from Silence", "Steve Roach", ["Ambient"]),
    record(5, "Funk Only", "Artist A", ["Jazz-Funk"]),
    record(6, "Both Styles", "Artist B", ["Ambient", "Jazz-Funk"]),
    record(7, "Ambient Only", "Artist C", ["Ambient"]),
    record(8, "More Funk", "Artist D", ["Jazz-Funk"]),
    record(9, "Both Styles", "Artist B", ["Ambient", "Jazz-Funk"], 6),
  ];
  const { recommended } = recentRecommendations(
    entries,
    [...Array(5).fill(plays[0]), plays[1]],
    years,
  );
  assert.equal(recommended.length, 4);
  assert.equal(recommended[0].entry.id, 6);
  assert.deepEqual(
    recommended[0].matches.map(({ play, connection }) => [
      play.albumId,
      connection,
    ]),
    [
      ["funk", { kind: "style", styles: ["Jazz-Funk"] }],
      ["ambient", { kind: "style", styles: ["Ambient"] }],
    ],
  );
});

test("deluxe editions resolve to the owned album and can seed genre and era matches", () => {
  const seed = record(1, "good kid, m.A.A.d city", "Kendrick Lamar", []);
  const near = record(2, "Near", "Someone Else", []);
  const far = record(3, "Far", "Someone Else", []);
  for (const entry of [seed, near, far])
    entry.basic_information.genres = ["Hip Hop"];
  const play = {
    ...plays[0],
    album: "good kid, m.A.A.d city (Deluxe)",
    artists: ["Kendrick Lamar"],
  };
  const results = recentRecommendations([seed, near, far], [play], {
    masters: { 1: 2012, 2: 2017, 3: 2018 },
  });
  assert.equal(results.onShelf[0].entry.id, 1);
  assert.deepEqual(
    results.recommended.map(({ entry }) => entry.id),
    [2],
  );
  assert.equal(results.recommended[0].year, 2017);
  assert.equal(results.recommended[0].matches[0].sourceYear, 2012);
  assert.deepEqual(results.recommended[0].matches[0].connection, {
    kind: "genre-era",
    genres: ["Hip Hop"],
  });
});

test("catalog metadata helps an unowned release without claiming an exact shelf match", () => {
  const near = record(2, "Near", "Someone Else", []);
  const unknown = record(3, "Unknown", "Someone Else", []);
  near.basic_information.genres = unknown.basic_information.genres = [
    "Hip Hop",
  ];
  const play = {
    ...plays[0],
    album: "Example Album",
    artists: ["Example Artist"],
  };
  const catalog = new Map([
    [
      albumKey(play.album, play.artists),
      {
        styles: [],
        genres: ["Hip Hop"],
        year: 2012,
      },
    ],
  ]);
  const results = recentRecommendations(
    [near, unknown],
    [play],
    {
      masters: { 2: 2015 },
    },
    catalog,
  );
  assert.deepEqual(results.onShelf, []);
  assert.deepEqual(
    results.recommended.map(({ entry }) => entry.id),
    [2],
  );
});
