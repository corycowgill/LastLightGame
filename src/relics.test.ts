import test from "node:test";
import assert from "node:assert/strict";
import { relicIdentity } from "./relics";
import { Game } from "./simulation";
test("votive identities are deterministic, varied and give the sealed discovery its own story", () => {
  const names = new Set<string>();
  // One relic per chamber; ids 2i and 2i+1 share chamber i.
  for (let chamber = 0; chamber < 18; chamber++) {
    const id = chamber * 2 + (chamber % 2);
    const relic = relicIdentity(104729, { id });
    assert.deepEqual(relic, relicIdentity(104729, { id }));
    assert.match(relic.color, /^#[a-f0-9]{6}$/i);
    assert.ok(relic.story.length > 30);
    names.add(relic.name);
  }
  assert.equal(names.size, 18);
  assert.equal(
    relicIdentity(42, { id: 1, encounter: "reliquary" }).name,
    "The Three Unburied Names",
  );
});
test("no votive repeats within any generated expedition", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = new Game(seed);
    const relics = g.items.filter(
      (i) => i.kind === "artifact" && i.encounter !== "reliquary",
    );
    const names = relics.map((i) => relicIdentity(seed, i).name);
    assert.equal(new Set(names).size, names.length, `seed ${seed}`);
  }
});
