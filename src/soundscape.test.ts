import test from "node:test";
import assert from "node:assert/strict";
import { audioMood } from "./soundscape";

test("Hunt transitions select the quiet threat mix even near fire until recovery", () => {
  for (const phase of [
    "EXTINGUISHING",
    "HUNT_GRACE",
    "HUNT_ACTIVE",
    "RELIGHTING",
    "DEAD",
  ])
    assert.equal(audioMood(phase, true), "hunt");
  assert.equal(audioMood("EXPLORING", false), "exploration");
  assert.equal(audioMood("EXPLORING", true), "sanctuary");
  assert.equal(audioMood("SANCTUARY", false), "sanctuary");
});
