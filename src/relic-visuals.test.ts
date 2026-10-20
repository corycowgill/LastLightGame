import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  relicMotes,
  animateRelicMotes,
  illuminateRelic,
} from "./relic-visuals";

test("relic effect stays bounded, depth tested and uses no lights", () => {
  const motes = relicMotes(true, "#c8b4ed");
  for (const t of [0, 7, 10000]) {
    animateRelicMotes(motes, t, 3);
    const positions = motes.geometry.getAttribute("position");
    assert.equal(positions.count, 24);
    for (let i = 0; i < positions.count; i++) {
      assert.ok(Math.hypot(positions.getX(i), positions.getZ(i)) <= 0.45);
      assert.ok(positions.getY(i) >= 0.19 && positions.getY(i) < 1.56);
    }
  }
  assert.equal((motes.material as THREE.ShaderMaterial).depthTest, true);
  assert.equal((motes.material as THREE.ShaderMaterial).depthWrite, false);
  assert.equal(motes.children.length, 0);
  motes.geometry.dispose();
  (motes.material as THREE.Material).dispose();
});

test("relic emissive finish never mutates the shared catalog material", () => {
  const original = new THREE.MeshStandardMaterial({ emissive: 0x000000 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), original);
  illuminateRelic(mesh, "#c8b4ed");
  assert.notEqual(mesh.material, original);
  assert.equal(original.emissive.getHex(), 0);
  assert.equal(mesh.castShadow, false);
  assert.ok(
    (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity > 0.4,
  );
  mesh.geometry.dispose();
  mesh.material.dispose();
  original.dispose();
});
