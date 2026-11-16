"use client";
import { useEffect, useRef, useState } from "react";
import type { Entry } from "../../lib/collection";
import { api } from "./api";
type CachedYear = { masterId: number; year: number | null; expiresAt: number };
export function useMasterYears(entries: Entry[], loading: boolean) {
  const [records, setRecords] = useState<Record<number, CachedYear>>({});
  const [status, setStatus] = useState<
    "idle" | "running" | "done" | "partial" | "paused"
  >("idle");
  const [progress, setProgress] = useState(0),
    [total, setTotal] = useState(0),
    [failures, setFailures] = useState(0),
    [clock, setClock] = useState(Date.now());
  const controller = useRef<AbortController | null>(null),
    resume = useRef(false);
  const ids = [
    ...new Set(
      entries
        .map((e) => e.basic_information.master_id)
        .filter((id): id is number => !!id),
    ),
  ];
  const idsKey = ids.join(",");
  const valid = Object.values(records).filter((r) => r.expiresAt > clock);
  const masters = Object.fromEntries(valid.map((r) => [r.masterId, r.year]));
  // Expiry is enforced while the browser stays open, not only on reload.
  useEffect(() => {
    const expiry = Math.min(...valid.map((r) => r.expiresAt));
    if (!Number.isFinite(expiry)) return;
    const timer = setTimeout(
      () => {
        setClock(Date.now());
        setStatus((s) => (s === "running" ? s : "idle"));
      },
      Math.max(0, expiry - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [records, clock]);
  useEffect(() => {
    if (loading) {
      if (controller.current) {
        resume.current = true;
        controller.current.abort();
        controller.current = null;
      }
      return;
    }
    const abort = new AbortController();
    let active = true;
    (async () => {
      try {
        const found: CachedYear[] = [];
        for (let i = 0; i < ids.length; i += 100) {
          const response = await api(
            "/api/master-years?ids=" + ids.slice(i, i + 100).join(","),
            abort.signal,
          );
          found.push(...response.years);
        }
        if (!active) return;
        setClock(Date.now());
        setRecords((old) => ({
          ...old,
          ...Object.fromEntries(found.map((y) => [y.masterId, y])),
        }));
        const existing = Object.values(records).filter(
          (r) => r.expiresAt > Date.now(),
        );
        const available = new Set(
          [...found, ...existing].map((r) => r.masterId),
        );
        const missing = ids.filter((id) => !available.has(id));
        if (resume.current) {
          resume.current = false;
          void run(false, missing);
        } else if (!controller.current)
          setStatus(missing.length ? "idle" : ids.length ? "done" : "idle");
      } catch {
        if (active) setStatus("idle");
      }
    })();
    return () => {
      active = false;
      abort.abort();
    };
  }, [loading, idsKey]);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  async function run(force = false, requested?: number[]) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const pending =
      requested ||
      ids.filter(
        (id) => force || !records[id] || records[id].expiresAt <= Date.now(),
      );
    setStatus("running");
    setProgress(0);
    setTotal(pending.length);
    setFailures(0);
    let failed = 0;
    try {
      for (const [index, id] of pending.entries()) {
        try {
          const result = await api(
            "/api/discogs?kind=master&id=" + id + (force ? "&refresh=1" : ""),
            abort.signal,
          );
          if (abort.signal.aborted) return;
          setRecords((old) => ({
            ...old,
            [id]: {
              masterId: id,
              year: result.data.year,
              expiresAt: result.expiresAt,
            },
          }));
        } catch {
          if (abort.signal.aborted) return;
          setFailures(++failed);
        }
        setProgress(index + 1);
      }
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        setStatus(
          abort.signal.aborted ? "paused" : failed ? "partial" : "done",
        );
      }
    }
  }
  function stop() {
    resume.current = false;
    controller.current?.abort();
    controller.current = null;
    setStatus("paused");
  }
  return {
    masters,
    status,
    progress,
    total,
    failures,
    run,
    stop,
    resolving: status === "running",
  };
}
