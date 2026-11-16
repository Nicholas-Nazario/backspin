"use client";
import { useEffect, useState } from "react";
import type { Entry } from "../../lib/collection";
import { api } from "./api";
export function useCollection() {
  const [entries, setEntries] = useState<Entry[]>([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, refresh] = useState(0);
  const [years, setYears] = useState<Record<number, number>>({}),
    [folders, setFolders] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setEntries([]);
    setLoading(true);
    setError("");
    (async () => {
      let expiry = Infinity;
      try {
        const annotations = await api("/api/years", controller.signal);
        setYears(
          Object.fromEntries(
            annotations.years.map((y: { release_id: number; year: number }) => [
              y.release_id,
              y.year,
            ]),
          ),
        );
        let page = 1,
          pages = 1;
        const all = new Map<number, Entry>();
        do {
          const response = await api(
            "/api/discogs?page=" + page,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          expiry = Math.min(expiry, response.expiresAt);
          clearTimeout(timer);
          timer = setTimeout(
            () => {
              controller.abort();
              setEntries([]);
              refresh((v) => v + 1);
            },
            Math.max(0, expiry - Date.now()),
          );
          if (expiry <= Date.now())
            throw new Error(
              "Collection snapshot expired during loading. Please retry.",
            );
          pages = response.data.pagination.pages;
          setTotal(response.data.pagination.items);
          for (const entry of response.data.releases)
            all.set(entry.instance_id, entry);
          setEntries([...all.values()]);
          page++;
        } while (page <= pages);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Unable to open collection",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    api("/api/discogs?kind=folders", controller.signal)
      .then((b) => {
        if (!controller.signal.aborted) setFolders(b.data.folders || []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFolders([]);
      });
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision]);
  async function saveYear(releaseId: number, year: number | null) {
    const response = await fetch("/api/years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId, year }),
    });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || "Unable to save year");
    }
    setYears((old) => {
      const next = { ...old };
      if (year === null) delete next[releaseId];
      else next[releaseId] = year;
      return next;
    });
  }
  return {
    entries,
    total,
    loading,
    error,
    years,
    folders,
    saveYear,
    revision,
    refresh: () => refresh((v) => v + 1),
  };
}
