export type Point = { x: number; z: number };
export type World = {
  cells: (Point & { kind: string })[];
  start: Point;
  exit: Point;
  seed: number;
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
  hunterChase: 4.5,
  sight: 12,
  memory: 12,
  grace: 8,
  relight: 2,
  fuel: 720,
  burstCost: 45,
  burstCooldown: 18,
};
const key = (x: number, z: number) => `${x},${z}`;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const grids = new WeakMap<World, Set<string>>();
function grid(w: World) {
  let s = grids.get(w);
  if (!s) {
    s = new Set(w.cells.map((c) => key(c.x, c.z)));
    grids.set(w, s);
  }
  return s;
}
export function generateWorld(seed = 1): World {
  let s = seed >>> 0;
  const rand = () =>
    (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const cells = new Map<string, Point & { kind: string }>(),
    centers: Point[] = [];
  const add = (x: number, z: number, kind = "floor") =>
    cells.set(key(x, z), { x, z, kind });
  for (let i = 0; i < 11; i++) {
    const row = Math.floor(i / 4),
      col = row % 2 ? 3 - (i % 4) : i % 4;
    centers.push({ x: col * 14, z: row * 14 });
  }
  const connect = (a: Point, b: Point) => {
    let x = a.x,
      z = a.z;
    while (x !== b.x || z !== b.z) {
      const horizontal = x !== b.x;
      if (horizontal) x += Math.sign(b.x - x);
      else z += Math.sign(b.z - z);
      for (let n = -1; n <= 1; n++)
        if (!cells.has(key(x + (horizontal ? 0 : n), z + (horizontal ? n : 0))))
          add(x + (horizontal ? 0 : n), z + (horizontal ? n : 0), "corridor");
    }
  };
  centers.forEach((p, i) => {
    const kind =
      i === 0 || i === 10
        ? "sanctuary"
        : ["crypt", "archive", "flooded", "landmark"][Math.floor(rand() * 4)];
    for (let x = -4; x <= 4; x++)
      for (let z = -4; z <= 4; z++) add(p.x + x, p.z + z, kind);
    if (i) connect(centers[i - 1], p);
  });
  // Seeded cross-links create alternate routes while preserving the guaranteed spine.
  for (const [a, b] of [
    [1, 6],
    [2, 5],
    [5, 10],
    [6, 9],
  ])
    if (rand() > 0.46) connect(centers[a], centers[b]);
  return {
    seed,
    cells: [...cells.values()],
    start: { ...centers[0] },
    exit: { ...centers[10] },
  };
}
export function walkable(w: World, x: number, z: number) {
  return grid(w).has(key(Math.round(x / 2), Math.round(z / 2)));
}
export function lineOfSight(w: World, a: Point, b: Point) {
  const n = Math.max(1, Math.ceil(dist(a, b) * 5));
  for (let i = 0; i <= n; i++)
    if (!walkable(w, a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n))
      return false;
  return true;
}
export function findPath(w: World, a: Point, b: Point): Point[] {
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
      if (allowed.has(nk) && !prev.has(nk)) {
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
  hunter = { x: 0, z: 0, state: "DORMANT" };
  items: {
    id: number;
    x: number;
    z: number;
    kind: "fuel" | "artifact" | "match";
    taken: boolean;
  }[] = [];
  chalk: Point[] = [];
  matches = 3;
  artifacts = 0;
  banked = 0;
  elapsed = 0;
  message = "";
  completed = false;
  enemies: { x: number; z: number; state: string; kind: string }[] = [];
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
  private director = 25;
  private messageTime = 0;
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
  private say(text: string) {
    this.message = text;
    this.messageTime = 6;
  }
  reset(seed = this.world.seed) {
    this.world = generateWorld(seed);
    this.player = {
      ...this.start,
      z: this.start.z + 2.4,
      yaw: 0,
      stamina: 1,
      crouched: false,
    };
    this.cameraYaw = 0;
    this.fuel = this.maxFuel;
    this.mode = 1;
    this.phase = "EXPLORING";
    this.hunter = { x: 0, z: 0, state: "DORMANT" };
    this.chalk = [];
    this.matches = 3;
    this.artifacts = 0;
    this.elapsed = 0;
    this.completed = false;
    this.timer = 0;
    this.memory = 0;
    this.cooldown = 0;
    this.vx = this.vz = 0;
    this.exhausted = false;
    this.director = 25;
    this.say("Seek the far golden fire. E to gather supplies.");
    const centers = this.world.cells.filter(
      (c) => c.x % 14 === 0 && c.z % 14 === 0 && (c.x || c.z),
    );
    this.items = centers.flatMap((c, i) => [
      {
        id: i * 2,
        x: c.x * 2 + 2,
        z: c.z * 2,
        kind: (i % 3 === 0 ? "artifact" : i % 3 === 1 ? "fuel" : "match") as
          "fuel" | "artifact" | "match",
        taken: false,
      },
      {
        id: i * 2 + 1,
        x: c.x * 2 - 4,
        z: c.z * 2 + 4,
        kind: (i % 2 === 0 ? "fuel" : "artifact") as "fuel" | "artifact",
        taken: false,
      },
    ]);
    this.enemies = [{ x: 84, z: 24, kind: "stalker", state: "LISTENING" }];
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
        if (dist(e, this.player) < 9) e.state = "REPELLED";
      });
    }
  }
  forceHunt() {
    this.fuel = 0;
    this.phase = "EXTINGUISHING";
    this.timer = 1;
    this.hunter.state = "DORMANT";
    this.say("The last light dies. Something wakes.");
  }
  relight() {
    if (
      ["HUNT_GRACE", "HUNT_ACTIVE"].includes(this.phase) &&
      this.matches > 0
    ) {
      this.matches--;
      this.phase = "RELIGHTING";
      this.timer = CONFIG.relight;
      this.say("Striking a match…");
    } else if (this.fuel === 0 && this.matches === 0)
      this.say("No matches remain. Find sanctuary fire.");
  }
  interact() {
    if (dist(this.player, this.destination) < 4) {
      this.banked += this.artifacts;
      this.artifacts = 0;
      this.fuel = this.maxFuel;
      this.phase = "SANCTUARY";
      this.hunter.state = "BANISHED";
      this.completed = true;
      this.say("Your discoveries are safe in the golden light.");
      this.save();
      return;
    }
    if (dist(this.player, this.start) < 3) {
      this.fuel = this.maxFuel;
      this.phase = "EXPLORING";
      this.hunter.state = "BANISHED";
      this.say("The first fire shelters you. The far sanctuary awaits.");
      return;
    }
    const item = this.items.find((i) => !i.taken && dist(i, this.player) < 2.6);
    if (item) {
      item.taken = true;
      if (item.kind === "fuel") {
        this.fuel = Math.min(this.maxFuel, this.fuel + 180);
        if (this.fuel > 0 && this.phase !== "EXPLORING") {
          this.phase = "RELIGHTING";
          this.timer = CONFIG.relight;
        }
      } else if (item.kind === "match") this.matches++;
      else this.artifacts++;
      this.say(
        item.kind === "artifact"
          ? "An ancient relic. Reach sanctuary to bank it."
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
    this.cooldown -= dt;
    this.messageTime -= dt;
    if (this.messageTime <= 0) this.message = "";
    this.cameraYaw = input.yaw;
    this.player.crouched = input.crouch;
    const moving = Math.hypot(input.forward, input.strafe) > 0;
    if (moving)
      this.player.yaw = input.yaw - Math.atan2(input.strafe, input.forward);
    if (this.player.stamina < 0.01) this.exhausted = true;
    if (this.player.stamina > 0.25) this.exhausted = false;
    const sprint = input.sprint && !this.exhausted && !input.crouch;
    this.player.stamina = Math.max(
      0,
      Math.min(1, this.player.stamina + dt * (sprint && moving ? -0.13 : 0.13)),
    );
    const speed = input.crouch
      ? CONFIG.crouch
      : sprint
        ? CONFIG.sprint
        : CONFIG.walk;
    const length = Math.max(1, Math.hypot(input.forward, input.strafe));
    const wantX =
        ((-Math.sin(input.yaw) * input.forward +
          Math.cos(input.yaw) * input.strafe) *
          speed) /
        length,
      wantZ =
        ((-Math.cos(input.yaw) * input.forward -
          Math.sin(input.yaw) * input.strafe) *
          speed) /
        length;
    this.vx += (wantX - this.vx) * Math.min(1, dt * 18);
    this.vz += (wantZ - this.vz) * Math.min(1, dt * 18);
    const clear = (x: number, z: number) =>
      dist({ x, z }, this.start) > 0.85 &&
      dist({ x, z }, this.destination) > 0.85 &&
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
          ? input.crouch
            ? 1
            : sprint
              ? 11
              : 5
          : 0;
    if (this.phase === "EXPLORING") {
      this.fuel = Math.max(0, this.fuel - dt * [0.35, 1, 3.5][this.mode]);
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
          this.fuel = Math.max(this.fuel, Math.min(this.maxFuel, 120));
          this.phase = "EXPLORING";
          this.hunter.state = "BANISHED";
          this.say("The flame lives. The Hunter retreats.");
        } else this.spawnHunter();
      }
    }
    const safe =
      dist(this.player, this.start) < 3 ||
      dist(this.player, this.destination) < 3;
    if (
      !safe &&
      (this.phase === "HUNT_ACTIVE" ||
        (this.phase === "RELIGHTING" &&
          !["DORMANT", "BANISHED"].includes(this.hunter.state)))
    )
      this.updateHunter(dt);
    if (safe && this.fuel === 0) {
      this.fuel = this.maxFuel;
      this.phase = "EXPLORING";
      this.hunter.state = "BANISHED";
      this.say("Sanctuary fire banishes the darkness.");
    }
    if (dist(this.player, this.destination) < 3) this.interact();
    if (!safe && this.phase === "EXPLORING")
      this.updateStalker(dt, input.crouch);
    this.director -= dt;
    if (this.director <= 0) {
      this.director = 28 + (this.world.seed % 17);
      if (!safe && this.phase === "EXPLORING")
        this.say(
          this.fuel < this.maxFuel * 0.25
            ? "The flame trembles. Find oil or a golden fire."
            : [
                "Stone shifts somewhere beyond the light.",
                "A distant footfall. Then silence.",
                "The Catacombs remember your footsteps.",
              ][Math.floor(this.elapsed / 25) % 3],
        );
    }
  }
  private spawnHunter() {
    const direction = {
      x: -Math.sin(this.cameraYaw),
      z: -Math.cos(this.cameraYaw),
    };
    const candidates = this.world.cells
      .map((c) => ({ x: c.x * 2, z: c.z * 2 }))
      .filter((p) => {
        const d = dist(p, this.player),
          visible = lineOfSight(this.world, p, this.player),
          front =
            ((p.x - this.player.x) * direction.x +
              (p.z - this.player.z) * direction.z) /
            Math.max(d, 1);
        return d > 18 && d < 45 && (!visible || front < -0.3);
      })
      .sort((a, b) => dist(a, this.player) - dist(b, this.player));
    const p = candidates[0];
    if (!p) {
      this.timer = 1;
      this.phase = "HUNT_GRACE";
      return;
    }
    this.hunter = { ...p, state: "SEARCHING" };
    this.target = { ...this.player };
    this.phase = "HUNT_ACTIVE";
    this.say("The Hunter searches. Break sight. Quiet your footsteps.");
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
    if (walkable(this.world, x, z)) {
      enemy.x = x;
      enemy.z = z;
      if (move >= length - 0.001) route.points.shift();
    }
  }
  private updateHunter(dt: number) {
    const d = dist(this.hunter, this.player),
      seen =
        d < CONFIG.sight && lineOfSight(this.world, this.hunter, this.player);
    const heard =
      d < this.noise &&
      findPath(this.world, this.hunter, this.player).length * 2 <
        this.noise * 1.5;
    if (seen || heard) {
      this.target = { ...this.player };
      this.memory = CONFIG.memory;
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
    this.moveEnemy(
      this.hunter,
      this.target,
      this.hunter.state === "PURSUING"
        ? CONFIG.hunterChase
        : CONFIG.hunterSearch,
      dt,
    );
    if (dist(this.hunter, this.player) < 1.1) {
      this.phase = "DEAD";
      this.artifacts = 0;
      this.say("The darkness found you. Banked relics remain safe.");
      this.save();
    }
  }
  private updateStalker(dt: number, crouch: boolean) {
    for (const e of this.enemies) {
      const d = dist(e, this.player);
      if (e.state === "REPELLED") {
        this.moveEnemy(e, { x: 84, z: 24 }, 2.5, dt);
        if (d > 10) e.state = "LISTENING";
        continue;
      }
      if (d < 15 && this.noise > 3 && lineOfSight(this.world, e, this.player)) {
        e.state = "INVESTIGATING";
        if (d > 3.5 || this.mode === 0) this.moveEnemy(e, this.player, 1.8, dt);
      } else e.state = "LISTENING";
      if (d < 1.4 && !crouch && this.mode === 0) {
        this.fuel = Math.max(0, this.fuel - dt * 15);
        this.say("A Stalker tears at the flame. Brighten it or retreat.");
      }
    }
  }
  save() {
    try {
      localStorage.setItem(
        "lastlight-save",
        JSON.stringify({
          version: 1,
          seed: this.world.seed,
          banked: this.banked,
          maxFuel: this.maxFuel,
          player: this.player,
          fuel: this.fuel,
          mode: this.mode,
          matches: this.matches,
          artifacts: this.artifacts,
          items: this.items,
          chalk: this.chalk,
          phase: this.phase,
          elapsed: this.elapsed,
          hunter: this.hunter,
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
      this.reset(Number(d.seed) || 1);
      if (!["DEAD", "SANCTUARY"].includes(d.phase)) {
        if (d.player && walkable(this.world, d.player.x, d.player.z))
          this.player = { ...this.player, ...d.player };
        if (dist(this.player, this.start) < 0.9)
          this.player.z = this.start.z + 2.4;
        this.fuel = Math.max(0, Math.min(this.maxFuel, Number(d.fuel) || 0));
        this.matches = Math.max(0, Number(d.matches) || 0);
        this.setMode(d.mode);
        this.artifacts = Math.max(0, Number(d.artifacts) || 0);
        if (Array.isArray(d.items)) this.items = d.items;
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
        if (this.fuel === 0 && this.phase === "EXPLORING") this.forceHunt();
      }
      return true;
    } catch {
      return false;
    }
  }
}
