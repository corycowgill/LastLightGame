import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  EncounterVisuals,
  brandGlow,
  SHORTCUT_GATE_SIZE,
} from "./encounter-visuals";
import type { CatalogAssets } from "./catalog-assets";

test("a ground brand fades before extinction and never flashes brighter as it dies", () => {
  assert.equal(brandGlow(0, 13), 0);
  assert.ok(brandGlow(0.3, 13) < brandGlow(1.2, 13));
  for (let time = 0; time < 10; time += 0.01) {
    assert.ok(brandGlow(8, time) >= 0.84);
    assert.ok(brandGlow(8, time) <= 1.001);
  }
});

test("pooled brands reuse their light, vertices and preloaded GLB across drops", () => {
  let requests = 0;
  const catalog = {
    add(_id: string, parent: THREE.Object3D) {
      requests++;
      const anchor = new THREE.Group();
      parent.add(anchor);
      return anchor;
    },
  } as unknown as CatalogAssets;
  const scene = new THREE.Scene();
  const visuals = new EncounterVisuals(scene, catalog);
  const children = visuals.brand.children.length;
  for (let index = 0; index < 20; index++) {
    visuals.update([{ id: index, x: 2, z: 4, remaining: 8 }], false, index);
    visuals.update([], false, index + 1);
  }
  assert.equal(requests, 1);
  assert.equal(visuals.brand.children.length, children);
  assert.equal(visuals.brand.visible, false);
  const lights = visuals.brand.children.filter(
    (child) => child instanceof THREE.PointLight,
  ) as THREE.PointLight[];
  assert.equal(lights.length, 1);
  assert.equal(lights[0].castShadow, false);
  assert.equal(lights[0].intensity, 0);
  assert.deepEqual(SHORTCUT_GATE_SIZE, { width: 2.1, height: 2.3, depth: 0.8 });
});

test("shortcut visual and landmark camera bounds match their physical footprints", () => {
  const loaded: string[] = [];
  const catalog = {
    add(id: string, parent: THREE.Object3D) {
      loaded.push(id);
      const root = new THREE.Group();
      parent.add(root);
      return root;
    },
    batch(id: string) {
      loaded.push(id);
    },
  } as unknown as CatalogAssets;
  const visuals = new EncounterVisuals(new THREE.Scene(), catalog);
  visuals.initialize(
    {
      gate: {
        x: 12,
        z: 28,
        yaw: Math.PI / 2,
        a: 1,
        b: 2,
        nearRoom: 1,
        farRoom: 2,
      },
      landmarkRoomIndex: 2,
      savedRoomSteps: 4,
    },
    { x: 22, z: 28, yaw: 0 },
  );
  const gateBounds = new THREE.Box3()
    .setFromObject(visuals.gateCollider)
    .getSize(new THREE.Vector3());
  assert.ok(Math.abs(gateBounds.x - 0.8) < 0.00001);
  assert.ok(Math.abs(gateBounds.z - 2.1) < 0.00001);
  assert.deepEqual(
    new THREE.Box3()
      .setFromObject(visuals.landmarkCollider!)
      .getSize(new THREE.Vector3())
      .toArray()
      .map((value) => Math.round(value * 10) / 10),
    [1.2, 1.2, 1.2],
  );
  assert.ok(loaded.includes("lan_fallen_bell"));
  assert.ok(loaded.includes("pro_crypt_door"));
  visuals.update([], false, 0);
  assert.equal(visuals.gate.visible, true);
  visuals.update([], true, 1);
  assert.equal(visuals.gate.visible, false);
});
