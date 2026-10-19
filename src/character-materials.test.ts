import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { prepareCharacterSurface } from "./character-materials";
test("cloth retains its textures while avoiding metallic glare and self-shadow artifacts", () => {
  const map = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({
    map,
    metalness: 1,
    roughness: 0.1,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
  prepareCharacterSurface(mesh);
  assert.equal(material.map, map);
  assert.equal(material.metalness, 0.04);
  assert.equal(material.roughness, 0.85);
  assert.equal(mesh.receiveShadow, false);
  assert.equal(mesh.castShadow, true);
  mesh.geometry.dispose();
  material.dispose();
  map.dispose();
});
