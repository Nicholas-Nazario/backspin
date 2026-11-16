import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  seal,
  unseal,
  sessionSchema,
  handshakeSchema,
  sameOrigin,
} from "../lib/session";
import { openDatabase, database } from "../lib/db";
import { consumeAttempt } from "../lib/oauth-attempts";
import { request, resetScheduler, UpstreamError } from "../lib/discogs";
process.env.SESSION_KEY = randomBytes(32).toString("hex");
test("sessions are encrypted, authenticated, and purpose scoped", () => {
  const value = {
    purpose: "session",
    token: { key: "private-token", secret: "private-secret" },
    username: "listener",
    userId: 1,
    expires: Date.now() + 1000,
  };
  const encoded = seal(value);
  assert.ok(!encoded.includes("private-token"));
  assert.deepEqual(unseal(encoded), value);
  assert.ok(sessionSchema.safeParse(unseal(encoded)).success);
  assert.ok(!handshakeSchema.safeParse(unseal(encoded)).success);
  const bytes = Buffer.from(encoded, "base64url");
  bytes[20] ^= 1;
  assert.equal(unseal(bytes.toString("base64url")), null);
  assert.equal(unseal("invalid"), null);
});
test("database backup restores committed data and has no credential columns", async () => {
  const dir = mkdtempSync(join(tmpdir(), "mystery-"));
  const db = openDatabase(join(dir, "source.sqlite"));
  try {
    db.prepare("INSERT INTO oauth_attempts VALUES (?,?)").run(
      "test",
      Date.now() + 10000,
    );
    await db.backup(join(dir, "backup.sqlite"));
    const copy = openDatabase(join(dir, "backup.sqlite"));
    assert.equal(
      (
        copy.prepare("SELECT count(*) AS n FROM oauth_attempts").get() as {
          n: number;
        }
      ).n,
      1,
    );
    assert.ok(
      !JSON.stringify(
        copy.prepare("SELECT sql FROM sqlite_master").all(),
      ).match(/token_secret|access_token/),
    );
    assert.equal(copy.pragma("foreign_keys", { simple: true }), 1);
    copy.close();
  } finally {
    db.close();
    rmSync(dir, { recursive: true });
  }
});
test("callback attempts are one use and expire", () => {
  const dir = mkdtempSync(join(tmpdir(), "mystery-attempt-"));
  process.env.DATABASE_PATH = join(dir, "db.sqlite");
  const db = database();
  db.prepare("INSERT INTO oauth_attempts VALUES (?,?)").run(
    "valid",
    Date.now() + 10000,
  );
  assert.equal(consumeAttempt("valid"), true);
  assert.equal(consumeAttempt("valid"), false);
  db.prepare("INSERT INTO oauth_attempts VALUES (?,?)").run(
    "expired",
    Date.now() - 1,
  );
  assert.equal(consumeAttempt("expired"), false);
  db.close();
  rmSync(dir, { recursive: true });
});
test("OAuth extras are signed and sent, upstream errors are sanitized", async () => {
  process.env.DISCOGS_CONSUMER_KEY = "app";
  process.env.DISCOGS_CONSUMER_SECRET = "secret";
  resetScheduler();
  await request(
    "/oauth/request_token",
    undefined,
    "POST",
    { oauth_callback: "https://example.com/callback" },
    async (_url, options) => {
      const h = new Headers(options?.headers);
      assert.match(h.get("Authorization")!, /oauth_callback=/);
      assert.match(h.get("Authorization")!, /oauth_signature=/);
      assert.equal(options?.cache, "no-store");
      return new Response("{}");
    },
  );
  resetScheduler();
  await assert.rejects(
    request(
      "/oauth/identity",
      { key: "user", secret: "secret" },
      "GET",
      {},
      async () =>
        new Response("sensitive upstream body", {
          status: 429,
          headers: { "Retry-After": "2" },
        }),
    ),
    (e: unknown) =>
      e instanceof UpstreamError &&
      e.status === 429 &&
      e.retryAfter === 2 &&
      !e.message.includes("sensitive"),
  );
});

test("same-origin forms may omit Origin, but cross-site and opaque origins are denied", () => {
  process.env.APP_URL = "http://localhost:3000";
  const req = (headers: Record<string, string>) =>
    new Request("http://localhost:3000/api/auth/connect", {
      method: "POST",
      headers,
    });
  assert.equal(sameOrigin(req({ origin: "http://localhost:3000" })), true);
  assert.equal(sameOrigin(req({ "sec-fetch-site": "same-origin" })), true);
  assert.equal(sameOrigin(req({ referer: "http://localhost:3000/" })), true);
  assert.equal(
    sameOrigin(req({ origin: "null", "sec-fetch-site": "same-origin" })),
    false,
  );
  assert.equal(
    sameOrigin(
      req({ origin: "https://evil.example", "sec-fetch-site": "same-origin" }),
    ),
    false,
  );
  assert.equal(sameOrigin(req({ "sec-fetch-site": "cross-site" })), false);
  assert.equal(sameOrigin(req({})), false);
});
