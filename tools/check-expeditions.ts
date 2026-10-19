import { Game } from "../src/simulation";
import { ExpeditionCheck } from "../src/qa";
const count = Math.min(200, Math.max(1, Number(process.argv[2]) || 20));
const failures: { seed: number; status: string }[] = [];
for (let seed = 1; seed <= count; seed++) {
  const game = new Game(seed);
  const check = new ExpeditionCheck(game.world);
  for (
    let tick = 0;
    tick < 60 * 300 && !game.completed && game.phase !== "DEAD";
    tick++
  )
    game.step(1 / 60, check.input(game));
  check.input(game);
  if (!game.completed || !check.sawHunt)
    failures.push({ seed, status: check.status });
}
console.log(
  JSON.stringify(
    { seeds: count, passed: count - failures.length, failures },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
