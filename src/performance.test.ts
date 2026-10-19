import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CameraIndex } from "./camera-index";
import { LoadQueue } from "./load-queue";
import { findPath, generateWorld, navigationDistance } from "./simulation";

test("camera broad phase matches exhaustive rays across cells and negative coordinates", () => {
  const geometry = new THREE.BoxGeometry(1, 4, 1);
  const material = new THREE.MeshBasicMaterial();
  const walls = Array.from({ length: 400 }, (_, i) => {
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(((i % 20) - 10) * 4, 1, (Math.floor(i / 20) - 10) * 4);
    return wall;
  });
  const index = new CameraIndex(walls);
  for (let i = 0; i < 80; i++) {
    const a = new THREE.Vector3(
      ((i % 10) - 5) * 7 + 1.4,
      1,
      (Math.floor(i / 10) - 4) * 7 + 1.4,
    );
    const b = a
      .clone()
      .add(new THREE.Vector3(Math.sin(i) * 6, 0, Math.cos(i) * 6));
    const ray = new THREE.Raycaster(
      a,
      b.clone().sub(a).normalize(),
      0,
      a.distanceTo(b),
    );
    const candidates = index.query(a, b);
    assert.ok(candidates.length < walls.length / 5);
    const full = ray.intersectObjects(walls, false)[0];
    const local = ray.intersectObjects(candidates, false)[0];
    assert.equal(local?.object, full?.object);
    assert.equal(local?.distance, full?.distance);
  }
  geometry.dispose();
  material.dispose();
});

test("asset queue bounds concurrency and a failed decode releases its slot", async () => {
  const queue = new LoadQueue(2);
  let active = 0,
    peak = 0;
  const results = await Promise.allSettled(
    Array.from({ length: 12 }, (_, i) =>
      queue.run(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
        if (i === 3) throw new Error("decode failed");
        return i;
      }),
    ),
  );
  assert.equal(peak, 2);
  assert.equal(active, 0);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 11);
  assert.equal(await queue.run(async () => 42), 42);
});

test("navigation cache survives caller mutation and isolates worlds", () => {
  const w = generateWorld(104729),
    a = { x: 0, z: 0 },
    b = { x: 28, z: 0 };
  const original = findPath(w, a, b),
    expected = structuredClone(original);
  original.shift();
  original[0].x = 9999;
  assert.deepEqual(findPath(w, a, b), expected);
  assert.equal(navigationDistance(w, a, b), expected.length * 2);
  const disconnected = { ...w, cells: [{ x: 0, z: 0, kind: "floor" }] };
  assert.equal(navigationDistance(disconnected, a, b), Infinity);
  for (let i = 0; i < 150; i++) findPath(w, a, { x: i * 2, z: 0 });
  assert.deepEqual(findPath(w, a, b), expected);
});
