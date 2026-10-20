import { roomAt } from "./room-design";
import test from "node:test";
import assert from "node:assert/strict";
import { dungeonDressing } from "./dungeon-dressing";
import { generateWorld } from "./simulation";
import { readFile } from "node:fs/promises";

test("every dungeon detail is backed by a detailed neural GLB", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/models/catalog/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  for (const detail of dungeonDressing(generateWorld(104729))) {
    const entry = manifest.assets.find((a: any) => a.id === detail.id);
    assert.ok(entry, detail.id);
    assert.equal(entry.method, "image_to_3d");
    assert.ok(entry.file.endsWith(".glb"));
    assert.ok(
      entry.triangles >=
        (detail.id.startsWith("pro_")
          ? 2000
          : detail.id === "dre_urn_broken"
            ? 9000
            : 12000),
      detail.id,
    );
  }
  const web = manifest.assets.find((a: any) => a.id === "dec_corner_cobweb");
  const bytes = await readFile(
    new URL("../public/models/catalog/" + web.file, import.meta.url),
  );
  const gltf = JSON.parse(
    bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
  );
  const position =
    gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
  assert.ok(
    position.max.every((n: number, i: number) => n - position.min[i] > 0.01),
    "web contains geometry in all three dimensions",
  );
});

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
      if (detail.id.startsWith("dre_") || detail.id.startsWith("pro_")) {
        assert.ok(
          Math.abs(detail.x - room.x * 2) >=
            (roomAt(world, room.x * 2, room.z * 2)?.design === "burial"
              ? 2
              : 3.5),
        );
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
