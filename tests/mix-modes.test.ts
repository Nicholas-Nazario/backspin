import { test } from "node:test";
import assert from "node:assert/strict";
import { Entry, workKey } from "../lib/collection";
import { mixCandidates, targetReady, MixTarget } from "../lib/mix-modes";
import { randomSet, SetOptions } from "../lib/random-set";
import { reshuffleMix, swapMixRecord } from "../lib/mix-editing";
const entries: Entry[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  instance_id: i + 1,
  basic_information: {
    title: "Record " + i,
    master_id: i + 1,
    artists: [{ name: "Artist " + i }],
    genres: [i < 4 ? "Pop" : "Rock"],
    styles: [i < 4 ? "Synth-pop" : "Hard Rock"],
  },
}));
const masters = {
  1: 1971,
  2: 1974,
  3: 1991,
  4: 1999,
  5: 1970,
  6: 2001,
  7: null,
  8: 0,
};
const options: SetOptions = {
  count: 3,
  seed: 42,
  artists: 1,
  genres: 1,
  eras: 1,
};
test("mode selection constrains genre/style/era and excludes unresolved original years", () => {
  assert.equal(targetReady({ mode: "genre", value: "" }), false);
  assert.deepEqual(
    mixCandidates(entries, { mode: "genre", value: "" }, {}, masters),
    [],
  );
  assert.equal(
    mixCandidates(entries, { mode: "random", value: "" }, {}, masters).length,
    8,
  );
  assert.deepEqual(
    mixCandidates(entries, { mode: "genre", value: "Pop" }, {}, masters).map(
      (e) => e.id,
    ),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    mixCandidates(
      entries,
      { mode: "style", value: "Hard Rock" },
      {},
      masters,
    ).map((e) => e.id),
    [5, 6, 7, 8],
  );
  assert.deepEqual(
    mixCandidates(
      entries,
      { mode: "era", value: "1970" },
      { 1: 1990 },
      masters,
    ).map((e) => e.id),
    [2, 5],
  );
  assert.deepEqual(
    mixCandidates(entries, { mode: "genre", value: "Jazz" }, {}, masters),
    [],
  );
});
test("generation, swap and pinned reshuffle only use the targeted pool", () => {
  for (const target of [
    { mode: "genre", value: "Pop" },
    { mode: "style", value: "Hard Rock" },
    { mode: "era", value: "1970" },
  ] as MixTarget[]) {
    const pool = mixCandidates(entries, target, {}, masters),
      ids = new Set(pool.map((e) => e.instance_id));
    const generated = randomSet(pool, { ...options, count: 2 }, {}, masters);
    assert.ok(generated.every((e) => ids.has(e.instance_id)));
    const current = generated.map((e) => e.instance_id),
      replacement = swapMixRecord(
        pool,
        current,
        current[0],
        options,
        {},
        masters,
      );
    assert.ok(
      replacement &&
        ids.has(replacement.instance_id) &&
        !generated.some((e) => workKey(e) === workKey(replacement)),
    );
    const shuffled = reshuffleMix(
      pool,
      current,
      [current[0]],
      options,
      {},
      masters,
    );
    assert.ok(shuffled.every((e) => ids.has(e.instance_id)));
    assert.equal(shuffled[0].instance_id, current[0]);
  }
});

test("switching mode preserves a compatible pinned slot while dropping ineligible records", () => {
  const pool = mixCandidates(
    entries,
    { mode: "genre", value: "Pop" },
    {},
    masters,
  );
  const result = reshuffleMix(pool, [5, 6, 1], [1], options, {}, masters);
  assert.equal(result[2].instance_id, 1);
  assert.ok(
    result.every((entry) => entry.basic_information.genres?.includes("Pop")),
  );
});
