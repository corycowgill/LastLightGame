import test from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  generateWorld,
  findPath,
  walkable,
  navigationDistance,
} from "./simulation";
import { DESIGNS, ROOM_DESIGNS, floorAt } from "./room-design";
const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
function advance(g: Game, seconds: number, input = idle) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.step(1 / 60, input);
}
test("six authored footprints create distinct spaces with narrow connected passages", () => {
  for (const seed of [1, 17, 42, 88, 104729]) {
    const w = generateWorld(seed),
      rooms = w.layout!.rooms;
    assert.deepEqual(new Set(rooms.map((r) => r.design)), new Set(DESIGNS));
    const counts = new Map<string, number>();
    for (const r of rooms) {
      assert.equal(r.ceiling, ROOM_DESIGNS[r.design].ceiling);
      const tiles = w.cells.filter(
        (c) =>
          Math.abs(c.x - r.x) <= 4 &&
          Math.abs(c.z - r.z) <= 4 &&
          c.kind !== "corridor",
      );
      counts.set(r.design, tiles.length);
      assert.ok(
        findPath(
          w,
          { x: r.x * 2, z: r.z * 2 },
          { x: w.exit.x * 2, z: w.exit.z * 2 },
        ).length > 0,
      );
    }
    assert.ok(counts.get("ossuary")! > counts.get("tunnels")! * 2);
    for (const c of w.cells.filter((c) => c.kind === "corridor")) {
      const neighbors = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([dx, dz]) => floorAt(w, (c.x + dx) * 2, (c.z + dz) * 2));
      assert.ok(
        neighbors.length <= 2,
        "connecting passages remain one cell wide",
      );
      assert.equal(c.ceiling, 2.7);
    }
  }
});
test("sealed reliquary trades time and audible exposure for three relics", () => {
  const g = new Game(104729);
  g.enemies = [];
  const item = g.items.find((i) => i.encounter === "reliquary")!;
  assert.ok(item);
  Object.assign(g.player, item);
  g.mode = 0;
  const listener = g.world.cells
    .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
    .find(
      (p) =>
        walkable(g.world, p.x, p.z) &&
        Math.hypot(p.x - item.x, p.z - item.z) > 5 &&
        Math.hypot(p.x - item.x, p.z - item.z) < 10 &&
        navigationDistance(g.world, p, item) < 20,
    )!;
  assert.ok(listener);
  const heading = Math.atan2(-(item.x - listener.x), -(item.z - listener.z));
  g.hunter = { ...listener, state: "SEARCHING", yaw: heading + Math.PI };
  g.interact();
  assert.ok(g.activeInteraction);
  assert.equal(item.taken, false);
  g.step(1 / 60, idle);
  assert.equal(
    g.hunter.state,
    "INVESTIGATING",
    "opening really creates AI-detectable noise",
  );
  g.hunter.state = "DORMANT";
  advance(g, 3);
  assert.equal(item.taken, false);
  assert.equal(g.artifacts, 0);
  advance(g, 0.6);
  assert.equal(item.taken, true);
  assert.equal(g.artifacts, 3);
  assert.equal(g.activeInteraction, undefined);
  assert.ok(g.discoveries.some((d) => d.includes("three votive names")));
});
test("moving or losing light cancels an uncompleted reliquary without awarding loot", () => {
  const g = new Game(42);
  g.enemies = [];
  const item = g.items.find((i) => i.encounter === "reliquary")!;
  Object.assign(g.player, item);
  g.interact();
  advance(g, 0.3);
  g.step(1 / 60, { ...idle, forward: 1 });
  assert.equal(g.activeInteraction, undefined);
  assert.equal(item.taken, false);
  Object.assign(g.player, item);
  g.interact();
  g.forceHunt();
  g.step(1 / 60, idle);
  assert.equal(g.activeInteraction, undefined);
  assert.equal(g.artifacts, 0);
});
test("optional oil detour is reachable and gives its advertised fifty base seconds", () => {
  for (const seed of [1, 17, 42, 104729]) {
    const g = new Game(seed),
      oil = g.items.find((i) => i.encounter === "oil_cache")!;
    assert.ok(oil);
    assert.ok(findPath(g.world, g.start, oil).length > 0);
    assert.ok(Math.hypot(oil.x - g.start.x, oil.z - g.start.z) > 10);
    Object.assign(g.player, oil);
    g.fuel = 0;
    g.phase = "HUNT_ACTIVE";
    g.interact();
    assert.equal(g.fuel, 300);
    assert.equal(oil.taken, true);
    assert.equal(g.phase, "RELIGHTING");
  }
});
test("water creates a louder route while flooded rooms retain dry reachable edges", () => {
  const g = new Game(104729);
  const water = g.world.cells.find(
    (c) => c.surface === "water" && walkable(g.world, c.x * 2, c.z * 2),
  )!;
  assert.ok(water);
  Object.assign(g.player, { x: water.x * 2, z: water.z * 2 });
  const wet = g.footstepNoise(false, false);
  const stone = g.world.cells.find(
    (c) =>
      c.kind === "flooded" &&
      c.surface === "stone" &&
      findPath(g.world, g.start, { x: c.x * 2, z: c.z * 2 }).length,
  )!;
  assert.ok(stone);
  Object.assign(g.player, { x: stone.x * 2, z: stone.z * 2 });
  assert.ok(wet > g.footstepNoise(false, false) * 1.5);
});
test("Hunter has rear blind space, close awareness and a visible reaction window", () => {
  const g = new Game(1);
  g.enemies = [];
  g.world = {
    seed: 1,
    start: { x: 0, z: 0 },
    exit: { x: 0, z: 30 },
    cells: Array.from({ length: 31 }, (_, z) => ({ x: 0, z, kind: "floor" })),
  };
  Object.assign(g.player, { x: 0, z: 20 });
  g.fuel = 0;
  g.phase = "HUNT_ACTIVE";
  g.hunter = { x: 0, z: 28, state: "SEARCHING", yaw: Math.PI };
  g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "SEARCHING");
  g.hunter.yaw = 0;
  g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "PURSUING");
  assert.ok(g.hunterReadiness > 0 && g.hunterReadiness < 1);
  g.hunter = { x: 0, z: 22, state: "SEARCHING", yaw: Math.PI };
  g.step(1 / 60, idle);
  assert.equal(
    g.hunter.state,
    "PURSUING",
    "close proximity still reveals the player",
  );
});
test("pacing events are deterministic and never change fuel or inventory secretly", () => {
  const make = () => {
    const g = new Game(42);
    g.enemies = [];
    g.fuel = 100000;
    g.maxFuel = 100000;
    Object.assign(g.player, { x: 28, z: 0 });
    return g;
  };
  const a = make(),
    b = make();
  const rate = a.fuelRate;
  advance(a, 120);
  advance(b, 120);
  assert.deepEqual(a.ambientEvent, b.ambientEvent);
  assert.ok(a.ambientEvent);
  assert.ok(Math.abs(a.fuel - (100000 - rate * 120)) < 0.001);
  assert.equal(a.matches, 2);
  assert.equal(a.artifacts, 0);
  assert.ok(a.items.every((i) => !i.taken));
  assert.ok(a.visitedRooms.length > 0);
  assert.ok(a.discoveries.length > 0);
});

test("turning back banks half the loot and discoveries without awarding an empty refuge win", () => {
  const g = new Game(104729);
  g.enemies = [];
  Object.assign(g.player, { x: g.start.x, z: g.start.z + 2 });
  g.interact();
  assert.equal(g.completed, false);
  // A single votive is not worth a retreat; the run continues with it carried.
  g.artifacts = 1;
  g.interact();
  assert.equal(g.completed, false);
  assert.equal(g.artifacts, 1);
  assert.equal(g.banked, 0);
  g.artifacts = 3;
  g.discoveries = ["A votive name recovered."];
  g.interact();
  assert.equal(g.phase, "SANCTUARY");
  assert.equal(g.completed, true);
  assert.equal(g.banked, 1);
  assert.equal(g.artifacts, 0);
  assert.ok(g.archive.includes("A votive name recovered."));
  g.reset(42);
  assert.ok(g.archive.includes("A votive name recovered."));
  assert.equal(g.discoveries.length, 0);
});

test("reliquary guard is reachable and near enough to respond to noise", () => {
  for (const seed of [1, 17, 42, 88, 104729]) {
    const g = new Game(seed),
      vault = g.items.find((i) => i.encounter === "reliquary")!,
      guard = g.enemies[0];
    assert.ok(Math.hypot(vault.x - guard.x, vault.z - guard.z) < 12);
    assert.ok(findPath(g.world, g.start, guard).length > 0);
  }
});
