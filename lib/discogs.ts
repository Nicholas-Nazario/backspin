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
): Promise<Response> {
  const work = async () => {
    const wait = nextRequest - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
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
    const response = await fetcher(url, {
      method,
      headers: {
        ...auth,
        "User-Agent": process.env.DISCOGS_USER_AGENT || "MysteryDJ/0.1",
        Accept: "application/vnd.discogs.v2.discogs+json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
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
const cache = new Map<string, { expires: number; value: unknown }>();
export async function json(path: string, token: Token, refresh = false) {
  const id = token.key + ":" + path;
  const old = cache.get(id);
  if (!refresh && old && old.expires > Date.now())
    return { value: old.value, expires: old.expires };
  const value = await (await request(path, token)).json();
  const now = Date.now();
  for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  const expires = now + 5 * 60 * 1000;
  cache.set(id, { expires, value });
  return { value, expires };
}
export function clearCache(token: Token) {
  for (const k of cache.keys())
    if (k.startsWith(token.key + ":")) cache.delete(k);
}
