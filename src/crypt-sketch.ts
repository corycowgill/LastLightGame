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

/** Sides in drawing order: north, east, south, west. */
const SIDES = [
  { x: 0, z: -1 },
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
];
const DOOR_HALF = 2;
const PASSAGE_HALF = 1.4;

/** A chamber's four walls, broken where a doorway leads out. */
function chamber(c: Point, seed: number, doors: boolean[]) {
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
  const lerp = (a: Point, b: Point, t: number) => ({
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
  });
  // Charcoal strokes overshoot their corners a little, as if drawn in haste.
  return p
    .map((q, i) => {
      const r = p[(i + 1) % 4],
        a = lerp(q, r, -0.06),
        b = lerp(q, r, 1.06);
      if (!doors[i]) return stroke(a, b, seed + i, 1.6);
      const gap = DOOR_HALF / Math.hypot(r.x - q.x, r.z - q.z);
      return (
        stroke(a, lerp(q, r, 0.5 - gap), seed + i, 0.8) +
        stroke(lerp(q, r, 0.5 + gap), b, seed + i + 4, 0.8)
      );
    })
    .join("");
}

/** A passage as two walls running between doorways. */
function passage(a: Point, b: Point, seed: number) {
  const nx = Math.sign(b.z - a.z) * PASSAGE_HALF,
    nz = -Math.sign(b.x - a.x) * PASSAGE_HALF;
  return [1, -1]
    .map((side, k) =>
      stroke(
        { x: a.x + nx * side, z: a.z + nz * side },
        { x: b.x + nx * side, z: b.z + nz * side },
        seed + k * 17,
        0.5,
      ),
    )
    .join("");
}

/** A small charcoal motif naming what kind of chamber this was. */
function motif(design: string, c: Point) {
  const at = (x: number, z: number) =>
    `${(c.x + x).toFixed(1)} ${(c.z + z).toFixed(1)}`;
  switch (design) {
    case "burial":
      // Three tomb slabs along the back wall.
      return [-4.5, -0.5, 3.5].map((x) => `M${at(x, -6)}h2.4v4h-2.4z`).join("");
    case "tunnels":
      return [-3.5, 1.5]
        .map((x) => `M${at(x, 3)}v-2.5a1.6 1.6 0 0 1 3.2 0v2.5`)
        .join("");
    case "ossuary":
      // Crossed bones.
      return `M${at(-3, -3)}L${at(3, 3)}M${at(3, -3)}L${at(-3, 3)}${[
        [-3, -3],
        [3, 3],
        [3, -3],
        [-3, 3],
      ]
        .map(
          ([x, z]) =>
            `M${at(x - 0.7, z)}a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0`,
        )
        .join("")}`;
    case "collapse":
      // A slump of rubble in one corner, hatched.
      return `M${at(2, 7)}l2.5 -4l2 2.5l0.5 1.5M${at(3, 6)}l1.5 -1.5M${at(4.5, 6.5)}l1.2 -1.2M${at(-5, 5)}l0.8 -0.8l0.8 0.8z`;
    default:
      return "";
  }
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
  const pad = ROOM_HALF + 12;
  const minX = Math.min(...xs) - pad,
    minZ = Math.min(...zs) - pad,
    width = Math.max(...xs) - Math.min(...xs) + pad * 2,
    height = Math.max(...zs) - Math.min(...zs) + pad * 2;
  const passages: string[] = [],
    stubs: string[] = [],
    unknowns: string[] = [];
  const doors = new Map<number, boolean[]>();
  const openDoor = (room: number, dx: number, dz: number) => {
    const sides = doors.get(room) ?? [false, false, false, false];
    sides[SIDES.findIndex((d) => d.x === dx && d.z === dz)] = true;
    doors.set(room, sides);
  };
  for (const [a, b] of layout.links) {
    if (!visited.has(a) && !visited.has(b)) continue;
    const from = visited.has(a) ? a : b,
      to = from === a ? b : a;
    const p = centre(from),
      q = centre(to);
    const dx = Math.sign(q.x - p.x),
      dz = Math.sign(q.z - p.z);
    openDoor(from, dx, dz);
    const door = { x: p.x + dx * ROOM_HALF, z: p.z + dz * ROOM_HALF };
    if (visited.has(to)) {
      openDoor(to, -dx, -dz);
      const far = { x: q.x - dx * ROOM_HALF, z: q.z - dz * ROOM_HALF };
      passages.push(passage(door, far, seed + a * 31 + b));
    } else {
      const reach = { x: door.x + dx * 8, z: door.z + dz * 8 };
      stubs.push(passage(door, reach, seed + a * 31 + b));
      unknowns.push(
        `<text class="sketch-unknown" x="${(reach.x + dx * 2.6).toFixed(1)}" y="${(reach.z + dz * 2.6 + 1.4).toFixed(1)}">?</text>`,
      );
    }
  }
  const noDoors = [false, false, false, false];
  const rooms = [...visited]
    .map((i) => chamber(centre(i), seed + i * 101, doors.get(i) ?? noDoors))
    .join("");
  const retrace = [...visited]
    .map((i) => chamber(centre(i), seed + i * 101 + 7, doors.get(i) ?? noDoors))
    .join("");
  const motifs = [...visited]
    .map((i) => motif(layout.rooms[i].design, centre(i)))
    .join("");
  const here = game.currentRoom
    ? `<rect class="sketch-here" x="${(game.currentRoom.x * 2 - ROOM_HALF).toFixed(1)}" y="${(game.currentRoom.z * 2 - ROOM_HALF).toFixed(1)}" width="${ROOM_HALF * 2}" height="${ROOM_HALF * 2}" fill="url(#sketch-glow)"/>`
    : "";
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
  const fell = `<path class="sketch-fell" d="M${(px - 2.2).toFixed(1)} ${(pz - 2.2).toFixed(1)}l4.4 4.4m0 -4.4l-4.4 4.4"/>`;
  const you =
    game.phase === "DEAD"
      ? fell
      : `<path class="sketch-you" d="M${(px + fx * 3).toFixed(1)} ${(pz + fz * 3).toFixed(1)}L${(px - fz * 1.6 - fx).toFixed(1)} ${(pz + fx * 1.6 - fz).toFixed(1)}L${(px + fz * 1.6 - fx).toFixed(1)} ${(pz - fx * 1.6 - fz).toFixed(1)}z"/>`;
  return `<svg class="crypt-sketch" viewBox="${minX.toFixed(1)} ${minZ.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}" role="img" aria-label="Sketch of ${visited.size} explored chambers, ${stubs.length} unexplored passages"><defs><radialGradient id="sketch-glow"><stop offset="0" stop-color="#d45b27" stop-opacity="0.32"/><stop offset="1" stop-color="#d45b27" stop-opacity="0"/></radialGradient></defs>${here}<path class="sketch-stub" d="${stubs.join("")}"/><path class="sketch-retrace" d="${retrace}"/><path class="sketch-wall" d="${passages.join("")}${rooms}"/>${unknowns.join("")}<path class="sketch-motif" d="${motifs}"/><path class="sketch-water" d="${flooded}"/>${chalk}${relics}${fires}${you}</svg>`;
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
