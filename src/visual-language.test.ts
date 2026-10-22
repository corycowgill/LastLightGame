import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "./simulation";
import { relicGlyph, visualCue, glyphSvg } from "./visual-language";
test("authored relic emblems cover six identities and reserve a seventh for the sealed votive", () => {
  const glyphs = new Set(
    Array.from({ length: 18 }, (_, chamber) =>
      relicGlyph(1, { id: chamber * 2 }),
    ),
  );
  assert.equal(glyphs.size, 6);
  assert.equal(relicGlyph(1, { id: 9, encounter: "reliquary" }), "votive");
  for (const glyph of glyphs) assert.match(glyphSvg(glyph), /<svg/);
});
test("timed actions show actual progress and take priority over local hazards", () => {
  const g = new Game(1);
  g.activeInteraction = { id: 1, total: 3.5, remaining: 1.75 };
  const cue = visualCue(g)!;
  assert.equal(cue.glyph, "lock");
  assert.equal(cue.progress, 0.5);
});
test("relic warning pairs hearing with the correct still-crouch response", () => {
  const g = new Game(1);
  g.cursedRelic = true;
  g.artifacts = 3;
  g.relicPulse = 1.5;
  const cue = visualCue(g)!;
  assert.equal(cue.glyph, "ear");
  assert.equal(cue.action, "crouch");
  assert.equal(cue.progress, 0.5);
  assert.ok(cue.urgent);
});
test("Hunt symbol guides players with and without matches", () => {
  const g = new Game(1);
  g.phase = "HUNT_ACTIVE";
  assert.equal(visualCue(g)!.action, "match");
  g.matches = 0;
  assert.equal(visualCue(g)!.action, "fire");
});
