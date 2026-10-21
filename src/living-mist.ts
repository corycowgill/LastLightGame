import type { Point, World } from "./simulation";
export const MIST_CONFIG = {
  initial: 0.62,
  refill: 0.045,
  clear: 1.6,
  interval: 0.2,
  range: 24,
  exposureRise: 0.055,
  exposureRecovery: 0.32,
  maxSlow: 0.08,
  coughThreshold: 0.65,
  coughCooldown: 6,
};
export type MistFire = Point & { radius: number };
const key = (x: number, z: number) =>
  `${Math.round(x / 2)},${Math.round(z / 2)}`;
export class LivingMist {
  readonly cells: { x: number; z: number; density: number }[];
  private index = new Map<string, { x: number; z: number; density: number }>();
  private accumulator = 0;
  exposure = 0;
  sheltered = false;
  constructor(world: World) {
    this.cells = world.cells.map((c) => ({
      x: c.x * 2,
      z: c.z * 2,
      density:
        Math.min(
          Math.hypot(c.x * 2 - world.start.x, c.z * 2 - world.start.z),
          Math.hypot(c.x * 2 - world.exit.x, c.z * 2 - world.exit.z),
        ) < 8
          ? 0
          : MIST_CONFIG.initial,
    }));
    for (const c of this.cells) this.index.set(key(c.x, c.z), c);
  }
  densityAt(p: Point) {
    return this.index.get(key(p.x, p.z))?.density ?? 0;
  }
  step(
    dt: number,
    player: Point,
    fires: MistFire[],
    visible: (a: Point, b: Point) => boolean,
  ) {
    this.accumulator += dt;
    if (this.accumulator >= MIST_CONFIG.interval) {
      const step = this.accumulator;
      this.accumulator = 0;
      for (const c of this.cells) {
        if (Math.hypot(c.x - player.x, c.z - player.z) > MIST_CONFIG.range)
          continue;
        const protectedByFire = fires.some(
          (f) => Math.hypot(c.x - f.x, c.z - f.z) < f.radius && visible(f, c),
        );
        c.density = Math.max(
          0,
          Math.min(
            1,
            c.density +
              step *
                (protectedByFire ? -MIST_CONFIG.clear : MIST_CONFIG.refill),
          ),
        );
      }
    }
    const safe = fires.some(
      (f) =>
        Math.hypot(player.x - f.x, player.z - f.z) < f.radius &&
        visible(f, player),
    );
    this.sheltered = safe;
    const density = this.densityAt(player);
    this.exposure = Math.max(
      0,
      Math.min(
        1,
        this.exposure +
          dt *
            (safe || density < 0.35
              ? -MIST_CONFIG.exposureRecovery
              : MIST_CONFIG.exposureRise * density),
      ),
    );
  }
  save() {
    return {
      exposure: this.exposure,
      densities: this.cells.map((c) => Math.round(c.density * 100)),
    };
  }
  load(value: unknown) {
    const d = value as { exposure?: number; densities?: number[] } | undefined;
    if (!d) return;
    this.exposure = Number.isFinite(d.exposure)
      ? Math.max(0, Math.min(1, d.exposure!))
      : 0;
    if (Array.isArray(d.densities) && d.densities.length === this.cells.length)
      d.densities.forEach((v, i) => {
        if (Number.isFinite(v))
          this.cells[i].density = Math.max(0, Math.min(1, v / 100));
      });
  }
}
