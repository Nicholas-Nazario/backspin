import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../lib/db";
import {
  cachedMasterYears,
  resolveMasterYear,
  correctYear,
  personalYears,
  MASTER_YEAR_TTL,
} from "../lib/year-data";
test("master cache survives reopen, is shared, expires, and supports forced refresh", async () => {
  const dir = mkdtempSync(join(tmpdir(), "year-cache-"));
  const path = join(dir, "db.sqlite");
  let db = openDatabase(path);
  let calls = 0;
  try {
    const first = await resolveMasterYear(db, 100, async () => {
      calls++;
      return 1967;
    });
    assert.equal(first.year, 1967);
    assert.equal(first.expiresAt - first.fetchedAt, MASTER_YEAR_TTL);
    db.close();
    db = openDatabase(path);
    assert.equal(cachedMasterYears(db, [100])[0].source, "discogs-master");
    await resolveMasterYear(db, 100, async () => {
      calls++;
      return 2020;
    });
    assert.equal(calls, 1);
    const updated = await resolveMasterYear(
      db,
      100,
      async () => {
        calls++;
        return 1968;
      },
      true,
    );
    assert.equal(updated.year, 1968);
    assert.equal(calls, 2);
    assert.deepEqual(cachedMasterYears(db, [100], updated.expiresAt), []);
    await resolveMasterYear(db, 100, async () => {
      calls++;
      return 1969;
    });
    assert.equal(calls, 3);
    correctYear(db, 1, 5, 1970);
    correctYear(db, 2, 5, 1980);
    assert.deepEqual(personalYears(db, 1), [{ release_id: 5, year: 1970 }]);
    assert.deepEqual(personalYears(db, 2), [{ release_id: 5, year: 1980 }]);
    await resolveMasterYear(db, 100, async () => 1971, true);
    assert.deepEqual(personalYears(db, 1), [{ release_id: 5, year: 1970 }]);
    correctYear(db, 1, 5, null);
    assert.deepEqual(personalYears(db, 1), []);
    assert.equal(personalYears(db, 2).length, 1);
  } finally {
    db.close();
    rmSync(dir, { recursive: true });
  }
});
test("unknown years are cached, failed lookups are not cached or substituted", async () => {
  const db = openDatabase(":memory:");
  try {
    assert.equal((await resolveMasterYear(db, 1, async () => 0)).year, null);
    assert.equal(cachedMasterYears(db, [1]).length, 1);
    await assert.rejects(
      resolveMasterYear(db, 2, async () => {
        throw new Error("Unavailable");
      }),
    );
    assert.deepEqual(cachedMasterYears(db, [2]), []);
    await assert.rejects(
      resolveMasterYear(
        db,
        1,
        async () => {
          throw new Error("Unavailable");
        },
        true,
      ),
    );
    assert.equal(cachedMasterYears(db, [1])[0].year, null);
  } finally {
    db.close();
  }
});
