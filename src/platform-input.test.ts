import test from "node:test";
import assert from "node:assert/strict";
import {
  ControllerInput,
  TouchInput,
  combineMovement,
  stick,
  type PadSnapshot,
  type PlatformAction,
} from "./platform-input";
import { CameraControls } from "./controls";
function pad(axes = [0, 0, 0, 0], pressed: number[] = []): PadSnapshot {
  return {
    index: 0,
    mapping: "standard",
    connected: true,
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({
      pressed: pressed.includes(i),
      value: pressed.includes(i) ? 1 : 0,
    })),
  };
}
test("Xbox sticks have radial deadzones and preserve analog movement", () => {
  const c = new ControllerInput(() => {});
  c.update(pad([0.1, -0.1, 0.1, 0]), 1 / 60, true);
  assert.deepEqual(c.movement, {
    forward: 0,
    strafe: 0,
    sprint: false,
    crouch: false,
  });
  assert.deepEqual(c.look, { x: 0, y: 0 });
  c.update(pad([0.5, -0.5, 1, -1]), 1 / 60, true);
  assert.ok(c.movement.forward > 0.4 && c.movement.forward < 0.6);
  assert.ok(c.look.x > 0 && c.look.y < 0);
  assert.ok(Math.hypot(c.look.x, c.look.y) <= 1.0001);
});
test("Xbox actions use press edges and do not repeat while held", () => {
  const actions: PlatformAction[] = [],
    c = new ControllerInput((a) => actions.push(a));
  c.update(pad(undefined, [0, 2, 3, 4, 5, 8, 11]), 1 / 60, true);
  assert.deepEqual(actions, [
    "interact",
    "burst",
    "chalk",
    "previousMode",
    "brand",
    "journal",
    "recenter",
  ]);
  c.update(pad(undefined, [0, 2, 3, 4, 5, 8, 11]), 1 / 60, true);
  assert.equal(actions.length, 7);
  c.update(pad(), 1 / 60, true);
  c.update(pad(undefined, [0]), 1 / 60, true);
  assert.equal(actions.at(-1), "interact");
  assert.equal(actions.length, 8);
});
test("Xbox triggers, sprint click and crouch toggle map independently", () => {
  const c = new ControllerInput(() => {});
  c.update(pad(undefined, [6, 7]), 1 / 60, true);
  assert.equal(c.movement.crouch, true);
  assert.equal(c.movement.sprint, true);
  c.update(pad(), 1 / 60, true);
  assert.equal(c.movement.crouch, false);
  c.update(pad(undefined, [1, 10]), 1 / 60, true);
  assert.equal(c.movement.crouch, true);
  assert.equal(c.movement.sprint, true);
  c.update(pad(undefined, [1]), 1 / 60, true);
  assert.equal(c.movement.crouch, true);
  c.update(pad(), 1 / 60, true);
  c.update(pad(undefined, [1]), 1 / 60, true);
  assert.equal(c.movement.crouch, false);
});
test("controller disconnection and unsupported mappings release movement", () => {
  const c = new ControllerInput(() => {});
  c.update(pad([1, 1, 1, 1], [7]), 1 / 60, true);
  c.update(null, 1 / 60, true);
  assert.equal(c.connected, false);
  assert.equal(c.movement.forward, 0);
  assert.equal(c.movement.sprint, false);
  assert.deepEqual(c.look, { x: 0, y: 0 });
  c.update({ ...pad([1, 1, 1, 1]), mapping: "" }, 1 / 60, true);
  assert.equal(c.connected, false);
  assert.equal(c.movement.strafe, 0);
});
test("Xbox menus support A/B, D-pad, stick repeat, and Menu pause edges", () => {
  const actions: PlatformAction[] = [],
    c = new ControllerInput((a) => actions.push(a));
  c.update(pad(undefined, [0]), 0.016, false);
  c.update(pad(undefined, [0]), 0.016, false);
  assert.deepEqual(actions, ["menuAccept"]);
  c.update(pad(undefined, [1, 13]), 0.016, false);
  assert.deepEqual(actions.slice(-2), ["menuBack", "menuDown"]);
  c.update(pad(undefined, [13]), 0.1, false);
  assert.equal(actions.filter((a) => a === "menuDown").length, 1);
  c.update(pad(undefined, [13]), 0.3, false);
  assert.equal(actions.filter((a) => a === "menuDown").length, 2);
  c.update(pad(undefined, [9]), 0.016, true);
  c.update(pad(undefined, [9]), 0.016, false);
  assert.equal(actions.filter((a) => a === "pause").length, 1);
  assert.equal(c.movement.forward, 0);
});
test("combining touch, pad and keyboard clamps diagonal speed and retains holds", () => {
  const combined = combineMovement(
    { forward: 1, strafe: 0, sprint: false, crouch: false },
    { forward: 1, strafe: 1, sprint: true, crouch: true },
  );
  assert.ok(Math.abs(Math.hypot(combined.forward, combined.strafe) - 1) < 1e-6);
  assert.equal(combined.sprint, true);
  assert.equal(combined.crouch, true);
  assert.deepEqual(stick(NaN, 1), { x: 0, y: 0 });
});
class Doc extends EventTarget {
  hidden = false;
  pointerLockElement = null;
  defaultView = new EventTarget();
}
class Element extends EventTarget {
  style = { transform: "" };
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  ownerDocument: Doc;
  children = new Map<string, Element>();
  groups = new Map<string, Element[]>();
  constructor(doc: Doc) {
    super();
    this.ownerDocument = doc;
  }
  focus() {}
  setPointerCapture() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 120, height: 120 };
  }
  setAttribute(k: string, v: string) {
    this.attributes.set(k, v);
  }
  querySelector(s: string) {
    return this.children.get(s) ?? null;
  }
  querySelectorAll(s: string) {
    return this.groups.get(s) ?? [];
  }
}
function send(target: EventTarget, type: string, props: object = {}) {
  const event = Object.assign(new Event(type, { cancelable: true }), props);
  target.dispatchEvent(event);
  return event;
}
function touchSetup() {
  const doc = new Doc(),
    root = new Element(doc);
  for (const name of ["movePad", "moveKnob", "touchSprint", "touchCrouch"])
    root.children.set("#" + name, new Element(doc));
  const action = new Element(doc);
  action.dataset.touchAction = "interact";
  root.groups.set("[data-touch-action]", [action]);
  const mode = new Element(doc);
  mode.dataset.touchMode = "2";
  root.groups.set("[data-touch-mode]", [mode]);
  const zoom = new Element(doc);
  zoom.dataset.touchZoom = "-140";
  root.groups.set("[data-touch-zoom]", [zoom]);
  const actions: PlatformAction[] = [],
    zooms: number[] = [];
  let active = true;
  const touch = new TouchInput(
    root as unknown as HTMLElement,
    () => active,
    (a) => actions.push(a),
    (d) => zooms.push(d),
    () => {},
  );
  return {
    doc,
    root,
    touch,
    actions,
    zooms,
    setActive: (v: boolean) => (active = v),
  };
}
test("touch movement, camera look and sprint track three fingers independently", () => {
  const s = touchSetup(),
    view = new Element(s.doc),
    camera = new CameraControls(
      view as unknown as HTMLElement,
      () => true,
      () => 1,
      () => {},
      () => {},
    ),
    joystick = s.root.children.get("#movePad")!,
    sprint = s.root.children.get("#touchSprint")!;
  send(joystick, "pointerdown", { pointerId: 1, clientX: 60, clientY: 60 });
  send(view, "pointerdown", {
    pointerId: 2,
    button: 0,
    clientX: 100,
    clientY: 100,
  });
  send(sprint, "pointerdown", { pointerId: 3 });
  send(s.doc, "pointermove", { pointerId: 1, clientX: 102, clientY: 60 });
  assert.equal(s.touch.movement.strafe, 1);
  assert.equal(camera.pose.yaw, -Math.PI / 2);
  assert.equal(s.touch.movement.sprint, true);
  send(s.doc, "pointermove", { pointerId: 2, clientX: 200, clientY: 130 });
  assert.ok(camera.pose.yaw < -Math.PI / 2);
  const angle = camera.pose.yaw;
  send(s.doc, "pointerup", { pointerId: 1 });
  assert.equal(s.touch.movement.strafe, 0);
  assert.equal(s.touch.movement.sprint, true);
  send(s.doc, "pointermove", { pointerId: 2, clientX: 250, clientY: 130 });
  assert.ok(camera.pose.yaw < angle);
  send(s.doc, "pointercancel", { pointerId: 3 });
  assert.equal(s.touch.movement.sprint, false);
  camera.dispose();
  s.touch.dispose();
});
test("touch actions, mode, zoom and crouch toggle remain usable without keyboard", () => {
  const s = touchSetup();
  send(s.root.groups.get("[data-touch-action]")![0], "click");
  assert.deepEqual(s.actions, ["interact"]);
  send(s.root.children.get("#touchCrouch")!, "click");
  assert.equal(s.touch.movement.crouch, true);
  send(s.root.groups.get("[data-touch-zoom]")![0], "click");
  assert.deepEqual(s.zooms, [-140]);
  let mode = -1;
  s.root.addEventListener(
    "flamemode",
    (e) => (mode = (e as CustomEvent).detail),
  );
  send(s.root.groups.get("[data-touch-mode]")![0], "click");
  assert.equal(mode, 2);
  s.setActive(false);
  send(s.root.groups.get("[data-touch-action]")![0], "click");
  assert.equal(s.actions.length, 1);
  s.touch.dispose();
});
test("pause reset and app backgrounding release held touch controls", () => {
  const s = touchSetup(),
    pad = s.root.children.get("#movePad")!,
    sprint = s.root.children.get("#touchSprint")!;
  send(pad, "pointerdown", { pointerId: 1, clientX: 60, clientY: 20 });
  send(sprint, "pointerdown", { pointerId: 2 });
  assert.ok(s.touch.movement.forward > 0.5);
  s.touch.reset();
  send(s.doc, "pointermove", { pointerId: 1, clientX: 60, clientY: 10 });
  assert.equal(s.touch.movement.forward, 0);
  assert.equal(s.touch.movement.sprint, false);
  send(pad, "pointerdown", { pointerId: 3, clientX: 20, clientY: 60 });
  send(s.doc.defaultView, "blur");
  assert.equal(s.touch.movement.strafe, 0);
  s.touch.dispose();
});

test("D-pad Up throws one stone per press during play", () => {
  const actions: PlatformAction[] = [];
  const c = new ControllerInput((a) => actions.push(a));
  c.update(pad([], [12]), 1 / 60, true);
  c.update(pad([], [12]), 1 / 60, true);
  assert.deepEqual(actions, ["stone"]);
});

test("forward joystick rim sprints without a third finger and releases safely", () => {
  const s = touchSetup(),
    pad = s.root.children.get("#movePad")!;
  send(pad, "pointerdown", { pointerId: 1, clientX: 60, clientY: 35 });
  assert.equal(s.touch.movement.sprint, false);
  send(s.doc, "pointermove", { pointerId: 1, clientX: 60, clientY: 18 });
  assert.equal(s.touch.movement.sprint, true);
  send(s.root.children.get("#touchCrouch")!, "click");
  assert.equal(s.touch.movement.sprint, false);
  send(s.root.children.get("#touchCrouch")!, "click");
  assert.equal(s.touch.movement.sprint, true);
  send(s.doc, "pointermove", { pointerId: 1, clientX: 60, clientY: 35 });
  assert.equal(s.touch.movement.sprint, false);
  send(s.doc, "pointermove", { pointerId: 1, clientX: 60, clientY: 18 });
  send(s.doc, "pointercancel", { pointerId: 1 });
  assert.equal(s.touch.movement.sprint, false);
  assert.equal(s.touch.movement.forward, 0);
  s.touch.dispose();
});

test("controller look eases in for fine aim but keeps full-tilt speed", () => {
  const c = new ControllerInput(() => {});
  c.update(pad([0, 0, 1, 0]), 1 / 60, true);
  assert.ok(Math.abs(c.look.x - 1) < 1e-9, "full deflection unchanged");
  c.update(pad([0, 0, 0.5, 0]), 1 / 60, true);
  const half = c.look.x;
  // A half push past the deadzone turns well under half speed.
  assert.ok(half > 0 && half < 0.3, `half push ${half}`);
  c.update(pad([0, 0, 0.6, 0.6]), 1 / 60, true);
  assert.ok(Math.abs(c.look.x - c.look.y) < 1e-9, "direction preserved");
});
