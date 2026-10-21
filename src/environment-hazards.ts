import type { World, Point } from "./simulation";
import { floorAt } from "./room-design";
import { blockedByProp } from "./crypt-layout";
export type HazardKind = "bones" | "chains" | "vapor";
export type EnvironmentHazard = Point & {
  id: number;
  kind: HazardKind;
  offset: number;
};
export const HAZARD_CONFIG = {
  radius: 1.25,
  warningRadius: 5,
  cycle: 10,
  warningStart: 5,
  activeStart: 7,
  vaporSpeed: 0.55,
  staminaDrain: 0.32,
  noiseDuration: 2.2,
  triggerCooldown: 4,
};
export function vaporPhase(h: EnvironmentHazard, elapsed: number) {
  const t =
    (((elapsed + h.offset) % HAZARD_CONFIG.cycle) + HAZARD_CONFIG.cycle) %
    HAZARD_CONFIG.cycle;
  return t >= HAZARD_CONFIG.activeStart
    ? "active"
    : t >= HAZARD_CONFIG.warningStart
      ? "warning"
      : "quiet";
}
/** Small optional room patches, never walls or navigation blockers. Early rooms and rewards stay clear. */
export function planEnvironmentHazards(
  world: World,
  rewards: Point[] = [],
): EnvironmentHazard[] {
  const result: EnvironmentHazard[] = [];
  const kinds: HazardKind[] = ["bones", "chains", "vapor"];
  for (const [index, room] of (world.layout?.rooms ?? []).entries()) {
    if (
      index < 2 ||
      room.kind === "sanctuary" ||
      Math.hypot(room.x * 2 - world.exit.x, room.z * 2 - world.exit.z) < 9
    )
      continue;
    const kind =
      room.design === "flooded"
        ? "vapor"
        : kinds[(index + (world.seed >>> 0)) % 3];
    const candidates = [
      [0, 3],
      [3, 0],
      [0, -3],
      [-3, 0],
      [3, 3],
      [-3, -3],
    ];
    for (const [dx, dz] of candidates) {
      const p = { x: room.x * 2 + dx, z: room.z * 2 + dz };
      if (
        !floorAt(world, p.x, p.z, 1.5) ||
        blockedByProp(world, p.x, p.z, 1.4) ||
        rewards.some((r) => Math.hypot(r.x - p.x, r.z - p.z) < 3.5) ||
        (world.landmarkDecoration &&
          Math.hypot(
            world.landmarkDecoration.x - p.x,
            world.landmarkDecoration.z - p.z,
          ) < 3)
      )
        continue;
      result.push({
        ...p,
        id: index,
        kind,
        offset: ((Math.imul(world.seed, 31) + index * 17) >>> 0) % 10,
      });
      break;
    }
  }
  return result;
}
export function hazardEffect(
  h: EnvironmentHazard,
  elapsed: number,
  moving: boolean,
  crouched: boolean,
  sprint: boolean,
) {
  if (h.kind === "vapor")
    return { noise: false, slow: vaporPhase(h, elapsed) === "active" };
  return {
    noise: moving && (h.kind === "chains" ? !crouched : sprint || !crouched),
    slow: false,
  };
}
export function hazardWarning(h: EnvironmentHazard, elapsed: number) {
  if (h.kind === "bones")
    return "LOOSE BONES · CROUCH TO CROSS QUIETLY OR GO AROUND";
  if (h.kind === "chains")
    return "HANGING CHAINS · CROUCH UNDER THEM TO AVOID THE RATTLE";
  const phase = vaporPhase(h, elapsed);
  return phase === "active"
    ? "FREEZING VAPOR · GO AROUND OR WAIT FOR IT TO CLEAR"
    : phase === "warning"
      ? "THE VENT IS HISSING · STEP BACK BEFORE IT ERUPTS"
      : "COLD VENT · WATCH ITS CYCLE; LEAVE ROOM TO ESCAPE";
}
