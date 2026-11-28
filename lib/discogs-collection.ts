import type { Entry } from "./collection";
import type { Token } from "./discogs";
import { accountJson, clearAccountCache } from "./discogs-cache";

export function isDiscogsCollectionUsername(username: string) {
  return (
    /^[a-zA-Z0-9_.-]{1,64}$/.test(username) &&
    username !== "." &&
    username !== ".."
  );
}

export function collectionFoldersPath(username: string) {
  return `/users/${encodeURIComponent(username)}/collection/folders`;
}

function collectionPagePrefix(username: string) {
  return `${collectionFoldersPath(username)}/0/releases?per_page=50&page=`;
}

export function collectionPath(username: string, page: number) {
  return collectionPagePrefix(username) + page;
}

export function clearCollectionPages(username: string, token: Token) {
  clearAccountCache(token, collectionPagePrefix(username));
}

export async function discogsCollection(
  username: string,
  token: Token,
  signal: AbortSignal,
) {
  const entries = new Map<number, Entry>();
  let pages = 1;
  let expiresAt = Infinity;
  for (let page = 1; page <= pages; page++) {
    signal.throwIfAborted();
    const { value, expires } = await accountJson(
      collectionPath(username, page),
      token,
      { signal },
    );
    expiresAt = Math.min(expiresAt, expires);
    const data = value as { pagination: { pages: number }; releases: Entry[] };
    pages = data.pagination.pages;
    for (const entry of data.releases) entries.set(entry.instance_id, entry);
  }
  return { entries: [...entries.values()], expiresAt };
}
