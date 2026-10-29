import type { Game, Point } from "./simulation";

/** Half the width of a chamber, in metres; chambers sit 28 m apart. */
const ROOM_HALF = 9;
const PITCH = 28;

/** Stable jitter so the sketch does not redraw itself each time it opens. */
function jitter(seed: number, n: number) {
  const h = Math.imul((seed ^ Math.imul(n, 0x9e3779b1)) >>> 0, 0x85ebca6b);
  return (((h ^ (h >>> 13)) >>> 0) % 1000) / 1000 - 0.5;
}

/** A hand-drawn line: a gently bowed stroke instead of a ruler edge. */
function stroke(a: Point, b: Point, seed: number, wobble = 0.9) {
  const mx = (a.x + b.x) / 2 + jitter(seed, 1) * wobble,
    mz = (a.z + b.z) / 2 + jitter(seed, 2) * wobble;
  return `M${a.x.toFixed(1)} ${a.z.toFixed(1)}Q${mx.toFixed(1)} ${mz.toFixed(1)} ${b.x.toFixed(1)} ${b.z.toFixed(1)}`;
}

function chamber(c: Point, seed: number) {
  const corner = (i: number, sx: number, sz: number) => ({
    x: c.x + sx * (ROOM_HALF + jitter(seed, i) * 1.4),
    z: c.z + sz * (ROOM_HALF + jitter(seed, i + 9) * 1.4),
  });
  const p = [
    corner(1, -1, -1),
    corner(2, 1, -1),
    corner(3, 1, 1),
    corner(4, -1, 1),
  ];
  // Charcoal strokes overshoot their corners a little, as if drawn in haste.
  return p
    .map((q, i) => {
      const r = p[(i + 1) % 4],
        dx = (r.x - q.x) * 0.06,
        dz = (r.z - q.z) * 0.06;
      return stroke(
        { x: q.x - dx, z: q.z - dz },
        { x: r.x + dx, z: r.z + dz },
        seed + i,
        1.6,
      );
    })
    .join("");
}

/**
 * The Torchbearer's charcoal sketch of the crypt: only chambers they have
 * entered, unexplored passages as faint stubs, fires, chalk marks, the
 * places relics were lifted and where they stand now.
 */
export function cryptSketch(game: Game) {
  const layout = game.world.layout;
  if (!layout) return "";
  const seed = game.world.seed;
  const centre = (i: number) => ({
    x: layout.rooms[i].x * 2,
    z: layout.rooms[i].z * 2,
  });
  const visited = new Set(
    layout.rooms
      .map((r, i) => (game.visitedRooms.includes(`${r.x},${r.z}`) ? i : -1))
      .filter((i) => i >= 0),
  );
  // The first fire is always known, even before its chamber is counted.
  visited.add(0);
  const known = [...visited].map(centre);
  const xs = known.map((p) => p.x).concat(game.player.x),
    zs = known.map((p) => p.z).concat(game.player.z);
  const pad = ROOM_HALF + 9;
  const minX = Math.min(...xs) - pad,
    minZ = Math.min(...zs) - pad,
    width = Math.max(...xs) - Math.min(...xs) + pad * 2,
    height = Math.max(...zs) - Math.min(...zs) + pad * 2;
  const passages: string[] = [],
    stubs: string[] = [];
  for (const [a, b] of layout.links) {
    if (!visited.has(a) && !visited.has(b)) continue;
    const from = visited.has(a) ? a : b,
      to = from === a ? b : a;
    const p = centre(from),
      q = centre(to);
    const dx = Math.sign(q.x - p.x),
      dz = Math.sign(q.z - p.z);
    const door = { x: p.x + dx * ROOM_HALF, z: p.z + dz * ROOM_HALF };
    if (visited.has(to)) {
      const far = { x: q.x - dx * ROOM_HALF, z: q.z - dz * ROOM_HALF };
      passages.push(stroke(door, far, seed + a * 31 + b, 0.5));
    } else {
      const reach = { x: door.x + dx * 8, z: door.z + dz * 8 };
      stubs.push(stroke(door, reach, seed + a * 31 + b, 0.4));
    }
  }
  const rooms = [...visited]
    .map((i) => chamber(centre(i), seed + i * 101))
    .join("");
  const retrace = [...visited]
    .map((i) => chamber(centre(i), seed + i * 101 + 7))
    .join("");
  const flooded = [...visited]
    .filter((i) => layout.rooms[i].design === "flooded")
    .map((i) => {
      const c = centre(i);
      return [-3, 1, 5]
        .map((dz, k) => `M${c.x - 4 + k} ${c.z + dz}q1.5 -1 3 0t3 0`)
        .join("");
    })
    .join("");
  const fires = [game.start, game.destination]
    .filter((f, i) => i === 0 || roomVisited(f))
    .map(
      (f) =>
        `<circle class="sketch-fire" cx="${f.x.toFixed(1)}" cy="${f.z.toFixed(1)}" r="2.6"/>`,
    )
    .join("");
  function roomVisited(p: Point) {
    return [...visited].some((i) => {
      const c = centre(i);
      return (
        Math.abs(c.x - p.x) <= ROOM_HALF && Math.abs(c.z - p.z) <= ROOM_HALF
      );
    });
  }
  const chalk = game.chalk
    .map(
      (c) =>
        `<path class="sketch-chalk" d="M${(c.x - 1).toFixed(1)} ${(c.z - 1).toFixed(1)}l2 2m0 -2l-2 2"/>`,
    )
    .join("");
  const relics = game.items
    .filter((i) => i.kind === "artifact" && i.taken)
    .map(
      (i) =>
        `<path class="sketch-relic" d="M${i.x.toFixed(1)} ${(i.z - 1.8).toFixed(1)}l1.5 1.8l-1.5 1.8l-1.5 -1.8z"/>`,
    )
    .join("");
  const yaw = game.player.yaw,
    fx = -Math.sin(yaw),
    fz = -Math.cos(yaw);
  const px = game.player.x,
    pz = game.player.z;
  const you = `<path class="sketch-you" d="M${(px + fx * 3).toFixed(1)} ${(pz + fz * 3).toFixed(1)}L${(px - fz * 1.6 - fx).toFixed(1)} ${(pz + fx * 1.6 - fz).toFixed(1)}L${(px + fz * 1.6 - fx).toFixed(1)} ${(pz - fx * 1.6 - fz).toFixed(1)}z"/>`;
  return `<svg class="crypt-sketch" viewBox="${minX.toFixed(1)} ${minZ.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}" role="img" aria-label="Sketch of ${visited.size} explored chambers, ${stubs.length} unexplored passages"><path class="sketch-stub" d="${stubs.join("")}"/><path class="sketch-retrace" d="${retrace}"/><path class="sketch-wall" d="${passages.join("")}${rooms}"/><path class="sketch-water" d="${flooded}"/>${chalk}${relics}${fires}${you}</svg>`;
}

/** Unexplored passages leading from explored chambers. */
export function unexploredPassages(game: Game) {
  const layout = game.world.layout;
  if (!layout) return 0;
  const seen = (i: number) =>
    i === 0 ||
    game.visitedRooms.includes(`${layout.rooms[i].x},${layout.rooms[i].z}`);
  return layout.links.filter(([a, b]) => seen(a) !== seen(b)).length;
}
