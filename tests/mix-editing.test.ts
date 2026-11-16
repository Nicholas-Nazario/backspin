import { test } from "node:test";
import assert from "node:assert/strict";
import { Entry, workKey } from "../lib/collection";
import { SetOptions } from "../lib/random-set";
import {
  reshuffleMix,
  swapMixRecord,
  reorderMixRecord,
} from "../lib/mix-editing";
const entries: Entry[] = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  instance_id: index + 1,
  basic_information: {
    title: "Album " + index,
    master_id: index === 5 ? 1 : index + 1,
    artists: [{ name: "Artist " + index }],
  },
}));
const options: SetOptions = {
  count: 3,
  seed: 42,
  artists: 1,
  genres: 1,
  eras: 1,
};
test("reshuffle preserves pins and slots, avoids duplicate works, and respects count", () => {
  const result = reshuffleMix(entries, [1, 2, 3], [2], options);
  assert.equal(result.length, 3);
  assert.equal(result[1].instance_id, 2);
  assert.equal(new Set(result.map(workKey)).size, 3);
  const shrunk = reshuffleMix(entries, [1, 2, 3], [3], {
    ...options,
    count: 1,
  });
  assert.deepEqual(
    shrunk.map((e) => e.instance_id),
    [3],
  );
  assert.throws(
    () => reshuffleMix(entries, [1, 2, 3], [1, 2], { ...options, count: 1 }),
    RangeError,
  );
  const allPinned = reshuffleMix(entries, [1, 2, 3], [1, 2, 3], options);
  assert.deepEqual(
    allPinned.map((e) => e.instance_id),
    [1, 2, 3],
  );
});
test("swap picks a different work outside the current mix or reports none", () => {
  for (let seed = 0; seed < 10; seed++) {
    const replacement = swapMixRecord(entries, [1, 2, 3], 1, {
      ...options,
      seed,
    });
    assert.ok(replacement);
    assert.ok([4, 5].includes(replacement.instance_id));
  }
  assert.equal(swapMixRecord(entries, [1, 2, 3, 4, 5], 1, options), null);
});
test("reorder inserts at the target position and handles missing IDs without mutation", () => {
  const ids = [1, 2, 3, 4];
  assert.deepEqual(reorderMixRecord(ids, 1, 4), [2, 3, 4, 1]);
  assert.deepEqual(reorderMixRecord(ids, 4, 1), [4, 1, 2, 3]);
  assert.deepEqual(reorderMixRecord(ids, 2, 2), ids);
  assert.deepEqual(reorderMixRecord(ids, 99, 1), ids);
  assert.deepEqual(reorderMixRecord(ids, 1, 99), ids);
  assert.deepEqual(ids, [1, 2, 3, 4]);
});
