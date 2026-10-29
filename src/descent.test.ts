import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG, DESCENT, Game, PROVISIONS } from "./simulation";

const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
const at = (descent: number, seed = 104729) => {
  const g = new Game(seed);
  g.descent = descent;
  g.deepestDescent = Math.max(g.deepestDescent, descent);
  g.reset(seed);
  return g;
};

test("each Descent burns fuel faster and shortens the grace, to a floor", () => {
  const base = at(1),
    deeper = at(3);
  deeper.mode = base.mode = 1;
  Object.assign(deeper.player, base.player);
  assert.ok(
    Math.abs(deeper.fuelRate / base.fuelRate - (1 + 2 * DESCENT.fuelDrain)) <
      1e-9,
  );
  const graceAt = (descent: number) => {
    const g = at(descent);
    g.enemies = [];
    Object.assign(g.player, { x: 28, z: 0 });
    g.fuel = 0.01;
    for (let i = 0; i < 60 * 3 && g.phase !== "HUNT_GRACE"; i++)
      g.step(1 / 60, idle);
    return g.phaseTimeRemaining;
  };
  assert.equal(Math.round(graceAt(1)), CONFIG.grace);
  assert.equal(Math.round(graceAt(3)), CONFIG.grace - 2);
  assert.equal(Math.round(graceAt(DESCENT.max)), DESCENT.minGrace);
});

test("from the second Descent a second Stalker waits deep in the crypt", () => {
  for (const seed of [1, 2, 3, 42, 104729]) {
    assert.equal(at(1, seed).enemies.length, 1);
    const g = at(2, seed);
    assert.equal(g.enemies.length, 2, `seed ${seed}`);
    const [first, second] = g.enemies;
    assert.ok(Math.hypot(first.x - second.x, first.z - second.z) > 4);
  }
});

test("banking at the far sanctuary pays the Descent bonus and unlocks the next", () => {
  const g = at(3);
  g.enemies = [];
  g.artifacts = 4;
  Object.assign(g.player, g.destination);
  g.interact();
  assert.equal(g.completed, true);
  // Four relics at Descent III: +0.5 per relic per level beyond the first.
  assert.equal(g.descentBonus, 4);
  assert.equal(g.banked, 8);
  assert.equal(g.deepestDescent, 4);
  // Turning back to the first fire never earns the bonus.
  const back = at(3);
  back.enemies = [];
  Object.assign(back.player, { x: back.start.x, z: back.start.z + 2 });
  back.artifacts = 4;
  back.interact();
  assert.equal(back.banked, 2);
  assert.equal(back.descentBonus, 0);
  assert.equal(back.deepestDescent, 3);
});

test("death costs one Descent, never below the first", () => {
  const g = at(3);
  g.enemies = [];
  Object.assign(g.player, { x: 28, z: 0 });
  g.phase = "HUNT_ACTIVE";
  g.hunter = { x: 28.2, z: 0, state: "PURSUING" };
  g.step(1 / 60, idle);
  assert.equal(g.phase, "DEAD");
  assert.equal(g.descent, 2);
  assert.equal(g.fellFrom, 3);
  const first = at(1);
  first.enemies = [];
  Object.assign(first.player, { x: 28, z: 0 });
  first.phase = "HUNT_ACTIVE";
  first.hunter = { x: 28.2, z: 0, state: "PURSUING" };
  first.step(1 / 60, idle);
  assert.equal(first.descent, 1);
  assert.equal(first.fellFrom, 0);
});

test("Descent progress survives save and load, bounded and never past the deepest", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const g = at(4);
  g.deepestDescent = 5;
  g.save();
  const loaded = new Game();
  loaded.load();
  assert.equal(loaded.descent, 4);
  assert.equal(loaded.deepestDescent, 5);
  const tampered = JSON.parse(memory.get("lastlight-save")!);
  tampered.descent = 99;
  tampered.deepestDescent = 2;
  memory.set("lastlight-save", JSON.stringify(tampered));
  loaded.load();
  assert.equal(loaded.deepestDescent, 2);
  assert.equal(loaded.descent, 2);
});

test("deeper Descents start with fewer matches, never fewer than one", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 7, DESCENT.max].map((d) => at(d).matches),
    [2, 2, 1, 1, 1, 1, 1],
  );
});

test("provisions are bought between expeditions and carried into exactly the next one", () => {
  const g = at(3);
  g.enemies = [];
  g.banked = 3;
  // Not mid-expedition.
  assert.equal(g.buyProvision("match"), false);
  g.phase = "SANCTUARY";
  assert.equal(g.buyProvision("match"), true);
  assert.equal(g.buyProvision("match"), true);
  assert.equal(g.buyProvision("match"), false, "two spare matches at most");
  assert.equal(g.buyProvision("stones"), true);
  assert.equal(g.banked, 0);
  g.banked = 0;
  g.provisions.stones = 0;
  assert.equal(g.buyProvision("stones"), false, "needs a banked relic");
  g.provisions.stones = 1;
  g.reset(7);
  const matches = g.matches,
    stones = g.stones;
  g.applyProvisions();
  assert.equal(g.matches, matches + 2);
  assert.equal(g.stones, stones + PROVISIONS.stones.amount);
  g.reset(8);
  g.applyProvisions();
  assert.equal(g.matches, matches, "provisions last one expedition");
});

test("unspent provisions survive save and load, bounded by their caps", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const g = at(1);
  g.provisions = { match: 2, stones: 1 };
  g.save();
  const loaded = new Game();
  loaded.load();
  assert.deepEqual(loaded.provisions, { match: 2, stones: 1 });
  const tampered = JSON.parse(memory.get("lastlight-save")!);
  tampered.provisions = { match: 40, stones: -3 };
  memory.set("lastlight-save", JSON.stringify(tampered));
  loaded.load();
  assert.deepEqual(loaded.provisions, { match: 2, stones: 0 });
});
