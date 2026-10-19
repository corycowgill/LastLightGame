import type { World } from "./simulation";
import * as THREE from "three";
import type { CatalogAssets } from "./catalog-assets";
import { burialRows } from "./crypt-rooms";
import { dungeonDressing } from "./dungeon-props";
export { dungeonDressing } from "./dungeon-props";
export type { Dressing } from "./dungeon-props";

/** Every dressing object is a catalog GLB reconstructed from reference art. */
export function dressDungeon(
  scene: THREE.Scene,
  catalog: CatalogAssets,
  world: World,
) {
  const groups = new Map<string, THREE.Matrix4[]>();
  for (const detail of dungeonDressing(world)) {
    const pose = new THREE.Object3D();
    pose.position.set(detail.x, detail.y, detail.z);
    pose.rotation.y = detail.yaw;
    pose.scale.setScalar(detail.scale);
    pose.updateMatrix();
    const list = groups.get(detail.id) ?? [];
    list.push(pose.matrix.clone());
    groups.set(detail.id, list);
  }
  for (const [id, placements] of groups) catalog.scatter(id, scene, placements);
  const matrices = burialRows(world).flatMap((row) =>
    [0, 1, 2].map((tier) =>
      new THREE.Matrix4()
        .makeTranslation(row.x, tier * 0.96, row.z)
        .multiply(new THREE.Matrix4().makeRotationY(row.yaw)),
    ),
  );
  catalog.batch(
    "arc_wall_niche_2m",
    scene,
    matrices,
    [2.2, 0.9, 0.85],
    () => {},
  );
}
