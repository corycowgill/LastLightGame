import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG, Game, OMENS } from "./simulation";

const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
/** A veteran's expedition on `seed`, with its Omen rolled as at a real start. */
const veteran = (seed: number) => {
  const g = new Game(seed);
  g.banked = 1;
  g.reset(seed);
  g.rollOmen();
  return g;
};
const seedFor = (id: string) => {
  for (let seed = 1; seed < 400; seed++)
    if (veteran(seed).omen.id === id) return seed;
  throw new Error(`no seed rolls ${id}`);
};

test("Omens are seeded, cover every kind, and a first-ever expedition plays plain", () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    const g = veteran(seed);
    assert.equal(g.omen.id, veteran(seed).omen.id);
    seen.add(g.omen.id);
  }
  assert.deepEqual(
    [...seen].sort(),
    [...new Set(OMENS.map((o) => o.id))].sort(),
  );
  const novice = new Game(seedFor("echoes"));
  novice.rollOmen();
  assert.equal(novice.omen.id, "quiet");
  // Tests and saves that never roll an Omen keep baseline rules.
  assert.equal(new Game(seedFor("echoes")).omen.id, "quiet");
});

test("each Omen applies its trade and nothing else", () => {
  const plain = (seed: number) => {
    const g = new Game(seed);
    g.banked = 1;
    g.reset(seed);
    return g;
  };
  {
    const seed = seedFor("echoes"),
      g = veteran(seed),
      base = plain(seed);
    assert.equal(g.stones, base.stones + 2);
    assert.ok(
      Math.abs(
        g.footstepNoise(false, false) / base.footstepNoise(false, false) - 1.25,
      ) < 1e-9,
    );
  }
  {
    const seed = seedFor("thin_oil"),
      g = veteran(seed),
      base = plain(seed);
    assert.equal(g.matches, base.matches + 1);
    const oil = g.items.find((i) => i.kind === "fuel" && !i.encounter)!;
    g.enemies = [];
    g.fuel = 1;
    Object.assign(g.player, { x: oil.x, z: oil.z });
    g.interact();
    assert.ok(Math.abs(g.fuel - (1 + CONFIG.fuelPickup * 0.7)) < 1e-9);
  }
  {
    const seed = seedFor("restless"),
      g = veteran(seed);
    assert.equal(plain(seed).enemies.length, 1);
    assert.equal(g.enemies.length, 2);
    g.enemies = [];
    g.artifacts = 6;
    Object.assign(g.player, g.destination);
    g.interact();
    assert.equal(g.descentBonus, 2);
  }
  {
    const seed = seedFor("ember_wind"),
      g = veteran(seed),
      base = plain(seed);
    assert.ok(Math.abs(g.fuelRate / base.fuelRate - 0.9) < 1e-9);
    g.enemies = [];
    Object.assign(g.player, { x: 28, z: 0 });
    g.fuel = 0.01;
    for (let i = 0; i < 60 * 3 && g.phase !== "HUNT_GRACE"; i++)
      g.step(1 / 60, idle);
    assert.equal(Math.round(g.phaseTimeRemaining), CONFIG.grace - 2);
  }
});

test("starting a new expedition clears the previous Omen", () => {
  const g = veteran(seedFor("restless"));
  assert.equal(g.omen.id, "restless");
  g.reset(seedFor("quiet"));
  assert.equal(g.omen.id, "quiet");
  assert.equal(g.enemies.length, 1);
});
