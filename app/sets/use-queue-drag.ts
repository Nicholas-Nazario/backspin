"use client";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { reorderMixRecord } from "../../lib/mix-editing";

type Drag = {
  id: number;
  original: number[];
  draft: number[];
  pointerId: number | null;
  startX: number;
  startY: number;
  active: boolean;
  inside: boolean;
};
export function useQueueDrag(
  ids: number[],
  onReorder: (ids: number[]) => void,
) {
  const instructions = useId();
  const list = useRef<HTMLOListElement>(null);
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<number[] | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  function reset() {
    drag.current = null;
    setPreview(null);
    setActiveId(null);
  }
  function announcePosition(current: Drag) {
    setAnnouncement(
      `Record at position ${current.draft.indexOf(current.id) + 1} of ${current.draft.length}.`,
    );
  }
  function finish(commit: boolean) {
    const current = drag.current;
    if (!current) return;
    if (commit && current.active) {
      onReorder(current.draft);
      setAnnouncement(
        `Record dropped at position ${current.draft.indexOf(current.id) + 1}.`,
      );
    } else if (current.active) setAnnouncement("Reordering cancelled.");
    reset();
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, id: number) {
    if (!event.isPrimary || event.button !== 0 || ids.length < 2) return;
    drag.current = {
      id,
      original: ids,
      draft: ids,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      inside: true,
    };
    event.currentTarget.focus({ preventScroll: true });
    list.current?.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLOListElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (
      !current.active &&
      Math.hypot(
        event.clientX - current.startX,
        event.clientY - current.startY,
      ) < 6
    )
      return;
    current.active = true;
    setActiveId(current.id);
    const rect = list.current?.getBoundingClientRect();
    if (!rect) return;
    current.inside =
      event.clientX >= rect.left - 24 &&
      event.clientX <= rect.right + 24 &&
      event.clientY >= rect.top - 30 &&
      event.clientY <= rect.bottom + 30;
    if (!current.inside) return;
    const rows = [
      ...(list.current?.querySelectorAll<HTMLElement>("[data-record-id]") ||
        []),
    ];
    const target = rows.reduce<HTMLElement | null>((closest, row) => {
      const box = row.getBoundingClientRect(),
        distance = Math.hypot(
          event.clientX - (box.left + box.width / 2),
          event.clientY - (box.top + box.height / 2),
        );
      if (!closest) return row;
      const previous = closest.getBoundingClientRect();
      return distance <
        Math.hypot(
          event.clientX - (previous.left + previous.width / 2),
          event.clientY - (previous.top + previous.height / 2),
        )
        ? row
        : closest;
    }, null);
    if (target) {
      const next = reorderMixRecord(
        current.draft,
        current.id,
        Number(target.dataset.recordId),
      );
      if (next.some((id, index) => id !== current.draft[index])) {
        current.draft = next;
        setPreview(next);
        announcePosition(current);
      }
    }
    // Scroll only while dragging the handle; normal touch scrolling elsewhere is preserved.
    if (event.clientY < 70) window.scrollBy(0, -18);
    else if (event.clientY > window.innerHeight - 70) window.scrollBy(0, 18);
  }
  function pointerUp(event: PointerEvent<HTMLOListElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    finish(current.inside);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, id: number) {
    if (event.key === "Escape") {
      if (drag.current) {
        event.preventDefault();
        finish(false);
      }
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (drag.current?.pointerId === null) {
        finish(true);
      } else if (!drag.current && ids.length > 1) {
        drag.current = {
          id,
          original: ids,
          draft: ids,
          pointerId: null,
          startX: 0,
          startY: 0,
          active: true,
          inside: true,
        };
        setActiveId(id);
        setAnnouncement(
          "Record picked up. Use arrow keys to move, Space to drop, Escape to cancel.",
        );
      }
      return;
    }
    const current = drag.current;
    if (!current || current.id !== id || current.pointerId !== null) return;
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
      const index = current.draft.indexOf(id),
        target = (() => {
          if (event.key === "ArrowLeft") return index - 1;
          if (event.key === "ArrowRight") return index + 1;
          const rows = [
            ...(list.current?.querySelectorAll<HTMLElement>(
              "[data-record-id]",
            ) || []),
          ];
          const origin = rows
            .find((row) => Number(row.dataset.recordId) === id)
            ?.getBoundingClientRect();
          if (!origin) return index;
          const candidates = rows.filter((row) => {
            const box = row.getBoundingClientRect();
            return event.key === "ArrowUp"
              ? box.top < origin.top - 5
              : box.top > origin.top + 5;
          });
          const nearest = candidates.sort((a, b) => {
            const x = a.getBoundingClientRect(),
              y = b.getBoundingClientRect();
            return (
              Math.hypot(x.left - origin.left, x.top - origin.top) -
              Math.hypot(y.left - origin.left, y.top - origin.top)
            );
          })[0];
          return nearest
            ? current.draft.indexOf(Number(nearest.dataset.recordId))
            : index;
        })();
      if (target >= 0 && target < current.draft.length) {
        current.draft = reorderMixRecord(
          current.draft,
          id,
          current.draft[target],
        );
        setPreview(current.draft);
        announcePosition(current);
      }
    }
  }
  // A changed mix invalidates an in-progress gesture; never restore stale IDs after an external edit.
  const valid =
    drag.current?.original.length === ids.length &&
    drag.current.original.every((id, index) => id === ids[index]);
  return {
    list,
    instructions,
    order: valid && preview ? preview : ids,
    activeId: valid ? activeId : null,
    announcement,
    listEvents: {
      onPointerMove: pointerMove,
      onPointerUp: pointerUp,
      onPointerCancel: () => finish(false),
      onLostPointerCapture: () => finish(false),
    },
    handle: (id: number) => ({
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) =>
        pointerDown(event, id),
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
        keyDown(event, id),
      onBlur: () => {
        if (drag.current?.pointerId === null) finish(false);
      },
    }),
  };
}
