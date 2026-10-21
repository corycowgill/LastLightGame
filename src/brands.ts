/** Temporary, stationary fire. Costs fifteen seconds of Steady fuel for eighteen
 * seconds of weak protection: four metres, compared with Steady light at nine.
 * It lasts through extinction/grace, but cannot travel with the escaping player. */
export const BRAND_CONFIG = {
  fuelCost: 90,
  lifetime: 18,
  repelRadius: 4,
  cooldown: 24,
  maxActive: 1,
} as const;

export type Brand = { id: number; x: number; z: number; remaining: number };
type Point = { x: number; z: number };
export type DropBrandFailure = "fuel" | "cooldown" | "active" | "placement";
export type DropBrandResult =
  | { ok: true; brand: Brand; fuel: number; cooldown: number }
  | { ok: false; reason: DropBrandFailure };

/** walkable must include prop collisions and a small footprint (about 0.15m).
 * Every point between the player and the brand is tested, so a valid destination
 * on the other side of a thin wall cannot be used. No input state is mutated. */
export function tryDropBrand(options: {
  fuel: number;
  cooldown: number;
  brands: readonly Brand[];
  player: Point;
  yaw: number;
  nextId: number;
  walkable: (x: number, z: number) => boolean;
}): DropBrandResult {
  const { fuel, cooldown, brands, player, yaw, nextId, walkable } = options;
  // Keep one second of Steady fuel, avoiding an accidental instantaneous Hunt.
  if (!Number.isFinite(fuel) || fuel < BRAND_CONFIG.fuelCost + 6)
    return { ok: false, reason: "fuel" };
  if (cooldown > 0) return { ok: false, reason: "cooldown" };
  if (
    brands.filter((brand) => brand.remaining > 0).length >=
    BRAND_CONFIG.maxActive
  )
    return { ok: false, reason: "active" };
  if (!Number.isFinite(yaw) || !walkable(player.x, player.z))
    return { ok: false, reason: "placement" };

  let placement = { ...player };
  // Player forward is (-sin(yaw), -cos(yaw)); leave fire behind their feet.
  for (let step = 1; step <= 6; step++) {
    const x = player.x + Math.sin(yaw) * step * 0.1;
    const z = player.z + Math.cos(yaw) * step * 0.1;
    if (!walkable(x, z)) break;
    placement = { x, z };
  }
  return {
    ok: true,
    brand: { id: nextId, ...placement, remaining: BRAND_CONFIG.lifetime },
    fuel: fuel - BRAND_CONFIG.fuelCost,
    cooldown: BRAND_CONFIG.cooldown,
  };
}

export function stepBrands(brands: readonly Brand[], dt: number): Brand[] {
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  return brands
    .map((brand) => ({ ...brand, remaining: brand.remaining - elapsed }))
    .filter((brand) => brand.remaining > 0);
}

/** The same physical line-of-sight check used by enemy perception belongs here.
 * Fire cannot repel through walls. Expired brands have no gameplay influence. */
export function brandRepels(
  brands: readonly Brand[],
  target: Point,
  lineOfSight: (from: Point, to: Point) => boolean,
): Brand | undefined {
  let nearest: Brand | undefined;
  let distance: number = BRAND_CONFIG.repelRadius;
  for (const brand of brands) {
    if (brand.remaining <= 0) continue;
    const candidateDistance = Math.hypot(
      brand.x - target.x,
      brand.z - target.z,
    );
    if (candidateDistance <= distance && lineOfSight(brand, target)) {
      nearest = brand;
      distance = candidateDistance;
    }
  }
  return nearest;
}
