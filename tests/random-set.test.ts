import { test } from "node:test";
import assert from "node:assert/strict";
import { Entry, workKey } from "../lib/collection";
import { albumCount, randomSet, SetOptions } from "../lib/random-set";
const options: SetOptions = {
  count: 3,
  seed: 42,
  artists: 0,
  genres: 0,
  eras: 0,
};
function record(
  id: number,
  artist = "Artist",
  genre = "Jazz",
  master = id,
): Entry {
  return {
    id,
    instance_id: id,
    basic_information: {
      title: "Album " + id,
      master_id: master,
      artists: [{ name: artist }],
      genres: [genre],
    },
  };
}
test("random sets are reproducible, owned, unique by album, and do not mutate input", () => {
  const entries = [
    record(1),
    record(2),
    record(3),
    record(4),
    record(5, "Artist", "Jazz", 1),
  ];
  const before = structuredClone(entries);
  const selected = randomSet(entries, options);
  assert.equal(selected.length, 3);
  assert.equal(new Set(selected.map(workKey)).size, 3);
  assert.ok(selected.every((e) => entries.includes(e)));
  assert.deepEqual(selected, randomSet(entries, options));
  assert.deepEqual(entries, before);
  assert.equal(albumCount(entries), 4);
});
test("sparse and empty sets stay honest; missing masters and duplicate instances are handled", () => {
  const entries = [
    record(1, "Artist", "Jazz", 0),
    record(2, "Artist", "Jazz", 0),
  ];
  entries.push(entries[0]);
  assert.equal(randomSet(entries, { ...options, count: 5 }).length, 2);
  assert.equal(randomSet([], options).length, 0);
  assert.equal(randomSet(entries, { ...options, count: 0 }).length, 0);
});
test("artist and genre variety favor new values when available and allow repeats when needed", () => {
  const entries = [
    record(1, "A", "Jazz"),
    record(2, "A", "Jazz"),
    record(3, "B", "Rock"),
    record(4, "C", "Electronic"),
  ];
  for (let seed = 0; seed < 20; seed++) {
    const artists = randomSet(entries, { ...options, seed, artists: 2 });
    assert.equal(
      new Set(
        artists.flatMap((e) => e.basic_information.artists.map((a) => a.name)),
      ).size,
      3,
    );
    const genres = randomSet(entries, { ...options, seed, genres: 2 });
    assert.equal(
      new Set(genres.flatMap((e) => e.basic_information.genres || [])).size,
      3,
    );
  }
  assert.equal(
    randomSet(entries, { ...options, count: 4, artists: 2, genres: 2 }).length,
    4,
  );
});
test("era variety uses original years and corrections, never pressing dates", () => {
  const entries = [record(1), record(2), record(3), record(4)];
  const masters = { 1: 1971, 2: 1972, 3: 1991, 4: 2001 };
  for (let seed = 0; seed < 20; seed++) {
    const result = randomSet(
      entries,
      { ...options, seed, eras: 2 },
      {},
      masters,
    );
    assert.equal(
      new Set(
        result.map((e) =>
          Math.floor(masters[e.id as keyof typeof masters] / 10),
        ),
      ).size,
      3,
    );
  }
  const correctionResult = randomSet(
    entries,
    { ...options, eras: 2 },
    { 2: 1981 },
    masters,
  );
  assert.equal(correctionResult.length, 3);
  assert.equal(
    randomSet(entries, { ...options, count: 4, eras: 2 }, {}, {}).length,
    4,
  );
});

test("some and a lot apply progressively stronger variety preferences", () => {
  const entries = Array.from({ length: 44 }, (_, index) =>
    record(index + 1, index < 40 ? "A" : index < 42 ? "B" : "C"),
  );
  const totals = [0, 0, 0];
  for (let seed = 0; seed < 100; seed++)
    for (const level of [0, 1, 2] as const) {
      const selected = randomSet(entries, { ...options, seed, artists: level });
      totals[level] += new Set(
        selected.flatMap((entry) =>
          entry.basic_information.artists.map((artist) => artist.name),
        ),
      ).size;
    }
  assert.ok(totals[0] < totals[1]);
  assert.ok(totals[1] < totals[2]);
});
