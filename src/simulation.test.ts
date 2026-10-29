import test from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  CONFIG,
  generateWorld,
  findPath,
  lineOfSight,
  walkable,
  navigationClearance,
} from "./simulation";
import * as THREE from "three";
import { constrainCamera, hunterScaleFor } from "./scene";
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
  Object.assign(g.player, { x: 0, z: 2.4 });
  advance(g, 0.5, { ...idle, forward: 1, yaw: Math.PI / 2 });
  assert.ok(g.player.x < -0.5);
  assert.ok(Math.abs(g.player.z - 2.4) < 0.01);
});
test("fuel modes consume exact deterministic amounts", () => {
  for (const [mode, rate] of [
    [0, 3.3],
    [1, 6],
    [2, 21],
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
  assert.equal(g.fuel, CONFIG.fuel - CONFIG.burstCost);
  g.burst();
  assert.equal(g.fuel, CONFIG.fuel - CONFIG.burstCost);
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
  assert.equal(g.matches, 1);
  assert.ok(g.fuel > 100);
});
test("successful emergency relighting resets Blaze but preserves a chosen Ember", () => {
  for (const mode of [0, 1, 2]) {
    const g = new Game(1);
    away(g);
    g.setMode(mode);
    g.forceHunt();
    advance(g, 1.2);
    g.relight();
    advance(g, 2.05);
    assert.equal(g.phase, "EXPLORING");
    assert.equal(g.mode, mode === 2 ? 1 : mode);
    assert.ok(g.fuel <= CONFIG.matchFuel && g.fuel > CONFIG.matchFuel - 2);
    if (mode === 2) assert.match(g.message, /Blaze resets to Steady/);
  }
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
  const artifact = g.items.find((i) => i.kind === "artifact" && !i.encounter)!;
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
  g.setMode(2);
  g.artifacts = 1;
  g.mark();
  g.save();
  const loaded = new Game(2);
  assert.equal(loaded.load(), true);
  assert.equal(loaded.world.seed, 88);
  assert.equal(loaded.banked, 3);
  assert.equal(loaded.maxFuel, 900);
  assert.equal(loaded.fuel, 450);
  assert.equal(loaded.mode, 2);
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
  assert.equal(g.deathCause, "Hunter");
  assert.match(g.deathAdvice, /corners/);
  g.reset();
  assert.equal(g.deathCause, "");
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
test("camera keeps clearance from stonework just beside the boom line", () => {
  // A pilaster 0.2 m to the side of the boom: a single centre ray misses it.
  const pilaster = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 4, 0.25),
    new THREE.MeshBasicMaterial(),
  );
  pilaster.position.set(0.32, 1.5, 2.5);
  pilaster.updateMatrixWorld(true);
  const anchor = new THREE.Vector3(0, 1.5, 0),
    desired = new THREE.Vector3(0, 1.5, 4);
  const safe = constrainCamera(anchor, desired, [pilaster]);
  assert.ok(safe.z < 2.3, `camera stays in front of the pilaster: ${safe.z}`);
  assert.ok(safe.distanceTo(anchor) > 1);
  pilaster.geometry.dispose();
  pilaster.material.dispose();
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

test("camera orbit does not turn an idle character; strafing faces the movement direction", () => {
  const g = new Game();
  const facing = g.player.yaw;
  g.step(1 / 60, { ...idle, yaw: 1 });
  assert.equal(g.player.yaw, facing);
  assert.equal(g.cameraYaw, 1);
  g.step(1 / 60, { ...idle, strafe: 1, yaw: 0 });
  assert.ok(Math.abs(g.player.yaw + Math.PI / 2) < 0.001);
});
test("initial spawn is in sanctuary and clear of the brazier", () => {
  const g = new Game();
  assert.ok(Math.hypot(g.player.x - g.start.x, g.player.z - g.start.z) > 2);
  assert.ok(Math.hypot(g.player.x - g.start.x, g.player.z - g.start.z) < 3);
  assert.ok(walkable(g.world, g.player.x, g.player.z));
});

test("movement cannot pass through the starting sanctuary brazier", () => {
  const g = new Game();
  Object.assign(g.player, { x: 0, z: 2.4 });
  advance(g, 2, { ...idle, forward: 1 });
  assert.ok(g.player.z >= 0.85);
  assert.ok(g.player.z < 1);
});

test("upgrades require sanctuary, sufficient banked relics and respect rank caps", () => {
  const g = new Game(1);
  g.banked = 30;
  assert.equal(g.purchaseUpgrade("wick"), false);
  g.phase = "SANCTUARY";
  for (const kind of ["wick", "boots", "spark"] as const) {
    for (let i = 0; i < 3; i++) assert.equal(g.purchaseUpgrade(kind), true);
    assert.equal(g.purchaseUpgrade(kind), false);
  }
  assert.equal(g.banked, 12);
  g.banked = 0;
  assert.equal(g.purchaseUpgrade("reservoir"), false);
  g.banked = 10;
  for (let i = 0; i < 5; i++)
    assert.equal(g.purchaseUpgrade("reservoir"), true);
  assert.equal(g.maxFuel, 1170);
  assert.equal(g.fuel, 1170);
  assert.equal(g.purchaseUpgrade("reservoir"), false);
});

test("wick reduces all flame rates without preventing depletion and spark speeds relighting", () => {
  const g = new Game(1);
  away(g);
  g.upgrades.wick = 3;
  for (const mode of [0, 1, 2]) {
    g.setMode(mode);
    g.fuel = 100;
    advance(g, 1);
    assert.ok(
      Math.abs(
        g.fuel -
          (100 -
            CONFIG.flameRates[mode] *
              CONFIG.burnMultiplier *
              0.76 *
              (1 + g.depth * 0.3)),
      ) < 0.00001,
    );
  }
  g.upgrades.spark = 3;
  g.forceHunt();
  advance(g, 1.1);
  g.relight();
  advance(g, 1.2);
  assert.equal(g.phase, "RELIGHTING");
  advance(g, 0.1);
  assert.equal(g.phase, "EXPLORING");
  g.fuel = 0.001;
  advance(g, 0.1);
  assert.equal(g.phase, "EXTINGUISHING");
});

test("soft boots reduce audible Stalker investigations without making footsteps silent", () => {
  const normal = new Game(1),
    quiet = new Game(1);
  for (const g of [normal, quiet]) {
    away(g);
    g.enemies = [{ x: 38, z: 0, state: "LISTENING", kind: "stalker" }];
  }
  quiet.upgrades.boots = 3;
  assert.equal(normal.footstepNoise(false, false), 5);
  assert.equal(quiet.footstepNoise(false, false), 3.2);
  assert.ok(quiet.footstepNoise(true, false) > 7);
  assert.ok(quiet.footstepNoise(false, true) > 0);
  const walk = { ...idle, forward: 1 };
  normal.step(1 / 60, walk);
  quiet.step(1 / 60, walk);
  // Boots reduce hearing range; they do not mute close footsteps.
  assert.equal(normal.enemies[0].state, "INVESTIGATING");
  assert.equal(quiet.enemies[0].state, "LISTENING");
  quiet.setMode(0);
  quiet.enemies = [{ x: 34, z: 0, state: "LISTENING", kind: "stalker" }];
  quiet.step(1 / 60, walk);
  assert.equal(quiet.enemies[0].state, "INVESTIGATING");
  // Match the second simulation step before comparing movement.
  normal.step(1 / 60, walk);
  assert.equal(quiet.player.x, normal.player.x);
  assert.equal(quiet.player.z, normal.player.z);
});

test("upgrade saves migrate old data, clamp invalid ranks and survive a new expedition", () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
    },
  });
  const g = new Game(7);
  g.upgrades = { wick: 2, boots: 1, spark: 3, compass: 1 };
  g.save();
  const loaded = new Game(1);
  assert.equal(loaded.load(), true);
  loaded.reset(8);
  assert.deepEqual(loaded.upgrades, g.upgrades);
  const old = JSON.parse(data.get("lastlight-save")!);
  delete old.upgrades;
  data.set("lastlight-save", JSON.stringify(old));
  loaded.load();
  assert.deepEqual(loaded.upgrades, {
    wick: 0,
    boots: 0,
    spark: 0,
    compass: 0,
  });
  old.upgrades = { wick: 99, boots: -2, spark: "bad" };
  data.set("lastlight-save", JSON.stringify(old));
  loaded.load();
  assert.deepEqual(loaded.upgrades, {
    wick: 3,
    boots: 0,
    spark: 0,
    compass: 0,
  });
});

test("sanctuary compass is locked until purchased and gives camera-relative bearings", () => {
  const g = new Game(1);
  assert.equal(g.sanctuaryBearing(0), null);
  g.phase = "SANCTUARY";
  g.banked = 3;
  assert.equal(g.purchaseUpgrade("compass"), true);
  assert.equal(g.banked, 0);
  assert.equal(g.purchaseUpgrade("compass"), false);
  g.player.x = g.destination.x;
  g.player.z = g.destination.z + 10;
  assert.deepEqual(g.sanctuaryBearing(0), { angle: 0, distance: 10 });
  assert.ok(
    Math.abs(g.sanctuaryBearing(Math.PI / 2)!.angle + Math.PI / 2) < 0.00001,
  );
  g.player.x = g.destination.x + 10;
  g.player.z = g.destination.z;
  assert.ok(Math.abs(g.sanctuaryBearing(0)!.angle - Math.PI / 2) < 0.00001);
  const a = g.sanctuaryBearing(100 * Math.PI)!.angle;
  assert.ok(a >= -Math.PI && a <= Math.PI);
  g.reset(44);
  assert.equal(g.upgrades.compass, 1);
});

test("Stalker cowers then retreats from every burning torch mode, smothering the flame once at close range", () => {
  for (const mode of [0, 1, 2]) {
    const g = new Game(104729);
    away(g);
    g.setMode(mode);
    g.enemies = [{ x: 30, z: 0, kind: "stalker", state: "LISTENING" }];
    const fuel = g.fuel;
    advance(g, 0.2);
    assert.equal(g.enemies[0].state, "COWERING");
    advance(g, 2);
    assert.equal(g.enemies[0].state, "FLEEING");
    assert.ok(
      Math.hypot(g.enemies[0].x - g.player.x, g.enemies[0].z - g.player.z) >
        2.5,
    );
    assert.ok(
      Math.abs(fuel - g.fuel - g.fuelRate * 2.2 - CONFIG.stalkerSmother) <
        0.001,
    );
    assert.match(g.message, /torch gutters/);
    g.forceHunt();
    advance(g, 0.1);
    assert.ok(!["COWERING", "FLEEING"].includes(g.enemies[0].state));
  }
});

test("a Stalker driven off at the edge of the light does not smother it", () => {
  const g = new Game(104729);
  away(g);
  g.setMode(2);
  g.enemies = [
    {
      x: 28 + CONFIG.lightRepel[2] + 1,
      z: 0,
      kind: "stalker",
      state: "LISTENING",
    },
  ];
  const fuel = g.fuel;
  advance(g, 0.5);
  assert.equal(g.enemies[0].state, "COWERING");
  assert.ok(Math.abs(fuel - g.fuel - g.fuelRate * 0.5) < 0.001);
});
test("smothering has a cooldown and never extinguishes the torch outright", () => {
  const g = new Game(104729);
  away(g);
  g.fuel = 20;
  g.enemies = [
    { x: 30, z: 0, kind: "stalker", state: "LISTENING" },
    { x: 26, z: 0, kind: "stalker", state: "LISTENING" },
  ];
  advance(g, 0.1);
  assert.ok(g.fuel > 0);
  assert.equal(g.phase, "EXPLORING");
  assert.ok(g.smotherCooldown > 5);
});
test("deeper chambers hold heavier votives and some chambers hold no supplies", () => {
  let deep = 0,
    lean = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const g = new Game(seed);
    const rooms = g.world.layout!.rooms.filter((r) => r.kind !== "sanctuary");
    if (g.items.some((i) => i.kind === "artifact" && i.value === 2)) deep++;
    if (g.items.filter((i) => i.kind !== "artifact").length < rooms.length)
      lean++;
    // The opening two chambers always resupply.
    for (const room of rooms.slice(0, 2))
      assert.ok(
        g.items.some(
          (i) =>
            i.kind !== "artifact" &&
            Math.abs(i.x - room.x * 2) <= 6 &&
            Math.abs(i.z - room.z * 2) <= 6,
        ),
      );
  }
  assert.ok(deep >= 18);
  assert.ok(lean >= 18);
});
test("death records how many carried relics the dark kept", () => {
  const g = new Game();
  away(g);
  g.phase = "HUNT_ACTIVE";
  g.artifacts = 3;
  g.hunter = { x: g.player.x + 0.2, z: g.player.z, state: "PURSUING" };
  g.step(1 / 60, idle);
  assert.equal(g.phase, "DEAD");
  assert.equal(g.lostRelics, 3);
  assert.equal(g.artifacts, 0);
  g.reset(7);
  assert.equal(g.lostRelics, 0);
});

test("the Hunter grows in tall chambers but every pose still clears the ceiling", () => {
  // Grounded clip tops measured from hunter.glb: listen 1.93, pursue 1.87, crawl 1.38.
  assert.equal(hunterScaleFor(4), 1.3);
  for (let ceiling = 2.5; ceiling <= 4.5; ceiling += 0.05) {
    const scale = hunterScaleFor(ceiling);
    assert.ok(scale >= 1 && scale <= 1.3);
    // Below 3.1 m the scene switches to the crawl pose.
    const tallest = ceiling < 3.1 ? 1.38 : 1.95;
    assert.ok(
      tallest * scale < ceiling - 0.05 || scale === 1,
      `${ceiling.toFixed(2)} m ceiling: ${(tallest * scale).toFixed(2)} m pose`,
    );
  }
});

const hideSetup = () => {
  const g = new Game(104729);
  g.enemies = [];
  const spot = g.hidingSpots[0];
  Object.assign(g.player, { x: spot.x, z: spot.z, crouched: true });
  g.phase = "HUNT_ACTIVE";
  g.fuel = 0;
  // A floor point about `d` metres from the nook with a clear view into it.
  const at = (d: number) => {
    let best: { x: number; z: number } | undefined,
      error = Infinity;
    for (let a = 0; a < 64; a++)
      for (const r of [d - 0.3, d, d + 0.3]) {
        const p = {
          x: spot.x + Math.cos((a * Math.PI) / 32) * r,
          z: spot.z + Math.sin((a * Math.PI) / 32) * r,
        };
        if (
          walkable(g.world, p.x, p.z) &&
          lineOfSight(g.world, p, spot) &&
          Math.abs(r - d) < error
        ) {
          best = p;
          error = Math.abs(r - d);
        }
      }
    assert.ok(best, `no clear vantage ${d} m from the nook`);
    return best!;
  };
  const facing = (p: { x: number; z: number }) =>
    Math.atan2(-(spot.x - p.x), -(spot.z - p.z));
  return { g, spot, at, facing };
};
const still = { ...idle, crouch: true };
test("every expedition offers tomb nooks off the Hunters' walking lines", () => {
  // Tombs walled in behind burial shelves are decorative and yield no nook.
  for (let seed = 1; seed <= 40; seed++) {
    const g = new Game(seed);
    assert.ok(g.hidingSpots.length >= 2, `seed ${seed}`);
    for (const spot of g.hidingSpots) {
      assert.ok(walkable(g.world, spot.x, spot.z));
      // Standing on the nook itself is hidden when crouched.
      Object.assign(g.player, { x: spot.x, z: spot.z, crouched: true });
      assert.equal(g.hidden, true);
      assert.ok(navigationClearance(g.world, spot) > CONFIG.nookClearance);
      assert.ok(Math.hypot(spot.x - g.start.x, spot.z - g.start.z) > 8);
    }
  }
});
test("a crouched Torchbearer in a nook is hidden from a searching Hunter in plain view", () => {
  const { g, at, facing } = hideSetup();
  const p = at(4);
  g.hunter = { ...p, state: "SEARCHING", yaw: facing(p) };
  g.step(1 / 60, still);
  assert.equal(g.hidden, true);
  assert.notEqual(g.hunter.state, "PURSUING");
  // Standing up in the same place gives the hiding away.
  g.hunter = { ...p, state: "SEARCHING", yaw: facing(p) };
  g.step(1 / 60, idle);
  assert.equal(g.hidden, false);
  assert.equal(g.hunter.state, "PURSUING");
});
test("a searching Hunter's own routes never stumble onto a hidden Torchbearer", () => {
  let found = 0,
    trials = 0;
  for (const seed of [1, 3, 7, 104729]) {
    for (const spot of new Game(seed).hidingSpots) {
      const g = new Game(seed);
      g.enemies = [];
      Object.assign(g.player, { x: spot.x, z: spot.z, crouched: true });
      g.phase = "HUNT_ACTIVE";
      g.fuel = 0;
      const start = g.world.cells
        .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
        .find((c) => Math.abs(Math.hypot(c.x - spot.x, c.z - spot.z) - 8) < 1);
      if (!start) continue;
      trials++;
      g.hunter = { ...start, state: "SEARCHING" };
      for (let i = 0; i < 60 * 20 && g.phase !== "DEAD"; i++)
        g.step(1 / 60, still);
      if (g.phase === "DEAD" || g.hunter.state === "PURSUING") found++;
    }
  }
  assert.ok(trials >= 8);
  // Only lingering long enough to sense the nook may reveal it.
  assert.ok(found / trials < 0.25, `${found}/${trials} found`);
});
test("a Hunter at arm's reach, or one that lingers close, finds and catches the hidden Torchbearer", () => {
  {
    const { g, at, facing } = hideSetup();
    const p = at(0.55);
    g.hunter = { ...p, state: "SEARCHING", yaw: facing(p) };
    g.step(1 / 60, still);
    assert.equal(g.hunter.state, "PURSUING");
  }
  {
    const { g, at } = hideSetup();
    const p = at(2);
    let sensedAt = -1;
    for (let i = 0; i < 60 * 5 && sensedAt < 0; i++) {
      // Hold the Hunter in place two metres away, as if sniffing the nook.
      Object.assign(g.hunter, { ...p, state: "SEARCHING" });
      g.step(1 / 60, still);
      if (i === 120) assert.ok(g.hidingExposure > 0.4);
      if (g.hunter.state === "PURSUING") sensedAt = i;
    }
    assert.ok(
      sensedAt > 60 * 3,
      "lingering for the sense time reveals the nook",
    );
    for (let i = 0; i < 60 * 4 && g.phase !== "DEAD"; i++)
      g.step(1 / 60, still);
    assert.equal(g.phase, "DEAD", "a sensed Torchbearer can still be reached");
  }
});
test("hiding does not save you from a Hunter that watched you go in", () => {
  const { g, at, facing, spot } = hideSetup();
  g.player.crouched = false;
  const p = at(5);
  g.hunter = { ...p, state: "SEARCHING", yaw: facing(p) };
  g.step(1 / 60, idle); // sees the Torchbearer standing at the nook
  assert.equal(g.hunter.state, "PURSUING");
  for (let i = 0; i < 60 * 6 && g.phase !== "DEAD"; i++) g.step(1 / 60, still);
  assert.equal(g.phase, "DEAD");
  assert.ok(Math.hypot(g.player.x - spot.x, g.player.z - spot.z) < 0.5);
});

test("a heard Torchbearer is placed approximately; a seen one exactly", () => {
  const g = new Game(104729);
  g.enemies = [];
  g.phase = "HUNT_ACTIVE";
  g.fuel = 0;
  Object.assign(g.player, { x: 28, z: 2 });
  g.hunter = { x: 22, z: 0, state: "SEARCHING" };
  const sprint = { ...idle, forward: 1, sprint: true, yaw: Math.PI / 2 };
  const errors: number[] = [];
  for (let i = 0; i < 30; i++) {
    g.step(1 / 60, sprint);
    if (g.hunter.state === "INVESTIGATING")
      errors.push(Math.hypot(g.target.x - g.player.x, g.target.z - g.player.z));
  }
  assert.ok(errors.length > 0, "the sprint is heard around the corner");
  assert.ok(Math.max(...errors) > 0.4, "hearing is not pin-point");
  assert.ok(Math.max(...errors) <= CONFIG.hearingError[1] + 0.2);
  // Sight stays exact.
  Object.assign(g.player, { x: 28, z: 0 });
  g.hunter = { x: 31, z: 0, state: "SEARCHING", yaw: Math.PI / 2 };
  g.step(1 / 60, idle);
  assert.equal(g.hunter.state, "PURSUING");
  assert.ok(
    Math.hypot(g.target.x - g.player.x, g.target.z - g.player.z) < 0.01,
  );
});
