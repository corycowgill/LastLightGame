import type { Layout } from "./worldgen";

/** Coordinates are world metres; layout room centres themselves use 2 m tiles. */
export type ExpeditionEncounterPlan = {
  gate: {
    x: number;
    z: number;
    yaw: number;
    a: number;
    b: number;
    nearRoom: number;
    farRoom: number;
  };
  landmarkRoomIndex: number;
  savedRoomSteps: number;
};

function distances(layout: Layout, skip = -1): number[] {
  const out = Array<number>(layout.rooms.length).fill(Infinity);
  out[0] = 0;
  const queue = [0];
  for (const room of queue) {
    layout.links.forEach(([a, b], index) => {
      if (index === skip) return;
      const next = a === room ? b : b === room ? a : -1;
      if (next >= 0 && out[next] === Infinity) {
        out[next] = out[room] + 1;
        queue.push(next);
      }
    });
  }
  return out;
}

/** A closed optional shortcut never severs a sanctuary or the introductory room.
 * Returns undefined for tree graphs: callers must preserve the normal expedition.
 * No new link is invented here, since its navigation and geometry require worldgen.
 */
export function planExpeditionEncounter(
  layout: Layout,
): ExpeditionEncounterPlan | undefined {
  const open = distances(layout);
  let best: ExpeditionEncounterPlan | undefined;
  let bestScore = -Infinity;
  layout.links.forEach(([a, b], index) => {
    if (a <= 1 || b <= 1) return;
    const closed = distances(layout, index);
    if (closed.some((distance) => !Number.isFinite(distance))) return;
    for (const farRoom of [a, b]) {
      const room = layout.rooms[farRoom];
      if (room.kind === "sanctuary") continue;
      const nearRoom = farRoom === a ? b : a;
      const saving = closed[farRoom] - open[farRoom];
      if (saving < 2 || closed[nearRoom] >= closed[farRoom]) continue;
      const preference =
        room.design === "ossuary" ? 0.4 : room.design === "flooded" ? 0.3 : 0;
      const score = saving + preference + Math.min(closed[farRoom], 10) * 0.01;
      if (score <= bestScore) continue;
      const first = layout.rooms[a],
        second = layout.rooms[b];
      bestScore = score;
      best = {
        gate: {
          x: first.x + second.x,
          z: first.z + second.z,
          yaw: Math.atan2(second.x - first.x, second.z - first.z),
          a,
          b,
          nearRoom,
          farRoom,
        },
        landmarkRoomIndex: farRoom,
        savedRoomSteps: saving,
      };
    }
  });
  return best;
}
