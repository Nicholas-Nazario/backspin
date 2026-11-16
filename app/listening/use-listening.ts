"use client";
import { useState } from "react";
import type { Entry } from "../../lib/collection";
import { listeningPosition } from "../../lib/listening";
export function useListening(entries: Entry[], queue: Entry[]) {
  const [currentId, setCurrentId] = useState<number | null>(null);
  const current =
    entries.find((entry) => entry.instance_id === currentId) || null;
  const position = listeningPosition(queue, currentId);
  function start(id: number) {
    if (entries.some((entry) => entry.instance_id === id)) setCurrentId(id);
  }
  return {
    current,
    currentId,
    previous: position.previous,
    next: position.next,
    inMix: position.index >= 0,
    start,
    stop: () => setCurrentId(null),
  };
}
