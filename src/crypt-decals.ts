import { floorAt } from "./room-design";
import * as THREE from "three";
import type { World } from "./simulation";

export function addCryptDecals(scene: THREE.Scene, world: World) {
  const meshes: THREE.InstancedMesh[] = [];
  const maps: THREE.Texture[] = [];
  const atlas = new THREE.TextureLoader().load(
    "/textures/crypt-decals.png",
    (texture) => {
      if (scene.userData.disposed) {
        texture.dispose();
        return;
      }
      maps.forEach((map) => {
        map.image = texture.image;
        map.needsUpdate = true;
      });
      meshes.forEach((mesh) => {
        mesh.visible = true;
      });
    },
  );
  atlas.colorSpace = THREE.SRGBColorSpace;
  const groups: THREE.Matrix4[][] = [[], [], [], []];
  const put = (
    tile: number,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    yaw: number,
    floor = false,
  ) => {
    if (!floorAt(world, x, z, floor ? Math.min(width, height) * 0.2 : 0))
      return;
    const pose = new THREE.Object3D();
    pose.position.set(x, y, z);
    pose.rotation.set(
      floor ? -Math.PI / 2 : 0,
      floor ? 0 : yaw,
      floor ? yaw : 0,
    );
    pose.scale.set(width, height, 1);
    pose.updateMatrix();
    groups[tile].push(pose.matrix.clone());
  };
  for (const room of world.cells.filter(
    (c) => c.x % 14 === 0 && c.z % 14 === 0 && c.kind !== "corridor",
  )) {
    const x = room.x * 2,
      z = room.z * 2;
    for (const side of [-1, 1]) {
      put(
        1,
        x + side * 4.7,
        2.5,
        z + side * 8.78,
        2,
        2.8,
        side === 1 ? Math.PI : 0,
      );
      put(0, x + side * 8.78, 2.9, z - 4.5, 1.6, 1.7, (-side * Math.PI) / 2);
      put(3, x + side * 5.7, 0.005, z - 4.3, 3.1, 2.4, side * 0.8, true);
      if (room.kind !== "sanctuary") {
        // Damp runs behind the loculi and broad scuffs toward opened graves.
        put(1, x + side * 8.77, 1.9, z + 3.1, 3.3, 3.6, (-side * Math.PI) / 2);
        put(0, x + side * 8.76, 1.1, z - 2.8, 2.2, 1.8, (-side * Math.PI) / 2);
        put(3, x + side * 4.9, 0.011, z + 2.8, 1.2, 3.3, side * 0.6, true);
        // Damp burial stains and grit anchor the nearer offerings to the floor.
        put(
          3,
          x + side * 4.15,
          0.009,
          z + side * 4.1,
          3.2,
          2.6,
          side * 0.4,
          true,
        );
        put(2, x + side * 4.8, 0.01, z - 4.6, 1.6, 2.4, side * 0.6, true);
        put(2, x + side * 3.5, 0.006, z + 4.3, 2.6, 2.2, side * 1.7, true);
        put(3, x + side * 6.3, 0.007, z + 5.8, 2.4, 2.3, side, true);
      }
    }
  }
  const occupied = new Set(world.cells.map((c) => `${c.x},${c.z}`));
  for (const cell of world.cells) {
    if (Math.abs(cell.x * 13 + cell.z * 7 + world.seed) % 5 !== 0) continue;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (occupied.has(`${cell.x + dx},${cell.z + dz}`)) continue;
      put(
        1,
        cell.x * 2 + dx * 0.97,
        1.15,
        cell.z * 2 + dz * 0.97,
        1.65,
        2.05,
        dx ? (-dx * Math.PI) / 2 : dz > 0 ? Math.PI : 0,
      );
    }
  }
  // Track-like wear ties rooms together without supplying a navigation arrow.
  for (const cell of world.cells) {
    if (cell.kind !== "corridor" || (cell.x * 13 + cell.z * 7) % 5 !== 0)
      continue;
    put(
      3,
      cell.x * 2,
      0.006,
      cell.z * 2,
      1.8,
      2.2,
      (cell.x + cell.z) * 0.7,
      true,
    );
  }
  const geometry = new THREE.PlaneGeometry(1, 1);
  groups.forEach((placements, tile) => {
    const map = tile === 0 ? atlas : atlas.clone();
    maps.push(map);
    map.repeat.set(0.5, 0.5);
    map.offset.set((tile % 2) * 0.5, tile < 2 ? 0.5 : 0);
    const material = new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      opacity: tile === 1 ? 0.55 : 0.65,
      depthWrite: false,
      alphaTest: 0.025,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    // Regional batches cull distant decals and share one generated atlas.
    const regions = new Map<string, THREE.Matrix4[]>();
    for (const matrix of placements) {
      const key = `${Math.floor(matrix.elements[12] / 28)},${Math.floor(matrix.elements[14] / 28)}`;
      const list = regions.get(key) ?? [];
      list.push(matrix);
      regions.set(key, list);
    }
    for (const list of regions.values()) {
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      list.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.name = "generated_crypt_decal_" + tile;
      mesh.visible = false;
      meshes.push(mesh);
      mesh.renderOrder = 1;
      mesh.computeBoundingSphere();
      scene.add(mesh);
    }
  });
}
