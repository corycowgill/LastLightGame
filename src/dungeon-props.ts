import { floorAt, roomAt } from "./room-design";
import type { World } from "./simulation";
import { burialRows, cryptStory } from "./crypt-rooms";

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
      const { side, type: story } = cryptStory(world, room);
      const offset = -4.2 + random() * 1.2;
      if (story === 0) {
        // A burial opened from within: remains spill toward a displaced lid.
        add("pro_sarcophagus", side * 5.5, 0, 2.8, 0.8, Math.PI / 2);
        add("dre_small_bone_pile", side * 5.5, 0.65, 2.8, 0.75, Math.PI / 2);
        add("dre_sarcophagus_lid", side * 4.6, 0, 2.1, 0.85, 0.55);
        add(
          "dre_crypt_skull",
          side * 3.7,
          0.02,
          2.3,
          0.95,
          (-side * Math.PI) / 2,
        );
      } else if (story === 1) {
        // An ordered memorial is more unsettling than random debris.
        add("pro_memorial", -side * 5.8, 0, -2.8, 0.85, (-side * Math.PI) / 2);
        for (let i = 0; i < 5; i++)
          add(
            "dre_crypt_skull",
            -side * (4.6 + i * 0.32),
            0.025,
            -2.5,
            0.7 + i * 0.04,
            (-side * Math.PI) / 2,
          );
        add("dre_urn_broken", -side * 6.4, 0, -3.4, 1.05);
      } else {
        // A chained, webbed recess hints at a space deliberately abandoned.
        for (const dz of [-0.45, 0.45])
          add("dre_chain_short", side * 6.3, 2.75, -3.1 + dz, 1.2, Math.PI / 2);
        add("dre_sarcophagus_lid", side * 6.4, 0, -3.1, 0.8, Math.PI / 2);
        add(
          "dec_corner_cobweb",
          side * 6.5,
          3.15,
          -3.2,
          2.3,
          (-side * Math.PI) / 2,
        );
      }
      add("dre_small_bone_pile", side * 6.2, 0, offset, 1.3);
      add("dre_crypt_skull", side * 5.5, 0.02, offset + 0.5, 1);
      if (room.kind === "crypt" || room.kind === "landmark") {
        add("dre_small_bone_pile", -side * 6.6, 0, 4.7, 0.9);
        add("dre_crypt_skull", -side * 6.4, 0.03, 5.2, 0.85);
      }
      add("dre_chain_short", -side * 7.8, 2.3, -3.7, 1, 0.35);
      // Collapsed funerary offerings reach into the lit side aisles, while
      // leaving the crossing and all doorway approaches unobstructed.
      for (const bank of [-1, 1]) {
        const dx = bank * (3.9 + random() * 0.35);
        const dz = bank * (3.8 + random() * 0.5);
        add("pro_memorial", dx + bank * 0.55, 0, dz + 0.7, 0.65, -bank * 0.25);
        add("dre_urn_broken", dx, 0, dz, 0.8);
        add("dre_small_bone_pile", dx + bank * 0.3, 0, dz - 0.65, 0.7);
        add(
          "dre_crypt_skull",
          dx - bank * 0.25,
          0.025,
          dz - 0.25,
          0.85,
          -bank * 0.6,
        );
        add("dre_chain_short", bank * 5.7, 2.7, -bank * 4.8, 0.9, bank * 0.3);
        add(
          "dec_corner_cobweb",
          bank * 5.9,
          3.15,
          -bank * 5.2,
          1.5,
          (bank * Math.PI) / 2,
        );
      }
      if (room.kind === "crypt" || room.kind === "landmark") {
        add("dre_sarcophagus_lid", -side * 4.8, 0, -4.4, 0.8, side * 0.35);
        add("dre_small_bone_pile", -side * 4.2, 0, -4.1, 0.85);
        add("dre_crypt_skull", -side * 3.8, 0.03, -4.3, 0.9, Math.PI);
      }
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
    // Rows of faces occupy multiple real shelves, leaving irregular empty bays.
    for (const shelf of [0, 1, 2]) {
      if ((index + shelf + world.seed) % 4 === 0) continue;
      for (const offset of [-0.45, 0, 0.45])
        result.push({
          id: "dre_crypt_skull",
          x: row.x - side * 0.22,
          y: shelf * 0.96 + 0.2,
          z: row.z + offset,
          scale: 0.65,
          yaw: row.yaw,
        });
    }
  });
  return result
    .filter((p) => floorAt(world, p.x, p.z, 0.2))
    .map((p) => {
      if (p.id === "dec_corner_cobweb") {
        const ceiling = roomAt(world, p.x, p.z)?.ceiling ?? 4;
        p.scale = Math.min(p.scale, (ceiling - 1.9) / 0.6);
        p.y = Math.min(p.y, ceiling - 0.05);
      }
      return p;
    });
}
