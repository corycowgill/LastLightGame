export type PlatformAction =
  | "interact"
  | "brand"
  | "stone"
  | "burst"
  | "chalk"
  | "journal"
  | "pause"
  | "previousMode"
  | "nextMode"
  | "recenter"
  | "menuAccept"
  | "menuBack"
  | "menuUp"
  | "menuDown"
  | "menuLeft"
  | "menuRight";
export type Movement = {
  forward: number;
  strafe: number;
  sprint: boolean;
  crouch: boolean;
};
export type PadSnapshot = {
  index: number;
  mapping: string;
  connected: boolean;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
};
export function stick(x: number, y: number, deadzone = 0.18) {
  const size = Math.hypot(x, y);
  if (!Number.isFinite(size) || size <= deadzone) return { x: 0, y: 0 };
  const scale = Math.min(1, (size - deadzone) / (1 - deadzone)) / size;
  return { x: x * scale, y: y * scale };
}
export class ControllerInput {
  movement: Movement = { forward: 0, strafe: 0, sprint: false, crouch: false };
  look = { x: 0, y: 0 };
  connected = false;
  used = false;
  private previous = new Set<number>();
  private index = -1;
  private crouched = false;
  private repeat = 0;
  private direction = "";
  constructor(private action: (action: PlatformAction) => void) {}
  update(pad: PadSnapshot | null, dt: number, playing: boolean) {
    this.used = false;
    this.connected = !!pad && pad.connected && pad.mapping === "standard";
    if (!this.connected || !pad) {
      this.reset();
      this.index = -1;
      return;
    }
    if (pad.index !== this.index) {
      this.reset();
      this.index = pad.index;
    }
    const buttons = new Set(
        pad.buttons.flatMap((b, i) => (b.pressed || b.value > 0.5 ? [i] : [])),
      ),
      edge = (i: number) => buttons.has(i) && !this.previous.has(i);
    const left = stick(pad.axes[0] ?? 0, pad.axes[1] ?? 0),
      right = stick(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
    this.used = !!(left.x || left.y || right.x || right.y || buttons.size);
    this.movement = { forward: 0, strafe: 0, sprint: false, crouch: false };
    this.look = { x: 0, y: 0 };
    // Save edges before dispatch: menu actions can synchronously change the screen.
    const edges = new Set([...buttons].filter((i) => edge(i)));
    this.previous = buttons;
    if (edges.has(9)) {
      this.action("pause");
      return;
    }
    if (!playing) {
      if (edges.has(0)) this.action("menuAccept");
      if (edges.has(1)) this.action("menuBack");
      const direction =
        buttons.has(12) || left.y < -0.5
          ? "menuUp"
          : buttons.has(13) || left.y > 0.5
            ? "menuDown"
            : buttons.has(14) || left.x < -0.5
              ? "menuLeft"
              : buttons.has(15) || left.x > 0.5
                ? "menuRight"
                : "";
      this.repeat -= dt;
      if (direction && (direction !== this.direction || this.repeat <= 0)) {
        this.action(direction as PlatformAction);
        this.repeat = direction !== this.direction ? 0.32 : 0.16;
      }
      this.direction = direction;
      return;
    }
    this.direction = "";
    if (edges.has(1)) this.crouched = !this.crouched;
    this.movement = {
      forward: -left.y || 0,
      strafe: left.x,
      sprint: buttons.has(7) || buttons.has(10),
      crouch: this.crouched || buttons.has(6),
    };
    this.look = right;
    const actions: Record<number, PlatformAction> = {
      0: "interact",
      2: "burst",
      3: "chalk",
      4: "previousMode",
      5: "brand",
      8: "journal",
      11: "recenter",
      12: "stone",
      14: "previousMode",
      15: "nextMode",
    };
    for (const i of edges) if (actions[i]) this.action(actions[i]);
  }
  reset() {
    this.movement = { forward: 0, strafe: 0, sprint: false, crouch: false };
    this.look = { x: 0, y: 0 };
    this.previous.clear();
    this.crouched = false;
    this.repeat = 0;
    this.direction = "";
  }
}
export function combineMovement(...inputs: Movement[]): Movement {
  let forward = 0,
    strafe = 0;
  for (const input of inputs) {
    forward += input.forward;
    strafe += input.strafe;
  }
  const length = Math.max(1, Math.hypot(forward, strafe));
  return {
    forward: forward / length,
    strafe: strafe / length,
    sprint: inputs.some((i) => i.sprint),
    crouch: inputs.some((i) => i.crouch),
  };
}
/** Each held control owns its pointer, allowing movement + look + action on iPhone. */
export class TouchInput {
  movement: Movement = { forward: 0, strafe: 0, sprint: false, crouch: false };
  private pointer: number | null = null;
  private sprintPointers = new Set<number>();
  private cleanups: (() => void)[] = [];
  constructor(
    private root: HTMLElement,
    private active: () => boolean,
    private action: (action: PlatformAction) => void,
    private zoom: (delta: number) => void,
    private used: () => void,
  ) {
    const doc = root.ownerDocument,
      pad = root.querySelector<HTMLElement>("#movePad")!,
      knob = root.querySelector<HTMLElement>("#moveKnob")!;
    const move = (e: PointerEvent) => {
      if (this.pointer !== e.pointerId || !this.active()) return;
      const r = pad.getBoundingClientRect(),
        radius = r.width * 0.35,
        dx = (e.clientX - r.left - r.width / 2) / radius,
        dy = (e.clientY - r.top - r.height / 2) / radius,
        v = stick(dx, dy, 0.08);
      this.movement.strafe = v.x;
      this.movement.forward = -v.y || 0;
      knob.style.transform = `translate(${v.x * radius}px,${v.y * radius}px)`;
    };
    this.listen(pad, "pointerdown", (e: PointerEvent) => {
      if (!this.active() || this.pointer !== null) return;
      e.preventDefault();
      this.used();
      this.pointer = e.pointerId;
      try {
        pad.setPointerCapture(e.pointerId);
      } catch {}
      move(e);
    });
    this.listen(doc, "pointermove", move);
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointer) return;
      this.pointer = null;
      this.movement.forward = this.movement.strafe = 0;
      knob.style.transform = "";
    };
    this.listen(doc, "pointerup", end);
    this.listen(doc, "pointercancel", end);
    this.listen(pad, "lostpointercapture", end);
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-touch-action]",
    ))
      this.listen(button, "click", () => {
        if (this.active()) {
          this.used();
          this.action(button.dataset.touchAction as PlatformAction);
        }
      });
    const sprint = root.querySelector<HTMLElement>("#touchSprint")!;
    this.listen(sprint, "pointerdown", (e: PointerEvent) => {
      if (!this.active()) return;
      e.preventDefault();
      this.used();
      this.sprintPointers.add(e.pointerId);
      this.movement.sprint = true;
      try {
        sprint.setPointerCapture(e.pointerId);
      } catch {}
    });
    const releaseSprint = (e: PointerEvent) => {
      this.sprintPointers.delete(e.pointerId);
      this.movement.sprint = this.sprintPointers.size > 0;
    };
    this.listen(doc, "pointerup", releaseSprint);
    this.listen(doc, "pointercancel", releaseSprint);
    this.listen(sprint, "lostpointercapture", releaseSprint);
    const crouch = root.querySelector<HTMLButtonElement>("#touchCrouch")!;
    this.listen(crouch, "click", () => {
      if (!this.active()) return;
      this.used();
      this.movement.crouch = !this.movement.crouch;
      crouch.setAttribute("aria-pressed", String(this.movement.crouch));
    });
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-touch-mode]",
    ))
      this.listen(button, "click", () => {
        if (this.active()) {
          this.used();
          root.dispatchEvent(
            new CustomEvent("flamemode", {
              detail: Number(button.dataset.touchMode),
              bubbles: true,
            }),
          );
        }
      });
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-touch-zoom]",
    ))
      this.listen(button, "click", () => {
        if (this.active()) {
          this.used();
          this.zoom(Number(button.dataset.touchZoom));
        }
      });
    this.listen(doc.defaultView!, "blur", () => this.reset());
    this.listen(doc, "visibilitychange", () => {
      if (doc.hidden) this.reset();
    });
  }
  private listen(
    target: EventTarget,
    name: string,
    listener: (event: any) => void,
  ) {
    target.addEventListener(name, listener);
    this.cleanups.push(() => target.removeEventListener(name, listener));
  }
  reset() {
    this.pointer = null;
    this.sprintPointers.clear();
    this.movement = { forward: 0, strafe: 0, sprint: false, crouch: false };
    const knob = this.root.querySelector<HTMLElement>("#moveKnob");
    if (knob) knob.style.transform = "";
    this.root
      .querySelector("#touchCrouch")
      ?.setAttribute("aria-pressed", "false");
  }
  dispose() {
    this.reset();
    this.cleanups.forEach((fn) => fn());
  }
}
