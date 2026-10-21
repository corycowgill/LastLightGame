import test from "node:test";
import assert from "node:assert/strict";
import { Game, navigationDistance, walkable } from "./simulation";
const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
function field() {
  const g = new Game(1);
  g.enemies = [];
  g.hazards = [];
  Object.assign(g.player, { x: 28, z: 0 });
  return g;
}
test("stones require a clear throw, consume finite stock and respect cooldown", () => {
  const g = field();
  g.cameraYaw = -Math.PI / 2;
  assert.ok(g.throwStone());
  assert.equal(g.stones, 2);
  assert.ok(g.distraction);
  assert.ok(walkable(g.world, g.distraction.x, g.distraction.z));
  assert.ok(!g.throwStone());
  assert.equal(g.stones, 2);
  const fuel = g.fuel;
  g.step(0.1, idle);
  assert.ok(Math.abs(g.fuel - (fuel - 0.1 * g.fuelRate)) < 0.001);
  g.stones = 0;
  g.stoneCooldown = 0;
  assert.ok(!g.throwStone());
});
test("stone impact makes an unseen Hunter investigate; direct sight takes priority", () => {
  const g = field();
  g.cameraYaw = -Math.PI / 2;
  assert.ok(g.throwStone());
  g.phase = "HUNT_ACTIVE";
  g.fuel = 0;
  const p = g.world.cells
    .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
    .find(
      (p) =>
        Math.hypot(p.x - g.player.x, p.z - g.player.z) > 8 &&
        Math.hypot(p.x - g.distraction!.x, p.z - g.distraction!.z) < 16 &&
        navigationDistance(g.world, p, g.distraction!) < 24,
    );
  assert.ok(p);
  g.hunter = {
    ...p,
    state: "SEARCHING",
    yaw: Math.atan2(-(g.player.x - p.x), -(g.player.z - p.z)) + Math.PI,
  };
  g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "INVESTIGATING");
  g.hunter = { x: 30, z: 0, state: "SEARCHING", yaw: Math.PI / 2 };
  g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "PURSUING");
});
test("cursed votive warns before a periodic audible cry, and crouching still muffles it", () => {
  const g = field();
  g.cursedRelic = true;
  g.artifacts = 3;
  g.relicPulse = 2;
  assert.match(g.tensionHint, /CROUCH STILL/);
  for (let i = 0; i < 21; i++) g.step(0.1, idle);
  assert.equal(g.relicEcho, 1);
  assert.equal(g.noise, 15);
  const q = field();
  q.cursedRelic = true;
  q.artifacts = 3;
  q.relicPulse = 0.05;
  q.step(0.1, { ...idle, crouch: true });
  assert.equal(q.relicEcho, 0);
  assert.ok(q.noise < 15);
  assert.equal(q.relicPulse, 18);
});
test("moving crouched does not muffle a relic; sanctuary and banked relics are quiet", () => {
  const g = field();
  g.cursedRelic = true;
  g.artifacts = 3;
  g.relicPulse = 0.05;
  g.step(0.1, { ...idle, crouch: true, forward: 1 });
  assert.equal(g.relicEcho, 1);
  const q = field();
  q.cursedRelic = true;
  q.relicPulse = 0.05;
  q.step(0.1, idle);
  assert.equal(q.relicEcho, 0);
  const safe = new Game(1);
  safe.cursedRelic = true;
  safe.artifacts = 3;
  safe.relicPulse = 0.05;
  safe.step(0.1, idle);
  assert.equal(safe.relicEcho, 0);
});
test("stone stock and relic timing survive save and load", () => {
  const m = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => m.set(k, v),
    },
  });
  const g = field();
  g.stones = 1;
  g.stoneCooldown = 3;
  g.cursedRelic = true;
  g.artifacts = 3;
  g.relicPulse = 6;
  g.save();
  const q = new Game(9);
  assert.ok(q.load());
  assert.equal(q.stones, 1);
  assert.equal(q.stoneCooldown, 3);
  assert.equal(q.cursedRelic, true);
  assert.equal(q.relicPulse, 6);
});
