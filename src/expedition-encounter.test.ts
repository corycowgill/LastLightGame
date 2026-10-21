import test from "node:test";
import assert from "node:assert/strict";
import { buildLabyrinth, type Layout } from "./worldgen";
import { planExpeditionEncounter } from "./expedition-encounter";

function steps(layout: Layout, target: number, skip?: [number, number]) {
  const distance = Array<number>(layout.rooms.length).fill(Infinity);
  distance[0] = 0;
  const queue = [0];
  for (const current of queue)
    for (const edge of layout.links) {
      if (skip && edge[0] === skip[0] && edge[1] === skip[1]) continue;
      const next =
        edge[0] === current ? edge[1] : edge[1] === current ? edge[0] : -1;
      if (next >= 0 && distance[next] === Infinity) {
        distance[next] = distance[current] + 1;
        queue.push(next);
      }
    }
  return distance[target];
}

test("optional return gates preserve every destination and materially shorten the relic return", () => {
  let planned = 0;
  for (let seed = 0; seed < 500; seed++) {
    const layout = buildLabyrinth(seed).layout!;
    const original = JSON.stringify(layout);
    const plan = planExpeditionEncounter(layout);
    assert.equal(
      JSON.stringify(layout),
      original,
      "planning must not mutate world geometry",
    );
    assert.deepEqual(plan, planExpeditionEncounter(layout));
    if (!plan) continue;
    planned++;
    const gate = plan.gate,
      skip: [number, number] = [gate.a, gate.b];
    assert.ok(gate.a > 1 && gate.b > 1);
    for (let room = 0; room < layout.rooms.length; room++) {
      assert.ok(
        Number.isFinite(steps(layout, room, skip)),
        `seed ${seed} blocked room ${room}`,
      );
    }
    assert.notEqual(layout.rooms[plan.landmarkRoomIndex].kind, "sanctuary");
    assert.equal(
      steps(layout, plan.landmarkRoomIndex, skip) -
        steps(layout, plan.landmarkRoomIndex),
      plan.savedRoomSteps,
    );
    assert.ok(plan.savedRoomSteps >= 2);
    assert.equal(gate.x, layout.rooms[gate.a].x + layout.rooms[gate.b].x);
    assert.equal(gate.z, layout.rooms[gate.a].z + layout.rooms[gate.b].z);
  }
  assert.ok(planned > 300, `expected useful seeded loops, got ${planned}/500`);
});

test("tree graphs safely omit an encounter instead of blocking the only route", () => {
  const layout = buildLabyrinth(104729).layout!;
  const spanning: Layout = {
    ...layout,
    links: layout.links.slice(0, layout.rooms.length - 1),
  };
  assert.equal(planExpeditionEncounter(spanning), undefined);
});
