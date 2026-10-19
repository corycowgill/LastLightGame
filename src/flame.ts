/** Render-only sputtering: never changes fuel, perception or extinction timing. */
export function flameFlicker(time: number, fuelFraction: number) {
  const ordinary =
    1 +
    (fuelFraction < 0.25 ? 0.18 : 0.06) * Math.sin(time * 19) +
    0.04 * Math.sin(time * 31);
  if (fuelFraction >= 0.1) return ordinary;
  // Uneven, bounded dips rather than rapid on/off flashes or a false extinction.
  const dip = Math.pow(
    Math.max(0, Math.sin(time * 5.3 + Math.sin(time * 1.7) * 1.4)),
    4,
  );
  return ordinary * (1 - 0.78 * dip);
}
