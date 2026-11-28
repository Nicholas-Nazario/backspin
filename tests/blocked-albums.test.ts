import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { blockedAlbumKeys, setAlbumBlocked } from "../lib/blocked-albums";
import { openDatabase } from "../lib/db";

test("album blocks persist, remain private, and can be removed", () => {
  const dir = mkdtempSync(join(tmpdir(), "backspin-blocks-"));
  const path = join(dir, "db.sqlite");
  try {
    const initial = openDatabase(path);
    try {
      setAlbumBlocked(initial, 1, "m42", true);
      setAlbumBlocked(initial, 1, "m42", true);
      setAlbumBlocked(initial, 2, "r42", true);
    } finally {
      initial.close();
    }

    const reopened = openDatabase(path);
    try {
      assert.deepEqual(blockedAlbumKeys(reopened, 1), ["m42"]);
      assert.deepEqual(blockedAlbumKeys(reopened, 2), ["r42"]);
      assert.deepEqual(blockedAlbumKeys(reopened, 3), []);
      setAlbumBlocked(reopened, 2, "m42", false);
      assert.deepEqual(blockedAlbumKeys(reopened, 1), ["m42"]);
      setAlbumBlocked(reopened, 1, "m42", false);
      assert.deepEqual(blockedAlbumKeys(reopened, 1), []);
      assert.deepEqual(blockedAlbumKeys(reopened, 2), ["r42"]);
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(dir, { recursive: true });
  }
});
