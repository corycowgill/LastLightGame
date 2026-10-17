import test from "node:test";
import * as THREE from "three";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("catalog replacements are embedded neural meshes with immutable provenance and metric scale", async () => {
  const directory = new URL("../public/models/catalog/", import.meta.url);
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", directory), "utf8"),
  );
  assert.ok(manifest.assets.length >= 2);
  for (const entry of manifest.assets) {
    assert.equal(entry.method, "image_to_3d");
    assert.ok(["hf", "comfy"].includes(entry.backend));
    assert.match(entry.reference_sha256, /^[a-f0-9]{64}$/);
    const bytes = await readFile(new URL(entry.file, directory));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
    );
    assert.equal(bytes.toString("ascii", 0, 4), "glTF");
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const document = JSON.parse(
      bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
    );
    assert.ok(document.meshes.length > 0);
    for (const resource of [...document.buffers, ...(document.images ?? [])])
      assert.ok(!resource.uri);
    const primitives = document.meshes.flatMap((mesh: any) => mesh.primitives);
    assert.equal(
      primitives.reduce(
        (sum: number, primitive: any) =>
          sum + document.accessors[primitive.indices].count / 3,
        0,
      ),
      entry.triangles,
    );
    const bounds = new THREE.Box3();
    function visit(index: number, parent: THREE.Matrix4) {
      const node = document.nodes[index];
      const local = node.matrix
        ? new THREE.Matrix4().fromArray(node.matrix)
        : new THREE.Matrix4().compose(
            new THREE.Vector3().fromArray(node.translation ?? [0, 0, 0]),
            new THREE.Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
            new THREE.Vector3().fromArray(node.scale ?? [1, 1, 1]),
          );
      const world = parent.clone().multiply(local);
      if (node.mesh !== undefined)
        for (const primitive of document.meshes[node.mesh].primitives) {
          const accessor = document.accessors[primitive.attributes.POSITION];
          bounds.union(
            new THREE.Box3(
              new THREE.Vector3().fromArray(accessor.min),
              new THREE.Vector3().fromArray(accessor.max),
            ).applyMatrix4(world),
          );
        }
      for (const child of node.children ?? []) visit(child, world);
    }
    for (const root of document.scenes[document.scene ?? 0].nodes)
      visit(root, new THREE.Matrix4());
    const extent = bounds.getSize(new THREE.Vector3())[
      entry.scale_axis as "x" | "y" | "z"
    ];
    assert.ok(
      entry.animation_binding ||
        Math.abs(extent - entry.target_size_m) < entry.target_size_m * 0.05,
      `${entry.id}: size ${extent}`,
    );
  }
});
