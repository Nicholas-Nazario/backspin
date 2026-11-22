import { setTimeout as delay } from "node:timers/promises";
import OAuth from "oauth-1.0a";
import { createHmac } from "node:crypto";
export type Token = { key: string; secret: string };
export class UpstreamError extends Error {
  constructor(
    public status: number,
    public retryAfter = 60,
  ) {
    super("Discogs request failed");
  }
}
let tail: Promise<unknown> = Promise.resolve();
let nextRequest = 0;
export function resetScheduler() {
  nextRequest = 0;
}
export async function request(
  path: string,
  token?: Token,
  method = "GET",
  extra: Record<string, string> = {},
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<Response> {
  const work = async () => {
    const wait = nextRequest - Date.now();
    signal?.throwIfAborted();
    if (wait > 0) await delay(wait, undefined, { signal });
    const key = process.env.DISCOGS_CONSUMER_KEY,
      secret = process.env.DISCOGS_CONSUMER_SECRET;
    if (!key || !secret)
      throw new Error("Discogs application is not configured");
    const oauth = new OAuth({
      consumer: { key, secret },
      signature_method: "HMAC-SHA1",
      hash_function: (base, key) =>
        createHmac("sha1", key).update(base).digest("base64"),
    });
    const url = "https://api.discogs.com" + path;
    const signed = oauth.authorize({ url, method, data: extra }, token);
    const auth = oauth.toHeader({ ...signed, ...extra });
    const timeout = AbortSignal.timeout(20000);
    const response = await fetcher(url, {
      method,
      headers: {
        ...auth,
        "User-Agent": process.env.DISCOGS_USER_AGENT || "MysteryDJ/0.1",
        Accept: "application/vnd.discogs.v2.discogs+json",
      },
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const limit = Number(response.headers.get("x-discogs-ratelimit")) || 60;
    nextRequest = Date.now() + Math.max(1100, Math.ceil(60000 / limit));
    const retryHeader = response.headers.get("retry-after");
    const retry = retryHeader
      ? /^\d+$/.test(retryHeader)
        ? Number(retryHeader)
        : Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000)
      : 60;
    if (
      response.status === 429 ||
      response.headers.get("x-discogs-ratelimit-remaining") === "0"
    )
      nextRequest = Date.now() + Math.max(1, Math.min(retry || 60, 300)) * 1000;
    if (!response.ok)
      throw new UpstreamError(response.status, Math.max(1, retry || 60));
    return response;
  };
  const result = tail.then(work);
  tail = result.catch(() => {});
  return result;
}
export async function oauthToken(
  path: string,
  token?: Token,
  extra: Record<string, string> = {},
) {
  const response = await request(path, token, "POST", extra);
  const params = new URLSearchParams(await response.text());
  const key = params.get("oauth_token"),
    secret = params.get("oauth_token_secret");
  if (!key || !secret) throw new Error("Invalid OAuth response");
  return { key, secret };
}
// Bounded memory cache; never persists account data. No stale fallback.
const cache = new Map<
  string,
  { expires: number; fetchedAt: number; value: unknown }
>();
export async function json(
  path: string,
  token: Token,
  {
    refresh = false,
    signal,
    fetcher = fetch,
    ttl = 5 * 60 * 1000,
  }: {
    refresh?: boolean;
    signal?: AbortSignal;
    fetcher?: typeof fetch;
    ttl?: number;
  } = {},
) {
  signal?.throwIfAborted();
  const id = token.key + ":" + path;
  const old = cache.get(id);
  if (!refresh && old && old.expires > Date.now())
    return { value: old.value, expires: old.expires, fetchedAt: old.fetchedAt };
  const value = await (
    await request(path, token, "GET", {}, fetcher, signal)
  ).json();
  const now = Date.now();
  for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  const expires = now + ttl;
  cache.set(id, { expires, fetchedAt: now, value });
  return { value, expires, fetchedAt: now };
}
export function clearCache(token: Token, pathPrefix = "") {
  for (const k of cache.keys())
    if (k.startsWith(token.key + ":" + pathPrefix)) cache.delete(k);
}
