import { test } from "node:test";
import assert from "node:assert/strict";
import { roomLightingAt } from "../lib/room-lighting";

test("lighting follows the device-local clock at every cutoff, including midnight", () => {
  const cases = [
    [0, 0, "night"],
    [4, 59, "night"],
    [5, 0, "dawn"],
    [7, 59, "dawn"],
    [8, 0, "day"],
    [16, 59, "day"],
    [17, 0, "dusk"],
    [19, 59, "dusk"],
    [20, 0, "night"],
    [23, 59, "night"],
  ] as const;
  for (const [hour, minute, expected] of cases) {
    assert.equal(
      roomLightingAt(new Date(2026, 10, 20, hour, minute)),
      expected,
    );
  }
});
