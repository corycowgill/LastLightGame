import test from "node:test";
import assert from "node:assert/strict";
import { GameAudio } from "./audio";
import { Game, OMENS } from "./simulation";

/** A GameAudio whose synthesized voices are recorded instead of played. */
const listen = () => {
  const audio = new GameAudio();
  const voices: Array<[string, number]> = [];
  const internals = audio as unknown as Record<string, unknown>;
  internals.ctx = { currentTime: 0 };
  internals.hum = { gain: { setTargetAtTime() {} } };
  internals.oscillator = { frequency: { setTargetAtTime() {} } };
  internals.tone = (f: number) => voices.push(["tone", f]);
  internals.air = (_d: number, _v: number, f: number) =>
    voices.push(["air", f]);
  return { audio, voices };
};

test("a plain expedition starts without a bell; an Omen is tolled once", () => {
  const game = new Game(104729);
  const plain = listen();
  plain.audio.update(game, 1 / 60);
  assert.ok(!plain.voices.some(([, f]) => f === 73));
  game.omenIndex = OMENS.findIndex((o) => o.id === "restless");
  game.reset(7);
  game.omenIndex = OMENS.findIndex((o) => o.id === "restless");
  const omen = listen();
  omen.audio.update(game, 1 / 60);
  assert.equal(omen.voices.filter(([, f]) => f === 73).length, 1);
  omen.voices.length = 0;
  omen.audio.update(game, 1 / 60);
  assert.ok(!omen.voices.some(([, f]) => f === 73));
});

test("a Stalker's smother is heard once per lunge", () => {
  const game = new Game(104729);
  const { audio, voices } = listen();
  audio.update(game, 1 / 60);
  voices.length = 0;
  game.smotherEvent++;
  audio.update(game, 1 / 60);
  assert.ok(voices.some(([kind, f]) => kind === "tone" && f === 120));
  voices.length = 0;
  audio.update(game, 1 / 60);
  assert.ok(!voices.some(([kind, f]) => kind === "tone" && f === 120));
});

test("being sensed in a nook pulses lower and slower than being nearly found", () => {
  const pulses = (exposure: number) => {
    const game = new Game(104729);
    Object.defineProperty(game, "hidingExposure", { get: () => exposure });
    const { audio, voices } = listen();
    for (let i = 0; i < 180; i++) audio.update(game, 1 / 60);
    return voices.filter(([kind, f]) => kind === "tone" && f >= 38 && f <= 72);
  };
  assert.equal(pulses(0).length, 0);
  const faint = pulses(0.2),
    near = pulses(0.95);
  assert.ok(near.length > faint.length);
  assert.ok(near[0][1] > faint[0][1]);
});
