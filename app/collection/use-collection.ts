"use client";
import { useEffect, useRef, useState } from "react";
import type { Entry } from "../../lib/collection";
import { api } from "./api";
export function useCollection(username?: string) {
  const hasSnapshot = useRef(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [{ revision, force }, setRequest] = useState({ revision: 0, force: false });
  const [folders, setFolders] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const background = hasSnapshot.current;
    if (!background) setEntries([]);
    setLoading(true);
    setError("");
    (async () => {
      let expiry = Infinity;
      let fetchedAt = Infinity;
      try {
        let page = 1,
          pages = 1;
        const all = new Map<number, Entry>();
        do {
          const response = await api(
            "/api/discogs?page=" +
              page +
              (username ? "&username=" + encodeURIComponent(username) : "") +
              (force ? "&refresh=1" : ""),
            controller.signal,
          );
          if (controller.signal.aborted) return;
          expiry = Math.min(expiry, response.expiresAt);
          fetchedAt = Math.min(fetchedAt, response.fetchedAt ?? Date.now());
          clearTimeout(timer);
          timer = setTimeout(
            () => {
              controller.abort();
              setRequest(({ revision }) => ({
                revision: revision + 1,
                force: false,
              }));
            },
            Math.max(0, expiry - Date.now()),
          );
          if (expiry <= Date.now())
            throw new Error(
              "Collection snapshot expired during loading. Please retry.",
            );
          pages = response.data.pagination.pages;
          if (!background) setTotal(response.data.pagination.items);
          for (const entry of response.data.releases)
            all.set(entry.instance_id, entry);
          if (!background) setEntries([...all.values()]);
          page++;
        } while (page <= pages);
        if (controller.signal.aborted) return;
        setEntries([...all.values()]);
        setTotal(all.size);
        setLastUpdated(fetchedAt);
        hasSnapshot.current = true;
      } catch (e) {
        if (!controller.signal.aborted) {
          // Keep the last view during refresh, but never offer an expired snapshot after failure.
          setEntries([]);
          hasSnapshot.current = false;
          setError(
            e instanceof Error ? e.message : "Unable to open collection",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    if (!username) {
      api(
        "/api/discogs?kind=folders" + (force ? "&refresh=1" : ""),
        controller.signal,
      )
        .then((b) => {
          if (!controller.signal.aborted) setFolders(b.data.folders || []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFolders([]);
        });
    }
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision, force, username]);
  return {
    entries,
    total,
    loading,
    refreshing: loading && hasSnapshot.current,
    lastUpdated,
    error,
    folders,
    revision,
    refresh: () =>
      setRequest(({ revision }) => ({ revision: revision + 1, force: true })),
  };
}
