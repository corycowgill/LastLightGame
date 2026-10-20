export type GraphicsMode = "auto" | "high" | "low";

/** Render-only adaptation. Never feeds back into simulation or perception. */
export class RenderBudget {
  level = 0;
  private seconds = 0;
  private frames = 0;
  private warmup = 2;
  private nextShadow = new Map<string, number>();
  constructor(public mode: GraphicsMode = "auto") {}

  sample(dt: number) {
    // Ignore tab suspension and isolated stalls; require sustained pressure.
    if (this.mode !== "auto" || dt <= 0 || dt > 2 || !Number.isFinite(dt))
      return false;
    dt = Math.min(dt, 0.1);
    if (this.warmup > 0) {
      this.warmup -= dt;
      return false;
    }
    this.seconds += dt;
    this.frames++;
    if (this.seconds < 3) return false;
    const fps = this.frames / this.seconds;
    this.seconds = 0;
    this.frames = 0;
    if (fps < 42 && this.level < 2) {
      this.level++;
      return true;
    }
    // Keep the reduced budget for this expedition: avoid quality oscillation.
    return false;
  }
  get shadows() {
    return this.mode !== "low" && this.level < 2;
  }
  pixelRatio(device: number) {
    return this.mode === "low" || this.level === 2
      ? Math.min(device, 1)
      : Math.min(device, this.level === 1 ? 1.15 : 1.6);
  }
  /** At most one six-face point shadow refresh per render frame. */
  shadow(now: number, candidates: { id: string; hz: number }[]) {
    if (!this.shadows) return undefined;
    const due = candidates.filter(
      (c) => now >= (this.nextShadow.get(c.id) ?? -1),
    );
    const selected = due.sort(
      (a, b) =>
        (this.nextShadow.get(a.id) ?? -1) - (this.nextShadow.get(b.id) ?? -1),
    )[0];
    if (!selected) return undefined;
    this.nextShadow.set(selected.id, now + 1 / selected.hz);
    return selected.id;
  }
}
