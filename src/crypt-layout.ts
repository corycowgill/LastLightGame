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
    for (const side of [-1, 1])
      for (const offset of [-5.6, -2.8, 2.8, 5.6])
        rows.push({
          x: room.x * 2 + side * 7.6,
          z: room.z * 2 + offset,
          yaw: (-side * Math.PI) / 2,
        });
  }
  return rows;
}

export function burialBlocks(world: World) {
  return burialRows(world).map((row) => ({
    x: row.x,
    z: row.z,
    halfX: 0.5,
    halfZ: 1.1,
  }));
}
