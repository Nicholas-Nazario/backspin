"use client";
import { useEffect, useState } from "react";
import { workKey, type Entry } from "../../lib/collection";
import {
  pickRecommendation,
  type RecommendationFilters,
} from "../../lib/recommendation";

type Selection = {
  key: string;
  id: number;
  phase: "revealing" | "ready";
};
export function useRecommendation(
  pool: Entry[],
  filters: RecommendationFilters,
  enabled: boolean,
) {
  const key = JSON.stringify(filters);
  const [selection, setSelection] = useState<Selection | null>(null);
  const current = selection?.key === key ? selection : null;
  const entry = current
    ? pool.find((record) => record.instance_id === current.id)
    : undefined;
  const phase = entry ? current!.phase : "idle";
  useEffect(() => {
    if (selection && (selection.key !== key || !entry)) setSelection(null);
  }, [selection, key, entry]);
  useEffect(() => {
    if (phase !== "revealing") return;
    const timer = setTimeout(
      () => {
        setSelection((old) =>
          old?.key === key ? { ...old, phase: "ready" } : old,
        );
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 2200,
    );
    return () => clearTimeout(timer);
  }, [phase, key]);
  function pick() {
    if (!enabled || phase === "revealing") return;
    const next = pickRecommendation(
      pool,
      filters.mood,
      entry && workKey(entry),
    );
    if (next) setSelection({ key, id: next.instance_id, phase: "revealing" });
  }
  return { entry, phase, pick };
}
