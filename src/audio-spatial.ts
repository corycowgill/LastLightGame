type Position = { x: number; z: number };

/** Camera-relative stereo and obstruction loss. Walls muffle, rather than erase, danger. */
export function spatialCue(
  listener: Position,
  source: Position,
  yaw: number,
  clear: boolean,
  range = 24,
) {
  const dx = source.x - listener.x,
    dz = source.z - listener.z;
  const distance = Math.hypot(dx, dz);
  const proximity = Math.max(0, 1 - distance / range);
  return {
    distance,
    gain: proximity * proximity * (clear ? 1 : 0.28),
    pan:
      Math.max(
        -1,
        Math.min(
          1,
          (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(1, distance),
        ),
      ) * (clear ? 1 : 0.65),
    muffled: !clear,
  };
}

/** Distance-based contacts: stopping, low frame rates, and teleports never create phantom steps. */
export class FootstepTracker {
  private previous?: Position;
  private distance = 0;
  sample(position: Position, stride: number) {
    if (!this.previous) {
      this.previous = { ...position };
      return false;
    }
    const moved = Math.hypot(
      position.x - this.previous.x,
      position.z - this.previous.z,
    );
    this.previous.x = position.x;
    this.previous.z = position.z;
    if (moved > 2.5) {
      this.distance = 0;
      return false;
    }
    this.distance += moved;
    if (moved < 0.002 || this.distance < stride) return false;
    this.distance %= stride;
    return true;
  }
}
