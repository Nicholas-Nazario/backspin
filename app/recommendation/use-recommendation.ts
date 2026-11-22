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
  nextId?: number;
  phase: "spinning" | "rolling" | "shuffling" | "ready";
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
  const pendingExists =
    current?.nextId === undefined ||
    pool.some((record) => record.instance_id === current.nextId);
  useEffect(() => {
    if (selection && (selection.key !== key || !entry)) setSelection(null);
    else if (selection && !pendingExists)
      setSelection({ ...selection, nextId: undefined, phase: "ready" });
  }, [selection, key, entry, pendingExists]);
  useEffect(() => {
    if (phase !== "spinning" && phase !== "rolling" && phase !== "shuffling")
      return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    function settle() {
      if (preference.matches)
        setSelection((old) =>
          old?.key === key
            ? {
                ...old,
                id: old.nextId ?? old.id,
                nextId: undefined,
                phase: "ready",
              }
            : old,
        );
    }
    settle();
    preference.addEventListener("change", settle);
    return () => preference.removeEventListener("change", settle);
  }, [phase, key]);
  useEffect(() => {
    if (phase !== "shuffling") return;
    const timer = setTimeout(() => {
      setSelection((old) =>
        old?.key === key && old.phase === "shuffling"
          ? {
              ...old,
              id: old.nextId ?? old.id,
              nextId: undefined,
              phase: "ready",
            }
          : old,
      );
    }, 2200);
    return () => clearTimeout(timer);
  }, [phase, key]);
  function completeMotion() {
    setSelection((old) =>
      old?.key === key && old.phase === phase
        ? { ...old, phase: old.phase === "spinning" ? "rolling" : "ready" }
        : old,
    );
  }
  function pick() {
    if (!enabled || (phase !== "idle" && phase !== "ready")) return;
    const next = pickRecommendation(
      pool,
      filters.mood,
      entry && workKey(entry),
    );
    if (!next) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setSelection({
      key,
      id: entry && !reducedMotion ? entry.instance_id : next.instance_id,
      nextId: entry && !reducedMotion ? next.instance_id : undefined,
      phase: reducedMotion ? "ready" : entry ? "shuffling" : "spinning",
    });
  }
  return { entry, phase, pick, completeMotion };
}
