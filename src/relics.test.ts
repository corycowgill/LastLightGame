import test from "node:test";
import assert from "node:assert/strict";
import { relicIdentity } from "./relics";
test("votive identities are deterministic, varied and give the sealed discovery its own story", () => {
  const names = new Set<string>();
  for (let id = 0; id < 12; id++) {
    const relic = relicIdentity(104729, { id });
    assert.deepEqual(relic, relicIdentity(104729, { id }));
    assert.match(relic.color, /^#[a-f0-9]{6}$/i);
    assert.ok(relic.story.length > 30);
    names.add(relic.name);
  }
  assert.equal(names.size, 6);
  assert.equal(
    relicIdentity(42, { id: 1, encounter: "reliquary" }).name,
    "The Three Unburied Names",
  );
});
