import assert from "node:assert/strict";
import test from "node:test";
import {
  clearCollectionPages,
  collectionPath,
  collectionTtl,
  discogsCollection,
} from "../lib/discogs-collection";
import { json, resetScheduler } from "../lib/discogs";

test("collection pages are reused for five hours and a refresh invalidates only that collection", async (t) => {
  process.env.DISCOGS_CONSUMER_KEY = "fixture";
  process.env.DISCOGS_CONSUMER_SECRET = "fixture";
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({
      pagination: { pages: 1 },
      releases: [
        {
          id: calls,
          instance_id: calls,
          basic_information: { title: "Fixture", artists: [] },
        },
      ],
    });
  });
  const token = { key: "collection-fixture", secret: "fixture" };
  const otherToken = { ...token, key: "other-collection-fixture" };
  const signal = new AbortController().signal;
  const path = collectionPath("Fixture Listener", 1);
  const first = await discogsCollection("Fixture Listener", token, signal);
  assert.equal(first.expiresAt - now, 5 * 60 * 60 * 1000);

  now += 60 * 60 * 1000;
  assert.deepEqual(
    await discogsCollection("Fixture Listener", token, signal),
    first,
  );
  assert.equal(calls, 1);

  await discogsCollection("Fixture Listener", otherToken, signal);
  clearCollectionPages("Fixture Listener", token);
  resetScheduler();
  await json(path, token, { refresh: true, ttl: collectionTtl });
  assert.equal(
    (await discogsCollection("Fixture Listener", token, signal)).entries[0].id,
    3,
  );
  assert.equal(
    (await discogsCollection("Fixture Listener", otherToken, signal)).entries[0]
      .id,
    2,
  );

  now += collectionTtl;
  assert.equal(
    (await discogsCollection("Fixture Listener", token, signal)).entries[0].id,
    4,
  );
  assert.equal(calls, 4);
});
