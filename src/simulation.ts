import {
  planExpeditionEncounter,
  type ExpeditionEncounterPlan,
} from "./expedition-encounter";
import {
  BRAND_CONFIG,
  tryDropBrand,
  stepBrands,
  brandRepels,
  type Brand,
} from "./brands";
import { floorAt } from "./room-design";
import { relicIdentity } from "./relics";
import { ROOM_DESIGNS, roomAt } from "./room-design";
import { buildLabyrinth, type Layout } from "./worldgen";
import { blockedByProp, propSegmentClear } from "./crypt-layout";
export type Hunter = {
  x: number;
  z: number;
  state: string;
  yaw?: number;
  readiness?: number;
  temporaryRetreat?: boolean;
};
export type Point = { x: number; z: number };
export type World = {
  cells: (Point & { kind: string; ceiling?: number; surface?: string })[];
  start: Point;
  exit: Point;
  seed: number;
  layout?: Layout;
  shortcutGate?: Point & { yaw: number; open: boolean };
  landmarkDecoration?: Point & { yaw: number };
};
export type Input = {
  forward: number;
  strafe: number;
  sprint: boolean;
  crouch: boolean;
  yaw: number;
};
export const CONFIG = {
  walk: 3.2,
  sprint: 5.5,
  crouch: 1.5,
  hunterSearch: 2.2,
  reinforcementWarning: 12,
  reinforcementArrival: 22,
  reinforcementRetry: 3,
  hunterChase: 4.5,
  sight: 12,
  memory: 12,
  grace: 8,
  relight: 2,
  fuel: 720,
  burnMultiplier: 6,
  flameRates: [0.55, 1, 3.5],
  fuelPickup: 180,
  matchFuel: 120,
  lightRepel: [2.8, 6, 11],
  fireRepel: 8,
  hunterFlee: 5.8,
  retreatDuration: 2.8,
  burstCost: 90,
  burstCooldown: 18,
  staminaRecoveryDelay: 0.65,
  staminaRecovery: 0.2,
  sprintDrain: 0.13,
  relightMovement: 0.35,
  crouchSight: 0.55,
};
export const UPGRADES = {
  compass: {
    name: "Sanctuary Compass",
    description: "A bearing toward the distant golden fire",
    cap: 1,
    cost: 3,
  },
  wick: {
    name: "Efficient Wick",
    description: "8% less fuel per rank",
    cap: 3,
    cost: 2,
  },
  boots: {
    name: "Soft Boots",
    description: "12% quieter footsteps per rank",
    cap: 3,
    cost: 2,
  },
  spark: {
    name: "Quick Spark",
    description: "0.25s faster relighting per rank",
    cap: 3,
    cost: 2,
  },
} as const;
export type Upgrade = keyof typeof UPGRADES;
const key = (x: number, z: number) => `${x},${z}`;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const grids = new WeakMap<World, Set<string>>();
const floors = new WeakMap<World, Set<string>>();
function floorGrid(w: World) {
  let floor = floors.get(w);
  if (!floor) {
    floor = new Set(w.cells.map((c) => key(c.x, c.z)));
    floors.set(w, floor);
  }
  return floor;
}
function grid(w: World) {
  let s = grids.get(w);
  if (!s) {
    s = new Set(
      w.cells
        .filter(
          (c) =>
            !blockedByProp(w, c.x * 2, c.z * 2, 0.45) &&
            !dynamicObstacle(w, c.x * 2, c.z * 2, 0.35),
        )
        .map((c) => key(c.x, c.z)),
    );
    grids.set(w, s);
  }
  return s;
}
export function generateWorld(seed = 1): World {
  return buildLabyrinth(seed);
}
export function dynamicObstacle(w: World, x: number, z: number, padding = 0) {
  const gate = w.shortcutGate;
  if (gate && !gate.open) {
    const dx = x - gate.x,
      dz = z - gate.z,
      c = Math.cos(gate.yaw),
      t = Math.sin(gate.yaw);
    if (
      Math.abs(c * dx - t * dz) < 1.05 + padding &&
      Math.abs(t * dx + c * dz) < 0.4 + padding
    )
      return true;
  }
  const bell = w.landmarkDecoration;
  return (
    !!bell &&
    Math.abs(x - bell.x) < 0.6 + padding &&
    Math.abs(z - bell.z) < 0.6 + padding
  );
}
export function invalidateNavigation(w: World) {
  grids.delete(w);
  pathCaches.delete(w);
  edgeCaches.delete(w);
}
export function walkable(w: World, x: number, z: number) {
  return (
    floorGrid(w).has(key(Math.round(x / 2), Math.round(z / 2))) &&
    !blockedByProp(w, x, z) &&
    !dynamicObstacle(w, x, z)
  );
}
const edgeCaches = new WeakMap<World, Map<string, boolean>>();
function clearEdge(w: World, a: Point, b: Point) {
  let cache = edgeCaches.get(w);
  if (!cache) {
    cache = new Map();
    edgeCaches.set(w, cache);
  }
  const first = key(a.x, a.z),
    second = key(b.x, b.z);
  const id = first < second ? `${first}:${second}` : `${second}:${first}`;
  const saved = cache.get(id);
  if (saved !== undefined) return saved;
  const clear = propSegmentClear(w, a.x * 2, a.z * 2, b.x * 2, b.z * 2);
  cache.set(id, clear);
  return clear;
}
export function lineOfSight(w: World, a: Point, b: Point) {
  const n = Math.max(1, Math.ceil(dist(a, b) * 5));
  for (let i = 0; i <= n; i++)
    if (!walkable(w, a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n))
      return false;
  return true;
}
const pathCaches = new WeakMap<World, Map<string, Point[]>>();
function cachedPath(w: World, a: Point, b: Point): Point[] {
  let cache = pathCaches.get(w);
  if (!cache) {
    cache = new Map();
    pathCaches.set(w, cache);
  }
  const id = `${Math.round(a.x / 2)},${Math.round(a.z / 2)}:${Math.round(b.x / 2)},${Math.round(b.z / 2)}`;
  let path = cache.get(id);
  if (!path) {
    path = solvePath(w, a, b);
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    cache.set(id, path);
  }
  return path;
}
export function findPath(w: World, a: Point, b: Point): Point[] {
  // Consumers shorten their routes; never expose the cached mutable array.
  return cachedPath(w, a, b).map((p) => ({ ...p }));
}
export function navigationDistance(w: World, a: Point, b: Point) {
  const path = cachedPath(w, a, b);
  return path.length ? path.length * 2 : Infinity;
}
function solvePath(w: World, a: Point, b: Point): Point[] {
  const sx = Math.round(a.x / 2),
    sz = Math.round(a.z / 2),
    end = key(Math.round(b.x / 2), Math.round(b.z / 2)),
    allowed = grid(w),
    q = [{ x: sx, z: sz }],
    prev = new Map<string, string | null>([[key(sx, sz), null]]);
  if (!allowed.has(key(sx, sz)) || !allowed.has(end)) return [];
  for (let i = 0; i < q.length; i++) {
    const p = q[i],
      k = key(p.x, p.z);
    if (k === end) {
      const out: Point[] = [];
      let at: string | null = k;
      while (at) {
        const [x, z] = at.split(",").map(Number);
        out.push({ x: x * 2, z: z * 2 });
        at = prev.get(at) ?? null;
      }
      return out.reverse();
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: p.x + dx, z: p.z + dz },
        nk = key(n.x, n.z);
      if (allowed.has(nk) && !prev.has(nk) && clearEdge(w, p, n)) {
        prev.set(nk, k);
        q.push(n);
      }
    }
  }
  return [];
}
export class Game {
  world: World;
  player = { x: 0, z: 0, yaw: 0, stamina: 1, crouched: false };
  cameraYaw = 0;
  fuel = 720;
  maxFuel = 720;
  mode = 1;
  phase = "EXPLORING";
  hunter: Hunter = {
    x: 0,
    z: 0,
    state: "DORMANT",
  };
  additionalHunters: Hunter[] = [];
  hunterWarning = "";
  encounter?: ExpeditionEncounterPlan;
  encounterRelicId?: number;
  brands: Brand[] = [];
  brandCooldown = 0;
  private nextBrandId = 1;
  get shortcutOpen() {
    return this.world.shortcutGate?.open ?? false;
  }
  get landmarkDecoration() {
    return this.world.landmarkDecoration;
  }
  get brandReady() {
    return (
      ((this.phase === "EXPLORING" && this.fuel >= BRAND_CONFIG.fuelCost + 6) ||
        (["HUNT_GRACE", "HUNT_ACTIVE"].includes(this.phase) &&
          this.matches > 0)) &&
      this.brandCooldown <= 0 &&
      !this.brands.length
    );
  }
  private huntElapsed = 0;
  private reinforcementAttempt = CONFIG.reinforcementArrival;
  private reinforcementSpawned = false;
  private updatingAdditional = false;
  private secondaryBrain = {
    target: { x: 0, z: 0 } as Point,
    memory: 0,
    searchTimer: 0,
    retreatTime: 0,
    retreatTarget: undefined as Point | undefined,
  };
  items: {
    id: number;
    x: number;
    z: number;
    kind: "fuel" | "artifact" | "match";
    taken: boolean;
    encounter?: "reliquary" | "oil_cache";
    opening?: number;
    value?: number;
  }[] = [];
  chalk: Point[] = [];
  matches = 2;
  deathCause: "Hunter" | "Stalker" | "" = "";
  deathAdvice = "";
  artifacts = 0;
  banked = 0;
  upgrades: Record<Upgrade, number> = {
    wick: 0,
    boots: 0,
    spark: 0,
    compass: 0,
  };
  elapsed = 0;
  message = "";
  completed = false;
  enemies: { x: number; z: number; state: string; kind: string }[] = [];
  discoveries: string[] = [];
  archive: string[] = [];
  visitedRooms: string[] = [];
  activeInteraction?: { id: number; remaining: number; total: number };
  ambientEvent?: {
    id: number;
    kind: "stone" | "chain" | "silence";
    x: number;
    z: number;
    until: number;
  };
  quietUntil = 0;
  hunterReadiness = 0;
  private eventCount = 0;
  private surfaceCells = new Map<string, string>();
  private routes = new WeakMap<Point, { points: Point[]; target: Point }>();
  private searchTimer = 0;
  private timer = 0;
  private memory = 0;
  private target: Point = { x: 0, z: 0 };
  private cooldown = 0;
  private noise = 0;
  private noiseTimer = 0;
  private vx = 0;
  private vz = 0;
  private exhausted = false;
  private staminaDelay = 0;
  private director = 25;
  private messageTime = 0;
  private retreatTime = 0;
  private retreatTarget: Point | undefined;
  private stalkerRetreats = new WeakMap<
    Point,
    { target?: Point; cower: number; retry: number }
  >();
  private roomCenters: Point[] = [];
  constructor(seed = 1) {
    this.world = generateWorld(seed);
    this.reset(seed);
  }
  get destination() {
    return { x: this.world.exit.x * 2, z: this.world.exit.z * 2 };
  }
  get start() {
    return { x: this.world.start.x * 2, z: this.world.start.z * 2 };
  }
  /** Faces the only entrance passage, derived from the generated room graph. */
  get startingHeading() {
    const layout = this.world.layout;
    const edge = layout?.links.find(([a, b]) => a === 0 || b === 0);
    const next = edge && layout?.rooms[edge[0] === 0 ? edge[1] : edge[0]];
    if (!next) {
      const dx = this.destination.x - this.start.x;
      const dz = this.destination.z - this.start.z;
      return Math.hypot(dx, dz) > 0 ? Math.atan2(-dx, -dz) : -Math.PI / 2;
    }
    return Math.atan2(
      -(next.x * 2 - this.start.x),
      -(next.z * 2 - this.start.z),
    );
  }
  get initialHeading() {
    return this.startingHeading;
  }
  get startingPosition() {
    return {
      x: this.start.x - Math.sin(this.startingHeading) * 2.4,
      z: this.start.z - Math.cos(this.startingHeading) * 2.4,
    };
  }
  /** Local, authored guidance; deliberately never tracks distant treasure through walls. */
  get objectiveHint() {
    if (
      this.encounter &&
      this.world.layout &&
      this.currentRoom ===
        this.world.layout?.rooms[this.encounter.landmarkRoomIndex]
    )
      return this.shortcutUnlocked && !this.shortcutOpen
        ? "BELL SEAL RELEASED · LOUD SHORTCUT OR QUIET RETURN"
        : !this.shortcutUnlocked
          ? "THE BELL CRYPT · RECOVER ITS SEALED VOTIVE TO RELEASE THE RETURN GATE"
          : "RETURN GATE OPEN · FOLLOW THE SHORTER PASSAGE TOWARD FIRE";
    if (this.artifacts > 0 && dist(this.player, this.start) < 40)
      return "RETURN TO THE FIRST FIRE TO BANK · OR RISK DEEPER CHAMBERS";
    const first = this.firstDiscovery;
    if (
      first &&
      !first.taken &&
      (dist(this.player, this.start) < 18 || dist(this.player, first) < 12)
    )
      return dist(this.player, first) < 8
        ? "A RELIC GLOWS AHEAD · APPROACH AND USE TO CLAIM IT"
        : "FOLLOW THE OPEN PASSAGE · A RELIC LIES BEYOND THE FIRST ARCH";
    return "SEEK THE FAR GOLDEN FIRE · BANK RELICS AT EITHER SANCTUARY";
  }
  private get firstDiscovery() {
    const layout = this.world.layout;
    const edge = layout?.links.find(([a, b]) => a === 0 || b === 0);
    const room = edge && layout?.rooms[edge[0] === 0 ? edge[1] : edge[0]];
    if (!room) return undefined;
    return this.items.find(
      (i) =>
        i.kind === "artifact" &&
        i.encounter !== "reliquary" &&
        roomAt(this.world, i.x, i.z) === room,
    );
  }
  private say(text: string) {
    this.message = text;
    this.messageTime = 6;
  }
  reset(seed = this.world.seed) {
    this.world = generateWorld(seed);
    this.encounter = this.world.layout
      ? planExpeditionEncounter(this.world.layout)
      : undefined;
    this.encounterRelicId = undefined;
    this.brands = [];
    this.brandCooldown = 0;
    this.nextBrandId = 1;
    if (this.encounter) {
      const gate = this.encounter.gate;
      this.world.shortcutGate = {
        x: gate.x,
        z: gate.z,
        yaw: gate.yaw,
        open: false,
      };
      this.world.layout!.rooms[this.encounter.landmarkRoomIndex].name =
        "THE BELL CRYPT";
    }
    this.player = {
      ...this.startingPosition,
      yaw: this.startingHeading,
      stamina: 1,
      crouched: false,
    };
    this.cameraYaw = this.startingHeading;
    this.fuel = this.maxFuel;
    this.mode = 1;
    this.phase = "EXPLORING";
    this.hunter = { x: 0, z: 0, state: "DORMANT" };
    this.additionalHunters = [];
    this.hunterWarning = "";
    this.huntElapsed = 0;
    this.reinforcementAttempt = CONFIG.reinforcementArrival;
    this.reinforcementSpawned = false;
    this.chalk = [];
    this.matches = 2;
    this.artifacts = 0;
    this.deathCause = "";
    this.deathAdvice = "";
    this.elapsed = 0;
    this.completed = false;
    this.retreatTime = 0;
    this.retreatTarget = undefined;
    this.roomCenters = this.world.cells
      .filter((c) => c.x % 14 === 0 && c.z % 14 === 0)
      .map((c) => ({ x: c.x * 2, z: c.z * 2 }));
    this.timer = 0;
    this.memory = 0;
    this.cooldown = 0;
    this.vx = this.vz = 0;
    this.exhausted = false;
    this.staminaDelay = 0;
    this.noise = this.noiseTimer = 0;
    this.director = 25;
    this.discoveries = [];
    this.visitedRooms = [];
    this.activeInteraction = undefined;
    this.ambientEvent = undefined;
    this.quietUntil = 0;
    this.eventCount = 0;
    this.hunterReadiness = 0;
    this.surfaceCells = new Map(
      this.world.cells.map((c) => [key(c.x, c.z), c.surface ?? "stone"]),
    );
    this.say("Follow the open passage. A relic glows beyond the first arch.");
    const rooms = this.world.layout!.rooms.filter(
      (r) => r.kind !== "sanctuary",
    );
    this.items = rooms.flatMap((r, i) => {
      const variant =
        ((this.world.seed >>> 0) ^ Math.imul(i + 1, 2654435761)) >>> 0;
      const p = [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ][variant % 4];
      return [
        {
          id: i * 2,
          x: r.x * 2 + p[0],
          z: r.z * 2 + p[1],
          kind: (r.reward ? "artifact" : i % 3 === 0 ? "match" : "fuel") as
            "fuel" | "artifact" | "match",
          taken: false,
        },
        {
          id: i * 2 + 1,
          x: r.x * 2 + 2,
          z: r.z * 2 + 2,
          kind: (r.reward ? "fuel" : "artifact") as
            "fuel" | "artifact" | "match",
          taken: false,
        },
      ];
    });
    // All rewards occupy real, unblocked floor. Risk comes from the choice,
    // never an unreachable pickup embedded in funerary furniture.
    for (const item of this.items) {
      const room = roomAt(this.world, item.x, item.z)!;
      const options = [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
        [4, 0],
        [-4, 0],
      ];
      if (
        !walkable(this.world, item.x, item.z) ||
        blockedByProp(this.world, item.x, item.z, 0.45) ||
        !findPath(this.world, this.start, item).length
      ) {
        const point = options
          .map(([x, z]) => ({ x: room.x * 2 + x, z: room.z * 2 + z }))
          .find(
            (p) =>
              walkable(this.world, p.x, p.z) &&
              !this.items.some((i) => i !== item && i.x === p.x && i.z === p.z),
          );
        if (point) Object.assign(item, point);
      }
    }
    const vault = this.encounter
      ? this.world.layout!.rooms[this.encounter.landmarkRoomIndex]
      : (rooms
          .filter((r) => r.design === "ossuary" && r.depth > 0.15)
          .sort(
            (a, b) => Math.abs(a.depth - 0.65) - Math.abs(b.depth - 0.65),
          )[0] ?? rooms[2]);
    const relic = this.items.find(
      (i) => i.kind === "artifact" && roomAt(this.world, i.x, i.z) === vault,
    );
    if (relic) {
      relic.encounter = "reliquary";
      relic.value = 3;
      this.encounterRelicId = this.encounter ? relic.id : undefined;
    }
    const cacheRoom =
      rooms.find((r) => r.reward) ??
      rooms.find((r) => r.design === "collapse") ??
      rooms[3];
    const oil =
      this.items.find(
        (i) => i.kind === "fuel" && roomAt(this.world, i.x, i.z) === cacheRoom,
      ) ?? this.items.find((i) => i.kind === "fuel");
    if (oil) {
      const room = roomAt(this.world, oil.x, oil.z)!;
      const candidates = this.world.cells
        .filter((c) => roomAt(this.world, c.x * 2, c.z * 2) === room)
        .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
        .filter(
          (p) =>
            walkable(this.world, p.x, p.z) &&
            !blockedByProp(this.world, p.x, p.z, 0.45) &&
            findPath(this.world, this.start, p).length > 0 &&
            !this.items.some((i) => i !== oil && dist(i, p) < 2),
        )
        .sort(
          (a, b) =>
            dist(b, { x: room.x * 2, z: room.z * 2 }) -
            dist(a, { x: room.x * 2, z: room.z * 2 }),
        );
      if (candidates[0]) Object.assign(oil, candidates[0]);
      oil.encounter = "oil_cache";
      oil.value = 300;
    }
    // Make the first discovery visible from the entrance, without adding loot.
    // A second relic remains the guarded, noisy vault further into the expedition.
    const first = this.firstDiscovery;
    if (first) {
      const room = roomAt(this.world, first.x, first.z)!;
      const approach = {
        x: room.x * 2 + Math.sin(this.startingHeading) * 4,
        z: room.z * 2 + Math.cos(this.startingHeading) * 4,
      };
      if (
        walkable(this.world, approach.x, approach.z) &&
        !blockedByProp(this.world, approach.x, approach.z, 0.45) &&
        findPath(this.world, this.start, approach).length > 0 &&
        !this.items.some((i) => i !== first && dist(i, approach) < 1.5)
      )
        Object.assign(first, approach);
    }
    const guards = [
      [6, 0],
      [-6, 0],
      [0, 6],
      [0, -6],
    ].map(([x, z]) => ({ x: vault.x * 2 + x, z: vault.z * 2 + z }));
    const guard = guards.find(
      (p) =>
        walkable(this.world, p.x, p.z) &&
        findPath(this.world, this.start, p).length > 0,
    ) ?? { x: vault.x * 2, z: vault.z * 2 + 2 };
    this.enemies = [{ ...guard, kind: "stalker", state: "LISTENING" }];
    if (this.encounter) {
      const room = this.world.layout!.rooms[this.encounter.landmarkRoomIndex];
      const candidates = [
        [-3, -3],
        [3, -3],
        [-3, 3],
        [3, 3],
        [-4, -2],
        [4, 2],
      ].map(([x, z]) => ({ x: room.x * 2 + x, z: room.z * 2 + z }));
      const point = candidates.find(
        (p) =>
          floorAt(this.world, p.x, p.z, 0.8) &&
          !blockedByProp(this.world, p.x, p.z, 0.9) &&
          !this.items.some((i) => dist(i, p) < 2) &&
          walkable(this.world, p.x, p.z),
      );
      if (point) {
        this.world.landmarkDecoration = { ...point, yaw: 0 };
        invalidateNavigation(this.world);
      }
    }
  }
  get currentRoom() {
    return roomAt(this.world, this.player.x, this.player.z);
  }
  get surface() {
    return (
      this.surfaceCells.get(
        key(Math.round(this.player.x / 2), Math.round(this.player.z / 2)),
      ) ?? "stone"
    );
  }
  get nearShortcut() {
    const g = this.world.shortcutGate;
    return (
      !!g &&
      !g.open &&
      dist(this.player, g) < 2.6 &&
      lineOfSight(this.world, this.player, {
        x: this.player.x + (g.x - this.player.x) * 0.5,
        z: this.player.z + (g.z - this.player.z) * 0.5,
      })
    );
  }
  get shortcutUnlocked() {
    return (
      this.encounterRelicId !== undefined &&
      !!this.items.find((i) => i.id === this.encounterRelicId)?.taken
    );
  }
  get relicLight() {
    return (
      (this.phase === "EXPLORING" && this.fuel > 0) ||
      (["HUNT_GRACE", "HUNT_ACTIVE"].includes(this.phase) &&
        !!brandRepels(this.brands, this.player, (a, b) =>
          lineOfSight(this.world, a, b),
        ))
    );
  }
  get interactionPrompt() {
    if (
      this.nearShortcut &&
      !this.shortcutUnlocked &&
      ["HUNT_GRACE", "HUNT_ACTIVE"].includes(this.phase) &&
      this.matches > 0
    )
      return "STRIKE A MATCH · BELL SEAL REMAINS LOCKED";
    if (this.nearShortcut)
      return this.shortcutUnlocked
        ? "RAISE RETURN GATE · LOUD · SHORTER ROUTE TO FIRE"
        : "BELL SEAL · RECOVER ITS VOTIVE VIA THE LONG PASSAGE";
    if (this.activeInteraction)
      return `OPENING RELIQUARY · ${this.activeInteraction.remaining.toFixed(1)}s · MOVE TO CANCEL`;
    if (dist(this.player, this.start) < 3 && this.artifacts > 0)
      return `BANK ${this.artifacts} ${this.artifacts === 1 ? "RELIC" : "RELICS"} · END EXPEDITION SAFELY`;
    const item = this.nearbyItem;
    return item?.encounter === "reliquary"
      ? `OPEN ${relicIdentity(this.world.seed, item).name.toUpperCase()} · 3.5s · NOISY · 3 RELICS`
      : item?.encounter === "oil_cache"
        ? "TAKE OIL CACHE · +50s BASE LIGHT"
        : item
          ? item.kind === "artifact"
            ? `CLAIM ${relicIdentity(this.world.seed, item).name.toUpperCase()} · ${item.value ?? 1} RELIC${(item.value ?? 1) > 1 ? "S" : ""}`
            : `COLLECT ${item.kind.toUpperCase()}`
          : "";
  }
  sanctuaryBearing(cameraYaw: number) {
    if (!this.upgrades.compass) return null;
    const dx = this.destination.x - this.player.x;
    const dz = this.destination.z - this.player.z;
    const distance = Math.hypot(dx, dz);
    const heading = Math.atan2(-dx, -dz);
    // The compass points at the fire, not at a route through walls.
    const angle = Math.atan2(
      Math.sin(heading - cameraYaw),
      Math.cos(heading - cameraYaw),
    );
    return { angle: angle || 0, distance };
  }
  get fuelRate() {
    return (
      CONFIG.flameRates[this.mode] *
      CONFIG.burnMultiplier *
      (1 - 0.08 * this.upgrades.wick) *
      (1 + this.depth * 0.3)
    );
  }
  get movementSpeed() {
    return Math.hypot(this.vx, this.vz);
  }
  get depth() {
    let closest = 0;
    this.roomCenters.forEach((p, i) => {
      if (dist(p, this.player) < dist(this.roomCenters[closest], this.player))
        closest = i;
    });
    const room = this.world.layout?.rooms[closest];
    return room?.depth ?? closest / Math.max(1, this.roomCenters.length - 1);
  }
  footstepNoise(sprint: boolean, crouch: boolean) {
    return (
      (crouch ? 1 : sprint ? 11 : 5) *
      (this.surface === "water" ? 1.65 : this.surface === "gravel" ? 1.25 : 1) *
      (1 - 0.12 * this.upgrades.boots)
    );
  }
  get relightDuration() {
    return CONFIG.relight - 0.25 * this.upgrades.spark;
  }
  purchaseUpgrade(kind: Upgrade | "reservoir") {
    if (this.phase !== "SANCTUARY") return false;
    if (kind === "reservoir") {
      if (this.banked < 1 || this.maxFuel >= 1170) return false;
      this.banked--;
      this.maxFuel = Math.min(1170, this.maxFuel + 90);
      this.fuel = this.maxFuel;
    } else {
      const spec = UPGRADES[kind];
      if (!spec || this.upgrades[kind] >= spec.cap || this.banked < spec.cost)
        return false;
      this.banked -= spec.cost;
      this.upgrades[kind]++;
    }
    this.save();
    return true;
  }
  setMode(n: number) {
    if (Number.isInteger(n) && n >= 0 && n <= 2) this.mode = n;
  }
  mark() {
    if (this.chalk.length < 100) {
      this.chalk.push({ x: this.player.x, z: this.player.z });
      this.say("Chalk remembers the way.");
    }
  }
  dropBrand() {
    const emergency = ["HUNT_GRACE", "HUNT_ACTIVE"].includes(this.phase);
    if (
      (this.phase !== "EXPLORING" && !emergency) ||
      (emergency && this.matches <= 0)
    ) {
      this.say("A brand needs torch fuel, or one match during the Hunt.");
      return false;
    }
    const result = tryDropBrand({
      // A match supplies ignition energy, but its unused potential fuel is
      // deliberately not credited to the handheld torch.
      fuel: emergency ? CONFIG.matchFuel : this.fuel,
      cooldown: this.brandCooldown,
      brands: this.brands,
      player: this.player,
      yaw: this.player.yaw,
      nextId: this.nextBrandId,
      walkable: (x, z) =>
        walkable(this.world, x, z) &&
        !blockedByProp(this.world, x, z, 0.15) &&
        !dynamicObstacle(this.world, x, z, 0.15),
    });
    if (!result.ok) {
      this.say(
        result.reason === "fuel"
          ? "A brand needs 15 seconds of Steady fuel, plus a small reserve."
          : result.reason === "placement"
            ? "No clear footing for a brand."
            : "Let the last brand cool before placing another.",
      );
      return false;
    }
    this.brands = [result.brand];
    if (emergency) this.matches--;
    else this.fuel = result.fuel;
    this.brandCooldown = result.cooldown;
    this.nextBrandId++;
    this.say(
      emergency
        ? "One match spent: eighteen seconds of stationary fire. Your torch remains out; move before the brand dies."
        : "Brand placed: eighteen seconds of stationary fire. It repels nearby creatures; it is not a sanctuary.",
    );
    return true;
  }
  burst() {
    if (
      this.phase === "EXPLORING" &&
      this.fuel >= CONFIG.burstCost &&
      this.cooldown <= 0
    ) {
      this.fuel -= CONFIG.burstCost;
      this.cooldown = CONFIG.burstCooldown;
      this.say("Flame burst — the shadows recoil.");
      this.noise = 15;
      this.noiseTimer = 2;
      this.enemies.forEach((e) => {
        if (dist(e, this.player) < 9 && lineOfSight(this.world, this.player, e))
          e.state = "REPELLED";
      });
    }
  }
  forceHunt() {
    this.fuel = 0;
    this.phase = "EXTINGUISHING";
    this.timer = 1;
    this.hunter.state = "DORMANT";
    this.additionalHunters = [];
    this.hunterWarning = "";
    this.huntElapsed = 0;
    this.reinforcementAttempt = CONFIG.reinforcementArrival;
    this.reinforcementSpawned = false;
    this.say("The last light dies. Something wakes.");
  }
  relight() {
    if (
      ["HUNT_GRACE", "HUNT_ACTIVE"].includes(this.phase) &&
      this.matches > 0
    ) {
      this.matches--;
      this.phase = "RELIGHTING";
      this.timer = this.relightDuration;
      this.say("Striking a match…");
    } else if (this.fuel === 0 && this.matches === 0)
      this.say("No matches remain. Find sanctuary fire.");
  }
  get nearbyItem() {
    return this.items
      .filter(
        (i) =>
          !i.taken &&
          dist(i, this.player) < 2.6 &&
          lineOfSight(this.world, this.player, i),
      )
      .sort((a, b) => dist(a, this.player) - dist(b, this.player))[0];
  }
  interact() {
    if (this.nearShortcut) {
      if (!this.shortcutUnlocked) {
        if (
          ["HUNT_GRACE", "HUNT_ACTIVE"].includes(this.phase) &&
          this.matches > 0
        ) {
          this.relight();
          return;
        }
        this.say("The bell seal holds. Follow the long passage to its votive.");
        return;
      }
      this.world.shortcutGate!.open = true;
      invalidateNavigation(this.world);
      this.routes = new WeakMap();
      this.noise = 15;
      this.noiseTimer = 3;
      this.discoveries.push(
        "The Bell Crypt: its raised return gate opens a shorter route toward the first fire.",
      );
      this.say(
        "The gate rings through the crypt. The return is shorter; the sound may draw a search.",
      );
      this.save();
      return;
    }
    if (dist(this.player, this.destination) < 4) {
      this.archive = [...new Set([...this.archive, ...this.discoveries])].slice(
        -100,
      );
      this.banked += this.artifacts;
      this.artifacts = 0;
      this.fuel = this.maxFuel;
      this.phase = "SANCTUARY";
      this.hunter.state = "BANISHED";
      for (const hunter of this.additionalHunters) hunter.state = "BANISHED";
      this.hunterWarning = "";
      this.completed = true;
      this.say("Your discoveries are safe in the golden light.");
      this.save();
      return;
    }
    if (dist(this.player, this.start) < 3) {
      if (this.artifacts > 0) {
        this.archive = [
          ...new Set([...this.archive, ...this.discoveries]),
        ].slice(-100);
        this.banked += this.artifacts;
        this.artifacts = 0;
        this.fuel = this.maxFuel;
        this.phase = "SANCTUARY";
        this.hunter.state = "BANISHED";
        for (const hunter of this.additionalHunters) hunter.state = "BANISHED";
        this.hunterWarning = "";
        this.completed = true;
        this.say("Your discoveries are safe in the golden light.");
        this.save();
        return;
      }
      this.fuel = this.maxFuel;
      this.phase = "EXPLORING";
      this.hunter.state = "BANISHED";
      for (const hunter of this.additionalHunters) hunter.state = "BANISHED";
      this.hunterWarning = "";
      this.say("The first fire shelters you. The far sanctuary awaits.");
      return;
    }
    const item = this.nearbyItem;
    if (item) {
      if (item.encounter === "reliquary" && (item.opening ?? 0) < 3.5) {
        if (!this.relicLight) {
          this.say(
            "The seal needs a lit torch or nearby brand. Relight or leave it.",
          );
          return;
        }
        this.activeInteraction ??= { id: item.id, remaining: 3.5, total: 3.5 };
        return;
      }
      item.taken = true;
      if (item.kind === "fuel") {
        this.fuel = Math.min(
          this.maxFuel,
          this.fuel +
            (item.encounter === "oil_cache"
              ? (item.value ?? 300)
              : CONFIG.fuelPickup),
        );
        if (this.fuel > 0 && this.phase !== "EXPLORING") {
          this.phase = "RELIGHTING";
          this.timer = this.relightDuration;
        }
      } else if (item.kind === "match") this.matches++;
      else {
        this.artifacts += item.value ?? 1;
        const identity = relicIdentity(this.world.seed, item);
        this.discoveries.push(`${identity.name}: ${identity.story}`);
        if (item.encounter === "reliquary")
          this.discoveries.push(
            "The sealed reliquary held three votive names: the fire was tended long after the crypt was abandoned.",
          );
      }
      this.say(
        item.kind === "artifact"
          ? `${relicIdentity(this.world.seed, item).name}. Reach sanctuary to bank it.`
          : item.kind === "fuel"
            ? "Oil recovered. A little longer in the light."
            : "A dry match recovered.",
      );
      return;
    }
    if (["HUNT_GRACE", "HUNT_ACTIVE"].includes(this.phase)) this.relight();
  }
  step(dt: number, input: Input) {
    if (["DEAD", "SANCTUARY"].includes(this.phase)) return;
    dt = Math.max(0, Math.min(dt, 0.1));
    this.elapsed += dt;
    this.brands = stepBrands(this.brands, dt);
    this.brandCooldown = Math.max(0, this.brandCooldown - dt);
    this.cooldown -= dt;
    const room = this.currentRoom;
    if (room && !this.visitedRooms.includes(`${room.x},${room.z}`)) {
      this.visitedRooms.push(`${room.x},${room.z}`);
      this.discoveries.push(`${room.name}: ${ROOM_DESIGNS[room.design].story}`);
    }

    this.messageTime -= dt;
    if (this.messageTime <= 0) this.message = "";
    this.cameraYaw = input.yaw;
    this.player.crouched = input.crouch;
    const moving = Math.hypot(input.forward, input.strafe) > 0;
    if (moving)
      this.player.yaw = input.yaw - Math.atan2(input.strafe, input.forward);
    if (this.player.stamina < 0.01) this.exhausted = true;
    if (this.player.stamina > 0.25) this.exhausted = false;
    const relighting = this.phase === "RELIGHTING";
    const sprint =
      input.sprint && !this.exhausted && !input.crouch && !relighting;
    if (sprint && moving) this.staminaDelay = CONFIG.staminaRecoveryDelay;
    else this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    this.player.stamina = Math.max(
      0,
      Math.min(
        1,
        this.player.stamina +
          dt *
            (sprint && moving
              ? -CONFIG.sprintDrain
              : this.staminaDelay <= 0
                ? CONFIG.staminaRecovery
                : 0),
      ),
    );
    const surfaceSpeed = this.surface === "water" ? 0.78 : 1;
    const speed =
      surfaceSpeed *
      (input.crouch ? CONFIG.crouch : sprint ? CONFIG.sprint : CONFIG.walk);
    const length = Math.max(1, Math.hypot(input.forward, input.strafe));
    const wantX =
        ((-Math.sin(input.yaw) * input.forward +
          Math.cos(input.yaw) * input.strafe) *
          speed *
          (relighting ? CONFIG.relightMovement : 1)) /
        length,
      wantZ =
        ((-Math.cos(input.yaw) * input.forward -
          Math.sin(input.yaw) * input.strafe) *
          speed *
          (relighting ? CONFIG.relightMovement : 1)) /
        length;
    this.vx += (wantX - this.vx) * Math.min(1, dt * 18);
    this.vz += (wantZ - this.vz) * Math.min(1, dt * 18);
    const clear = (x: number, z: number) =>
      dist({ x, z }, this.start) > 0.85 &&
      dist({ x, z }, this.destination) > 0.85 &&
      !blockedByProp(this.world, x, z, 0.3) &&
      [
        [-0.3, -0.3],
        [0.3, -0.3],
        [-0.3, 0.3],
        [0.3, 0.3],
      ].every(([a, b]) => walkable(this.world, x + a, z + b));
    if (clear(this.player.x + this.vx * dt, this.player.z))
      this.player.x += this.vx * dt;
    else this.vx = 0;
    if (clear(this.player.x, this.player.z + this.vz * dt))
      this.player.z += this.vz * dt;
    else this.vz = 0;
    this.noiseTimer -= dt;
    this.noise =
      this.noiseTimer > 0
        ? 15
        : moving
          ? this.footstepNoise(sprint, input.crouch)
          : 0;
    if (this.activeInteraction) {
      const item = this.items.find((i) => i.id === this.activeInteraction!.id);
      if (!item || moving || dist(item, this.player) > 2.6 || !this.relicLight)
        this.activeInteraction = undefined;
      else {
        this.noise = 15;
        this.noiseTimer = 0.2;
        this.activeInteraction.remaining -= dt;
        if (this.activeInteraction.remaining <= 0) {
          item.opening = 3.5;
          this.activeInteraction = undefined;
          this.interact();
        }
      }
    }
    if (this.phase === "EXPLORING") {
      this.fuel = Math.max(0, this.fuel - dt * this.fuelRate);
      if (this.fuel === 0) this.forceHunt();
    } else if (
      ["EXTINGUISHING", "HUNT_GRACE", "RELIGHTING"].includes(this.phase)
    ) {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.phase === "EXTINGUISHING") {
          this.phase = "HUNT_GRACE";
          this.timer = CONFIG.grace;
          this.say("Something is waking. E to strike a match.");
        } else if (this.phase === "RELIGHTING") {
          this.fuel = Math.max(
            this.fuel,
            Math.min(this.maxFuel, CONFIG.matchFuel),
          );
          const recoveredFromBlaze = this.mode === 2;
          if (recoveredFromBlaze) this.mode = 1;
          this.phase = "EXPLORING";
          if (!["DORMANT", "BANISHED"].includes(this.hunter.state))
            this.retreatFrom(this.player);
          else this.hunter.state = "BANISHED";
          this.say(
            recoveredFromBlaze
              ? "The flame lives. Blaze resets to Steady to conserve your emergency fuel. The Hunter retreats."
              : "The flame lives. The Hunter retreats.",
          );
        } else this.spawnHunter();
      }
    }
    const safe =
      dist(this.player, this.start) < 3 ||
      dist(this.player, this.destination) < 3;
    if (
      this.hunter.state === "FLEEING" ||
      (!safe &&
        (this.phase === "HUNT_ACTIVE" ||
          (this.phase === "EXPLORING" &&
            !["DORMANT", "BANISHED"].includes(this.hunter.state)) ||
          (this.phase === "RELIGHTING" &&
            !["DORMANT", "BANISHED"].includes(this.hunter.state))))
    )
      this.updateHunter(dt);
    this.updateReinforcements(dt, safe);
    if (safe && this.fuel === 0) {
      this.fuel = this.maxFuel;
      this.phase = "EXPLORING";
      this.hunter.state = "BANISHED";
      this.say("Sanctuary fire banishes the darkness.");
    }
    if (dist(this.player, this.destination) < 3) this.interact();
    if (
      !safe &&
      [
        "EXPLORING",
        "EXTINGUISHING",
        "HUNT_GRACE",
        "HUNT_ACTIVE",
        "RELIGHTING",
      ].includes(this.phase)
    )
      this.updateStalker(dt, input.crouch);
    this.director -= dt;
    if (this.director <= 0) {
      this.eventCount++;
      this.director =
        35 + (((this.world.seed + this.eventCount * 13) >>> 0) % 29);
      if (
        !safe &&
        this.phase === "EXPLORING" &&
        this.fuel > this.maxFuel * 0.12
      ) {
        const kind = (["stone", "chain", "silence"] as const)[
          this.eventCount % 3
        ];
        const nearby = this.world.cells.filter((c) => {
          const d = dist(this.player, { x: c.x * 2, z: c.z * 2 });
          return d > 5 && d < 14;
        });
        const p = nearby[(this.world.seed >>> 0) % Math.max(1, nearby.length)];
        if (p) {
          this.ambientEvent = {
            id: this.eventCount,
            kind,
            x: p.x * 2,
            z: p.z * 2,
            until: this.elapsed + (kind === "silence" ? 8 : 2.5),
          };
          if (kind === "silence") this.quietUntil = this.elapsed + 8;
        }
      }
    }
  }
  private hunterSpawnPoint(extra = false) {
    const direction = {
      x: -Math.sin(this.cameraYaw),
      z: -Math.cos(this.cameraYaw),
    };
    const candidates = this.world.cells
      .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
      .filter((p) => {
        const d = dist(p, this.player);
        if (d <= 18 || d >= 45 || !grid(this.world).has(key(p.x / 2, p.z / 2)))
          return false;
        const visible = lineOfSight(this.world, p, this.player),
          front =
            ((p.x - this.player.x) * direction.x +
              (p.z - this.player.z) * direction.z) /
            Math.max(d, 1);
        return (
          walkable(this.world, p.x, p.z) &&
          d > 18 &&
          d < 45 &&
          (!visible || front < -0.3) &&
          (!extra ||
            (dist(p, this.hunter) > 12 &&
              navigationDistance(this.world, p, this.player) >= 24))
        );
      })
      .sort((a, b) => dist(a, this.player) - dist(b, this.player));
    const escapeDistance = navigationDistance(
      this.world,
      this.player,
      this.destination,
    );
    const p = candidates.find(
      (candidate) =>
        findPath(this.world, candidate, this.player).length > 0 &&
        navigationDistance(this.world, candidate, this.destination) >
          escapeDistance + 6,
    );
    return p;
  }
  private spawnHunter() {
    const p = this.hunterSpawnPoint();
    if (!p) {
      this.timer = 1;
      this.phase = "HUNT_GRACE";
      return;
    }
    this.hunter = {
      ...p,
      state: "SEARCHING",
      yaw: Math.atan2(-(this.player.x - p.x), -(this.player.z - p.z)),
    };
    this.target = { ...this.player };
    this.hunterReadiness = 0;
    this.phase = "HUNT_ACTIVE";
    this.say("The Hunter searches. Break sight. Quiet your footsteps.");
  }
  private updateReinforcements(dt: number, safe: boolean) {
    if (safe || this.phase === "SANCTUARY" || this.phase === "DEAD") {
      this.hunterWarning = "";
      for (const hunter of this.additionalHunters) hunter.state = "BANISHED";
      return;
    }
    if (this.phase === "HUNT_ACTIVE") {
      this.huntElapsed += dt;
      if (
        !this.reinforcementSpawned &&
        this.huntElapsed >= CONFIG.reinforcementWarning
      ) {
        this.hunterWarning =
          "A second set of footsteps answers. Find fire before it arrives.";
        if (this.huntElapsed >= this.reinforcementAttempt) {
          const p = this.hunterSpawnPoint(true);
          this.reinforcementAttempt =
            this.huntElapsed + CONFIG.reinforcementRetry;
          if (p) {
            this.additionalHunters.push({
              ...p,
              state: "SEARCHING",
              yaw: Math.atan2(-(this.player.x - p.x), -(this.player.z - p.z)),
              readiness: 0,
            });
            this.secondaryBrain = {
              target: { ...this.player },
              memory: 0,
              searchTimer: 0,
              retreatTime: 0,
              retreatTarget: undefined,
            };
            this.reinforcementSpawned = true;
            this.hunterWarning =
              "Two Hunters roam the dark. Break sight and seek fire.";
          }
        }
      }
    } else this.hunterWarning = "";
    for (const hunter of this.additionalHunters) {
      if (["DORMANT", "BANISHED"].includes(hunter.state)) continue;
      // Run the same perception/navigation machine with independent memory and route state.
      const primary = {
        hunter: this.hunter,
        target: this.target,
        memory: this.memory,
        searchTimer: this.searchTimer,
        retreatTime: this.retreatTime,
        retreatTarget: this.retreatTarget,
        readiness: this.hunterReadiness,
      };
      this.hunter = hunter;
      Object.assign(this, this.secondaryBrain);
      this.hunterReadiness = hunter.readiness ?? 0;
      if (
        this.fuel > 0 &&
        this.phase === "EXPLORING" &&
        hunter.state !== "FLEEING"
      )
        this.retreatFrom(this.player);
      this.updatingAdditional = true;
      this.updateHunter(dt);
      this.updatingAdditional = false;
      hunter.readiness = this.hunterReadiness;
      this.secondaryBrain = {
        target: this.target,
        memory: this.memory,
        searchTimer: this.searchTimer,
        retreatTime: this.retreatTime,
        retreatTarget: this.retreatTarget,
      };
      this.hunter = primary.hunter;
      this.target = primary.target;
      this.memory = primary.memory;
      this.searchTimer = primary.searchTimer;
      this.retreatTime = primary.retreatTime;
      this.retreatTarget = primary.retreatTarget;
      this.hunterReadiness = primary.readiness;
      if (this.phase === "DEAD") this.save();
    }
  }
  private moveEnemy(enemy: Point, target: Point, speed: number, dt: number) {
    let route = this.routes.get(enemy);
    if (!route || route.points.length === 0 || dist(route.target, target) > 3) {
      const start = route?.points[0] ?? enemy;
      const points = findPath(this.world, start, target);
      if (points[0] && dist(enemy, points[0]) < 0.05) points.shift();
      route = { points, target: { ...target } };
      this.routes.set(enemy, route);
    }
    const next = route.points[0];
    if (!next) return;
    const length = dist(next, enemy);
    if (length < 0.02) {
      route.points.shift();
      return;
    }
    const move = Math.min(length, dt * speed),
      x = enemy.x + ((next.x - enemy.x) / length) * move,
      z = enemy.z + ((next.z - enemy.z) / length) * move;
    if (walkable(this.world, x, z) && !blockedByProp(this.world, x, z, 0.3)) {
      enemy.x = x;
      enemy.z = z;
      if (move >= length - 0.001) route.points.shift();
    }
  }
  private updateHunter(dt: number) {
    if (["DORMANT", "BANISHED"].includes(this.hunter.state)) return;
    const sanctuaryFire = [this.start, this.destination].find(
      (p) =>
        dist(p, this.hunter) < CONFIG.fireRepel &&
        lineOfSight(this.world, p, this.hunter),
    );
    const brand = brandRepels(this.brands, this.hunter, (a, b) =>
      lineOfSight(this.world, a, b),
    );
    const fire = sanctuaryFire ?? brand;
    const torchNear =
      this.fuel > 0 &&
      this.phase === "EXPLORING" &&
      dist(this.player, this.hunter) < CONFIG.lightRepel[this.mode] &&
      lineOfSight(this.world, this.player, this.hunter);
    if ((fire || torchNear) && this.hunter.state !== "FLEEING") {
      this.hunter.temporaryRetreat = !!brand && !sanctuaryFire && !torchNear;
      this.retreatFrom(fire ?? this.player);
    }
    if (this.hunter.state === "FLEEING") {
      this.retreatTime -= dt;
      if (this.retreatTarget)
        this.moveEnemy(this.hunter, this.retreatTarget, CONFIG.hunterFlee, dt);
      if (this.retreatTime <= 0) {
        this.hunter.state =
          !this.hunter.temporaryRetreat && (this.fuel > 0 || sanctuaryFire)
            ? "BANISHED"
            : "SEARCHING";
        this.hunter.temporaryRetreat = false;
        this.memory = 0;
        this.retreatTarget = undefined;
      }
      return; // A recoiling Hunter cannot capture the player.
    }
    const d = dist(this.hunter, this.player);
    const heading = Math.atan2(
      -(this.player.x - this.hunter.x),
      -(this.player.z - this.hunter.z),
    );
    const facing = this.hunter.yaw ?? heading;
    const inCone =
      d < 2.5 || Math.cos(heading - facing) > Math.cos((Math.PI * 70) / 180);
    const seen =
      inCone &&
      d <
        CONFIG.sight *
          (1 + this.depth * 0.15) *
          (this.player.crouched ? CONFIG.crouchSight : 1) &&
      lineOfSight(this.world, this.hunter, this.player);
    const heard =
      !seen &&
      d < this.noise &&
      navigationDistance(this.world, this.hunter, this.player) <
        this.noise * 1.5;
    if (seen || heard) {
      this.target = { ...this.player };
      this.memory = CONFIG.memory + this.depth * 4;
      this.hunter.state = seen ? "PURSUING" : "INVESTIGATING";
    } else {
      this.memory = Math.max(0, this.memory - dt);
      if (this.memory === 0) {
        this.hunter.state = "SEARCHING";
        this.searchTimer -= dt;
        if (this.searchTimer <= 0) {
          this.searchTimer = 4;
          const options = this.world.cells
            .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
            .filter(
              (p) => dist(p, this.target) < 8 && dist(p, this.target) > 2,
            );
          if (options.length)
            this.target =
              options[
                (this.world.seed + Math.floor(this.elapsed / 4)) %
                  options.length
              ];
        }
      }
    }
    this.hunterReadiness = seen
      ? Math.min(1, this.hunterReadiness + dt / 0.4)
      : Math.max(0, this.hunterReadiness - dt);
    const before = { x: this.hunter.x, z: this.hunter.z };
    this.moveEnemy(
      this.hunter,
      this.target,
      this.hunter.state === "PURSUING"
        ? (CONFIG.hunterChase + this.depth * 0.55) *
            (this.hunterReadiness < 1 ? 0.4 : 1)
        : CONFIG.hunterSearch,
      dt,
    );
    if (dist(before, this.hunter) > 0.001)
      this.hunter.yaw =
        Math.atan2(-(this.hunter.x - before.x), -(this.hunter.z - before.z)) ||
        0;
    if (dist(this.hunter, this.player) < 1.1) {
      this.phase = "DEAD";
      this.deathCause = "Hunter";
      this.deathAdvice =
        "Break sight around corners, then crouch to quiet your footsteps. Use a match to relight, or reach sanctuary fire.";
      this.artifacts = 0;
      this.say("The darkness found you. Banked relics remain safe.");
      if (!this.updatingAdditional) this.save();
    }
  }
  private retreatFrom(light: Point) {
    this.hunter.state = "FLEEING";
    this.retreatTime = CONFIG.retreatDuration;
    this.routes.delete(this.hunter);
    const options = this.world.cells
      .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
      .filter(
        (p) =>
          dist(p, this.hunter) < 14 &&
          dist(p, light) > dist(this.hunter, light) + 4 &&
          walkable(this.world, p.x, p.z),
      );
    options.sort(
      (a, b) =>
        dist(b, light) -
        dist(b, this.hunter) * 0.4 -
        (dist(a, light) - dist(a, this.hunter) * 0.4),
    );
    this.retreatTarget = options.find((p) => {
      const path = findPath(this.world, this.hunter, p);
      return (
        path.length > 0 &&
        path
          .slice(0, 4)
          .every((step) => dist(step, light) >= dist(this.hunter, light) - 0.5)
      );
    });
  }
  private updateStalker(dt: number, crouch: boolean) {
    for (const e of this.enemies) {
      const d = dist(e, this.player);
      const lit =
        this.fuel > 0 && ["EXPLORING", "SANCTUARY"].includes(this.phase);
      const brand = brandRepels(this.brands, e, (a, b) =>
        lineOfSight(this.world, a, b),
      );
      const light = brand ?? this.player;
      const lightDistance = dist(e, light);
      const threatened =
        !!brand ||
        (lit &&
          d < CONFIG.lightRepel[this.mode] + 2 &&
          lineOfSight(this.world, e, this.player));
      let retreat = this.stalkerRetreats.get(e);
      if (
        threatened ||
        (lit && retreat && d < CONFIG.lightRepel[this.mode] + 5)
      ) {
        if (!retreat) {
          retreat = { cower: 0.7, retry: 0 };
          this.stalkerRetreats.set(e, retreat);
          this.routes.delete(e);
        }
        retreat.cower -= dt;
        retreat.retry -= dt;
        e.state = retreat.cower > 0 ? "COWERING" : "FLEEING";
        if (retreat.retry <= 0) {
          retreat.retry = 1.5;
          const options = this.world.cells
            .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
            .filter(
              (p) =>
                dist(p, e) < 14 &&
                dist(p, light) > lightDistance + 3 &&
                walkable(this.world, p.x, p.z),
            )
            .sort((a, b) => dist(b, light) - dist(a, light));
          retreat.target = options.find((p) => {
            const path = findPath(this.world, e, p);
            return (
              path.length > 0 &&
              path
                .slice(0, 4)
                .every((step) => dist(step, light) >= lightDistance - 0.5)
            );
          });
          this.routes.delete(e);
        }
        if (retreat.cower <= 0 && retreat.target)
          this.moveEnemy(e, retreat.target, 1.35, dt);
        continue;
      }
      if (retreat) {
        this.stalkerRetreats.delete(e);
        this.routes.delete(e);
        e.state = "LISTENING";
      }
      if (e.state === "REPELLED") {
        this.moveEnemy(
          e,
          this.roomCenters[Math.floor(this.roomCenters.length * 0.65)],
          2.5,
          dt,
        );
        if (d > 10) e.state = "LISTENING";
        continue;
      }
      const heard =
        this.noise > 3 &&
        navigationDistance(this.world, e, this.player) < this.noise * 2.6;
      const seen =
        !lit && (!crouch || d < 2.5) && lineOfSight(this.world, e, this.player);
      if (d < 15 + this.depth * 5 && (heard || seen)) {
        e.state = lit ? "INVESTIGATING" : "PURSUING";
        if (!lit || d > 2 || this.mode === 0)
          this.moveEnemy(
            e,
            this.player,
            lit ? 1.8 + this.depth * 0.5 : 2.8,
            dt,
          );
      } else e.state = "LISTENING";
      if (!lit && this.phase === "HUNT_ACTIVE" && d < 1.1 && !crouch) {
        this.phase = "DEAD";
        this.deathCause = "Stalker";
        this.deathAdvice =
          "The Stalker follows sound. Crouch when fire dies; relight with a match or escape toward sanctuary fire.";
        this.artifacts = 0;
        this.say("Without fire, the Stalker closes in.");
      }
    }
  }
  save() {
    try {
      localStorage.setItem(
        "lastlight-save",
        JSON.stringify({
          version: 1,
          generation: 4,
          seed: this.world.seed,
          banked: this.banked,
          maxFuel: this.maxFuel,
          upgrades: this.upgrades,
          player: this.player,
          fuel: this.fuel,
          mode: this.mode,
          matches: this.matches,
          artifacts: this.artifacts,
          items: this.items,
          discoveries: this.discoveries,
          archive: this.archive,
          visitedRooms: this.visitedRooms,
          chalk: this.chalk,
          phase: this.phase,
          elapsed: this.elapsed,
          hunter: this.hunter,
          additionalHunters: this.additionalHunters,
          secondaryBrain: this.secondaryBrain,
          huntElapsed: this.huntElapsed,
          reinforcementSpawned: this.reinforcementSpawned,
          shortcutOpen: this.shortcutOpen,
          brands: this.brands,
          brandCooldown: this.brandCooldown,
          target: this.target,
          memory: this.memory,
          timer: this.timer,
        }),
      );
    } catch {}
  }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem("lastlight-save") || "null");
      if (!d || d.version !== 1) return false;
      this.banked = Math.max(0, Number(d.banked) || 0);
      this.maxFuel = Math.min(1170, Math.max(720, Number(d.maxFuel) || 720));
      for (const kind of Object.keys(UPGRADES) as Upgrade[]) {
        const level = Number(d.upgrades?.[kind]);
        this.upgrades[kind] = Number.isFinite(level)
          ? Math.min(UPGRADES[kind].cap, Math.max(0, Math.floor(level)))
          : 0;
      }
      this.archive = Array.isArray(d.archive)
        ? d.archive.filter((s: unknown) => typeof s === "string").slice(-100)
        : [];
      this.reset(Number(d.seed) || 1);
      if (d.generation !== 4) {
        if (Array.isArray(d.discoveries))
          this.archive = [
            ...new Set([
              ...this.archive,
              ...d.discoveries.filter((v: unknown) => typeof v === "string"),
            ]),
          ].slice(-100);
        this.banked += Math.max(0, Number(d.artifacts) || 0);
        this.say("The passages have shifted. Your banked discoveries endure.");
        this.save();
        return true;
      }
      if (!["DEAD", "SANCTUARY"].includes(d.phase)) {
        if (this.world.shortcutGate) {
          this.world.shortcutGate.open = Boolean(d.shortcutOpen);
          invalidateNavigation(this.world);
        }
        this.brands = Array.isArray(d.brands)
          ? d.brands
              .filter(
                (b: Brand) =>
                  Number.isFinite(b.id) &&
                  Number.isFinite(b.remaining) &&
                  b.remaining > 0 &&
                  b.remaining <= BRAND_CONFIG.lifetime &&
                  walkable(this.world, b.x, b.z),
              )
              .slice(0, 1)
          : [];
        this.nextBrandId = Math.max(0, ...this.brands.map((b) => b.id)) + 1;
        this.brandCooldown = Math.max(
          0,
          Math.min(BRAND_CONFIG.cooldown, Number(d.brandCooldown) || 0),
        );
        if (d.player && walkable(this.world, d.player.x, d.player.z))
          this.player = { ...this.player, ...d.player };
        if (dist(this.player, this.start) < 0.9)
          Object.assign(this.player, this.startingPosition);
        this.fuel = Math.max(0, Math.min(this.maxFuel, Number(d.fuel) || 0));
        this.matches = Math.max(0, Number(d.matches) || 0);
        this.setMode(d.mode);
        this.artifacts = Math.max(0, Number(d.artifacts) || 0);
        if (Array.isArray(d.items)) this.items = d.items;
        if (Array.isArray(d.discoveries))
          this.discoveries = d.discoveries
            .filter((s: unknown) => typeof s === "string")
            .slice(0, 100);
        if (Array.isArray(d.visitedRooms))
          this.visitedRooms = d.visitedRooms
            .filter((s: unknown) => typeof s === "string")
            .slice(0, 100);
        if (Array.isArray(d.chalk)) this.chalk = d.chalk;
        this.elapsed = Number(d.elapsed) || 0;
        if (
          [
            "EXPLORING",
            "EXTINGUISHING",
            "HUNT_GRACE",
            "HUNT_ACTIVE",
            "RELIGHTING",
          ].includes(d.phase)
        )
          this.phase = d.phase;
        this.timer = Number(d.timer) || 0;
        this.memory = Number(d.memory) || 0;
        if (d.hunter && walkable(this.world, d.hunter.x, d.hunter.z))
          this.hunter = d.hunter;
        if (d.target) this.target = d.target;
        this.huntElapsed = Math.max(0, Number(d.huntElapsed) || 0);
        this.reinforcementAttempt = Math.max(
          CONFIG.reinforcementArrival,
          this.huntElapsed + 1,
        );
        this.reinforcementSpawned = Boolean(d.reinforcementSpawned);
        if (Array.isArray(d.additionalHunters)) {
          this.additionalHunters = d.additionalHunters
            .filter(
              (h: Hunter) =>
                h &&
                walkable(this.world, h.x, h.z) &&
                [
                  "SEARCHING",
                  "INVESTIGATING",
                  "PURSUING",
                  "FLEEING",
                  "BANISHED",
                ].includes(h.state),
            )
            .slice(0, 1);
          const brain = d.secondaryBrain;
          const validPoint = (p: Point | undefined) =>
            p &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.z) &&
            walkable(this.world, p.x, p.z);
          this.secondaryBrain = {
            target: validPoint(brain?.target)
              ? brain.target
              : { ...this.player },
            memory: Math.max(0, Math.min(20, Number(brain?.memory) || 0)),
            searchTimer: Math.max(
              0,
              Math.min(4, Number(brain?.searchTimer) || 0),
            ),
            retreatTime: Math.max(
              0,
              Math.min(
                CONFIG.retreatDuration,
                Number(brain?.retreatTime) || CONFIG.retreatDuration,
              ),
            ),
            retreatTarget: validPoint(brain?.retreatTarget)
              ? brain.retreatTarget
              : undefined,
          };
        }
        if (this.fuel === 0 && this.phase === "EXPLORING") this.forceHunt();
      }
      return true;
    } catch {
      return false;
    }
  }
}
