import test from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  findPath,
  walkable,
  lineOfSight,
  navigationDistance,
} from "./simulation";
import { BRAND_CONFIG } from "./brands";
const idle = { forward: 0, strafe: 0, sprint: false, crouch: true, yaw: 0 };
test("a match brand can light the noisy reliquary while the handheld torch stays out", () => {
  const g = encounter();
  g.enemies = [];
  const relic = g.items.find((i) => i.id === g.encounterRelicId)!;
  Object.assign(g.player, { x: relic.x, z: relic.z });
  g.fuel = 0;
  g.phase = "HUNT_ACTIVE";
  assert.ok(g.dropBrand());
  g.interact();
  assert.ok(g.activeInteraction);
  advance(g, 3.6);
  assert.equal(relic.taken, true);
  assert.equal(g.artifacts, 3);
  assert.equal(g.fuel, 0);
  assert.equal(g.phase, "HUNT_ACTIVE");
  assert.equal(g.matches, 1);
});
test("an emergency brand spends exactly one match without relighting or refilling the torch", () => {
  const g = new Game(104729);
  g.enemies = [];
  Object.assign(g.player, { x: 28, z: 0 });
  g.fuel = 0;
  g.phase = "HUNT_ACTIVE";
  const matches = g.matches;
  assert.ok(g.brandReady);
  assert.ok(g.dropBrand());
  assert.equal(g.matches, matches - 1);
  assert.equal(g.fuel, 0);
  assert.equal(g.phase, "HUNT_ACTIVE");
  assert.equal(g.dropBrand(), false);
  assert.equal(g.matches, matches - 1);
  advance(g, 18.1);
  g.matches = 0;
  assert.equal(g.dropBrand(), false);
  assert.equal(g.fuel, 0);
});
function advance(g: Game, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.step(1 / 60, idle);
}
function encounter() {
  for (let seed = 1; seed < 40; seed++) {
    const g = new Game(seed);
    if (g.encounter && g.encounterRelicId !== undefined) return g;
  }
  throw new Error("No optional encounter fixture");
}
function approachGate(g: Game) {
  const gate = g.encounter!.gate,
    room = g.world.layout!.rooms[gate.farRoom];
  Object.assign(g.player, {
    x: gate.x + Math.sign(room.x * 2 - gate.x) * 2,
    z: gate.z + Math.sign(room.z * 2 - gate.z) * 2,
  });
}
test("closed return seal is physical and opening it shortens a real collision-aware route", () => {
  const g = encounter(),
    gate = g.encounter!.gate;
  const relic = g.items.find((i) => i.id === g.encounterRelicId)!;
  const before = findPath(g.world, relic, g.start).length;
  assert.ok(before > 0);
  assert.equal(walkable(g.world, gate.x, gate.z), false);
  approachGate(g);
  const fuel = g.fuel;
  g.interact();
  assert.equal(g.shortcutOpen, false);
  assert.equal(g.fuel, fuel);
  relic.taken = true;
  g.interact();
  assert.equal(g.shortcutOpen, true);
  assert.ok(walkable(g.world, gate.x, gate.z));
  assert.ok(
    findPath(g.world, relic, g.start).length < before,
    "cached closed route must be invalidated",
  );
  assert.ok(g.discoveries.some((s) => s.includes("raised return gate")));
});
test("closed optional seals preserve sanctuary and room connectivity across seeded encounters", () => {
  let count = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const g = new Game(seed);
    if (!g.encounter) continue;
    count++;
    for (const room of g.world.layout!.rooms)
      assert.ok(
        findPath(g.world, g.start, { x: room.x * 2, z: room.z * 2 }).length > 0,
        `seed ${seed}`,
      );
  }
  assert.ok(count > 10);
});
test("raising the noisy shortcut makes a distant Hunter investigate", () => {
  const g = encounter();
  g.enemies = [];
  approachGate(g);
  g.items.find((i) => i.id === g.encounterRelicId)!.taken = true;
  g.fuel = 0;
  g.phase = "HUNT_ACTIVE";
  g.interact();
  const p = g.world.cells
    .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
    .find(
      (p) =>
        Math.hypot(p.x - g.player.x, p.z - g.player.z) > 8 &&
        Math.hypot(p.x - g.player.x, p.z - g.player.z) < 14 &&
        navigationDistance(g.world, p, g.player) < 20,
    );
  assert.ok(p);
  g.hunter = {
    ...p,
    state: "SEARCHING",
    yaw: Math.atan2(-(g.player.x - p.x), -(g.player.z - p.z)) + Math.PI,
  };
  g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "INVESTIGATING");
});
test("brand is paid for, bounded, and survives the initial extinction grace window", () => {
  const g = new Game(104729);
  g.enemies = [];
  Object.assign(g.player, { x: 28, z: 0 });
  const fuel = g.fuel;
  assert.equal(g.dropBrand(), true);
  assert.equal(g.fuel, fuel - BRAND_CONFIG.fuelCost);
  assert.equal(g.dropBrand(), false);
  assert.equal(g.brands.length, 1);
  g.forceHunt();
  advance(g, 9.2);
  assert.ok(g.brands[0].remaining > 8);
  assert.equal(g.fuel, 0);
});
test("a temporary brand repels both Hunters but never provides sanctuary refill or permanent banishment", () => {
  const g = new Game(1);
  g.enemies = [];
  g.world = {
    cells: Array.from({ length: 41 * 41 }, (_, i) => ({
      x: (i % 41) - 20,
      z: Math.floor(i / 41) - 20,
      kind: "corridor",
    })),
    start: { x: -20, z: -20 },
    exit: { x: 20, z: 20 },
    seed: 1,
  };
  Object.assign(g.player, { x: 25, z: 25 });
  g.fuel = 0;
  g.phase = "HUNT_ACTIVE";
  g.hunter = { x: 2, z: 0, state: "SEARCHING" };
  g.additionalHunters = [{ x: -2, z: 0, state: "SEARCHING" }];
  g.brands = [{ id: 1, x: 0, z: 0, remaining: 18 }];
  g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "FLEEING");
  assert.equal(g.additionalHunters[0].state, "FLEEING");
  advance(g, 3.2);
  assert.notEqual(g.hunter.state, "BANISHED");
  assert.notEqual(g.additionalHunters[0].state, "BANISHED");
  assert.equal(g.fuel, 0);
  assert.notEqual(g.phase, "SANCTUARY");
  advance(g, 15);
  assert.equal(g.brands.length, 0);
});
test("brand protection respects the physical closed return gate", () => {
  const g = encounter();
  g.enemies = [];
  const gate = g.encounter!.gate;
  const dx = Math.sin(gate.yaw),
    dz = Math.cos(gate.yaw);
  const brand = {
    id: 1,
    x: gate.x - dx * 1.4,
    z: gate.z - dz * 1.4,
    remaining: 18,
  };
  g.brands = [brand];
  g.hunter = { x: gate.x + dx * 1.4, z: gate.z + dz * 1.4, state: "SEARCHING" };
  Object.assign(g.player, { x: brand.x - dx * 4, z: brand.z - dz * 4 });
  g.fuel = 0;
  g.phase = "HUNT_ACTIVE";
  assert.equal(lineOfSight(g.world, brand, g.hunter), false);
  g.step(1 / 60, idle);
  assert.notEqual(g.hunter.state, "FLEEING");
});
test("save/load preserves unlocked return route and remaining brand lifetime", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const g = encounter();
  g.enemies = [];
  approachGate(g);
  g.items.find((i) => i.id === g.encounterRelicId)!.taken = true;
  g.interact();
  assert.ok(g.dropBrand());
  advance(g, 2);
  g.save();
  const saved = new Game(9);
  assert.ok(saved.load());
  assert.equal(saved.shortcutOpen, true);
  assert.equal(saved.brands.length, 1);
  assert.ok(
    Math.abs(saved.brands[0].remaining - g.brands[0].remaining) < 0.001,
  );
  assert.equal(saved.fuel, g.fuel);
  assert.ok(saved.brandCooldown > 0);
});
