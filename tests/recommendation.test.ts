import { test } from "node:test";
import assert from "node:assert/strict";
import type { Entry } from "../lib/collection";
import {
  emptyRecommendationFilters as defaults,
  recommendationPool,
  pickRecommendation,
  recommendationReason,
} from "../lib/recommendation";
const record = (
  id: number,
  genre = "Jazz",
  style = "Soul-Jazz",
  master = id,
): Entry => ({
  id,
  instance_id: id,
  basic_information: {
    title: `Album ${id}`,
    artists: [{ name: "Artist" }],
    master_id: master,
    genres: [genre],
    styles: [style],
  },
});
const entries = [
  record(1),
  record(2, "Rock", "Hard Rock"),
  record(3, "Jazz", "Free Jazz"),
];
const years = { masters: { 1: 1982, 2: 1975 } };
test("genre and era are hard limits; unknown Discogs original years stay out", () => {
  assert.deepEqual(
    recommendationPool(
      entries,
      { ...defaults, genre: "Jazz", era: "1970" },
      years,
    ),
    [],
  );
  assert.deepEqual(
    recommendationPool(
      entries,
      { ...defaults, genre: "Jazz", era: "1980" },
      years,
    ),
    [entries[0]],
  );
  assert.deepEqual(
    recommendationPool(entries, { ...defaults, era: "1970" }, years),
    [entries[1]],
  );
  assert.deepEqual(recommendationPool(entries, defaults, years), entries);
});
test("mood weights matching metadata without excluding other eligible albums", () => {
  assert.deepEqual(
    recommendationPool(entries, { ...defaults, mood: "Mellow" }, years),
    entries,
  );
  assert.equal(
    pickRecommendation(entries, "Mellow", undefined, () => 0.5)?.id,
    1,
  );
  assert.equal(
    pickRecommendation(entries, "Mellow", undefined, () => 0.99)?.id,
    3,
  );
  assert.equal(pickRecommendation([entries[1]], "Mellow")?.id, 2);
});
test("extra pressings do not increase selection weight and try another avoids the current work", () => {
  const copies = [entries[0], record(4, "Jazz", "Soul-Jazz", 1), entries[1]];
  assert.equal(pickRecommendation(copies, "", undefined, () => 0.6)?.id, 2);
  assert.equal(pickRecommendation(copies, "", "m1", () => 0)?.id, 2);
  assert.equal(pickRecommendation([entries[0]], "", "m1")?.id, 1);
  assert.equal(pickRecommendation([], ""), null);
});
test("explanations identify metadata hints and disclose mood fallback without inventing personal context", () => {
  assert.match(
    recommendationReason(entries[0], { ...defaults, mood: "Mellow" }),
    /Soul-Jazz tag/,
  );
  assert.match(
    recommendationReason(entries[1], { ...defaults, mood: "Mellow" }),
    /No clear mellow match/,
  );
  assert.equal(recommendationReason(entries[0], defaults), "");
});
