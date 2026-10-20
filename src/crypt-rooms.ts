import { floorAt, roomAt } from "./room-design";
import type { World } from "./simulation";

/** Burial furniture is shared by rendering, camera avoidance and AI navigation. */
export function burialRows(world: World) {
  const rows: { x: number; z: number; yaw: number }[] = [];
  for (const room of world.cells) {
    if (
      room.x % 14 ||
      room.z % 14 ||
      room.kind === "corridor" ||
      room.kind === "sanctuary"
    )
      continue;
    const design = roomAt(world, room.x * 2, room.z * 2)?.design;
    if (design === "tunnels") continue;
    const edge =
      design === "burial"
        ? 2.65
        : design === "flooded"
          ? 6.5
          : design === "collapse"
            ? 5.6
            : 7.6;
    for (const side of [-1, 1])
      for (const offset of [-5.6, -2.8, 2.8, 5.6])
        rows.push({
          x: room.x * 2 + side * edge,
          z: room.z * 2 + offset,
          yaw: (-side * Math.PI) / 2,
        });
  }
  return rows.filter((r) => floorAt(world, r.x, r.z, 0.15));
}

export function burialBlocks(world: World) {
  return burialRows(world).map((row) => ({
    x: row.x,
    z: row.z,
    halfX: 0.5,
    halfZ: 1.1,
  }));
}

/** Four roof supports frame each chamber without closing its central cross. */
export function pillarRows(world: World) {
  return world.cells
    .filter((c) => roomAt(world, c.x * 2, c.z * 2)?.design === "ossuary")
    .filter(
      (c) =>
        c.x % 14 === 0 &&
        c.z % 14 === 0 &&
        ["crypt", "archive", "flooded", "landmark", "sanctuary"].includes(
          c.kind,
        ),
    )
    .flatMap((room) =>
      [-1, 1].flatMap((side) =>
        [-1, 1].map((end) => ({
          x: room.x * 2 + side * 4,
          z: room.z * 2 + end * 6,
          yaw: (side * Math.PI) / 2,
        })),
      ),
    )
    .filter((p) => floorAt(world, p.x, p.z, 0.7));
}

export function cryptStory(world: World, room: { x: number; z: number }) {
  return {
    type: Math.abs(world.seed + room.x * 7 + room.z * 13) % 3,
    side: (world.seed ^ (room.x * 13) ^ (room.z * 31)) & 1 ? -1 : 1,
  };
}
