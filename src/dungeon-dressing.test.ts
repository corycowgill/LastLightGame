import test from "node:test";
import assert from "node:assert/strict";
import { dungeonDressing } from "./dungeon-dressing";
import { generateWorld } from "./simulation";

test("dungeon stories are repeatable and keep large props outside central walking lanes", () => {
  for (const seed of [1, 42, 104729, 99183]) {
    const world = generateWorld(seed);
    const details = dungeonDressing(world);
    assert.deepEqual(details, dungeonDressing(generateWorld(seed)));
    assert.ok(details.some((d) => d.id === "dre_small_bone_pile"));
    assert.ok(details.some((d) => d.id === "dec_corner_cobweb"));
    const centers = world.cells.filter(
      (c) => c.x % 14 === 0 && c.z % 14 === 0 && c.kind !== "corridor",
    );
    for (const detail of details) {
      const room = centers.find(
        (c) =>
          Math.abs(c.x * 2 - detail.x) < 10 &&
          Math.abs(c.z * 2 - detail.z) < 10,
      )!;
      assert.ok(room);
      if (detail.id.startsWith("dre_")) {
        assert.ok(Math.abs(detail.x - room.x * 2) >= 3.5);
        assert.ok(Math.abs(detail.z - room.z * 2) >= 1.8);
      }
      if (detail.id === "dec_corner_cobweb")
        assert.ok(detail.y - detail.scale / 2 >= 1.8);
      if (room.kind === "sanctuary")
        assert.ok(
          !["dre_small_bone_pile", "dre_crypt_skull"].includes(detail.id),
        );
    }
  }
});
