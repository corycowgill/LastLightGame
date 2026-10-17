export type CameraPose = { yaw: number; pitch: number; distance: number };
export const CAMERA_LIMITS = {
  minPitch: -0.35,
  maxPitch: 1.05,
  minDistance: 1.6,
  maxDistance: 6.5,
};
export function orbit(
  pose: CameraPose,
  dx: number,
  dy: number,
  sensitivity: number,
) {
  const gain = 0.003 * Math.max(0.2, Math.min(2, sensitivity));
  pose.yaw -= dx * gain;
  pose.pitch = Math.max(
    CAMERA_LIMITS.minPitch,
    Math.min(CAMERA_LIMITS.maxPitch, pose.pitch + dy * gain),
  );
}
export function zoom(pose: CameraPose, delta: number) {
  pose.distance = Math.max(
    CAMERA_LIMITS.minDistance,
    Math.min(CAMERA_LIMITS.maxDistance, pose.distance + delta * 0.005),
  );
}
/** Mouse capture is optional: browser embeds always retain a drag-to-orbit path. */
export class CameraControls {
  readonly pose: CameraPose = { yaw: -Math.PI / 2, pitch: 0.25, distance: 3.7 };
  private dragging = false;
  private x = 0;
  private y = 0;
  private disposers: (() => void)[] = [];
  constructor(
    private element: HTMLElement,
    private active: () => boolean,
    private sensitivity: () => number,
    private changed: () => void,
    private status: (captured: boolean, unavailable?: boolean) => void,
  ) {
    const doc = element.ownerDocument;
    this.listen(element, "pointerdown", (e: PointerEvent) => {
      if (!this.active() || ![0, 2].includes(e.button)) return;
      e.preventDefault();
      element.focus({ preventScroll: true });
      if (doc.pointerLockElement === element) return;
      this.dragging = true;
      this.x = e.clientX;
      this.y = e.clientY;
      try {
        element.setPointerCapture(e.pointerId);
      } catch {}
    });
    this.listen(doc, "pointermove", (e: PointerEvent) => {
      if (
        !this.active() ||
        !this.dragging ||
        doc.pointerLockElement === element
      )
        return;
      orbit(
        this.pose,
        e.clientX - this.x,
        e.clientY - this.y,
        this.sensitivity(),
      );
      this.x = e.clientX;
      this.y = e.clientY;
      this.changed();
    });
    this.listen(doc, "mousemove", (e: MouseEvent) => {
      if (this.active() && doc.pointerLockElement === element) {
        orbit(this.pose, e.movementX, e.movementY, this.sensitivity());
        this.changed();
      }
    });
    this.listen(doc, "pointerup", () => {
      this.dragging = false;
    });
    this.listen(element, "lostpointercapture", () => {
      this.dragging = false;
    });
    this.listen(doc, "pointercancel", () => {
      this.dragging = false;
    });
    this.listen(element, "contextmenu", (e: Event) => {
      if (this.active()) e.preventDefault();
    });
    this.listen(
      element,
      "wheel",
      (e: WheelEvent) => {
        if (!this.active()) return;
        e.preventDefault();
        zoom(
          this.pose,
          e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1),
        );
        this.changed();
      },
      { passive: false },
    );
    this.listen(doc, "pointerlockchange", () => {
      this.dragging = false;
      this.status(doc.pointerLockElement === element);
    });
    this.listen(doc, "pointerlockerror", () => this.status(false, true));
    this.listen(doc.defaultView!, "blur", () => {
      this.dragging = false;
    });
  }
  private listen(
    target: EventTarget,
    name: string,
    listener: (event: any) => void,
    options?: AddEventListenerOptions,
  ) {
    target.addEventListener(name, listener, options);
    this.disposers.push(() =>
      target.removeEventListener(name, listener, options),
    );
  }
  async capture() {
    if (!this.active()) return;
    const doc = this.element.ownerDocument;
    if (doc.pointerLockElement === this.element) {
      this.release();
      return;
    }
    try {
      if (!this.element.requestPointerLock) {
        this.status(false, true);
        return;
      }
      await this.element.requestPointerLock();
    } catch {
      this.status(false, true);
    }
  }
  release() {
    this.dragging = false;
    if (this.element.ownerDocument.pointerLockElement === this.element)
      this.element.ownerDocument.exitPointerLock?.();
  }
  keyboard(keys: ReadonlySet<string>, dt: number) {
    if (!this.active()) return;
    const horizontal =
        Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft")),
      vertical = Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp"));
    if (horizontal || vertical) {
      orbit(this.pose, horizontal * 500 * dt, vertical * 360 * dt, 1);
      this.changed();
    }
  }
  dispose() {
    this.release();
    this.disposers.forEach((dispose) => dispose());
  }
}
