import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Soundscape, AUDIO_FILES } from "./soundscape";
test("generated foley files match provenance and bounded technical mastering", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../public/audio/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  for (const id of [
    "cough",
    "foot_stone",
    "foot_water",
    "crypt_creak",
    "chain_rattle",
    "bone_crunch",
  ]) {
    assert.ok((AUDIO_FILES as readonly string[]).includes(id));
    const e = manifest.clips.find((e: { id: string }) => e.id === id);
    assert.ok(e);
    const bytes = readFileSync(
      new URL(`../public/audio/${e.file}`, import.meta.url),
    );
    assert.equal(bytes.length, e.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), e.sha256);
    assert.ok(e.seconds_mastered >= 0.5 && e.seconds_mastered <= 4.5);
    assert.ok(e.peak_dbfs <= -3);
    assert.match(e.model, /MOSS/);
  }
});
test("sample playback caps voices, clamps controls and applies occlusion filtering", () => {
  const old = globalThis.fetch;
  globalThis.fetch = (() => new Promise(() => {})) as typeof fetch;
  try {
    const filters: any[] = [];
    const sources: any[] = [];
    const node = () => ({
      connect(to: any) {
        return to;
      },
      disconnect() {},
    });
    const context = {
      createBufferSource() {
        const s = {
          ...node(),
          playbackRate: { value: 0 },
          buffer: null,
          start() {},
          stop() {},
          onended: undefined as undefined | (() => void),
        };
        sources.push(s);
        return s;
      },
      createGain() {
        return { ...node(), gain: { value: 0 } };
      },
      createStereoPanner() {
        return { ...node(), pan: { value: 0 } };
      },
      createBiquadFilter() {
        const f = { ...node(), type: "", frequency: { value: 0 } };
        filters.push(f);
        return f;
      },
    };
    const s = new Soundscape(
      context as unknown as AudioContext,
      node() as unknown as GainNode,
    );
    (s as any).buffers.set("cough", {});
    assert.equal(s.play("foot_stone"), false);
    assert.equal(s.play("cough", 0.4, 4, 4, true), true);
    assert.equal(filters[0].frequency.value, 650);
    assert.equal(sources[0].playbackRate.value, 1.2);
    for (let i = 0; i < 5; i++) s.play("cough");
    assert.equal(s.play("cough"), false);
    sources[0].onended();
    assert.equal(s.play("cough"), true);
    s.dispose();
    assert.equal(s.play("cough"), false);
  } finally {
    globalThis.fetch = old;
  }
});
