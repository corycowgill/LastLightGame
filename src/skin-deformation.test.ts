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
  const weights = mesh.geometry.getAttribute("skinWeight"),
    joints = mesh.geometry.getAttribute("skinIndex");
  for (let i = 0; i < positions.count; i++)
    if (positions.getY(i) > 0.98)
      for (let k = 0; k < 4; k++) {
        const bone = mesh.skeleton.bones[joints.getComponent(i, k)].name;
        assert.ok(
          weights.getComponent(i, k) < 0.0001 ||
            !/^(thigh|shin|foot|ball|toe)/.test(bone),
          "ribcage must not follow leg bones",
        );
      }
  let gloveVertices = 0;
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getX(i)) <= 0.37 || positions.getY(i) >= 0.82)
      continue;
    gloveVertices++;
    let wristWeight = 0;
    for (let k = 0; k < 4; k++)
      if (
        mesh.skeleton.bones[joints.getComponent(i, k)].name.startsWith("hand_")
      )
        wristWeight += weights.getComponent(i, k);
    assert.ok(
      wristWeight > 0.999,
      "glove must follow the wrist and gripped prop",
    );
  }
  assert.ok(
    gloveVertices > 200,
    "both gloves must be included in the grip regression",
  );
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
  for (const name of [
    "idle",
    "walk",
    "sprint",
    "crouch_idle",
    "crouch_walk",
    "interact",
    "relight",
    "burst",
    "death",
  ]) {
    const clip = gltf.animations.find((c) => c.name === name)!;
    const mixer = new THREE.AnimationMixer(gltf.scene);
    mixer.clipAction(clip).play();
    let excessive = 0,
      worst = 0;
    const phases = Array.from({ length: 12 }, (_, i) => i / 12);
    const hands: Record<string, THREE.Vector3[]> = { L: [], R: [] };
    for (const phase of phases) {
      mixer.setTime(clip.duration * phase);
      gltf.scene.updateMatrixWorld(true);
      mesh.skeleton.update();
      const chest = gltf.scene.getObjectByName("chest")!;
      for (const side of ["L", "R"])
        hands[side].push(
          chest.worldToLocal(
            gltf.scene
              .getObjectByName(`hand_${side}`)!
              .getWorldPosition(new THREE.Vector3()),
          ),
        );
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
    assert.ok(worst < 3.6, `${name}: edge stretched ${worst.toFixed(2)}x`);
    assert.ok(
      excessive / (edges.length * phases.length) < 0.001,
      `${name}: widespread skin tearing`,
    );
    if (["walk", "sprint", "crouch_walk"].includes(name))
      for (const side of ["L", "R"]) {
        const travel = Math.max(
          ...hands[side].map((p) => p.distanceTo(hands[side][0])),
        );
        assert.ok(
          travel > 0.01,
          `${name}: ${side} arm must move relative to the chest, not remain frozen`,
        );
        assert.ok(
          travel < 1,
          `${name}: ${side} wrist escaped its anatomical envelope`,
        );
      }
    mixer.stopAllAction();
    mixer.uncacheRoot(gltf.scene);
  }
});
