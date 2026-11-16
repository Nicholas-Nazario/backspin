"use client";
import { useEffect, useRef, useState } from "react";
import { Entry, workKey } from "../../lib/collection";
import { albumCount, Variety } from "../../lib/random-set";
import { reshuffleMix, swapMixRecord } from "../../lib/mix-editing";
import {
  mixCandidates,
  randomTarget,
  targetReady,
  MixTarget,
} from "../../lib/mix-modes";
type Generated = {
  target: MixTarget;
  ids: number[];
  optionsKey: string;
  requestedCount: number;
};
export function useMix(
  entries: Entry[],
  corrections: Record<number, number>,
  masters: Record<number, number | null>,
  disabled: boolean,
  open: boolean,
) {
  const [target, setTarget] = useState<MixTarget>(randomTarget);
  const [count, setCount] = useState(5);
  const [variety, setVariety] = useState<Variety>({
    artists: 1,
    genres: 1,
    eras: 1,
  });
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [pinned, setPinned] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [revealing, setRevealing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelReveal() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setRevealing(false);
  }
  const candidates = mixCandidates(entries, target, corrections, masters);
  const available = albumCount(candidates);
  const optionsKey = JSON.stringify({ count, ...variety, target });
  useEffect(() => {
    cancelReveal();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [optionsKey, disabled, open]);
  const selected =
    generated?.ids.flatMap((id) => {
      const record = entries.find((entry) => entry.instance_id === id);
      return record ? [record] : [];
    }) || [];
  const pinnedCount = selected.filter((entry) =>
    pinned.includes(entry.instance_id),
  ).length;
  const incompatiblePins = selected.filter(
    (entry) =>
      pinned.includes(entry.instance_id) &&
      !candidates.some(
        (candidate) => candidate.instance_id === entry.instance_id,
      ),
  );
  const activeCandidates = mixCandidates(
    entries,
    generated?.target || target,
    corrections,
    masters,
  );
  const usedWorks = new Set(selected.map(workKey));
  const canSwap = activeCandidates.some(
    (entry) => !usedWorks.has(workKey(entry)),
  );
  function releaseIncompatiblePins() {
    setPinned((old) =>
      old.filter(
        (id) => !incompatiblePins.some((entry) => entry.instance_id === id),
      ),
    );
  }
  function shuffle() {
    if (!targetReady(target) || incompatiblePins.length || disabled) return;
    setMessage("");
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const records = reshuffleMix(
      candidates,
      generated?.ids || [],
      pinned,
      { count, seed, ...variety },
      corrections,
      masters,
    );
    cancelReveal();
    setRevealing(true);
    const reveal = () => {
      setGenerated({
        target: { ...target },
        ids: records.map((record) => record.instance_id),
        requestedCount: count,
        optionsKey,
      });
      setRevealing(false);
      timer.current = null;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) reveal();
    else timer.current = setTimeout(reveal, 1500);
  }
  function swap(id: number) {
    if (!generated || pinned.includes(id)) return;
    const replacement = swapMixRecord(
      activeCandidates,
      generated.ids,
      id,
      {
        count: 1,
        seed: crypto.getRandomValues(new Uint32Array(1))[0],
        ...variety,
      },
      corrections,
      masters,
    );
    if (!replacement) {
      setMessage("No other albums available to swap in.");
      return;
    }
    setGenerated((old) =>
      old
        ? {
            ...old,
            ids: old.ids.map((value) =>
              value === id ? replacement.instance_id : value,
            ),
          }
        : old,
    );
    setMessage("Swapped in " + replacement.basic_information.title + ".");
  }
  function remove(id: number) {
    if (!generated) return;
    const ids = generated.ids.filter((value) => value !== id),
      nextCount = Math.max(1, ids.length);
    setGenerated({
      ...generated,
      ids,
      requestedCount: ids.length,
      optionsKey: JSON.stringify({
        count: nextCount,
        ...variety,
        target: generated.target,
      }),
    });
    setCount(nextCount);
    setPinned((old) => old.filter((value) => value !== id));
    setMessage("Record removed from this mix.");
  }
  function pin(id: number) {
    setPinned((old) =>
      old.includes(id) ? old.filter((value) => value !== id) : [...old, id],
    );
  }
  function reorder(ids: number[]) {
    const current = selected.map((entry) => entry.instance_id);
    if (
      ids.length !== current.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !current.includes(id))
    )
      return;
    setGenerated((old) => (old ? { ...old, ids: [...ids] } : old));
  }
  return {
    target,
    setTarget,
    ready: targetReady(target),
    incompatiblePins,
    releaseIncompatiblePins,
    canSwap,
    count,
    setCount,
    variety,
    setVariety,
    generated,
    pinned,
    message,
    revealing,
    available,
    optionsKey,
    selected,
    pinnedCount,
    shuffle,
    swap,
    remove,
    pin,
    reorder,
  };
}
