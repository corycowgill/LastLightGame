import test from "node:test";
import assert from "node:assert/strict";
import { movementClip } from "./character";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

test("character locomotion selects idle, walk, sprint and crouch without false sprinting", () => {
  assert.equal(movementClip(false, 0), "idle");
  assert.equal(movementClip(false, 3.2), "walk");
  assert.equal(movementClip(false, 5.5), "sprint");
  assert.equal(movementClip(true, 0), "crouch_idle");
  assert.equal(movementClip(true, 1.5), "crouch_walk");
});

test("shipped GLBs load with bound skeletons, required clips and an animated hand socket", async () => {
  for (const name of ["torchbearer", "hunter", "stalker"]) {
    const bytes = await readFile(
      new URL(`../public/models/${name}.glb`, import.meta.url),
    );
    // Node has no image decoder; actual embedded texture decode is exercised in browser QA.
    const loader = new GLTFLoader().register(() => ({
      name: "HeadlessTexture",
      loadTexture: async () => new THREE.Texture(),
    }));
    const gltf = await loader.parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    let skinned = 0;
    gltf.scene.traverse((node) => {
      const mesh = node as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh) {
        skinned++;
        assert.ok(mesh.skeleton.bones.length >= 16);
        const weights = mesh.geometry.getAttribute("skinWeight");
        assert.ok(weights.count > 0);
        for (let i = 0; i < weights.count; i++)
          assert.ok(
            Math.abs(
              weights.getX(i) +
                weights.getY(i) +
                weights.getZ(i) +
                weights.getW(i) -
                1,
            ) < 0.001,
          );
      }
    });
    assert.ok(skinned > 0);
    const socket = gltf.scene.getObjectByName("torch_socket")!;
    assert.ok(socket);
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const clip = gltf.animations.find(
      (c) =>
        c.name ===
        (name === "torchbearer"
          ? "crouch_idle"
          : name === "stalker"
            ? "investigate"
            : "pursue"),
    )!;
    assert.ok(clip && clip.tracks.length > 0);
    gltf.scene.updateMatrixWorld(true);
    const before = socket.getWorldPosition(new THREE.Vector3());
    mixer.clipAction(clip).play();
    mixer.update(0.3);
    gltf.scene.updateMatrixWorld(true);
    assert.ok(
      before.distanceTo(socket.getWorldPosition(new THREE.Vector3())) > 0.005,
      "Clip must move the rig and socket",
    );
    const target =
      name === "torchbearer" ? 1.55 : name === "hunter" ? 3.2 : 1.65;
    for (const time of [0.1, 0.3, 0.5, 0.8]) {
      mixer.setTime(time);
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((node) => {
        const mesh = node as THREE.SkinnedMesh;
        if (mesh.isSkinnedMesh) mesh.skeleton.update();
      });
      const bounds = new THREE.Box3().setFromObject(gltf.scene, true);
      const size = bounds.getSize(new THREE.Vector3());
      assert.ok(
        Number.isFinite(size.length()) &&
          size.y > target * 0.3 &&
          size.y < target * 1.6,
        `${name}: broken animated height ${size.toArray()} at ${time}`,
      );
      assert.ok(
        size.x < target * 1.3 && size.z < target * 1.3,
        `${name}: exploded skin`,
      );
    }
  }
});
