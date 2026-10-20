import test from "node:test";
import assert from "node:assert/strict";
import { RenderBudget } from "./render-budget";

test("sustained slow rendering reduces Auto cost, stable rendering and explicit High do not", () => {
  const slow = new RenderBudget(),
    fast = new RenderBudget(),
    high = new RenderBudget("high");
  for (let i = 0; i < 600; i++) {
    slow.sample(1 / 25);
    fast.sample(1 / 60);
    high.sample(1 / 25);
  }
  assert.equal(slow.level, 2);
  assert.equal(slow.shadows, false);
  assert.equal(slow.pixelRatio(3), 1);
  assert.equal(fast.level, 0);
  assert.equal(high.level, 0);
  const severe = new RenderBudget();
  for (let i = 0; i < 100; i++) severe.sample(0.5);
  assert.equal(
    severe.level,
    2,
    "severe sustained slowdown must also trigger fallback",
  );
  for (let i = 0; i < 600; i++) slow.sample(1 / 60);
  assert.equal(slow.level, 2, "quality must not oscillate during a run");
});
test("tab suspension and isolated stalls do not trigger quality reductions", () => {
  const budget = new RenderBudget();
  for (let i = 0; i < 600; i++) budget.sample(i % 100 ? 1 / 60 : 1);
  assert.equal(budget.level, 0);
});
test("point shadow work is staggered with bounded refresh rates and no starvation", () => {
  const budget = new RenderBudget("high");
  const counts: Record<string, number> = { torch: 0, start: 0, end: 0 };
  for (let i = 0; i < 600; i++) {
    const selected = budget.shadow(i / 60, [
      { id: "torch", hz: 20 },
      { id: "start", hz: 4 },
      { id: "end", hz: 4 },
    ]);
    if (selected) counts[selected]++;
  }
  assert.ok(counts.torch > 150 && counts.torch <= 201);
  assert.ok(counts.start > 30 && counts.start <= 41);
  assert.ok(counts.end > 30 && counts.end <= 41);
  assert.equal(
    new RenderBudget("low").shadow(0, [{ id: "torch", hz: 20 }]),
    undefined,
  );
});
