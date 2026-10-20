import type { World } from "./simulation";
export const DESIGNS = [
  "burial",
  "tunnels",
  "ossuary",
  "flooded",
  "collapse",
  "refuge",
] as const;
export type RoomDesign = (typeof DESIGNS)[number];
export const ROOM_DESIGNS: Record<
  RoomDesign,
  { name: string; ceiling: number; story: string }
> = {
  burial: {
    name: "THE NARROW REPOSE",
    ceiling: 3.3,
    story:
      "The burial shelves face inward. Someone moved the dead to watch the passage.",
  },
  tunnels: {
    name: "THE WHISPER PASSAGES",
    ceiling: 2.55,
    story:
      "Chalk prayers end at the low arch. The marks beyond it are scratched into stone.",
  },
  ossuary: {
    name: "THE CHOIR OF BONES",
    ceiling: 5.2,
    story:
      "Every skull faces the empty lectern. No mouth remains, yet the room carries a voice.",
  },
  flooded: {
    name: "THE DROWNED PROCESSION",
    ceiling: 3.8,
    story:
      "The raised stone edges are dry. The water in the centre carries every footstep.",
  },
  collapse: {
    name: "THE BROKEN VIGIL",
    ceiling: 3.6,
    story:
      "Masonry fell across the old procession. The offering was left on the far side.",
  },
  refuge: {
    name: "THE GOLDEN REFUGE",
    ceiling: 3.4,
    story:
      "Soot covers the vault, but the names beside the fire have been freshly carved.",
  },
};
export function roomTile(design: RoomDesign, x: number, z: number) {
  const a = Math.abs(x),
    b = Math.abs(z);
  // Every doorway joins a clear axial route. Side spaces vary independently.
  if (x === 0 || z === 0) return true;
  if (design === "ossuary") return a <= 4 && b <= 4;
  if (design === "refuge") return a <= 2 && b <= 2;
  if (design === "burial") return a <= 1 || (a <= 3 && b >= 2 && b <= 3);
  if (design === "tunnels") return (b === 2 && a <= 2) || (a === 2 && z === 1);
  if (design === "flooded") return a <= 3 && b <= 2;
  return a <= 3 && b <= 3 && !(x === 1 && z > 0) && !(x === -3 && z === -3);
}
const floorCaches = new WeakMap<World, Set<string>>();
export function floorAt(world: World, x: number, z: number, padding = 0) {
  let cells = floorCaches.get(world);
  if (!cells) {
    cells = new Set(world.cells.map((c) => `${c.x},${c.z}`));
    floorCaches.set(world, cells);
  }
  return [
    [-padding, -padding],
    [padding, padding],
    [-padding, padding],
    [padding, -padding],
  ].every(([a, b]) =>
    cells!.has(`${Math.round((x + a) / 2)},${Math.round((z + b) / 2)}`),
  );
}
export function roomAt(world: World, x: number, z: number) {
  return world.layout?.rooms.find(
    (r) => Math.abs(r.x * 2 - x) <= 9 && Math.abs(r.z * 2 - z) <= 9,
  );
}
export function passageDoors(world: World) {
  return (world.layout?.links ?? []).flatMap(([a, b]) =>
    [
      [a, b],
      [b, a],
    ].map(([from, to]) => {
      const room = world.layout!.rooms[from],
        other = world.layout!.rooms[to];
      const dx = Math.sign(other.x - room.x),
        dz = Math.sign(other.z - room.z);
      return {
        x: room.x * 2 + dx * 9,
        z: room.z * 2 + dz * 9,
        yaw: dx ? Math.PI / 2 : 0,
      };
    }),
  );
}
