import test from "node:test";
import assert from "node:assert/strict";
import { burialRows, pillarRows } from "./crypt-layout";
import { generateWorld, walkable, findPath, lineOfSight } from "./simulation";
import { dungeonDressing } from "./dungeon-dressing";

test("burial rows have matching navigation blockers and preserve sanctuary routes", () => {
  for (const seed of [1, 42, 104729, 99183, 77, 120]) {
    const world = generateWorld(seed);
    const rows = burialRows(world);
    const pillars = pillarRows(world);
    assert.equal(pillars.length, 44);
    for (const pillar of pillars) {
      assert.equal(
        walkable(world, pillar.x, pillar.z),
        false,
        "pillars block player and Hunter navigation",
      );
      assert.ok(Math.abs(pillar.x % 28) >= 4);
      assert.ok(Math.abs(pillar.z % 28) >= 6);
      const a = { x: pillar.x - 2, z: pillar.z };
      const b = { x: pillar.x + 2, z: pillar.z };
      assert.equal(
        lineOfSight(world, a, b),
        false,
        "pillars provide real visual cover",
      );
      assert.ok(
        findPath(world, a, b).length > 0,
        "navigation can route around a pillar",
      );
    }
    assert.ok(rows.length >= 56);
    for (const row of rows)
      assert.equal(
        walkable(world, row.x, row.z),
        false,
        "solid burial shelves cannot be walked through",
      );
    const path = findPath(
      world,
      { x: world.start.x * 2, z: world.start.z * 2 },
      { x: world.exit.x * 2, z: world.exit.z * 2 },
    );
    assert.ok(path.length > 20);
    assert.ok(path.every((p) => walkable(world, p.x, p.z)));
    assert.ok(
      dungeonDressing(world).length + rows.length * 3 > 300,
      "crypts need clustered furnishings, not a few isolated props",
    );
  }
});
