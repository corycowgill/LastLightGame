import test from "node:test";
import assert from "node:assert/strict";
import { FootstepTracker, spatialCue } from "./audio-spatial";

test("enemy contacts follow traveled distance and stop when the enemy stops", () => {
  const steps = new FootstepTracker();
  assert.equal(steps.sample({ x: 12, z: 3 }, 1), false);
  assert.equal(steps.sample({ x: 12.6, z: 3 }, 1), false);
  assert.equal(steps.sample({ x: 13.1, z: 3 }, 1), true);
  for (let i = 0; i < 120; i++)
    assert.equal(steps.sample({ x: 13.1, z: 3 }, 1), false);
  assert.equal(
    steps.sample({ x: 60, z: 3 }, 1),
    false,
    "spawn/teleport must not make a footfall",
  );
  assert.equal(steps.sample({ x: 60.5, z: 3 }, 1), false);
});

test("footfall rhythm is independent of render frame rate", () => {
  function contacts(frames: number) {
    const steps = new FootstepTracker();
    let count = 0;
    for (let i = 0; i <= frames; i++) {
      if (steps.sample({ x: (i / frames) * 10.2, z: 0 }, 1)) count++;
    }
    return count;
  }
  assert.equal(contacts(600), 10);
  assert.equal(contacts(30), 10);
});

test("threat cues rotate with camera and become quieter and less precise through walls", () => {
  const listener = { x: 0, z: 0 },
    source = { x: 6, z: 0 };
  const clear = spatialCue(listener, source, 0, true);
  const muffled = spatialCue(listener, source, 0, false);
  assert.equal(clear.pan, 1);
  assert.equal(spatialCue(listener, source, Math.PI, true).pan, -1);
  assert.ok(muffled.gain > 0 && muffled.gain < clear.gain / 3);
  assert.ok(Math.abs(muffled.pan) < Math.abs(clear.pan));
  assert.equal(spatialCue(listener, { x: 40, z: 0 }, 0, true).gain, 0);
  const overlapping = spatialCue(listener, listener, 0, true);
  assert.equal(overlapping.pan, 0);
  assert.equal(overlapping.gain, 1);
});
