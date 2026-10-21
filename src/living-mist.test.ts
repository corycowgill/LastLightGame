import test from "node:test";
import assert from "node:assert/strict";
import { LivingMist, MIST_CONFIG } from "./living-mist";
import { Game, CONFIG, navigationDistance, type World } from "./simulation";
const world: World = {
  seed: 1,
  start: { x: -20, z: 0 },
  exit: { x: 20, z: 0 },
  cells: Array.from({ length: 9 }, (_, i) => ({
    x: i - 4,
    z: 0,
    kind: "corridor",
  })),
};
const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
function step(
  m: LivingMist,
  seconds: number,
  fires: { x: number; z: number; radius: number }[] = [],
  visible = () => true,
) {
  for (let i = 0; i < seconds * 10; i++)
    m.step(0.1, { x: 0, z: 0 }, fires, visible);
}
test("fire clears nearby mist but cannot clear through occlusion", () => {
  const m = new LivingMist(world);
  step(m, 1, [{ x: 0, z: 0, radius: 3 }]);
  assert.equal(m.densityAt({ x: 0, z: 0 }), 0);
  assert.ok(m.densityAt({ x: 6, z: 0 }) > 0.6);
  const blocked = new LivingMist(world);
  step(blocked, 1, [{ x: 0, z: 0, radius: 3 }], () => false);
  assert.ok(blocked.densityAt({ x: 0, z: 0 }) > 0.6);
});
test("mist regrows gradually after fire, warns before coughing and recedes on relight", () => {
  const m = new LivingMist(world);
  step(m, 1, [{ x: 0, z: 0, radius: 4.5 }]);
  step(m, 8);
  assert.ok(m.densityAt({ x: 0, z: 0 }) > 0);
  assert.ok(m.exposure < MIST_CONFIG.coughThreshold);
  step(m, 25);
  assert.ok(m.exposure > MIST_CONFIG.coughThreshold);
  step(m, 4, [{ x: 0, z: 0, radius: 4.5 }]);
  assert.equal(m.exposure, 0);
  assert.equal(m.densityAt({ x: 0, z: 0 }), 0);
});
test("mist state round trips safely and rejects invalid density data", () => {
  const m = new LivingMist(world);
  step(m, 7);
  const q = new LivingMist(world);
  q.load(m.save());
  assert.ok(
    Math.abs(q.densityAt({ x: 0, z: 0 }) - m.densityAt({ x: 0, z: 0 })) < 0.011,
  );
  assert.equal(q.exposure, m.exposure);
  q.load({ exposure: Infinity, densities: [NaN] });
  assert.equal(q.exposure, 0);
  assert.ok(Number.isFinite(q.densityAt({ x: 0, z: 0 })));
});
test("fully exposed sprint still exceeds Hunter chase speed", () => {
  assert.ok(CONFIG.sprint * (1 - MIST_CONFIG.maxSlow) > CONFIG.hunterChase);
});
test("sanctuary clears exposure and never triggers coughing", () => {
  const g = new Game(1);
  g.mist.exposure = 0.9;
  g.step(0.1, idle);
  assert.equal(g.mistCough, 0);
  for (let i = 0; i < 40; i++) g.step(0.1, idle);
  assert.equal(g.mist.exposure, 0);
  assert.equal(g.mistCough, 0);
});
test("a cough can make an unseen nearby Hunter investigate without supernatural sight", () => {
  const g = new Game(1);
  g.enemies = [];
  g.hazards = [];
  Object.assign(g.player, { x: 28, z: 0 });
  g.phase = "HUNT_ACTIVE";
  g.fuel = 0;
  g.mist.exposure = 0.8;
  const p = g.world.cells
    .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
    .find(
      (p) =>
        Math.hypot(p.x - 28, p.z) > 3 &&
        Math.hypot(p.x - 28, p.z) < 7 &&
        navigationDistance(g.world, p, g.player) < 10,
    );
  assert.ok(p);
  g.hunter = {
    ...p,
    state: "SEARCHING",
    yaw: Math.atan2(-(g.player.x - p.x), -(g.player.z - p.z)) + Math.PI,
  };
  g.step(1 / 60, idle);
  assert.equal(g.mistCough, 1);
  assert.equal(g.hunter.state, "INVESTIGATING");
  for (let i = 0; i < 10; i++) g.step(0.1, idle);
  assert.equal(g.mistCough, 1);
});
