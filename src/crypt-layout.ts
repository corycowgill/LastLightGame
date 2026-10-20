import { roomAt, passageDoors } from "./room-design";
import type { World } from "./simulation";
import { burialBlocks, pillarRows } from "./crypt-rooms";
import { dungeonDressing } from "./dungeon-props";
import { roomProps, type RoomProp } from "./room-props";
import { propBounds } from "./prop-bounds";
export {
  burialRows,
  burialBlocks,
  pillarRows,
  cryptStory,
} from "./crypt-rooms";

export type SolidBlock = {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  yaw: number;
  bottom: number;
  height: number;
  id: string;
};
const cache = new WeakMap<World, SolidBlock[]>();
const buckets = new WeakMap<World, Map<string, SolidBlock[]>>();
function box(
  p: RoomProp,
  hx: number,
  hz: number,
  cx = 0,
  cz = 0,
  bottom = 0,
  height = 3,
): SolidBlock {
  const c = Math.cos(p.yaw),
    s = Math.sin(p.yaw);
  return {
    x: p.x + (c * cx + s * cz) * p.scale,
    z: p.z + (-s * cx + c * cz) * p.scale,
    halfX: hx * p.scale,
    halfZ: hz * p.scale,
    yaw: p.yaw,
    bottom: p.y + bottom * p.scale,
    height: height * p.scale,
    id: p.id,
  };
}
function solidProp(p: RoomProp): SolidBlock[] {
  const b = propBounds[p.id];
  if (!b || (b.max[1] - b.min[1]) * p.scale < 0.4) return [];
  const hx = (b.max[0] - b.min[0]) / 2,
    hz = (b.max[2] - b.min[2]) / 2;
  const cx = (b.min[0] + b.max[0]) / 2,
    cz = (b.min[2] + b.max[2]) / 2;
  const height = b.max[1] - b.min[1];
  if (p.id === "lan_sanctuary_arch_hero") {
    const post = hx * 0.22;
    return [-1, 1]
      .map((side) =>
        box(p, post, hz, cx + side * (hx - post), cz, b.min[1], height),
      )
      .concat(box(p, hx, hz, cx, cz, b.min[1] + height * 0.78, height * 0.22));
  }
  return [box(p, hx, hz, cx, cz, b.min[1], height)];
}
/** Exact shared solids, independent of asynchronous graphics loading. */
export function environmentBlocks(world: World): SolidBlock[] {
  const existing = cache.get(world);
  if (existing) return existing;
  const result: SolidBlock[] = burialBlocks(world).map((b) => ({
    ...b,
    yaw: 0,
    bottom: 0,
    height: 2.85,
    id: "burial_shelf",
  }));
  for (const p of pillarRows(world))
    result.push({
      ...p,
      halfX: 0.6,
      halfZ: 0.6,
      bottom: 0,
      height: 3.85,
      id: "interior_pillar",
    });
  for (const room of world.cells.filter(
    (c) =>
      c.x % 14 === 0 &&
      c.z % 14 === 0 &&
      ["crypt", "archive", "flooded", "landmark", "sanctuary"].includes(c.kind),
  )) {
    const x = room.x * 2,
      z = room.z * 2;
    for (const prop of roomProps(x, z, room.kind, world))
      result.push(...solidProp(prop));
    for (const side of roomAt(world, x, z)?.design === "ossuary"
      ? [-1, 1]
      : []) {
      const p = {
        id: "passage_arch",
        x,
        y: 0,
        z: z + side * 7.7,
        scale: 1,
        yaw: 0,
      };
      for (const sx of [-1, 1])
        result.push(box(p, 0.4, 0.275, sx * 2.2, 0, 0, 3.1));
      result.push(box(p, 2.6, 0.275, 0, 0, 3.1, 1));
    }
  }
  for (const door of passageDoors(world)) {
    const p = { ...door, id: "passage_arch", y: 0, scale: 1 };
    for (const side of [-1, 1])
      result.push(box(p, 0.17, 0.2, side * 1.02, 0, 0, 2.55));
    result.push(box(p, 1.2, 0.2, 0, 0, 2.12, 0.43));
  }
  for (const p of dungeonDressing(world)) result.push(...solidProp(p));
  cache.set(world, result);
  return result;
}
/** Four-metre spatial hash keeps exact footprint checks local and cheap. */
function collisionBuckets(world: World) {
  let index = buckets.get(world);
  if (!index) {
    index = new Map();
    for (const b of environmentBlocks(world)) {
      if (b.bottom >= 1.8) continue;
      const c = Math.abs(Math.cos(b.yaw)),
        s = Math.abs(Math.sin(b.yaw));
      const hx = c * b.halfX + s * b.halfZ + 0.5,
        hz = s * b.halfX + c * b.halfZ + 0.5;
      for (
        let ix = Math.floor((b.x - hx) / 4);
        ix <= Math.floor((b.x + hx) / 4);
        ix++
      )
        for (
          let iz = Math.floor((b.z - hz) / 4);
          iz <= Math.floor((b.z + hz) / 4);
          iz++
        ) {
          const k = `${ix},${iz}`,
            list = index.get(k) ?? [];
          list.push(b);
          index.set(k, list);
        }
    }
    buckets.set(world, index);
  }
  return index;
}
export function blockedByProp(world: World, x: number, z: number, padding = 0) {
  return (
    collisionBuckets(world).get(`${Math.floor(x / 4)},${Math.floor(z / 4)}`) ??
    []
  ).some((b) => {
    const dx = x - b.x,
      dz = z - b.z,
      c = Math.cos(b.yaw),
      s = Math.sin(b.yaw);
    return (
      Math.abs(c * dx - s * dz) < b.halfX + padding &&
      Math.abs(s * dx + c * dz) < b.halfZ + padding
    );
  });
}

/** Exact slab test for a short navigation edge, including actor clearance. */
export function propSegmentClear(
  world: World,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  padding = 0.45,
) {
  const index = collisionBuckets(world);
  const ka = `${Math.floor(ax / 4)},${Math.floor(az / 4)}`,
    kb = `${Math.floor(bx / 4)},${Math.floor(bz / 4)}`;
  for (const k of ka === kb ? [ka] : [ka, kb])
    for (const b of index.get(k) ?? []) {
      const c = Math.cos(b.yaw),
        s = Math.sin(b.yaw),
        dx = ax - b.x,
        dz = az - b.z;
      const origins = [c * dx - s * dz, s * dx + c * dz];
      const dirs = [
        c * (bx - ax) - s * (bz - az),
        s * (bx - ax) + c * (bz - az),
      ];
      const halves = [b.halfX + padding, b.halfZ + padding];
      let enter = 0,
        exit = 1;
      for (let axis = 0; axis < 2; axis++) {
        const o = origins[axis],
          d = dirs[axis],
          h = halves[axis];
        if (Math.abs(d) < 1e-9) {
          if (Math.abs(o) >= h) {
            enter = 2;
            break;
          }
        } else {
          const a = (-h - o) / d,
            e = (h - o) / d;
          enter = Math.max(enter, Math.min(a, e));
          exit = Math.min(exit, Math.max(a, e));
        }
      }
      if (enter < exit) return false;
    }
  return true;
}
