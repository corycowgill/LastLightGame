import test from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  generateWorld,
  findPath,
  lineOfSight,
  walkable,
} from "./simulation";
import * as THREE from "three";
import { constrainCamera } from "./scene";
import { ExpeditionCheck } from "./qa";
const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
const advance = (g: Game, seconds: number, input = idle) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) g.step(1 / 60, input);
};
const away = (g: Game) => {
  g.player.x = 28;
  g.player.z = 0;
  g.enemies = [];
};
test("100 seeds are deterministic and every walkable cell connects to sanctuary", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const w = generateWorld(seed);
    assert.deepEqual(w, generateWorld(seed));
    const reachable = new Set<string>(),
      queue = [w.cells[0]],
      cells = new Set(w.cells.map((c) => `${c.x},${c.z}`));
    reachable.add(`${queue[0].x},${queue[0].z}`);
    for (let i = 0; i < queue.length; i++) {
      const c = queue[i];
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = c.x + dx,
          z = c.z + dz,
          k = `${x},${z}`;
        if (cells.has(k) && !reachable.has(k)) {
          reachable.add(k);
          queue.push({ x, z, kind: "" });
        }
      }
    }
    assert.equal(reachable.size, w.cells.length);
    assert.ok(
      findPath(
        w,
        { x: w.start.x * 2, z: w.start.z * 2 },
        { x: w.exit.x * 2, z: w.exit.z * 2 },
      ).length > 20,
    );
  }
});
test("different seeds change layouts", () =>
  assert.notDeepEqual(generateWorld(1), generateWorld(9001)));
test("movement respects walls; sprint consumes stamina", () => {
  const g = new Game(3);
  advance(g, 10, { ...idle, forward: 1, sprint: true });
  assert.ok(walkable(g.world, g.player.x, g.player.z));
  assert.ok(g.player.z >= -8.71);
  assert.ok(g.player.stamina < 1);
});
test("camera yaw and movement agree on the forward direction", () => {
  const g = new Game();
  advance(g, 0.5, { ...idle, forward: 1, yaw: Math.PI / 2 });
  assert.ok(g.player.x < -0.5);
  assert.ok(Math.abs(g.player.z) < 0.01);
});
test("fuel modes consume exact deterministic amounts", () => {
  for (const [mode, rate] of [
    [0, 0.35],
    [1, 1],
    [2, 3.5],
  ]) {
    const g = new Game();
    g.setMode(mode);
    advance(g, 10);
    assert.ok(Math.abs(g.fuel - (720 - 10 * rate)) < 1e-6);
  }
});
test("invalid modes do not break fuel simulation", () => {
  const g = new Game();
  g.setMode(8);
  advance(g, 1);
  assert.equal(g.mode, 1);
  assert.ok(Number.isFinite(g.fuel));
});
test("burst costs fuel and obeys cooldown", () => {
  const g = new Game();
  g.burst();
  assert.equal(g.fuel, 675);
  g.burst();
  assert.equal(g.fuel, 675);
  advance(g, 19);
  g.burst();
  assert.ok(g.fuel < 620);
});
test("extinction has sputter and eight seconds grace before Hunter activation", () => {
  const g = new Game();
  away(g);
  g.forceHunt();
  advance(g, 1.2);
  assert.equal(g.phase, "HUNT_GRACE");
  advance(g, 7);
  assert.equal(g.hunter.state, "DORMANT");
  advance(g, 1);
  assert.equal(g.phase, "HUNT_ACTIVE");
  assert.ok(Math.hypot(g.hunter.x - g.player.x, g.hunter.z - g.player.z) > 15);
  assert.ok(walkable(g.world, g.hunter.x, g.hunter.z));
});
test("vision respects walls and paths remain on connected navigation", () => {
  const w = generateWorld(4);
  assert.equal(lineOfSight(w, { x: 0, z: 0 }, { x: 4, z: 0 }), true);
  assert.equal(lineOfSight(w, { x: 0, z: 0 }, { x: 0, z: 26 }), false);
  const path = findPath(
    w,
    { x: 0, z: 0 },
    { x: w.exit.x * 2, z: w.exit.z * 2 },
  );
  assert.ok(path.every((p) => walkable(w, p.x, p.z)));
  for (let i = 1; i < path.length; i++)
    assert.equal(
      Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z),
      2,
    );
});
test("match relight takes two seconds, consumes match and banishes Hunter", () => {
  const g = new Game();
  away(g);
  g.forceHunt();
  advance(g, 1.2);
  g.relight();
  assert.equal(g.phase, "RELIGHTING");
  advance(g, 1);
  assert.equal(g.phase, "RELIGHTING");
  advance(g, 1.1);
  assert.equal(g.phase, "EXPLORING");
  assert.equal(g.hunter.state, "BANISHED");
  assert.equal(g.matches, 2);
  assert.ok(g.fuel > 100);
});
test("starting sanctuary protects player without completing expedition", () => {
  const g = new Game();
  g.forceHunt();
  advance(g, 2);
  assert.equal(g.phase, "EXPLORING");
  assert.equal(g.hunter.state, "BANISHED");
  assert.equal(g.completed, false);
});
test("destination banks relics and reset retains permanent upgrades", () => {
  const g = new Game();
  g.artifacts = 2;
  Object.assign(g.player, g.destination);
  g.interact();
  assert.equal(g.completed, true);
  assert.equal(g.banked, 2);
  assert.equal(g.artifacts, 0);
  assert.equal(g.phase, "SANCTUARY");
  g.maxFuel = 810;
  g.reset(9);
  assert.equal(g.banked, 2);
  assert.equal(g.maxFuel, 810);
});
test("pickup and chalk are functional", () => {
  const g = new Game();
  const artifact = g.items.find((i) => i.kind === "artifact")!;
  g.player.x = artifact.x;
  g.player.z = artifact.z;
  g.interact();
  assert.equal(g.artifacts, 1);
  assert.equal(artifact.taken, true);
  g.mark();
  assert.deepEqual(g.chalk[0], { x: g.player.x, z: g.player.z });
});
test("save/load retain exploration, Hunt state and progression", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const g = new Game(88);
  away(g);
  g.banked = 3;
  g.maxFuel = 900;
  g.fuel = 450;
  g.artifacts = 1;
  g.mark();
  g.save();
  const loaded = new Game(2);
  assert.equal(loaded.load(), true);
  assert.equal(loaded.world.seed, 88);
  assert.equal(loaded.banked, 3);
  assert.equal(loaded.maxFuel, 900);
  assert.equal(loaded.fuel, 450);
  assert.equal(loaded.artifacts, 1);
  assert.equal(loaded.chalk.length, 1);
  g.forceHunt();
  advance(g, 10);
  g.save();
  loaded.load();
  assert.equal(loaded.phase, g.phase);
  assert.deepEqual(loaded.hunter, g.hunter);
});
test("Hunter abandons pursuit when sight and sound are lost", () => {
  const g = new Game(3);
  away(g);
  g.phase = "HUNT_ACTIVE";
  g.hunter = { x: 22, z: 0, state: "SEARCHING" };
  g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "PURSUING");
  g.player.x = g.destination.x - 5;
  g.player.z = g.destination.z;
  advance(g, 13);
  assert.equal(g.phase, "HUNT_ACTIVE");
  assert.equal(g.hunter.state, "SEARCHING");
});
test("capture loses carried artifacts and preserves banked relics", () => {
  const g = new Game();
  away(g);
  g.phase = "HUNT_ACTIVE";
  g.banked = 4;
  g.artifacts = 2;
  g.hunter = { x: g.player.x + 0.2, z: g.player.z, state: "PURSUING" };
  g.step(1 / 60, idle);
  assert.equal(g.phase, "DEAD");
  assert.equal(g.artifacts, 0);
  assert.equal(g.banked, 4);
});
test("sprinting behind a long separating wall does not reveal location", () => {
  const g = new Game(),
    cells = [] as { x: number; z: number; kind: string }[];
  for (let z = 0; z <= 7; z++)
    cells.push({ x: 0, z, kind: "floor" }, { x: 2, z, kind: "floor" });
  cells.push({ x: 1, z: 7, kind: "floor" });
  g.world = {
    seed: 1,
    cells,
    start: { x: 100, z: 100 },
    exit: { x: 200, z: 200 },
  };
  g.player.x = 4;
  g.player.z = 0;
  g.phase = "HUNT_ACTIVE";
  g.enemies = [];
  g.hunter = { x: 0, z: 0, state: "SEARCHING" };
  assert.equal(lineOfSight(g.world, g.hunter, g.player), false);
  g.step(1 / 60, { ...idle, forward: 1, sprint: true });
  assert.equal(g.hunter.state, "SEARCHING");
});
test("extinction, active Hunt, physical escape, sanctuary banking", () => {
  const g = new Game(19);
  const route = findPath(g.world, g.start, g.destination),
    begin = Math.max(0, route.length - 9);
  Object.assign(g.player, route[begin]);
  g.artifacts = 1;
  g.enemies = [];
  g.forceHunt();
  advance(g, 9.3);
  assert.equal(g.phase, "HUNT_ACTIVE");
  for (const waypoint of route.slice(begin + 1))
    for (
      let tick = 0;
      tick < 180 &&
      !g.completed &&
      g.phase !== "DEAD" &&
      Math.hypot(g.player.x - waypoint.x, g.player.z - waypoint.z) > 0.22;
      tick++
    ) {
      const yaw = Math.atan2(
        -(waypoint.x - g.player.x),
        -(waypoint.z - g.player.z),
      );
      g.step(1 / 60, { ...idle, forward: 1, sprint: true, yaw });
    }
  assert.equal(g.completed, true);
  assert.equal(g.phase, "SANCTUARY");
  assert.equal(g.banked, 1);
  assert.equal(g.hunter.state, "BANISHED");
});
test("full browser driver physically navigates the generated expedition", () => {
  const g = new Game(104729);
  g.enemies = [];
  const driver = new ExpeditionCheck(g.world);
  for (let i = 0; i < 60 * 300 && !g.completed && g.phase !== "DEAD"; i++)
    g.step(1 / 60, driver.input(g));
  driver.input(g);
  assert.equal(g.completed, true, driver.status);
  assert.equal(driver.sawHunt, true);
  assert.ok(g.banked > 0, "Collected relics must be banked by the full route");
});

test("camera collision retracts before walls and preserves clear camera rays", () => {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(6, 6, 0.3),
    new THREE.MeshBasicMaterial(),
  );
  wall.position.set(0, 1.5, 2);
  wall.updateMatrixWorld(true);
  const anchor = new THREE.Vector3(0, 1.5, 0),
    desired = new THREE.Vector3(0, 2, 4);
  const safe = constrainCamera(anchor, desired, [wall]);
  assert.ok(safe.z < 1.85);
  assert.ok(safe.distanceTo(anchor) > 1);
  assert.deepEqual(
    constrainCamera(anchor, new THREE.Vector3(3, 2, 0), [wall]),
    new THREE.Vector3(3, 2, 0),
  );
  wall.geometry.dispose();
  wall.material.dispose();
});
test("Hunter investigates audible footsteps without seeing through corner", () => {
  const g = new Game();
  g.enemies = [];
  g.player.x = 28;
  g.player.z = 2;
  g.hunter = { x: 22, z: 0, state: "SEARCHING" };
  g.phase = "HUNT_ACTIVE";
  g.step(1 / 60, { ...idle, forward: 1, sprint: true });
  assert.ok(["INVESTIGATING", "PURSUING"].includes(g.hunter.state));
});

test("Hunter traverses multiple navigation cells and catches an exposed stationary player", () => {
  const g = new Game();
  away(g);
  g.phase = "HUNT_ACTIVE";
  g.hunter = { x: 18, z: 0, state: "SEARCHING" };
  advance(g, 2.3);
  assert.equal(g.phase, "DEAD");
  assert.ok(g.hunter.x > 26);
});
