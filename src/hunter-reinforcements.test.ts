import test from "node:test";
import assert from "node:assert/strict";
import { Game, navigationDistance, walkable, lineOfSight } from "./simulation";
const idle = { forward: 0, strafe: 0, sprint: false, crouch: true, yaw: 0 };
test("banking banishes the whole pack immediately even before another simulation tick", () => {
  const g = new Game(104729);
  g.additionalHunters = [{ x: 28, z: 0, state: "SEARCHING" }];
  g.hunterWarning = "Two Hunters roam the dark.";
  Object.assign(g.player, g.destination);
  g.artifacts = 3;
  g.interact();
  assert.equal(g.completed, true);
  assert.equal(g.additionalHunters[0].state, "BANISHED");
  assert.equal(g.hunterWarning, "");
});
function advance(g: Game, seconds: number) {
  for (let t = 0; t < Math.ceil(seconds * 60); t++) g.step(1 / 60, idle);
}
function hunt() {
  const g = new Game(104729);
  g.enemies = [];
  const r = g.world.layout!.rooms.find((r) => r.design === "ossuary")!;
  Object.assign(g.player, { x: r.x * 2, z: r.z * 2 });
  g.fuel = 0;
  g.phase = "HUNT_ACTIVE";
  g.hunter = { ...g.start, state: "BANISHED" };
  return g;
}
test("a prolonged Hunt warns for ten seconds before a second navigable off-camera Hunter", () => {
  const g = hunt();
  advance(g, 12.1);
  assert.match(g.hunterWarning, /second set of footsteps/);
  assert.equal(g.additionalHunters.length, 0);
  advance(g, 9.8);
  assert.equal(g.additionalHunters.length, 0);
  advance(g, 0.2);
  assert.equal(g.additionalHunters.length, 1);
  const h = g.additionalHunters[0];
  assert.ok(walkable(g.world, h.x, h.z));
  assert.ok(navigationDistance(g.world, h, g.player) > 23);
  assert.ok(
    navigationDistance(g.world, h, g.destination) >
      navigationDistance(g.world, g.player, g.destination) + 5,
  );
  const d = Math.hypot(h.x - g.player.x, h.z - g.player.z);
  assert.ok(
    !lineOfSight(g.world, h, g.player) || -(h.z - g.player.z) / d < -0.3,
  );
  assert.equal(
    g.hunter.state,
    "BANISHED",
    "secondary memory must not overwrite the primary",
  );
});
test("sanctuary and relighting neutralize every additional Hunter", () => {
  const g = hunt();
  advance(g, 22.1);
  assert.equal(g.additionalHunters.length, 1);
  g.fuel = 180;
  g.phase = "EXPLORING";
  advance(g, 0.1);
  assert.equal(g.additionalHunters[0].state, "FLEEING");
  Object.assign(g.player, g.start);
  advance(g, 0.1);
  assert.equal(g.additionalHunters[0].state, "BANISHED");
  assert.equal(g.hunterWarning, "");
  g.reset();
  assert.equal(g.additionalHunters.length, 0);
});
test("reinforcement spawn is deterministic and at most one is added per Hunt", () => {
  const a = hunt(),
    b = hunt();
  advance(a, 22.1);
  advance(b, 22.1);
  assert.deepEqual(a.additionalHunters, b.additionalHunters);
  a.additionalHunters[0].state = "BANISHED";
  advance(a, 45);
  assert.equal(a.additionalHunters.length, 1);
});
test("the second Hunter pursues through sight, captures, and cannot corrupt the primary saved identity", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const g = hunt();
  const primary = { ...g.hunter };
  g.artifacts = 3;
  g.additionalHunters = [
    {
      x: g.player.x + 2,
      z: g.player.z,
      state: "SEARCHING",
      yaw: Math.PI / 2,
      readiness: 0,
    },
  ];
  advance(g, 0.1);
  assert.equal(g.additionalHunters[0].state, "PURSUING");
  assert.ok((g.additionalHunters[0].readiness ?? 0) > 0);
  advance(g, 2);
  assert.equal(g.phase, "DEAD");
  assert.equal(g.artifacts, 0);
  const saved = JSON.parse(memory.get("lastlight-save")!);
  assert.deepEqual(saved.hunter, primary);
});
test("the second Hunter cannot see through a separating stone wall", () => {
  const g = hunt();
  const cells = [];
  for (let x = -8; x <= 8; x++)
    for (let z = -8; z <= 8; z++)
      if (x !== 0 || z === 8) cells.push({ x, z, kind: "corridor" });
  g.world = { cells, start: { x: -8, z: -8 }, exit: { x: 8, z: 8 }, seed: 1 };
  Object.assign(g.player, { x: 4, z: 0 });
  g.additionalHunters = [
    { x: -4, z: 0, state: "SEARCHING", yaw: -Math.PI / 2, readiness: 0 },
  ];
  advance(g, 0.5);
  assert.equal(g.additionalHunters[0].state, "SEARCHING");
  assert.equal(g.additionalHunters[0].readiness, 0);
  assert.notEqual(g.phase, "DEAD");
});
test("Hunt save/load retains the second threat and relighting resets the next escalation clock", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const g = hunt();
  advance(g, 22.1);
  g.save();
  const loaded = new Game(2);
  assert.equal(loaded.load(), true);
  assert.deepEqual(loaded.additionalHunters, g.additionalHunters);
  loaded.forceHunt();
  assert.equal(loaded.additionalHunters.length, 0);
  assert.equal(loaded.hunterWarning, "");
  advance(loaded, 9.1);
  assert.equal(loaded.additionalHunters.length, 0);
  assert.equal(loaded.hunterWarning, "");
});
test("reload preserves a second Hunter's last known target instead of revealing the player's new position", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const g = hunt();
  advance(g, 22.1);
  g.save();
  const original = JSON.parse(memory.get("lastlight-save")!);
  const target = original.secondaryBrain.target;
  const hidingPlace = g.world.cells
    .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
    .find(
      (p) =>
        walkable(g.world, p.x, p.z) &&
        Math.hypot(p.x - target.x, p.z - target.z) > 10 &&
        Math.hypot(p.x - g.start.x, p.z - g.start.z) > 5 &&
        Math.hypot(p.x - g.destination.x, p.z - g.destination.z) > 5,
    )!;
  assert.ok(hidingPlace);
  Object.assign(g.player, hidingPlace);
  g.save();
  const loaded = new Game(2);
  assert.equal(loaded.load(), true);
  loaded.save();
  const restored = JSON.parse(memory.get("lastlight-save")!);
  assert.deepEqual(restored.secondaryBrain.target, target);
  assert.notDeepEqual(restored.secondaryBrain.target, {
    x: loaded.player.x,
    z: loaded.player.z,
  });
  assert.equal(restored.secondaryBrain.memory, original.secondaryBrain.memory);
  assert.equal(
    restored.secondaryBrain.searchTimer,
    original.secondaryBrain.searchTimer,
  );
});
