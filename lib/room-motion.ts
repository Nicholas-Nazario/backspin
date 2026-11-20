/** Visual transition IDs only. Record metadata stays in the live collection. */
export type SwapPhase =
  "idle" | "clear" | "lift" | "file" | "take" | "place" | "settle";
export type ShelfSlot = 0 | 1;
export type RoomMotionState = {
  displayedId: number | null;
  targetId: number | null;
  phase: SwapPhase;
  occupiedSlot: ShelfSlot;
};

export function initialRoomMotion(id: number | null): RoomMotionState {
  return { displayedId: id, targetId: id, phase: "idle", occupiedSlot: 0 };
}

export type RoomMotionEvent =
  | { type: "select"; id: number | null; animate: boolean }
  | { type: "advance"; targetId: number | null; phase: SwapPhase };

export function roomMotionReducer(
  state: RoomMotionState,
  event: RoomMotionEvent,
): RoomMotionState {
  if (event.type === "select") {
    if (!event.animate || event.id === null || state.displayedId === null) {
      return {
        ...state,
        displayedId: event.id,
        targetId: event.id,
        phase: "idle",
      };
    }
    if (event.id === state.targetId) return state;
    // A new choice during a swap settles immediately, rather than replaying old choices.
    if (state.phase !== "idle") {
      return {
        ...state,
        displayedId: event.id,
        targetId: event.id,
        phase: "idle",
      };
    }
    return { ...state, targetId: event.id, phase: "clear" };
  }

  if (state.targetId !== event.targetId || state.phase !== event.phase)
    return state;
  switch (state.phase) {
    case "clear":
      return { ...state, phase: "lift" };
    case "lift":
      return { ...state, phase: "file" };
    case "file":
      return { ...state, phase: "take" };
    case "take":
      return { ...state, phase: "place", displayedId: state.targetId };
    case "place":
      return { ...state, phase: "settle" };
    case "settle":
      return {
        ...state,
        phase: "idle",
        occupiedSlot: state.occupiedSlot === 0 ? 1 : 0,
      };
    default:
      return state;
  }
}

/** CSS optimizers may serialize 300ms as .3s. Both describe the same delay. */
export function motionDurationMilliseconds(value: string): number {
  const match = value.trim().match(/^([0-9]*\.?[0-9]+)(ms|s)$/);
  return match ? Number(match[1]) * (match[2] === "s" ? 1000 : 1) : 0;
}
