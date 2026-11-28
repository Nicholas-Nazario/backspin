import { request, type Token } from "./discogs";
import { discogsCacheTtl } from "./discogs-freshness";

type CacheEntry<T> = { expires: number; fetchedAt: number; value: T };

class DiscogsCache<T> {
  private entries = new Map<string, CacheEntry<T>>();

  async load(key: string, fetchValue: () => Promise<T>, refresh = false) {
    const cached = this.entries.get(key);
    if (!refresh && cached && cached.expires > Date.now()) return cached;

    const value = await fetchValue();
    const fetchedAt = Date.now();
    this.evictExpired(fetchedAt);
    this.entries.delete(key);
    const oldest = this.entries.keys().next().value;
    if (this.entries.size >= 100 && oldest !== undefined)
      this.entries.delete(oldest);
    const entry = { value, fetchedAt, expires: fetchedAt + discogsCacheTtl };
    this.entries.set(key, entry);
    return entry;
  }

  private evictExpired(now: number) {
    for (const [key, entry] of this.entries)
      if (entry.expires <= now) this.entries.delete(key);
  }

  clear(prefix: string) {
    for (const key of this.entries.keys())
      if (key.startsWith(prefix)) this.entries.delete(key);
  }
}

const accountResponses = new DiscogsCache<unknown>();

function accountPrefix(token: Token) {
  return JSON.stringify(token.key) + ":";
}

export function accountJson(
  path: string,
  token: Token,
  { refresh = false, signal }: { refresh?: boolean; signal?: AbortSignal } = {},
) {
  signal?.throwIfAborted();
  return accountResponses.load(
    accountPrefix(token) + path,
    async () => (await request(path, token, "GET", {}, fetch, signal)).json(),
    refresh,
  );
}

export function clearAccountCache(token: Token, pathPrefix = "") {
  accountResponses.clear(accountPrefix(token) + pathPrefix);
}

export function createCatalogCache<T>() {
  return new DiscogsCache<T>();
}
