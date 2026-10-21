import test from "node:test";
import assert from "node:assert/strict";
import { Game, walkable, navigationDistance } from "./simulation";
import {
  planEnvironmentHazards,
  vaporPhase,
  hazardEffect,
  HAZARD_CONFIG,
} from "./environment-hazards";
const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
test("hazards are deterministic, bounded, clear of rewards and sanctuaries across 100 seeds", () => {
  let count = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const g = new Game(seed);
    assert.deepEqual(g.hazards, planEnvironmentHazards(g.world, g.items));
    assert.ok(g.hazards.length <= g.world.layout!.rooms.length - 2);
    for (const h of g.hazards) {
      count++;
      assert.ok(walkable(g.world, h.x, h.z));
      assert.ok(Math.hypot(h.x - g.start.x, h.z - g.start.z) > 9);
      assert.ok(Math.hypot(h.x - g.destination.x, h.z - g.destination.z) > 9);
      assert.ok(g.items.every((i) => Math.hypot(i.x - h.x, i.z - h.z) >= 3.5));
    }
  }
  assert.ok(count > 100);
});
test("vents telegraph two seconds before each three-second discharge", () => {
  const h = { id: 1, x: 0, z: 0, kind: "vapor" as const, offset: 0 };
  assert.equal(vaporPhase(h, 4.99), "quiet");
  assert.equal(vaporPhase(h, 5), "warning");
  assert.equal(vaporPhase(h, 6.99), "warning");
  assert.equal(vaporPhase(h, 7), "active");
  assert.equal(vaporPhase(h, 10), "quiet");
  assert.equal(vaporPhase(h, 17), "active");
});
test("crouching avoids bone crunch and chain rattle; stationary players do not trigger noise", () => {
  for (const kind of ["bones", "chains"] as const) {
    const h = { id: 1, x: 0, z: 0, kind, offset: 0 };
    assert.equal(hazardEffect(h, 0, true, true, false).noise, false);
    assert.equal(hazardEffect(h, 0, false, false, false).noise, false);
    assert.equal(hazardEffect(h, 0, true, false, false).noise, true);
    assert.equal(hazardEffect(h, 0, true, false, true).noise, true);
  }
});
function fixture(kind: "bones" | "vapor") {
  const g = new Game(1);
  g.enemies = [];
  const p = g.hazards[0];
  assert.ok(p);
  Object.assign(g.player, { x: p.x, z: p.z });
  g.hazards = [{ ...p, kind, offset: 0 }];
  return g;
}
test("noise hazards alert through normal AI noise without fuel tax and cannot spam every frame", () => {
  const g = fixture("bones");
  const fuel = g.fuel;
  g.step(0.1, { ...idle, forward: 1 });
  assert.equal(g.noise, 15);
  assert.ok(g.hazardEvent);
  const id = g.hazardEvent.id;
  g.step(0.1, { ...idle, forward: 1 });
  assert.equal(g.hazardEvent!.id, id);
  assert.ok(Math.abs(g.fuel - (fuel - 0.2 * g.fuelRate)) < 0.001);
  const q = fixture("bones");
  q.step(0.1, { ...idle, forward: 1, crouch: true });
  assert.equal(q.hazardEvent, undefined);
  assert.ok(q.noise < 15);
});
test("vapor drains stamina only during active phase without changing fuel rate or causing death", () => {
  const g = fixture("vapor");
  g.elapsed = 7;
  g.player.stamina = 1;
  g.step(0.1, idle);
  assert.ok(g.player.stamina < 1);
  assert.equal(g.phase, "EXPLORING");
  assert.ok(Math.abs(g.fuel - (g.maxFuel - 0.1 * g.fuelRate)) < 0.001);
  const q = fixture("vapor");
  q.elapsed = 5;
  q.step(0.1, idle);
  assert.equal(q.player.stamina, 1);
  assert.equal(HAZARD_CONFIG.vaporSpeed, 0.55);
});

test("a loud environmental contact makes an out-of-view Hunter investigate", () => {
  const g = fixture("bones");
  g.fuel = 0;
  g.phase = "HUNT_ACTIVE";
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
  g.step(1 / 60, { ...idle, forward: 1 });
  assert.equal(g.hunter.state, "INVESTIGATING");
});
