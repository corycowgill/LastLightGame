import test from "node:test";
import assert from "node:assert/strict";
import { flameFlicker } from "./flame";
test("critical fuel causes bounded irregular sputtering without false extinction", () => {
  const samples = Array.from({ length: 1200 }, (_, i) =>
    flameFlicker(i / 60, 0.09),
  );
  assert.ok(Math.min(...samples) > 0.15);
  assert.ok(Math.min(...samples) < 0.3);
  assert.ok(Math.max(...samples) < 1.25);
  const normal = Array.from({ length: 1200 }, (_, i) =>
    flameFlicker(i / 60, 0.1),
  );
  assert.ok(Math.min(...normal) > 0.75);
});
