import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

test("Torchbearer skin does not tear at shoulder and waist weight boundaries", async () => {
  const bytes = await readFile(
    new URL("../public/models/torchbearer.glb", import.meta.url),
  );
  const gltf = await new GLTFLoader()
    .register(() => ({
      name: "GeometryOnly",
      loadTexture: async () => new THREE.Texture(),
    }))
    .parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
  let mesh!: THREE.SkinnedMesh;
  gltf.scene.traverse((node) => {
    if ((node as THREE.SkinnedMesh).isSkinnedMesh)
      mesh = node as THREE.SkinnedMesh;
  });
  const positions = mesh.geometry.getAttribute("position"),
    indices = mesh.geometry.index!;
  const edges: [number, number, number][] = [];
  const a = new THREE.Vector3(),
    b = new THREE.Vector3();
  for (let i = 0; i < indices.count; i += 3)
    for (let side = 0; side < 3; side++) {
      const first = indices.getX(i + side),
        second = indices.getX(i + ((side + 1) % 3));
      const length = a
        .fromBufferAttribute(positions, first)
        .distanceTo(b.fromBufferAttribute(positions, second));
      if (length > 0.005) edges.push([first, second, length]);
    }
  for (const name of ["idle", "walk", "sprint", "crouch_walk"]) {
    const clip = gltf.animations.find((c) => c.name === name)!;
    const mixer = new THREE.AnimationMixer(gltf.scene);
    mixer.clipAction(clip).play();
    let excessive = 0,
      worst = 0;
    for (const phase of [0.1, 0.3, 0.5, 0.7]) {
      mixer.setTime(clip.duration * phase);
      gltf.scene.updateMatrixWorld(true);
      mesh.skeleton.update();
      const deformed = Array.from({ length: positions.count }, (_, i) =>
        mesh.applyBoneTransform(
          i,
          new THREE.Vector3().fromBufferAttribute(positions, i),
        ),
      );
      for (const [first, second, length] of edges) {
        const ratio = deformed[first].distanceTo(deformed[second]) / length;
        worst = Math.max(worst, ratio);
        if (ratio > 2.5) excessive++;
      }
    }
    // The rejected site weights had thousands of 2.5x edges and 14–18x peaks.
    assert.ok(worst < 5, `${name}: edge stretched ${worst.toFixed(2)}x`);
    assert.ok(
      excessive / (edges.length * 4) < 0.001,
      `${name}: widespread skin tearing`,
    );
    mixer.stopAllAction();
    mixer.uncacheRoot(gltf.scene);
  }
});
