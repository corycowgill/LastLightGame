import test from "node:test";
import assert from "node:assert/strict";
import { Game, findPath } from "./simulation";
import { blockedByProp } from "./crypt-layout";
import { roomAt } from "./room-design";

test("new expeditions face and walk through the entrance without steering", () => {
  for (const seed of [1, 17, 42, 88, 104729]) {
    const g = new Game(seed);
    const origin = { ...g.player };
    for (let i = 0; i < 150; i++)
      g.step(1 / 60, {
        forward: 1,
        strafe: 0,
        sprint: false,
        crouch: false,
        yaw: g.startingHeading,
      });
    assert.ok(
      Math.hypot(g.player.x - origin.x, g.player.z - origin.z) > 7,
      `seed ${seed}: unsteered entrance`,
    );
    assert.ok(!blockedByProp(g.world, g.player.x, g.player.z, 0.35));
  }
});

test("first relic is a reachable earned discovery beyond the entrance and ends local hints", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = new Game(seed);
    const layout = g.world.layout!;
    const first = layout.rooms[1];
    const relic = g.items.find(
      (i) =>
        i.kind === "artifact" &&
        !i.encounter &&
        roomAt(g.world, i.x, i.z) === first,
    )!;
    assert.ok(relic, `seed ${seed}: first room relic`);
    assert.ok(findPath(g.world, g.start, relic).length > 0);
    assert.ok(Math.hypot(relic.x - g.start.x, relic.z - g.start.z) >= 20);
    assert.match(g.objectiveHint, /FIRST ARCH/);
    Object.assign(g.player, relic);
    assert.match(g.objectiveHint, /APPROACH/);
    g.interact();
    assert.equal(g.artifacts, 1);
    assert.doesNotMatch(g.objectiveHint, /FIRST ARCH|A RELIC GLOWS/);
    assert.ok(
      g.items.some((i) => i.encounter === "reliquary" && i.value === 3),
    );
  }
});

test("Stalker capture gives the correct sound-based advice", () => {
  const g = new Game(1);
  Object.assign(g.player, { x: 28, z: 0 });
  g.fuel = 0;
  g.phase = "HUNT_ACTIVE";
  g.hunter = { x: 0, z: 0, state: "DORMANT" };
  g.enemies = [{ x: 28.2, z: 0, state: "LISTENING", kind: "stalker" }];
  g.step(1 / 60, {
    forward: 0,
    strafe: 0,
    sprint: false,
    crouch: false,
    yaw: 0,
  });
  assert.equal(g.phase, "DEAD");
  assert.equal(g.deathCause, "Stalker");
  assert.match(g.deathAdvice, /follows sound/);
});

test("custom diagnostic worlds without room graphs retain safe onboarding fallbacks", () => {
  const g = new Game(1);
  g.world = {
    seed: 1,
    cells: [{ x: 0, z: 0, kind: "floor" }],
    start: { x: 0, z: 0 },
    exit: { x: 2, z: 0 },
  };
  assert.equal(g.startingHeading, -Math.PI / 2);
  assert.match(g.objectiveHint, /FAR GOLDEN FIRE/);
});
