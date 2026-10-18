import type { World } from "./simulation";
import * as THREE from "three";
import type { CatalogAssets } from "./catalog-assets";
import { burialRows } from "./crypt-layout";

export type Dressing = {
  id: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  yaw: number;
};

/** Seeded environmental stories, outside the three-metre central walking lanes. */
export function dungeonDressing(world: World): Dressing[] {
  let state = (world.seed ^ 0x51ab739) >>> 0;
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const result: Dressing[] = [];
  for (const room of world.cells.filter(
    (c) => c.x % 14 === 0 && c.z % 14 === 0 && c.kind !== "corridor",
  )) {
    const x = room.x * 2,
      z = room.z * 2;
    const add = (
      id: string,
      dx: number,
      dy: number,
      dz: number,
      scale = 1,
      yaw = random() * Math.PI * 2,
    ) => result.push({ id, x: x + dx, y: dy, z: z + dz, scale, yaw });
    // Keep the sanctuary free of human remains around the safe flame.
    if (room.kind !== "sanctuary") {
      const side = random() < 0.5 ? -1 : 1;
      const offset = -4.2 + random() * 1.2;
      add("dre_small_bone_pile", side * 6.2, 0, offset, 1.3);
      add("dre_crypt_skull", side * 5.5, 0.02, offset + 0.5, 1);
      if (room.kind === "crypt" || room.kind === "landmark") {
        add("dre_small_bone_pile", -side * 6.6, 0, 4.7, 0.9);
        add("dre_crypt_skull", -side * 6.4, 0.03, 5.2, 0.85);
      }
      add("dre_chain_short", -side * 7.8, 2.3, -3.7, 1, 0.35);
      // Funerary clusters form recognisable corners rather than uniform scatter.
      for (const corner of [-1, 1]) {
        add("dre_urn_broken", corner * 5.4, 0, 5.1, 1);
        add("dre_urn_broken", corner * 5.9, 0, 5.5, 0.65);
        add(
          "dre_sarcophagus_lid",
          corner * 5.5,
          0,
          -5.8,
          1,
          Math.PI / 2 + corner * 0.16,
        );
        add("pro_rubble", corner * 6.1, 0, -6.3, 0.7);
        for (let i = 0; i < 3; i++) {
          add(
            "dre_crypt_skull",
            corner * (6.8 - i * 0.28),
            i * 0.04,
            6.2 + random() * 0.35,
            0.8 + random() * 0.25,
          );
        }
      }
      add(
        "dec_corner_cobweb",
        side * 8.6,
        2.9,
        offset - 0.4,
        2.0,
        (-side * Math.PI) / 2,
      );
    }
    // Torn webs accumulate above side recesses, never across camera-height passages.
    add("dec_corner_cobweb", -7.8, 2.75, -6.5, 1.4, Math.PI / 2);
    if (room.kind !== "sanctuary")
      add("dec_corner_cobweb", 6.2, 2.7, 8.5, 1.8, Math.PI);
  }
  burialRows(world).forEach((row, index) => {
    const side = Math.sign(row.x - Math.round(row.x / 28) * 28);
    const tier = index % 3;
    // Occupied and empty recesses alternate; remains rest on the actual stone shelf.
    if (index % 2 === 0)
      result.push({
        id: "dre_small_bone_pile",
        x: row.x - side * 0.12,
        y: tier * 0.96 + 0.2,
        z: row.z - 0.15,
        scale: 0.8,
        yaw: 0,
      });
    result.push({
      id: "dre_crypt_skull",
      x: row.x - side * 0.15,
      y: tier * 0.96 + 0.2,
      z: row.z + 0.58,
      scale: 0.8,
      yaw: row.yaw,
    });
  });
  return result;
}
/** Every dressing object is a catalog GLB reconstructed from reference art. */
export function dressDungeon(
  scene: THREE.Scene,
  catalog: CatalogAssets,
  world: World,
) {
  for (const detail of dungeonDressing(world)) {
    const anchor = catalog.add(
      detail.id,
      scene,
      detail.x,
      detail.y,
      detail.z,
      detail.scale,
      detail.yaw,
      () => {
        anchor.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(anchor);
        if (detail.id === "dre_small_bone_pile")
          anchor.position.y += detail.y - bounds.min.y;
        if (detail.id === "dec_corner_cobweb") {
          // Catalog pivot is at its base; placements specify the web's vertical centre.
          anchor.position.y -= bounds.getSize(new THREE.Vector3()).y / 2;
        }
      },
    );
    if (detail.id === "dre_small_bone_pile") anchor.rotation.x = -Math.PI / 2;
  }
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
