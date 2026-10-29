import test from "node:test";
import assert from "node:assert/strict";
import { cryptSketch, unexploredPassages } from "./crypt-sketch";
import { Game } from "./simulation";

const visit = (g: Game, i: number) => {
  const r = g.world.layout!.rooms[i];
  g.visitedRooms.push(`${r.x},${r.z}`);
};

test("the sketch shows only entered chambers and stubs toward the unknown", () => {
  const g = new Game(104729);
  const layout = g.world.layout!;
  const fresh = cryptSketch(g);
  assert.match(fresh, /1 explored chambers/);
  const exits = layout.links.filter((l) => l.includes(0)).length;
  assert.equal(unexploredPassages(g), exits);
  // Walking into a neighbour turns its stub into a drawn passage.
  const [a, b] = layout.links.find((l) => l.includes(0))!;
  visit(g, a === 0 ? b : a);
  const after = cryptSketch(g);
  assert.match(after, /2 explored chambers/);
  // The far fire stays undrawn until its chamber is found.
  assert.equal((after.match(/sketch-fire/g) ?? []).length, 1);
  layout.rooms.forEach((_, i) => visit(g, i));
  const all = cryptSketch(g);
  assert.equal((all.match(/sketch-fire/g) ?? []).length, 2);
  assert.equal(unexploredPassages(g), 0);
  assert.match(all, new RegExp(`${layout.rooms.length} explored chambers`));
});

test("chalk, lifted relics and the Torchbearer are marked; the drawing is stable", () => {
  const g = new Game(42);
  g.chalk.push({ x: 4, z: 2 }, { x: 10, z: -2 });
  const relic = g.items.find((i) => i.kind === "artifact")!;
  relic.taken = true;
  const svg = cryptSketch(g);
  assert.equal((svg.match(/sketch-chalk/g) ?? []).length, 2);
  assert.equal((svg.match(/sketch-relic/g) ?? []).length, 1);
  assert.equal((svg.match(/sketch-you/g) ?? []).length, 1);
  assert.equal(cryptSketch(g), svg);
  assert.doesNotMatch(svg, /NaN|undefined/);
});
