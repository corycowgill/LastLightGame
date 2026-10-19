import test from "node:test";
import assert from "node:assert/strict";
import { Game, generateWorld, findPath, walkable } from "./simulation";

test("200 seeds vary topology, size, themes and destination while preserving every room route", () => {
  const maps = new Set<string>(),
    sizes = new Set<number>(),
    themes = new Set<string>(),
    exits = new Set<string>();
  let loops = 0,
    deadEnds = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const w = generateWorld(seed),
      layout = w.layout!;
    assert.deepEqual(w, generateWorld(seed));
    assert.ok(layout.rooms.length >= 12 && layout.rooms.length <= 18);
    sizes.add(layout.rooms.length);
    themes.add(layout.theme);
    exits.add(JSON.stringify(w.exit));
    maps.add(JSON.stringify(layout.rooms.map((r) => [r.x, r.z])));
    assert.equal(
      new Set(layout.rooms.map((r) => `${r.x},${r.z}`)).size,
      layout.rooms.length,
    );
    assert.equal(layout.rooms.filter((r) => r.kind === "sanctuary").length, 2);
    if (layout.links.length >= layout.rooms.length) loops++;
    deadEnds += layout.rooms.filter((r) => r.reward).length;
    for (const room of layout.rooms) {
      assert.ok(
        findPath(w, { x: 0, z: 0 }, { x: room.x * 2, z: room.z * 2 }).length >
          0,
        `${seed}: room ${room.x},${room.z}`,
      );
      assert.ok(room.depth >= 0 && room.depth <= 1);
    }
  }
  assert.ok(maps.size > 190);
  assert.equal(sizes.size, 7);
  assert.equal(themes.size, 3);
  assert.ok(exits.size > 15);
  assert.ok(loops > 150);
  assert.ok(deadEnds > 200);
});

test("seeded resources and creature spawn are reachable and avoid sanctuaries", () => {
  for (const seed of [1, 42, 88, 104729, 99183]) {
    const g = new Game(seed);
    for (const item of [...g.items, ...g.enemies]) {
      assert.ok(walkable(g.world, item.x, item.z));
      assert.ok(findPath(g.world, g.start, item).length > 0);
      assert.ok(Math.hypot(item.x - g.start.x, item.z - g.start.z) > 10);
      assert.ok(
        Math.hypot(item.x - g.destination.x, item.z - g.destination.z) > 10,
      );
    }
    assert.ok(g.items.some((i) => i.kind === "fuel"));
    assert.ok(g.items.some((i) => i.kind === "match"));
    assert.ok(g.items.some((i) => i.kind === "artifact"));
  }
});

test("old fixed-map saves migrate safely and preserve upgrades and carried discoveries", () => {
  let stored = JSON.stringify({
    version: 1,
    seed: 88,
    banked: 3,
    artifacts: 2,
    maxFuel: 900,
    upgrades: { wick: 2 },
    player: { x: 999, z: 999 },
    fuel: 1,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    },
  });
  const g = new Game(1);
  assert.equal(g.load(), true);
  assert.equal(g.banked, 5);
  assert.equal(g.upgrades.wick, 2);
  assert.equal(g.maxFuel, 900);
  assert.equal(g.fuel, 900);
  assert.ok(walkable(g.world, g.player.x, g.player.z));
  assert.equal(JSON.parse(stored).generation, 2);
  assert.equal(g.load(), true);
  assert.equal(g.banked, 5);
});
