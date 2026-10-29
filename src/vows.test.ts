import test from "node:test";
import assert from "node:assert/strict";
import { Game, VOWS, VOW_CONFIG } from "./simulation";

const idle = { forward: 0, strafe: 0, sprint: false, crouch: false, yaw: 0 };
/** A veteran's expedition sworn to the given Vow. */
const sworn = (id: (typeof VOWS)[number]["id"], seed = 104729) => {
  const g = new Game(seed);
  g.banked = 1;
  g.reset(seed);
  g.rollVow();
  g.vowIndex = VOWS.findIndex((v) => v.id === id);
  g.enemies = [];
  return g;
};
const reachFarFire = (g: Game, relics: number) => {
  g.artifacts = relics;
  Object.assign(g.player, g.destination);
  const before = g.banked;
  g.interact();
  assert.equal(g.completed, true);
  return g.banked - before - relics - g.descentBonus;
};

test("a first-ever expedition swears no Vow; veterans swear a seeded one", () => {
  const novice = new Game(5);
  novice.rollVow();
  assert.equal(novice.vow, undefined);
  const seen = new Set<string>();
  for (let seed = 1; seed <= 40; seed++) {
    const g = new Game(seed);
    g.banked = 2;
    g.reset(seed);
    g.rollVow();
    const again = g.vowIndex;
    g.rollVow();
    assert.equal(g.vowIndex, again, "seeded");
    seen.add(g.vow!.id);
  }
  assert.equal(seen.size, VOWS.length, "every Vow appears");
});

test("a kept Vow pays at the far fire; turning back forfeits it", () => {
  assert.equal(reachFarFire(sworn("silence"), 2), VOW_CONFIG.reward);
  const back = sworn("silence");
  back.artifacts = 4;
  Object.assign(back.player, { x: back.start.x, z: back.start.z + 2 });
  back.interact();
  assert.equal(back.completed, true);
  assert.equal(back.vowBonus, 0);
});

test("running, Blaze and a dead flame each break their Vow", () => {
  const silence = sworn("silence");
  silence.step(1 / 60, { ...idle, forward: 1, sprint: true });
  assert.equal(silence.vowBroken, true);
  assert.match(silence.message, /Vow of Silence is broken/);
  assert.equal(reachFarFire(silence, 3), 0);
  const quiet = sworn("silence");
  quiet.step(1 / 60, { ...idle, forward: 1, crouch: true });
  assert.equal(quiet.vowBroken, false);

  const ember = sworn("ember");
  ember.setMode(2);
  ember.step(1 / 60, idle);
  assert.equal(ember.vowBroken, true);

  const flame = sworn("flame");
  Object.assign(flame.player, { x: 28, z: 0 });
  flame.fuel = 0.01;
  for (let i = 0; i < 120 && !flame.vowBroken; i++) flame.step(1 / 60, idle);
  assert.equal(flame.vowBroken, true);
  // Other Vows ignore what they did not forbid.
  const other = sworn("burden");
  other.setMode(2);
  other.step(1 / 60, { ...idle, forward: 1, sprint: true });
  assert.equal(other.vowBroken, false);
});

test("Burden needs five relics at the far fire; Haste needs four minutes", () => {
  assert.equal(reachFarFire(sworn("burden"), 4), 0);
  assert.equal(
    reachFarFire(sworn("burden"), VOW_CONFIG.burden),
    VOW_CONFIG.reward,
  );
  const slow = sworn("haste");
  slow.elapsed = VOW_CONFIG.haste;
  slow.step(1 / 60, idle);
  assert.equal(slow.vowBroken, true);
  assert.equal(reachFarFire(slow, 2), 0);
});

test("the Vow and its breaking survive save and load", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const g = sworn("silence");
  g.step(1 / 60, { ...idle, forward: 1, sprint: true });
  g.save();
  const loaded = new Game();
  loaded.load();
  assert.equal(loaded.vow?.id, "silence");
  assert.equal(loaded.vowBroken, true);
  const tampered = JSON.parse(memory.get("lastlight-save")!);
  tampered.vow = 99;
  memory.set("lastlight-save", JSON.stringify(tampered));
  loaded.load();
  assert.equal(loaded.vow, undefined);
});
