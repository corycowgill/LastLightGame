import { findPath, type Game, type World } from "./simulation";
/** Diagnostic route driver; normal gameplay never uses this. */
export class ExpeditionCheck {
  path: { x: number; z: number }[] = [];
  cursor = 1;
  forced = false;
  sawHunt = false;
  status = "RUNNING";
  constructor(world: World) {
    this.path = findPath(
      world,
      { x: world.start.x * 2, z: world.start.z * 2 },
      { x: world.exit.x * 2, z: world.exit.z * 2 },
    );
    if (!this.path.length) throw new Error("Destination disconnected");
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
    // Use the final 24 metres instead of a fixed fraction of a variable map.
    if (!this.forced && this.path.length - this.cursor < 13) {
      game.matches = 0;
      game.forceHunt();
      this.forced = true;
    }
    // Wait through extinction/grace so every layout exercises an active Hunt
    // before following the final escape route. This is QA-only behavior.
    if (this.forced && !this.sawHunt) return idle;
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
