import test from "node:test";
import assert from "node:assert/strict";
import { Game, lineOfSight } from "./simulation";
import { roomAt } from "./room-design";

/** A first-ever expedition, standing on the first relic, looking onward. */
function lesson(seed: number) {
  const g = new Game(seed);
  g.initiated = false;
  g.enemies = [];
  const room = g.world.layout!.rooms[1];
  const relic = g.items.find(
    (i) =>
      i.kind === "artifact" &&
      !i.encounter &&
      roomAt(g.world, i.x, i.z) === room,
  )!;
  Object.assign(g.player, { x: relic.x, z: relic.z });
  const yaw = Math.atan2(-(relic.x - g.start.x), -(relic.z - g.start.z));
  const input = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw };
  g.interact();
  assert.equal(g.artifacts, 1);
  return { g, input };
}
const run = (
  g: Game,
  input: object,
  seconds: number,
  until?: () => boolean,
) => {
  for (let i = 0; i < seconds * 60 && !until?.(); i++)
    g.step(1 / 60, input as Parameters<Game["step"]>[1]);
};

test("the first relic snuffs the torch and the Hunter rises in sight", () => {
  let inSight = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const { g, input } = lesson(seed);
    run(g, input, 2);
    assert.equal(g.phase, "EXPLORING", "the relic card reads first");
    run(g, input, 6, () => g.phase === "HUNT_ACTIVE");
    assert.equal(g.phase, "HUNT_ACTIVE", `seed ${seed}`);
    assert.equal(g.initiated, true);
    const d = Math.hypot(g.hunter.x - g.player.x, g.hunter.z - g.player.z);
    if (d >= 9 && d <= 15 && lineOfSight(g.world, g.hunter, g.player))
      inSight++;
  }
  assert.ok(inSight >= 27, `Hunter seen on ${inSight}/30 seeds`);
});

test("a struck match drives the Hunter off and the lesson never repeats", () => {
  for (const seed of [1, 7, 42, 104729]) {
    const { g, input } = lesson(seed);
    run(g, input, 8, () => g.phase === "HUNT_ACTIVE");
    const matches = g.matches;
    g.relight();
    assert.equal(g.matches, matches - 1);
    run(g, input, 4);
    assert.equal(g.phase, "EXPLORING", `seed ${seed}`);
    assert.ok(g.fuel > 0);
    assert.equal(
      g.hunter.state,
      "FLEEING",
      `seed ${seed}: recoils from the match`,
    );
    // A second relic is just a relic.
    const next = g.items.find(
      (i) => i.kind === "artifact" && !i.taken && !i.encounter,
    )!;
    Object.assign(g.player, { x: next.x, z: next.z });
    g.interact();
    run(g, input, 5);
    assert.notEqual(g.phase, "EXTINGUISHING");
    assert.notEqual(g.phase, "HUNT_GRACE");
  }
});

test("a frozen first-timer gets a merciful window, then the Hunt is real", () => {
  for (const seed of [1, 7, 42, 104729]) {
    const { g, input } = lesson(seed);
    run(g, input, 8, () => g.phase === "HUNT_ACTIVE");
    run(g, input, 7.5);
    assert.notEqual(g.phase, "DEAD", `seed ${seed}: died inside the mercy`);
    run(g, input, 30, () => g.phase === "DEAD");
    assert.equal(g.phase, "DEAD", `seed ${seed}: the Hunt must stay real`);
  }
});

test("experienced saves and default games never play the lesson", () => {
  const g = new Game(3);
  const room = g.world.layout!.rooms[1];
  const relic = g.items.find(
    (i) =>
      i.kind === "artifact" &&
      !i.encounter &&
      roomAt(g.world, i.x, i.z) === room,
  )!;
  Object.assign(g.player, { x: relic.x, z: relic.z });
  g.interact();
  run(g, { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 }, 6);
  assert.equal(g.phase, "EXPLORING");
});
