"use client";
import { useEffect, useRef, useState } from "react";
import {
  masterYearLiveBatchSize,
  masterYearReadBatchSize,
} from "../../lib/master-year-batch";
import type { Entry } from "../../lib/collection";
import { api } from "./api";
type CachedYear = {
  masterId: number;
  year: number | null;
  expiresAt: number | null;
};

function yearExpiry(record: CachedYear) {
  return record.expiresAt ?? Infinity;
}
export function useMasterYears(entries: Entry[], loading: boolean) {
  const [records, setRecords] = useState<Record<number, CachedYear>>({});
  const [checkedCacheKey, setCheckedCacheKey] = useState<string | null>(null);
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
  const valid = Object.values(records).filter((r) => yearExpiry(r) > clock);
  const masters = Object.fromEntries(valid.map((r) => [r.masterId, r.year]));
  // Expiry is enforced while the browser stays open, not only on reload.
  useEffect(() => {
    const expiry = Math.min(...valid.map(yearExpiry));
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
        for (let i = 0; i < ids.length; i += masterYearReadBatchSize) {
          const response = await api(
            "/api/master-years?ids=" +
              ids.slice(i, i + masterYearReadBatchSize).join(","),
            abort.signal,
          );
          found.push(...response.years);
        }
        if (!active) return;
        setClock(Date.now());
        setRecords((old) => {
          const next = { ...old };
          for (const id of ids) {
            if (next[id]?.expiresAt === null) delete next[id];
          }
          return Object.assign(
            next,
            Object.fromEntries(found.map((year) => [year.masterId, year])),
          );
        });
        const existing = Object.values(records).filter(
          (record) =>
            record.expiresAt !== null && yearExpiry(record) > Date.now(),
        );
        const available = new Set(
          [...found, ...existing].map((r) => r.masterId),
        );
        const missing = ids.filter((id) => !available.has(id));
        if (resume.current) {
          resume.current = false;
          void resolve(missing);
        } else if (!controller.current)
          setStatus(missing.length ? "idle" : ids.length ? "done" : "idle");
      } catch {
        if (active) setStatus("idle");
      } finally {
        if (active) setCheckedCacheKey(idsKey);
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
  function run() {
    return resolve(
      ids.filter((id) => !records[id] || yearExpiry(records[id]) <= Date.now()),
    );
  }
  async function resolve(pending: number[]) {
    if (!pending.length) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setStatus("running");
    setProgress(0);
    setTotal(pending.length);
    setFailures(0);
    let failed = 0;
    try {
      for (
        let index = 0;
        index < pending.length;
        index += masterYearLiveBatchSize
      ) {
        const batch = pending.slice(index, index + masterYearLiveBatchSize);
        try {
          const result: {
            years: CachedYear[];
            failures: number;
            retryAfter?: number;
          } = await api(
            "/api/master-years?resolve=1&ids=" + batch.join(","),
            abort.signal,
          );
          if (abort.signal.aborted) return;
          setRecords((old) => ({
            ...old,
            ...Object.fromEntries(
              result.years.map((year) => [year.masterId, year]),
            ),
          }));
          failed += result.failures;
          setFailures(failed);
          setProgress(index + result.years.length + result.failures);
          if (result.retryAfter) break;
        } catch {
          if (abort.signal.aborted) return;
          failed += batch.length;
          setFailures(failed);
          setProgress(index + batch.length);
          break;
        }
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
  const pendingCount =
    !loading && checkedCacheKey === idsKey
      ? ids.filter((id) => !Object.hasOwn(masters, id)).length
      : 0;
  return {
    masters,
    pendingCount,
    status,
    progress,
    total,
    failures,
    run,
    stop,
    resolving: status === "running",
  };
}
