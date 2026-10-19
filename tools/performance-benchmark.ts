import * as THREE from "three";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await mkdir(new URL("../.asset-tools/", import.meta.url), { recursive: true });
const baseline = execFileSync("git", ["show", "343d75a:src/simulation.ts"], {
  cwd: root,
  encoding: "utf8",
}).replace('"./crypt-layout"', '"../src/crypt-layout"');
await writeFile(
  new URL("../.asset-tools/baseline-simulation.ts", import.meta.url),
  baseline,
);
const { findPath: oldPath } =
  await import("../.asset-tools/baseline-simulation.ts");
import { generateWorld, navigationDistance } from "../src/simulation";
import { CameraIndex } from "../src/camera-index";
const world = generateWorld(104729),
  a = { x: 28, z: 0 },
  b = { x: 34, z: 0 };
oldPath(world, a, b);
navigationDistance(world, a, b);
function bench(fn: () => unknown, n = 3000) {
  const start = performance.now();
  for (let i = 0; i < n; i++) fn();
  return +(performance.now() - start).toFixed(2);
}
const geometry = new THREE.BoxGeometry(1, 4, 1),
  material = new THREE.MeshBasicMaterial();
const walls = Array.from({ length: 2000 }, (_, i) => {
  const m = new THREE.Mesh(geometry, material);
  m.position.set((i % 50) * 4, 1, Math.floor(i / 50) * 4);
  m.updateMatrixWorld();
  return m;
});
const index = new CameraIndex(walls),
  from = new THREE.Vector3(30, 1, 30),
  to = new THREE.Vector3(35, 1, 35);
const ray = new THREE.Raycaster(
  from,
  to.clone().sub(from).normalize(),
  0,
  from.distanceTo(to),
);
console.log(
  JSON.stringify(
    {
      iterations: 3000,
      pathSearchBeforeMs: bench(() => oldPath(world, a, b)),
      cachedHearingAfterMs: bench(() => navigationDistance(world, a, b)),
      cameraBeforeMs: bench(() => ray.intersectObjects(walls, false)),
      cameraAfterMs: bench(() =>
        ray.intersectObjects(index.query(from, to), false),
      ),
      totalColliders: walls.length,
      nearbyColliders: index.query(from, to).length,
    },
    null,
    2,
  ),
);
geometry.dispose();
material.dispose();
