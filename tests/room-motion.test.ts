import { test } from "node:test";
import assert from "node:assert/strict";
import {
  motionDurationMilliseconds,
  initialRoomMotion,
  roomMotionReducer,
  type RoomMotionState,
} from "../lib/room-motion";

const advance = (state: RoomMotionState) =>
  roomMotionReducer(state, {
    type: "advance",
    phase: state.phase,
    targetId: state.targetId,
  });

test("a swap keeps old identity through filing/taking and commits the new record once at placement", () => {
  let state = roomMotionReducer(initialRoomMotion(1), {
    type: "select",
    id: 2,
    animate: true,
  });
  const shown: (number | null)[] = [];
  for (const phase of ["clear", "lift", "file", "take", "place", "settle"]) {
    assert.equal(state.phase, phase);
    shown.push(state.displayedId);
    state = advance(state);
  }
  assert.deepEqual(shown, [1, 1, 1, 1, 2, 2]);
  assert.equal(state.phase, "idle");
  assert.equal(state.displayedId, 2);
  assert.equal(state.occupiedSlot, 1);
  state = roomMotionReducer(state, { type: "select", id: 3, animate: true });
  while (state.phase !== "idle") state = advance(state);
  assert.equal(state.occupiedSlot, 0);
});

test("rapid navigation settles on the latest choice and ignores stale phase callbacks", () => {
  let state = roomMotionReducer(initialRoomMotion(1), {
    type: "select",
    id: 2,
    animate: true,
  });
  state = advance(state);
  const stale = {
    type: "advance" as const,
    phase: state.phase,
    targetId: state.targetId,
  };
  state = roomMotionReducer(state, { type: "select", id: 3, animate: true });
  assert.equal(state.displayedId, 3);
  assert.equal(state.phase, "idle");
  assert.deepEqual(roomMotionReducer(state, stale), state);
  // Returning to the old target still must not accept a callback from its old phase.
  state = roomMotionReducer(state, { type: "select", id: 2, animate: true });
  assert.deepEqual(roomMotionReducer(state, stale), state);
});

test("manual pause, hidden/reduced/compact mode and missing data settle without clearing listening ownership", () => {
  for (let step = 0; step < 6; step++) {
    let state = roomMotionReducer(initialRoomMotion(1), {
      type: "select",
      id: 2,
      animate: true,
    });
    for (let index = 0; index < step; index++) state = advance(state);
    const settled = roomMotionReducer(state, {
      type: "select",
      id: 2,
      animate: false,
    });
    assert.equal(settled.phase, "idle");
    assert.equal(settled.displayedId, 2);
    const expired = roomMotionReducer(state, {
      type: "select",
      id: null,
      animate: false,
    });
    assert.equal(expired.displayedId, null);
    assert.equal(expired.phase, "idle");
  }
  const restored = roomMotionReducer(initialRoomMotion(null), {
    type: "select",
    id: 2,
    animate: true,
  });
  assert.equal(restored.phase, "idle");
  assert.equal(restored.displayedId, 2);
});

test("same-ID refresh and repeated selection do not restart an active transition", () => {
  let state = roomMotionReducer(initialRoomMotion(1), {
    type: "select",
    id: 2,
    animate: true,
  });
  state = advance(state);
  assert.equal(
    roomMotionReducer(state, { type: "select", id: 2, animate: true }),
    state,
  );
});

test("motion timing remains correct when CSS minification converts milliseconds to seconds", () => {
  assert.equal(motionDurationMilliseconds("300ms"), 300);
  assert.equal(motionDurationMilliseconds(".3s"), 300);
  assert.equal(motionDurationMilliseconds(" 0.65s "), 650);
  assert.equal(motionDurationMilliseconds("250ms"), 250);
  for (const value of ["", "none", "-1s", "20frames"])
    assert.equal(motionDurationMilliseconds(value), 0);
});
