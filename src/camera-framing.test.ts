import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  shoulderOffset,
  compressedPlayerOpacity,
  PlayerCameraFade,
} from "./camera-framing";
import { generateWorld } from "./simulation";
import { environmentBlocks } from "./crypt-layout";

test("camera recenters against the real generated passage arch posts", () => {
  const world = generateWorld(104729);
  const blocks = environmentBlocks(world).filter(
    (b) => b.id === "passage_arch",
  );
  assert.ok(blocks.length > 0);
  // Use exact solids shared with rendered GLB placement and player collisions.
  const walls = blocks.map((b) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.halfX * 2, b.height, b.halfZ * 2),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    mesh.position.set(b.x, b.bottom + b.height / 2, b.z);
    mesh.rotation.y = b.yaw;
    mesh.updateMatrixWorld();
    return mesh;
  });
  const b = blocks.find((b) => b.bottom === 0)!;
  const right = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const forward = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  // Start just inside an opening; shoulder hits a post while the center clears.
  const anchor = new THREE.Vector3(b.x, 1.25, b.z)
    .addScaledVector(right, -0.6)
    .addScaledVector(forward, -1);
  const boom = forward.clone().multiplyScalar(3.7);
  assert.ok(shoulderOffset(anchor, boom, right, walls) < 0.6);
  assert.equal(shoulderOffset(anchor, boom, right, []), 0.85);
  walls.forEach((w) => {
    w.geometry.dispose();
    (w.material as THREE.Material).dispose();
  });
});

test("compressed camera fades only owned avatar materials and restores opaque depth", () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const shaderHook = material.onBeforeCompile;
  const body = new THREE.Mesh(new THREE.BoxGeometry(), material);
  root.add(body);
  const fade = new PlayerCameraFade(root);
  assert.notEqual(body.material, material);
  assert.equal(body.material.onBeforeCompile, shaderHook);
  fade.update(compressedPlayerOpacity(0.4));
  assert.equal(body.material.opacity, 0);
  assert.equal(body.material.depthWrite, false);
  assert.equal(material.opacity, 1, "shared source remains unchanged");
  fade.update(compressedPlayerOpacity(3));
  assert.equal(body.material.opacity, 1);
  assert.equal(body.material.transparent, false);
  assert.equal(body.material.depthWrite, true);
  body.geometry.dispose();
  body.material.dispose();
});
