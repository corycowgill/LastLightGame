import test from "node:test";
import assert from "node:assert/strict";
import { CameraControls, CrouchKey } from "./controls";
class Target extends EventTarget {
  ownerDocument!: Doc;
  focus() {}
  setPointerCapture() {}
  requestPointerLock?: () => Promise<void>;
}
class Doc extends EventTarget {
  pointerLockElement: Target | null = null;
  defaultView = new EventTarget();
  exitPointerLock() {
    this.pointerLockElement = null;
    this.dispatchEvent(new Event("pointerlockchange"));
  }
}
function event(target: EventTarget, type: string, values: object = {}) {
  const e = Object.assign(new Event(type, { cancelable: true }), values);
  target.dispatchEvent(e);
  return e;
}
function setup() {
  const element = new Target(),
    doc = new Doc();
  element.ownerDocument = doc;
  let active = true,
    changes = 0,
    captured = false;
  const controls = new CameraControls(
    element as unknown as HTMLElement,
    () => active,
    () => 1,
    () => changes++,
    (value) => (captured = value),
  );
  return {
    element,
    doc,
    controls,
    setActive: (value: boolean) => (active = value),
    get changes() {
      return changes;
    },
    get captured() {
      return captured;
    },
  };
}
test("drag look works after pointer lock rejection and moves both camera axes", async () => {
  const s = setup();
  s.element.requestPointerLock = () =>
    Promise.reject(new Error("blocked by embed"));
  await s.controls.capture();
  assert.equal(s.captured, false);
  const yaw = s.controls.pose.yaw,
    pitch = s.controls.pose.pitch;
  event(s.element, "pointerdown", {
    button: 0,
    pointerId: 1,
    clientX: 100,
    clientY: 100,
  });
  event(s.doc, "pointermove", { clientX: 300, clientY: 180 });
  assert.ok(s.controls.pose.yaw < yaw - 0.5);
  assert.ok(s.controls.pose.pitch > pitch + 0.2);
  event(s.doc, "pointerup");
  const ended = s.controls.pose.yaw;
  event(s.doc, "pointermove", { clientX: 400, clientY: 180 });
  assert.equal(s.controls.pose.yaw, ended);
  assert.ok(s.changes > 0);
  s.controls.dispose();
});
test("right drag works; inactive menus ignore look and zoom", () => {
  const s = setup();
  event(s.element, "pointerdown", {
    button: 2,
    pointerId: 1,
    clientX: 10,
    clientY: 10,
  });
  event(s.doc, "pointermove", { clientX: 60, clientY: 40 });
  assert.notEqual(s.controls.pose.yaw, -Math.PI / 2);
  s.setActive(false);
  const pose = { ...s.controls.pose };
  event(s.doc, "pointermove", { clientX: 900, clientY: 900 });
  event(s.element, "wheel", { deltaY: 100, deltaMode: 0 });
  s.controls.keyboard(new Set(["ArrowRight"]), 1);
  assert.deepEqual(s.controls.pose, pose);
  s.controls.dispose();
});
test("captured mouse uses relative movement and reports release", async () => {
  const s = setup();
  s.element.requestPointerLock = async () => {
    s.doc.pointerLockElement = s.element;
    s.doc.dispatchEvent(new Event("pointerlockchange"));
  };
  await s.controls.capture();
  assert.equal(s.captured, true);
  const yaw = s.controls.pose.yaw;
  event(s.doc, "mousemove", { movementX: 120, movementY: -80 });
  assert.ok(s.controls.pose.yaw < yaw);
  assert.ok(s.controls.pose.pitch < 0.25);
  s.controls.release();
  assert.equal(s.captured, false);
  s.controls.dispose();
});
test("arrow keys control both axes, wheel zoom clamps, and pitch stays bounded", () => {
  const s = setup();
  s.controls.keyboard(new Set(["ArrowRight", "ArrowDown"]), 0.5);
  assert.ok(s.controls.pose.yaw < -Math.PI / 2);
  assert.ok(s.controls.pose.pitch > 0.25);
  s.controls.keyboard(new Set(["ArrowUp"]), 100);
  assert.equal(s.controls.pose.pitch, -0.35);
  const wheel = event(s.element, "wheel", { deltaY: 100000, deltaMode: 0 });
  assert.equal(wheel.defaultPrevented, true);
  assert.equal(s.controls.pose.distance, 6.5);
  event(s.element, "wheel", { deltaY: -100000, deltaMode: 0 });
  assert.equal(s.controls.pose.distance, 1.6);
  s.controls.dispose();
});
test("blur cancels drag and disposing removes listeners", () => {
  const s = setup();
  event(s.element, "pointerdown", {
    button: 0,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
  });
  event(s.doc.defaultView, "blur");
  const pose = { ...s.controls.pose };
  event(s.doc, "pointermove", { clientX: 100, clientY: 100 });
  assert.deepEqual(s.controls.pose, pose);
  s.controls.dispose();
  event(s.element, "pointerdown", {
    button: 0,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
  });
  event(s.doc, "pointermove", { clientX: 100, clientY: 100 });
  assert.deepEqual(s.controls.pose, pose);
});

test("crouch key: a tap toggles, a hold crouches only while held", () => {
  const c = new CrouchKey();
  c.press(0);
  assert.equal(c.crouching, true);
  c.release(0.1);
  assert.equal(c.crouching, true, "tap toggles crouch on");
  c.press(5);
  c.release(5.1);
  assert.equal(c.crouching, false, "a second tap stands up");
  c.press(10);
  c.release(12);
  assert.equal(c.crouching, false, "a long hold releases on key up");
  c.press(20);
  c.release(20.1);
  c.press(30);
  assert.equal(c.crouching, true);
  c.release(31);
  assert.equal(c.crouching, false, "holding from a toggle also stands up");
  c.press(40);
  c.release(40.1);
  c.cancel();
  assert.equal(c.crouching, false, "running stands up");
  // A key released while the game was paused never arrives: treat as a hold.
  c.press(50);
  c.release(Infinity);
  assert.equal(c.crouching, false);
});

test("invert look flips only the vertical axis of drag look", () => {
  const element = new Target(),
    doc = new Doc();
  element.ownerDocument = doc;
  const controls = new CameraControls(
    element as unknown as HTMLElement,
    () => true,
    () => 1,
    () => {},
    () => {},
    () => true,
  );
  const before = { ...controls.pose };
  event(element, "pointerdown", {
    button: 0,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
  });
  event(doc, "pointermove", { pointerId: 1, clientX: 20, clientY: 30 });
  assert.ok(controls.pose.yaw < before.yaw, "horizontal unchanged");
  assert.ok(controls.pose.pitch < before.pitch, "vertical inverted");
  controls.dispose();
});
