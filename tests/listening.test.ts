import { test } from "node:test";
import assert from "node:assert/strict";
import { listeningPosition } from "../lib/listening";
import type { Entry } from "../lib/collection";
const entry = (id: number): Entry => ({
  id,
  instance_id: id,
  basic_information: { title: "Record " + id, artists: [] },
});
const queue = [entry(1), entry(2), entry(3)];
test("listening navigation follows order and stops at both boundaries", () => {
  assert.equal(listeningPosition(queue, 1).previous, null);
  assert.equal(listeningPosition(queue, 1).next?.instance_id, 2);
  assert.equal(listeningPosition(queue, 3).next, null);
  assert.equal(listeningPosition(queue, 3).previous?.instance_id, 2);
  assert.equal(
    listeningPosition([queue[1], queue[0], queue[2]], 1).next?.instance_id,
    3,
  );
});
test("no selection and removed records do not silently select another album", () => {
  assert.deepEqual(listeningPosition(queue, null), {
    index: -1,
    previous: null,
    next: null,
  });
  assert.deepEqual(listeningPosition(queue, 999), {
    index: -1,
    previous: null,
    next: null,
  });
  assert.deepEqual(listeningPosition([], 1), {
    index: -1,
    previous: null,
    next: null,
  });
});
