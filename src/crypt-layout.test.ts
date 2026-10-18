import test from "node:test";
import assert from "node:assert/strict";
import { burialRows } from "./crypt-layout";
import { generateWorld, walkable, findPath } from "./simulation";
import { dungeonDressing } from "./dungeon-dressing";

test("burial rows have matching navigation blockers and preserve sanctuary routes", () => {
  for (const seed of [1, 42, 104729, 99183, 77, 120]) {
    const world = generateWorld(seed);
    const rows = burialRows(world);
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
