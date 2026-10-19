import test from "node:test";
import assert from "node:assert/strict";
import { movementClip, smoothFacing } from "./character";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

test("Mesh2Motion source is preserved and runtime keeps its skin with in-place motion", async () => {
  const source = await readFile(
    new URL("../docs/mesh2motion/multiview/torchbearer/site-export.glb", import.meta.url),
  );
  const record = JSON.parse(
    await readFile(
      new URL("../docs/mesh2motion/multiview/torchbearer/provenance.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    record.animation_source.export_sha256,
  );
  const original = JSON.parse(
    source.toString("utf8", 20, 20 + source.readUInt32LE(12)),
  );
  const runtime = await readFile(
    new URL("../public/models/torchbearer.glb", import.meta.url),
  );
  const size = runtime.readUInt32LE(12);
  const doc = JSON.parse(runtime.toString("utf8", 20, 20 + size));
  assert.equal(doc.skins[0].joints.length, original.skins[0].joints.length);
  assert.equal(doc.skins[0].joints.length, 66);
  assert.ok(doc.nodes.some((n: any) => n.name === 'index_03_l'));
  assert.ok(doc.nodes.some((n: any) => n.name === "game_forward"));
  for (const animation of doc.animations) {
    assert.equal(animation.extras.source, "Mesh2Motion");
    assert.ok(
      original.animations.some(
        (a: any) => a.name === animation.extras.source_clip,
      ),
    );
    for (const channel of animation.channels.filter(
      (c: any) => c.target.path === "translation",
    )) {
      const accessor =
        doc.accessors[animation.samplers[channel.sampler].output];
      const offset =
        28 +
        size +
        (doc.bufferViews[accessor.bufferView].byteOffset ?? 0) +
        (accessor.byteOffset ?? 0);
      for (let i = 1; i < accessor.count; i++)
        for (const axis of [0, 4])
          assert.equal(
            runtime.readFloatLE(offset + i * 12 + axis),
            runtime.readFloatLE(offset + axis),
            "animation must not move the collision-owned character horizontally",
          );
    }
  }
});

test("character locomotion selects idle, walk, sprint and crouch without false sprinting", () => {
  assert.equal(movementClip(false, 0), "idle");
  assert.equal(movementClip(false, 3.2), "walk");
  assert.equal(movementClip(false, 5.5), "sprint");
  assert.equal(movementClip(true, 0), "crouch_idle");
  assert.equal(movementClip(true, 1.5), "crouch_walk");
});

test("locomotion hysteresis resists speed jitter and still stops at rest", () => {
  assert.equal(movementClip(false, 4.1, "walk"), "walk");
  assert.equal(movementClip(false, 4.1, "sprint"), "sprint");
  assert.equal(movementClip(false, 3.6, "sprint"), "walk");
  assert.equal(movementClip(true, 0.12, "crouch_idle"), "crouch_idle");
  assert.equal(movementClip(true, 0.12, "crouch_walk"), "crouch_walk");
  assert.equal(movementClip(true, 0, "crouch_walk"), "crouch_idle");
});

test("facing turns smoothly across angle wrap and is frame-rate independent", () => {
  const start = Math.PI - 0.1,
    target = -Math.PI + 0.1;
  const next = smoothFacing(start, target, 1 / 60);
  assert.ok(next > start && next < start + 0.2, "short turn across +/- pi");
  let a = 0,
    b = 0;
  for (let i = 0; i < 60; i++) a = smoothFacing(a, 2, 1 / 60);
  for (let i = 0; i < 120; i++) b = smoothFacing(b, 2, 1 / 120);
  assert.ok(Math.abs(a - b) < 1e-6);
  assert.ok(Math.abs(a - 2) < 0.001);
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
    if (name === "hunter")
      assert.ok(
        gltf.animations.some(
          (clip) => clip.name === "flee" && clip.duration > 0.5,
        ),
        "Hunter needs a real retreat clip",
      );
    if (name === "torchbearer") {
      gltf.scene.traverse((node) => {
        const mesh = node as THREE.SkinnedMesh;
        if (!mesh.isSkinnedMesh) return;
        const vertices = mesh.geometry.getAttribute("position");
        const weights = mesh.geometry.getAttribute("skinWeight");
        const joints = mesh.geometry.getAttribute("skinIndex");
        mesh.geometry.computeBoundingBox();
        const bounds = mesh.geometry.boundingBox!;
        const knee = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.45;
        for (let i = 0; i < vertices.count; i++) {
          if (vertices.getY(i) >= knee) continue;
          for (let component = 0; component < 4; component++) {
            const weight = weights.getComponent(i, component);
            const bone = mesh.skeleton.bones[joints.getComponent(i, component)];
            assert.ok(
              weight < 0.0001 || !/arm|hand|head/.test(bone.name),
              "lower legs must never follow arms, hands or head",
            );
          }
        }
      });
      for (const clipName of [
        "idle",
        "walk",
        "sprint",
        "crouch_idle",
        "crouch_walk",
        "relight",
      ]) {
        const motion = gltf.animations.find((c) => c.name === clipName)!;
        assert.ok(motion && motion.duration >= 0.5);
        const sampleMixer = new THREE.AnimationMixer(gltf.scene);
        sampleMixer.clipAction(motion).play();
        const rightHand = gltf.scene.getObjectByName("hand_R")!;
        const handHeights: number[] = [];
        for (const phase of [0, 0.2, 0.4, 0.6, 0.8]) {
          sampleMixer.setTime(phase * motion.duration);
          gltf.scene.updateMatrixWorld(true);
          handHeights.push(rightHand.getWorldPosition(new THREE.Vector3()).y);
          for (const side of ["L", "R"]) {
            const foot = gltf.scene.getObjectByName("foot_" + side)!;
            const point = foot.getWorldPosition(new THREE.Vector3());
            assert.ok(
              // Mesh2Motion's ankle pivot sits lower; sprint raises the swing foot.
              point.y >= 0 && point.y < (clipName === "sprint" ? 0.5 : 0.35),
              `${clipName}: foot left floor envelope ${point.y}`,
            );
          }
        }
        assert.ok(
          Math.min(...handHeights) >
            (clipName.startsWith("crouch")
              ? 0.4
              : clipName === "sprint"
                ? 0.5
                : 0.65),
          `${clipName}: torch wrist collapsed`,
        );
        assert.ok(
          Math.max(...handHeights) - Math.min(...handHeights) <
            (clipName === "sprint" ? 0.3 : 0.09),
          `${clipName}: unstable torch carry`,
        );
        if (clipName !== "relight") {
          const landmarks = ["foot_L", "foot_R", "hand_R", "head"].map((n) =>
            gltf.scene.getObjectByName(n)!,
          );
          sampleMixer.setTime(0);
          gltf.scene.updateMatrixWorld(true);
          const start = landmarks.map((n) =>
            n.getWorldPosition(new THREE.Vector3()),
          );
          sampleMixer.setTime(motion.duration - 0.0001);
          gltf.scene.updateMatrixWorld(true);
          landmarks.forEach((node, i) =>
            assert.ok(
              node.getWorldPosition(new THREE.Vector3()).distanceTo(start[i]) <
                0.004,
              `${clipName}: visible loop seam at ${node.name}`,
            ),
          );
        }
        sampleMixer.stopAllAction();
        sampleMixer.uncacheRoot(gltf.scene);
      }
    }
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
