import test from "node:test";
import assert from "node:assert/strict";
import { GameAudio } from "./audio";

test("defeat fade ends promptly and retry volume cancels the old envelope", () => {
  const calls: Array<[string, ...number[]]> = [];
  const audio = new GameAudio();
  const gain = {
    cancelAndHoldAtTime(time: number) {
      calls.push(["hold", time]);
    },
    linearRampToValueAtTime(value: number, time: number) {
      calls.push(["ramp", value, time]);
    },
    setTargetAtTime(value: number, time: number, constant: number) {
      calls.push(["target", value, time, constant]);
    },
  };
  const internals = audio as unknown as {
    ctx: { currentTime: number };
    master: { gain: typeof gain };
  };
  internals.ctx = { currentTime: 10 };
  internals.master = { gain };
  audio.fadeAfterDefeat();
  assert.deepEqual(calls, [
    ["hold", 10],
    ["ramp", 0, 10.45],
  ]);
  internals.ctx.currentTime = 10.1;
  audio.setVolume(0.6);
  assert.deepEqual(calls.slice(2), [
    ["hold", 10.1],
    ["target", 0.6, 10.1, 0.1],
  ]);
  assert.equal(audio.volume, 0.6);
  // Pausing or muting during that interval must also override the end cue.
  audio.setVolume(0);
  assert.deepEqual(calls.slice(-2), [
    ["hold", 10.1],
    ["target", 0, 10.1, 0.1],
  ]);
});

test("audio ending before the first gesture requires no context or timer", () => {
  const audio = new GameAudio();
  assert.doesNotThrow(() => audio.fadeAfterDefeat());
  audio.setVolume(0);
  assert.equal(audio.volume, 0);
});
