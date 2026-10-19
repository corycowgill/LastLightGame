import type { Point, World } from "./simulation";
export type Room = Point & { kind: string; depth: number; reward: boolean };
export type Layout = {
  rooms: Room[];
  links: [number, number][];
  theme: string;
};
const key = (p: Point) => `${p.x},${p.z}`;

/** Bounded grid graph: no overlapping rooms or crossing corridors. */
export function buildLabyrinth(seed: number): World {
  let s = (seed ^ 0x9e3779b9) >>> 0;
  const rand = () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const count = 12 + Math.floor(rand() * 7);
  const themeIndex = Math.floor(rand() * 3);
  const themes = ["THE BONE WARRENS", "THE DROWNED TOMBS", "THE ASHEN ARCHIVE"];
  const tiles: Point[] = [
    { x: 0, z: 0 },
    { x: 1, z: 0 },
  ];
  const links: [number, number][] = [[0, 1]];
  const occupied = new Set(tiles.map(key));
  const dirs = [
    { x: 1, z: 0 },
    { x: 0, z: 1 },
    { x: -1, z: 0 },
    { x: 0, z: -1 },
  ];
  while (tiles.length < count) {
    const frontier: { p: Point; parent: number }[] = [];
    for (let i = 1; i < tiles.length; i++)
      for (const d of dirs) {
        const p = { x: tiles[i].x + d.x, z: tiles[i].z + d.z };
        if (
          occupied.has(key(p)) ||
          Math.abs(p.x) > 5 ||
          Math.abs(p.z) > 4 ||
          Math.abs(p.x) + Math.abs(p.z) <= 1
        )
          continue;
        frontier.push({ p, parent: i });
      }
    // Different themes bias toward longer procession paths or compact warrens.
    const candidates =
      themeIndex === 2 && rand() < 0.65
        ? frontier.filter((f) => f.parent >= tiles.length - 3)
        : frontier;
    const options = candidates.length ? candidates : frontier;
    const chosen = options[Math.floor(rand() * options.length)];
    links.push([chosen.parent, tiles.length]);
    tiles.push(chosen.p);
    occupied.add(key(chosen.p));
  }
  const linked = (a: number, b: number) =>
    links.some((e) => e.includes(a) && e.includes(b));
  let loops = 0;
  for (let a = 1; a < count; a++)
    for (let b = a + 1; b < count; b++) {
      if (
        Math.abs(tiles[a].x - tiles[b].x) +
          Math.abs(tiles[a].z - tiles[b].z) ===
          1 &&
        !linked(a, b) &&
        (loops === 0 || rand() < 0.35)
      ) {
        links.push([a, b]);
        loops++;
      }
    }
  const distances = Array(count).fill(Infinity);
  distances[0] = 0;
  const queue = [0];
  for (const a of queue)
    for (const [u, v] of links) {
      const b = u === a ? v : v === a ? u : -1;
      if (b >= 0 && distances[b] === Infinity) {
        distances[b] = distances[a] + 1;
        queue.push(b);
      }
    }
  const exit = distances.indexOf(Math.max(...distances));
  const degree = (i: number) => links.filter((e) => e.includes(i)).length;
  const kinds =
    themeIndex === 0
      ? ["crypt", "crypt", "landmark", "archive", "flooded"]
      : themeIndex === 1
        ? ["flooded", "flooded", "crypt", "landmark", "archive"]
        : ["archive", "archive", "crypt", "landmark", "flooded"];
  const rooms: Room[] = tiles.map((p, i) => ({
    x: p.x * 14,
    z: p.z * 14,
    kind:
      i === 0 || i === exit
        ? "sanctuary"
        : kinds[Math.floor(rand() * kinds.length)],
    depth: distances[i] / distances[exit],
    reward: i !== 0 && i !== exit && degree(i) === 1,
  }));
  // Include each supported chamber type while preserving the themed weighting.
  ["crypt", "archive", "flooded", "landmark"].forEach((kind, i) => {
    const room = rooms.filter((_, j) => j !== 0 && j !== exit)[i];
    room.kind = kind;
  });
  const cells = new Map<string, Point & { kind: string }>();
  const add = (x: number, z: number, kind: string) =>
    cells.set(`${x},${z}`, { x, z, kind });
  for (const r of rooms)
    for (let x = -4; x <= 4; x++)
      for (let z = -4; z <= 4; z++) add(r.x + x, r.z + z, r.kind);
  for (const [a, b] of links) {
    const u = rooms[a],
      v = rooms[b],
      dx = Math.sign(v.x - u.x),
      dz = Math.sign(v.z - u.z);
    for (let n = 0; n <= 14; n++)
      for (let side = -1; side <= 1; side++) {
        const x = u.x + dx * n + dz * side,
          z = u.z + dz * n + dx * side;
        if (!cells.has(`${x},${z}`)) add(x, z, "corridor");
      }
  }
  return {
    seed,
    cells: [...cells.values()],
    start: { x: 0, z: 0 },
    exit: { x: rooms[exit].x, z: rooms[exit].z },
    layout: { rooms, links, theme: themes[themeIndex] },
  };
}
