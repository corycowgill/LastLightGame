import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Game, generateWorld, walkable, findPath } from "./simulation";
import {
  blockedByProp,
  environmentBlocks,
  propSegmentClear,
} from "./crypt-layout";
import { propBounds } from "./prop-bounds";
import { roomProps } from "./room-props";

test("solid prop bounds match the actual shipped GLBs", async () => {
  for (const [id, bounds] of Object.entries(propBounds)) {
    const bytes = await readFile(
      new URL(`../public/models/catalog/${id}.glb`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      bounds.sha256,
      id,
    );
    assert.ok(
      bounds.max.every((v, i) => v > bounds.min[i]),
      id,
    );
  }
});

test("large room furniture and off-centre footprints are solid", () => {
  const w = generateWorld(104729);
  const blocks = environmentBlocks(w);
  for (const id of [
    "pro_supply_crate",
    "pro_barrel",
    "pro_sarcophagus",
    "lan_hiding_tomb",
    "pro_pillar",
    "pro_memorial",
  ])
    assert.ok(
      [1, 42, 104729].some((seed) =>
        environmentBlocks(generateWorld(seed)).some((b) => b.id === id),
      ),
      id,
    );
  for (const b of blocks.filter((b) => b.bottom < 1.8)) {
    assert.equal(blockedByProp(w, b.x, b.z), true, b.id);
    const x = b.x + Math.cos(b.yaw) * b.halfX * 0.9;
    const z = b.z - Math.sin(b.yaw) * b.halfX * 0.9;
    assert.equal(blockedByProp(w, x, z), true, `${b.id}: footprint edge`);
  }
});

test("arch pillars block movement but the central opening stays passable", () => {
  const w = generateWorld(104729);
  for (const side of [-1, 1]) {
    assert.equal(walkable(w, 0, side * 7.7), true);
    for (const post of [-1, 1])
      assert.equal(walkable(w, post * 2.2, side * 7.7), false);
    assert.equal(propSegmentClear(w, 0, side * 6, 0, side * 8), true);
  }
  const arch = roomProps(0, 0, "sanctuary").find(
    (p) => p.id === "lan_sanctuary_arch_hero",
  )!;
  assert.equal(blockedByProp(w, arch.x, arch.z), false, "hero arch opening");
});

test("player cannot walk through a crate; navigation detours with body clearance", () => {
  const g = new Game(104729);
  g.enemies = [];
  const room = g.world.layout!.rooms.find((r) => r.design === "ossuary")!;
  const crate = roomProps(room.x * 2, room.z * 2, room.kind, g.world).find(
    (p) => p.id === "pro_supply_crate",
  )!;
  Object.assign(g.player, { x: crate.x, z: crate.z - 2 });
  for (let i = 0; i < 300; i++)
    g.step(1 / 60, {
      forward: 1,
      strafe: 0,
      sprint: true,
      crouch: false,
      yaw: Math.PI,
    });
  assert.ok(g.player.z > crate.z - 1.8, "player approached crate");
  assert.ok(g.player.z < crate.z - 0.3, "crate stopped the player");
  const approach = { x: crate.x, z: crate.z - 2 };
  const beyond = g.world.cells
    .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
    .filter(
      (p) =>
        p.z > crate.z &&
        Math.abs(p.x - crate.x) < 5 &&
        Math.hypot(p.x - crate.x, p.z - crate.z) < 5 &&
        walkable(g.world, p.x, p.z),
    )
    .find((p) => findPath(g.world, approach, p).length > 0)!;
  assert.ok(beyond, "there is a reachable route beyond the crate");
  const path = findPath(g.world, approach, beyond);
  assert.ok(path.length >= 3, "route reaches the far side of furniture");
  for (let i = 1; i < path.length; i++)
    assert.equal(
      propSegmentClear(
        g.world,
        path[i - 1].x,
        path[i - 1].z,
        path[i].x,
        path[i].z,
      ),
      true,
    );
});
