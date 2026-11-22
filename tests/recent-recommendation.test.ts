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

const years = { corrections: {}, masters: { 1: 1978, 3: 1979, 4: 1984 } };

test("recent picks cover different albums and exclude duplicate pressings", () => {
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
    picks.map(({ entry }) => entry.id),
    [1, 4, 3],
  );
  assert.deepEqual(picks[2].connection, {
    kind: "style",
    styles: ["Jazz-Funk"],
  });
  assert.deepEqual(picks[0].connection, { kind: "album" });
});

test("artist-only matches do not spread styles and unrelated title matches are ignored", () => {
  const entries = [
    record(1, "Jolly Jive", "Masayoshi Takanaka", ["Jazz-Funk"]),
    record(2, "Brasilian Skies", "Other Artist", ["Jazz-Funk"]),
    record(3, "Sunburst", "Another Artist", ["Jazz-Funk"]),
  ];
  assert.deepEqual(
    recentRecommendations(entries, plays, years).map(({ entry }) => entry.id),
    [1],
  );
  assert.deepEqual(recentRecommendations(entries.slice(1), plays, years), []);
  assert.deepEqual(recentRecommendations(entries, [], years), []);
});
