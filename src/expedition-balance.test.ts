import test from "node:test";
import assert from "node:assert/strict";
import { Game, CONFIG, lineOfSight, walkable } from "./simulation";

const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
function advance(g: Game, seconds: number, input = idle) {
  for (let i = 0; i < Math.round(seconds * 60); i++) g.step(1 / 60, input);
}
function expedition() {
  const g = new Game(104729);
  Object.assign(g.player, { x: 28, z: 0 });
  g.enemies = [];
  return g;
}

test("sprint taps cannot immediately regenerate stamina; rest restores it", () => {
  const g = expedition();
  advance(g, 1, { ...idle, forward: 1, sprint: true });
  const spent = g.player.stamina;
  advance(g, 0.5);
  assert.equal(g.player.stamina, spent);
  advance(g, CONFIG.staminaRecoveryDelay + 1);
  assert.ok(g.player.stamina > spent);
  assert.ok(g.player.stamina <= 1);
  g.reset();
  g.player.stamina = 0.5;
  advance(g, 0.5);
  assert.ok(g.player.stamina > 0.5, "new expedition clears recovery delay");
});

test("relighting requires a slow exposed movement window even with sprint held", () => {
  const g = expedition();
  g.phase = "HUNT_GRACE";
  g.fuel = 0;
  g.relight();
  const start = { ...g.player };
  advance(g, 1, { ...idle, forward: 1, sprint: true });
  assert.equal(g.phase, "RELIGHTING");
  assert.ok(Math.hypot(g.player.x - start.x, g.player.z - start.z) < 1.2);
  assert.equal(g.player.stamina, 1);
  advance(g, 1.1);
  assert.equal(g.phase, "EXPLORING");
  assert.equal(g.matches, 2);
  assert.ok(g.fuel > 119);
});

test("crouching avoids distant visual detection but close Hunter still sees player", () => {
  const crouched = expedition();
  crouched.phase = "HUNT_ACTIVE";
  crouched.fuel = 0;
  crouched.hunter = { x: 28, z: 8, state: "SEARCHING" };
  assert.ok(lineOfSight(crouched.world, crouched.player, crouched.hunter));
  advance(crouched, 1 / 60, { ...idle, crouch: true });
  assert.equal(crouched.hunter.state, "SEARCHING");
  crouched.hunter = { x: 28, z: 4, state: "SEARCHING" };
  advance(crouched, 1 / 60, { ...idle, crouch: true });
  assert.equal(crouched.hunter.state, "PURSUING");
  const standing = expedition();
  standing.phase = "HUNT_ACTIVE";
  standing.fuel = 0;
  standing.hunter = { x: 28, z: 8, state: "SEARCHING" };
  advance(standing, 1 / 60);
  assert.equal(standing.hunter.state, "PURSUING");
});

test("burst spends fuel but cannot repel creatures behind masonry", () => {
  const g = expedition();
  const points = g.world.cells
    .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
    .filter((p) => walkable(g.world, p.x, p.z));
  const a = points.find((a) =>
    points.some(
      (b) =>
        Math.hypot(a.x - b.x, a.z - b.z) < 9 && !lineOfSight(g.world, a, b),
    ),
  )!;
  const b = points.find(
    (b) => Math.hypot(a.x - b.x, a.z - b.z) < 9 && !lineOfSight(g.world, a, b),
  )!;
  assert.ok(a && b);
  Object.assign(g.player, a);
  g.enemies = [{ ...b, kind: "stalker", state: "LISTENING" }];
  g.burst();
  assert.equal(g.enemies[0].state, "LISTENING");
  assert.equal(g.fuel, g.maxFuel - CONFIG.burstCost);
  g.burst();
  assert.equal(
    g.fuel,
    g.maxFuel - CONFIG.burstCost,
    "cooldown prevents repeated bursts",
  );
});
