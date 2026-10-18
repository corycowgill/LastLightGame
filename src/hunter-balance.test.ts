import test from "node:test";
import assert from "node:assert/strict";
import { Game, walkable, lineOfSight, CONFIG } from "./simulation";
const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
test("visible torch makes Hunter flee along navigation before banishment", () => {
  const g = new Game(104729);
  g.player.x = 28;
  g.player.z = 0;
  g.phase = "HUNT_ACTIVE";
  g.fuel = 0;
  g.hunter = { x: 42, z: 0, state: "PURSUING" };
  g.relight();
  for (let i = 0; i < 121; i++) g.step(1 / 60, idle);
  assert.equal(g.phase, "EXPLORING");
  assert.equal(g.hunter.state, "FLEEING");
  const before = Math.hypot(g.hunter.x - g.player.x, g.hunter.z - g.player.z);
  for (let i = 0; i < 90; i++) {
    g.step(1 / 60, idle);
    assert.ok(walkable(g.world, g.hunter.x, g.hunter.z));
    assert.notEqual(g.phase, "DEAD");
  }
  assert.ok(
    Math.hypot(g.hunter.x - g.player.x, g.hunter.z - g.player.z) > before + 1,
  );
  for (let i = 0; i < 90; i++) g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "BANISHED");
});
test("unlit torch does not repel but sanctuary fire does", () => {
  const g = new Game(104729);
  g.player.x = 28;
  g.player.z = 0;
  g.phase = "HUNT_ACTIVE";
  g.fuel = 0;
  g.hunter = { x: 28, z: 5, state: "SEARCHING" };
  g.step(1 / 60, idle);
  assert.notEqual(g.hunter.state, "FLEEING");
  g.hunter = { x: 5, z: 0, state: "PURSUING" };
  g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "FLEEING");
});
test("torch cannot repel Hunter through stone walls", () => {
  const g = new Game(104729);
  const points = g.world.cells
    .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
    .filter(
      (p) =>
        walkable(g.world, p.x, p.z) &&
        Math.hypot(p.x, p.z) > 12 &&
        Math.hypot(p.x - g.destination.x, p.z - g.destination.z) > 12,
    );
  const pair = points
    .flatMap((a) =>
      points
        .filter(
          (b) =>
            Math.hypot(a.x - b.x, a.z - b.z) > 3 &&
            Math.hypot(a.x - b.x, a.z - b.z) < 10 &&
            !lineOfSight(g.world, a, b),
        )
        .slice(0, 1)
        .map((b) => [a, b]),
    )
    .at(0)!;
  assert.ok(pair);
  Object.assign(g.player, pair[0]);
  g.hunter = { ...pair[1], state: "SEARCHING" };
  g.phase = "EXPLORING";
  g.fuel = 100;
  g.mode = 2;
  g.step(1 / 60, idle);
  assert.notEqual(g.hunter.state, "FLEEING");
});
test("late rooms increase fuel pressure while preserving sprint escape speed", () => {
  const g = new Game(1);
  const early = g.fuelRate;
  Object.assign(g.player, { x: 56, z: 56 });
  assert.equal(g.depth, 1);
  assert.ok(g.fuelRate > early * 1.25);
  assert.ok(CONFIG.hunterChase + 0.55 < CONFIG.sprint);
});
