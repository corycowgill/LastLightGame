# Building The Last Light: prompts and workflow

This page condenses the original long-form game brief into reusable contributor prompts. It is not a verbatim transcript. Exact recorded generation prompts live in the files linked from the [README](../README.md).

## Development brief

```text
Build THE LAST LIGHT, a complete playable browser survival horror expedition.
Use TypeScript, Three.js, Vite, static hosting and browser-local persistence.
The player is a lone cloaked Torchbearer in ancient underground catacombs.
There is no conventional combat: survival comes from movement, stealth,
navigation, limited fuel, scavenging and meaningful risk versus reward.

Prioritize one integrated Catacombs expedition before additional biomes.
Include responsive third-person movement/camera, keyboard/mouse, Xbox and
iPhone touch controls; Ember, Steady and Blaze torch modes; oil and relics;
chalk navigation; starting/destination sanctuary; banking, upgrades and saves.

Extinction must not immediately kill the player. Implement sputtering,
eight-second grace, active Hunter searching/investigation/pursuit, matches,
two-second relighting, sanctuary recovery and death only on capture.
Hunter perception must respect walls, sound, last-known position and
navigable routes. The player must have viable escape options.

Use seeded generation and a deterministic fixed-step simulation independent
of rendering. Collision, AI navigation and furniture placement must agree.
Keep systems modular. Use generated catalog GLBs for solid art and webs;
generated decals may add surface wear. Procedural layout and fire effects
remain game systems, not substitutes for the requested generated assets.

Match the art bible: cold navy catacombs, weathered burial niches, bones,
webs and monumental architecture; warm golden fire; ochre cloak and satchel;
a tall ragged Hunter with elongated arms and subtle eyes. Keep audio creepy
but readable, especially threat footsteps during the Hunt.

Inspect the repository and existing pipeline first. Implement, integrate,
test, play and revise; do not stop at scaffolding or decorative mockups.
Use simpler functional systems when necessary. Keep BUILD_STATUS.md honest:
record exact validation, failed experiments, blockers and next work.
Compilation alone is not completion. Do not claim model-generated outputs
unless the actual exported artifact was inspected and integrated.
```

## A focused implementation prompt

```text
Review the current expedition and choose a concrete balance problem.
Explain the player-facing consequence, implement a small coherent change,
and add regressions for both its intended behavior and its counterplay.
Keep sanctuary safety, line-of-sight fairness and a survivable no-match
escape. Run the existing suite and production build. Exercise the actual
browser scenario. Retune failures rather than relaxing checks to hide them.
Update the field guide and BUILD_STATUS.md with values, evidence and limits.
```

Example outcome: immediate stamina recovery allowed repeated sprint tapping. The accepted change adds a 0.65-second rest before 20%/second recovery while keeping 13%/second drain. A harsher initial setting failed the no-match escape; it was rejected. Relighting now requires slow movement, while crouching reduces distant visual detection without removing close detection or memory.

## Art prompt structure

For a new catalog reference, specify:

1. Stable asset ID and gameplay purpose, including whether it is scenery or a traversable structure.
2. Shape, material, worn details and palette consistent with the art bible.
3. Isolated object or clear reconstruction-friendly view; separated limbs for characters, separate torch hardware, and no hidden required openings.
4. Required dimensions, pivot and triangle budget in the catalog rather than relying on the image prompt to set physical scale.
5. Exclusions such as labels, UI, baked scenery or painted shadows when inappropriate for the asset.

These are authoring guidelines, not a claimed verbatim generation prompt. Actual imported definitions and provider manifests are under `docs/catalog-assets/`. The title background and decal prompt records preserve their full generation text. Review generated images before reconstruction and inspect all sides of resulting GLBs; references can conceal fused limbs, missing undersides or blocked openings.

## Integration gates

- Check the external library's instructions, queue status and health before generation; recover uncertain jobs before starting another. Keep one GPU worker on the shared development machine.
- Preserve raw sources and rejected candidates. A provider response or preview image is not proof of a valid exported mesh or motion file.
- Finish scale/pivot/texture budget, then import with provenance. Never mark a reviewable draft production-approved automatically.
- Inspect GLBs and clips at `/asset-review.html`, then in the real dungeon. Test feet, torch socket, lower-leg weights and cloak deformation for characters.
- Keep room routes, Hunter paths and camera collision clear after adding detail. Verify lighting at low graphical quality as well as normal quality.
- Run relevant regressions, full TypeScript tests and production build. Use the browser expedition and retreat checks; record real results, not only screenshots of menus.
- Distinguish automated route success from human difficulty, session pacing and physical device acceptance. State what remains untested.

## Reproduction boundaries

A fresh clone can run the game, build it, execute TypeScript tests and inspect shipped assets. It does not contain the separate shared library queue, complete raw-generation archive, ignored model weights, raw audio, or a portable authoring environment. The current tools include development-machine paths that need adaptation. Hosted demos can change or become unavailable; stored prompts and seeds document an attempt but do not promise byte-identical future outputs.

The Torchbearer now uses a fitted Mesh2Motion rig and site-derived motion on its generated mesh; Hunter/Stalker retain authored motion. NVIDIA Kimodo export did not produce a verified integrated artifact. Torchbearer source export and adapters are preserved; Hunter/Stalker re-rigging remains pending. See [its status](MESH2MOTION_STATUS.md). Future replacements should preserve named runtime clips and torch socket behavior, pass deformation checks, and be visually reviewed before promotion.
