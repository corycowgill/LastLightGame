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
function fixture(kind: "bones" | "vapor" | "webs" | "rubble") {
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

test("webs slow upright movement but crouching avoids entanglement", () => {
  const h = { id: 1, x: 0, z: 0, kind: "webs" as const, offset: 0 };
  assert.equal(hazardEffect(h, 0, true, false, true).slow, true);
  assert.equal(hazardEffect(h, 0, true, true, false).slow, false);
  assert.equal(
    hazardEffect({ ...h, burned: true }, 0, true, false, true).slow,
    false,
  );
});
test("webs require continuous nearby Blaze, spend only normal fuel, and stay cleared", () => {
  const g = fixture("webs");
  const h = g.hazards[0];
  g.mode = 1;
  for (let i = 0; i < 21; i++) g.step(0.1, idle);
  assert.ok(!h.burned);
  g.mode = 2;
  for (let i = 0; i < 10; i++) g.step(0.1, idle);
  assert.ok(!h.burned);
  g.mode = 1;
  g.step(0.1, idle);
  assert.equal(h.burnProgress, 0);
  g.mode = 2;
  const fuel = g.fuel;
  for (let i = 0; i < 21; i++) g.step(0.1, idle);
  assert.equal(h.burned, true);
  assert.ok(Math.abs(g.fuel - (fuel - 2.1 * g.fuelRate)) < 0.001);
  assert.equal(g.hazardHint, "");
  assert.equal(g.hazardEvent!.kind, "webs");
});
test("distant Blaze and a dark torch cannot burn webs", () => {
  const g = fixture("webs");
  g.mode = 2;
  g.hazards[0].x += 4;
  for (let i = 0; i < 21; i++) g.step(0.1, idle);
  assert.ok(!g.hazards[0].burned);
  g.hazards[0].x -= 4;
  g.fuel = 0;
  g.phase = "HUNT_GRACE";
  for (let i = 0; i < 21; i++) g.step(0.1, idle);
  assert.ok(!g.hazards[0].burned);
});
test("walking rubble is quiet; sprinting incurs a bounded stamina stumble", () => {
  const walk = fixture("rubble");
  walk.step(0.1, { ...idle, forward: 1 });
  assert.equal(walk.hazardEvent, undefined);
  const run = fixture("rubble");
  run.step(0.1, { ...idle, forward: 1, sprint: true });
  assert.equal(run.hazardEvent!.kind, "rubble");
  assert.ok(run.player.stamina < 0.8);
  const after = run.player.stamina;
  run.step(0.1, { ...idle, forward: 1, sprint: true });
  assert.ok(after - run.player.stamina < 0.02);
});

test("all five hazard archetypes appear in actual valid generated placements", () => {
  const kinds = new Set<string>();
  for (let seed = 1; seed <= 20; seed++)
    for (const h of new Game(seed).hazards) kinds.add(h.kind);
  assert.deepEqual([...kinds].sort(), [
    "bones",
    "chains",
    "rubble",
    "vapor",
    "webs",
  ]);
});
test("save/load retains cleared webs without clearing other patches", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const g = new Game(1);
  const web = g.hazards.find((h) => h.kind === "webs")!;
  assert.ok(web);
  web.burned = true;
  g.save();
  const loaded = new Game(9);
  assert.ok(loaded.load());
  assert.equal(loaded.hazards.find((h) => h.id === web.id)!.burned, true);
  assert.ok(
    loaded.hazards.filter((h) => h.kind !== "webs").every((h) => !h.burned),
  );
});
