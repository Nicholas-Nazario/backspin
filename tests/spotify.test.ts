import { after, afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { POST as connect } from "../app/api/spotify/connect/route";
import { GET as callback } from "../app/api/spotify/callback/route";
import { POST as disconnect } from "../app/api/spotify/disconnect/route";
import { database } from "../lib/db";
import { seal, unseal, sessionSchema } from "../lib/session";
import { createAttempt, consumeAttempt } from "../lib/oauth-attempts";
import {
  SPOTIFY_HANDSHAKE_COOKIE,
  SPOTIFY_SESSION_COOKIE,
  readSpotifySession,
} from "../lib/spotify-session";
import { spotifyConfiguration } from "../lib/spotify";

const directory = mkdtempSync(join(tmpdir(), "backspin-spotify-"));
process.env.DATABASE_PATH = join(directory, "fixture.sqlite");
process.env.SESSION_KEY = randomBytes(32).toString("hex");
const appOrigin = "https://backspin.test";
const calls: { url: string; options?: RequestInit }[] = [];
let provider: typeof fetch;

beforeEach(() => {
  process.env.APP_URL = appOrigin;
  process.env.SPOTIFY_CLIENT_ID = "fixture-client";
  process.env.SPOTIFY_CLIENT_SECRET = "fixture-secret";
  calls.length = 0;
  provider = async () => {
    throw new Error("Unexpected provider request");
  };
  mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    return provider(url, options);
  });
});
afterEach(() => mock.restoreAll());
after(() => {
  database().close();
  rmSync(directory, { recursive: true });
});

function form(path: string, cookie = "", returnTo = "/collection") {
  return new NextRequest(appOrigin + path, {
    method: "POST",
    headers: {
      Origin: appOrigin,
      Cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ returnTo }),
  });
}
async function begin(returnTo = "/collection") {
  const response = await connect(form("/api/spotify/connect", "", returnTo));
  assert.equal(response.status, 303);
  const cookie = response.cookies.get(SPOTIFY_HANDSHAKE_COOKIE)!.value;
  const handshake = unseal(cookie);
  return { response, cookie, handshake };
}
function callbackRequest(cookie: string, values: Record<string, string>) {
  return new NextRequest(
    appOrigin + "/api/spotify/callback?" + new URLSearchParams(values),
    { headers: { Cookie: `${SPOTIFY_HANDSHAKE_COOKIE}=${cookie}` } },
  );
}
function success() {
  provider = async (url) =>
    String(url).endsWith("/api/token")
      ? Response.json({
          access_token: "fixture-access-token",
          refresh_token: "fixture-refresh-token",
          token_type: "Bearer",
          expires_in: 3600,
        })
      : Response.json({
          display_name: "Spotify Fixture Listener",
          account_id: "unused-account-id",
          email: "unused@example.invalid",
        });
}

test("connection binds state and exact callback to a protected one-use handshake", async () => {
  const { response, cookie, handshake } = await begin();
  const authorize = new URL(response.headers.get("location")!);
  assert.equal(authorize.origin, "https://accounts.spotify.com");
  assert.equal(authorize.searchParams.get("state"), handshake.state);
  assert.equal(authorize.searchParams.get("scope"), "user-read-private");
  assert.equal(
    authorize.searchParams.get("redirect_uri"),
    appOrigin + "/api/spotify/callback",
  );
  assert.equal(authorize.searchParams.has("client_secret"), false);
  assert.equal(handshake.returnTo, "/collection");
  assert.equal(handshake.purpose, "spotify-handshake");
  assert.ok(!cookie.includes(handshake.state));
  assert.ok(response.headers.get("set-cookie")!.includes("HttpOnly"));
  assert.ok(response.headers.get("set-cookie")!.includes("SameSite=lax"));
  assert.equal(
    !!response.cookies.get(SPOTIFY_HANDSHAKE_COOKIE)!.secure,
    process.env.NODE_ENV === "production",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(consumeAttempt(handshake.id), true);
  assert.equal(consumeAttempt(handshake.id), false);
});

test("successful callback encrypts a short-lived session and discards refresh credentials", async () => {
  success();
  const { cookie, handshake } = await begin();
  const request = callbackRequest(cookie, {
    state: handshake.state,
    code: "fixture-code",
  });
  const response = await callback(request);
  assert.equal(
    response.headers.get("location"),
    appOrigin + "/collection?spotify=connected",
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.cookies.get(SPOTIFY_HANDSHAKE_COOKIE)!.value, "");
  const encoded = response.cookies.get(SPOTIFY_SESSION_COOKIE)!.value;
  assert.equal(response.cookies.get(SPOTIFY_SESSION_COOKIE)!.httpOnly, true);
  assert.equal(
    !!response.cookies.get(SPOTIFY_SESSION_COOKIE)!.secure,
    process.env.NODE_ENV === "production",
  );
  assert.ok(!encoded.includes("fixture-access-token"));
  const session = readSpotifySession(encoded)!;
  assert.equal(session.accessToken, "fixture-access-token");
  assert.equal(session.displayName, "Spotify Fixture Listener");
  assert.ok(session.expires > Date.now());
  assert.ok(session.expires <= Date.now() + 3600000);
  assert.equal("refresh_token" in session, false);
  assert.equal("account_id" in session, false);
  assert.equal("email" in session, false);
  assert.equal(sessionSchema.safeParse(session).success, false);
  assert.equal(readSpotifySession(encoded, session.expires), null);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://accounts.spotify.com/api/token");
  assert.equal(calls[0].options!.cache, "no-store");
  assert.equal(
    new Headers(calls[0].options!.headers).get("Authorization"),
    "Basic " + Buffer.from("fixture-client:fixture-secret").toString("base64"),
  );
  assert.equal(
    new URLSearchParams(calls[0].options!.body as URLSearchParams).get(
      "redirect_uri",
    ),
    appOrigin + "/api/spotify/callback",
  );
  assert.equal(
    new Headers(calls[1].options!.headers).get("Authorization"),
    "Bearer fixture-access-token",
  );
  const replay = await callback(request);
  assert.equal(replay.cookies.has(SPOTIFY_SESSION_COOKIE), false);
  assert.equal(calls.length, 2);
  assert.ok(
    !readFileSync(process.env.DATABASE_PATH!).includes(
      Buffer.from("fixture-access-token"),
    ),
  );
  assert.ok(
    !JSON.stringify(
      database().prepare("SELECT * FROM oauth_attempts").all(),
    ).includes("fixture-refresh-token"),
  );
});

test("invalid state, expired handshakes, and other-service cookies never contact Spotify", async () => {
  const { cookie, handshake } = await begin();
  for (const [value, state] of [
    [cookie, "wrong-state"],
    [seal({ ...handshake, expires: Date.now() - 1 }), handshake.state],
    [seal({ ...handshake, purpose: "handshake" }), handshake.state],
    ["tampered", handshake.state],
  ]) {
    const response = await callback(
      callbackRequest(value, { state, code: "fixture-code" }),
    );
    assert.equal(response.cookies.has(SPOTIFY_SESSION_COOKIE), false);
    assert.match(response.headers.get("location")!, /spotify=error$/);
    assert.equal(response.cookies.get(SPOTIFY_HANDSHAKE_COOKIE)!.value, "");
  }
  assert.equal(calls.length, 0);
});

test("denial and upstream failures return sanitized feedback without replacing existing sessions", async () => {
  const denied = await begin();
  const response = await callback(
    callbackRequest(denied.cookie, {
      state: denied.handshake.state,
      error: "access_denied",
    }),
  );
  assert.match(response.headers.get("location")!, /spotify=denied$/);
  assert.equal(calls.length, 0);
  assert.equal(consumeAttempt(denied.handshake.id), false);

  provider = async () =>
    new Response("sensitive provider body", { status: 403 });
  const failed = await begin();
  const failure = await callback(
    callbackRequest(failed.cookie, {
      state: failed.handshake.state,
      code: "private-code",
    }),
  );
  assert.match(failure.headers.get("location")!, /spotify=error$/);
  assert.equal(failure.cookies.has(SPOTIFY_SESSION_COOKIE), false);
  assert.ok(!JSON.stringify([...failure.headers]).includes("private-code"));
  assert.ok(!(await failure.text()).includes("sensitive"));
});

test("cross-site mutations are forbidden and return destinations cannot escape Backspin", async () => {
  for (const [path, handler] of [
    ["connect", connect],
    ["disconnect", disconnect],
  ] as const) {
    const request = form(`/api/spotify/${path}`);
    request.headers.set("Origin", "https://attacker.invalid");
    assert.equal((await handler(request)).status, 403);
  }
  const { handshake } = await begin("https://attacker.invalid");
  assert.equal(handshake.returnTo, "/");
  assert.equal(calls.length, 0);
});

test("disconnect only clears Spotify cookies and invalidates its pending authorization", async () => {
  const { cookie, handshake } = await begin();
  const response = await disconnect(
    form(
      "/api/spotify/disconnect",
      `${SPOTIFY_HANDSHAKE_COOKIE}=${cookie}; mdj_session=discogs-fixture`,
    ),
  );
  assert.equal(
    response.headers.get("location"),
    appOrigin + "/collection?spotify=disconnected",
  );
  assert.equal(response.cookies.get(SPOTIFY_SESSION_COOKIE)!.value, "");
  assert.equal(response.cookies.get(SPOTIFY_HANDSHAKE_COOKIE)!.value, "");
  assert.equal(response.cookies.has("mdj_session"), false);
  assert.equal(response.cookies.has("mdj_handshake"), false);
  assert.equal(consumeAttempt(handshake.id), false);
  assert.equal(calls.length, 0);
});

test("sessions reject tampering, expiry, and cookies from another provider", () => {
  const value = seal({
    purpose: "spotify-session",
    accessToken: "fixture-token",
    displayName: "Listener",
    expires: Date.now() + 60000,
  });
  assert.equal(readSpotifySession(value)?.displayName, "Listener");
  assert.equal(readSpotifySession(value, Date.now() + 60001), null);
  assert.equal(readSpotifySession("invalid"), null);
  assert.equal(
    readSpotifySession(
      seal({
        purpose: "session",
        token: { key: "key", secret: "secret" },
        username: "Discogs",
        userId: 1,
        expires: Date.now() + 60000,
      }),
    ),
    null,
  );
});

test("Spotify configuration rejects localhost and missing credentials", async () => {
  process.env.APP_URL = "http://localhost:3011";
  assert.equal(spotifyConfiguration(), null);
  process.env.APP_URL = "https://localhost:3011";
  assert.equal(spotifyConfiguration(), null);
  process.env.APP_URL = "http://127.0.0.1:3011";
  assert.equal(
    spotifyConfiguration()?.redirectUri ?? null,
    process.env.NODE_ENV === "production"
      ? null
      : "http://127.0.0.1:3011/api/spotify/callback",
  );
  process.env.APP_URL = "http://[::1]:3011";
  assert.equal(
    spotifyConfiguration()?.redirectUri ?? null,
    process.env.NODE_ENV === "production"
      ? null
      : "http://[::1]:3011/api/spotify/callback",
  );
  process.env.APP_URL = appOrigin;
  delete process.env.SPOTIFY_CLIENT_SECRET;
  assert.equal(spotifyConfiguration(), null);
  const response = await connect(form("/api/spotify/connect"));
  assert.match(response.headers.get("location")!, /spotify=unavailable$/);
  assert.equal(response.cookies.has(SPOTIFY_HANDSHAKE_COOKIE), false);
  assert.equal(calls.length, 0);
});

test("shared OAuth attempts expire without storing credential material", () => {
  const expired = createAttempt(Date.now() - 1);
  assert.equal(consumeAttempt(expired), false);
  const id = createAttempt(Date.now() + 10000);
  assert.equal(consumeAttempt(id), true);
  assert.equal(consumeAttempt(id), false);
});
