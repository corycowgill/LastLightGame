import type { Game, World } from "./simulation";
/** Diagnostic route driver; normal gameplay never uses this. */
export class ExpeditionCheck {
  path: { x: number; z: number }[] = [];
  cursor = 1;
  forced = false;
  sawHunt = false;
  status = "RUNNING";
  constructor(world: World) {
    const key = (x: number, z: number) => `${x},${z}`,
      cells = new Set<string>(world.cells.map((c: any) => key(c.x, c.z))),
      start = key(world.start.x, world.start.z),
      end = key(world.exit.x, world.exit.z),
      queue = [start],
      prev = new Map<string, string>();
    prev.set(start, "");
    for (let i = 0; i < queue.length && !prev.has(end); i++) {
      const [x, z] = queue[i].split(",").map(Number);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = key(x + dx, z + dz);
        if (cells.has(n) && !prev.has(n)) {
          prev.set(n, queue[i]);
          queue.push(n);
        }
      }
    }
    if (!prev.has(end)) throw new Error("Destination disconnected");
    let current = end;
    while (current) {
      const [x, z] = current.split(",").map(Number);
      this.path.push({ x: x * 2, z: z * 2 });
      current = prev.get(current)!;
    }
    this.path.reverse();
  }
  input(game: Game) {
    if (game.phase === "HUNT_ACTIVE") this.sawHunt = true;
    const idle = {
      forward: 0,
      strafe: 0,
      sprint: false,
      crouch: false,
      yaw: 0,
    };
    if (game.completed) {
      this.status = this.sawHunt
        ? "PASS: extinction, active Hunt, navigated escape, sanctuary"
        : "COMPLETE: active Hunt not observed";
      return idle;
    }
    if (game.phase === "DEAD") {
      this.status = "FAILED: Hunter caught the Torchbearer";
      return idle;
    }
    if (
      game.phase === "EXPLORING" &&
      game.items.some(
        (i: any) =>
          !i.taken &&
          i.kind === "artifact" &&
          Math.hypot(i.x - game.player.x, i.z - game.player.z) < 2.6,
      )
    )
      game.interact();
    if (!this.forced && this.cursor > this.path.length * 0.58) {
      game.matches = 0;
      game.forceHunt();
      this.forced = true;
    }
    let target = this.path[this.cursor];
    while (
      target &&
      Math.hypot(target.x - game.player.x, target.z - game.player.z) < 0.22
    ) {
      this.cursor++;
      target = this.path[this.cursor];
    }
    if (!target) {
      game.interact();
      return idle;
    }
    return {
      forward: 1,
      strafe: 0,
      sprint: true,
      crouch: false,
      yaw: Math.atan2(-(target.x - game.player.x), -(target.z - game.player.z)),
    };
  }
}
