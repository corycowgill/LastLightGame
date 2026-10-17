# Catalog-derived neural assets — 17 October 2026

The runtime replacement set contains **32 GLB roles from 31 accepted neural reconstructions**. All 21 original individual prop/character references from the shared asset library have generated meshes. Two additional accepted reconstructions provide the catalog wall and arch. Paving/ceiling geometry reuses the neural wall mesh with a documented rotation and fit; the separate slab attempt was rejected. No new runtime replacement mesh was built from primitive or manually authored geometry.

Source library: `C:/Users/coryc/Documents/Codex/2026-10-17/cre/outputs/last-light-asset-library`. Its live catalog has 221 definitions, most still planned. This pass does **not** claim all 221 definitions are finished. The separate experimental urn reference was not reconstructed. Stable catalog IDs, original references, seeds and provider runs are preserved.

## Runtime changes

- Neural Torchbearer, Hunter and Stalker replace the previous authored character meshes. Automatic region/material-aware skin weights bind them to the existing authored animation donors. The player retains its generated A-pose as the bind pose, with carrying offsets in the clips. Motions are not claimed as NVIDIA/Kimodo output. Skeletal refinement, finger contacts and cloth deformation remain art-polish work.
- Neural torch hardware, oil and match pickups, artifact, brazier, coffin, pillar, memorial, crates, barrels, rubble, crypt doors, journal, satchel, flask and chalk replace or enrich the corresponding visible props. Not every room variant appears in every seed.
- Neural wall, arch and stone paving replace the visible masonry/floor/ceiling shell after loading. Region-based instancing shares geometry/materials. The wall uses LOD1 because LOD2 introduced holes. Stone materials have restrained metalness; sanctuary lighting was reduced to preserve surface detail.
- Existing simulation navigation and camera collision remain authoritative. Generated box-proxy colliders are not used to seal arch openings. Procedural room placement, flame effects, chalk marks and lighting remain gameplay systems. Simple loading/error fallbacks remain available.
- Hollow and Moth are generated expansion meshes in the review viewer; their rigs and enemy behaviors are not implemented by this pass.

Browse `/asset-review.html` to orbit every model and play available clips. Files are in `public/models/catalog/`; the active character aliases are also in `public/models/`. The manifest records source/reference hashes, model, backend, seed, provider job ID, triangle counts, bytes and draft state. `docs/catalog-assets/` retains catalog definitions and generation/preparation manifests. The paving derivation records its actual wall source rather than claiming a successful floor generation.

## Pipeline

Generation used the existing serial library worker and [TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B), with the existing HF login and official Space. The brazier used the installed local ComfyUI TRELLIS workflow; the other accepted new reconstructions used HF. The older crate and barrel pilot generations were reused. New wall/arch reference images used the installed local SDXL/Juggernaut checkpoint. No model installation, paid endpoint, or hardware upgrade was provisioned.

The model card identifies MIT licensing. Original project art is the reconstruction input. Models, references and provider provenance remain recorded for review; generated drafts are not automatically a production-approved library release.

The local library queue was adjusted to stop treating authored architecture sources as completed neural sources when an explicit production override is present. That guard has a regression test. The user-requested neural production overrides are preserved on the three architecture definitions. The first slab had fragmented sides/underside; its reference/source/candidate were rejected and retained. The second reference became a flat texture and its reconstruction ended with a terminal provider error. No blind retry or manual replacement was used; accepted neural masonry supplies paving instead.

Reproduction tools in `tools/assets/`:

1. Read the shared library instructions, then run its `assetlib.py status` and `doctor`. Recover unresolved jobs before new work. Use its single worker for reference/mesh jobs.
2. `finish_catalog.py LIBRARY_ROOT ASSET_ID ...` normalizes completed neural sources and runs the existing CPU Blender LOD/review pass. New sources get new candidate versions.
3. `import_catalog.py LIBRARY_ROOT ASSET_ID ...` rejects authored/rejected candidates, verifies hashes, packs 512px embedded textures, normalizes rigid props and preserves already-bound characters. Do not import the rejected standalone floor candidate.
4. `build_characters.py` creates legacy motion donors only in ignored `.asset-tools/rigs`. `bind_generated_character.py` consumes a neural candidate and a donor; it does not generate mesh geometry. `promote_character.py` installs the bound result and its provenance. Use the Torchbearer donor for the player and Hunter donor for Hunter/Stalker.
5. Run `derive_stone_floor.py` after importing the accepted neural wall. This creates the explicitly labeled paving derivative and its provenance.

Raw model sources, editable Blender binding files, LODs and original references stay in the library/ignored tools directories. Runtime needs no Python, Blender, account, inference service or API key.

## Verification and limits

- 48 TypeScript tests: simulation/input, character load/weights/socket motion, sampled deformation bounds, catalog hashes, embedded resources and rigid scale checks.
- Eight Python asset tests, including actual triangle ray tests for an open arch, opaque wall and visible floor support.
- Shared pipeline: 18 tests, including authored-source rejection under neural override.
- Production Vite build passes. All 32 GLBs decoded through the actual Three.js browser viewer with no warnings/errors observed.
- In-game Hunt recovery and screenshot evidence are recorded in BUILD_STATUS.md after the final browser run.

These remain reviewable integration drafts, not certified production assets. Physical iPhone/Xbox testing, sustained device performance profiling, full deformation/art review and expansion enemy rigging remain pending. No approved library release was created.

## Resumed landmark batch

Eight new references were generated serially with the installed ComfyUI SDXL workflow, reviewed, then reconstructed through the official TRELLIS.2 Space: split pillar relief, bell, processional statue, sun door, broken dais, sanctuary arch, pedestal and tomb. Each runtime mesh has about 5,000 triangles and embedded 512px textures. Their IDs, input hashes and generation/preparation records are preserved alongside the earlier batch.

These dress room boundaries and sanctuary recesses. The upright bell and closed tomb differ from their initial concepts; the tomb is decorative and provides no new hiding mechanic. The sanctuary arch is recessed scenery rather than an unvalidated passage collider. Existing navigation remains authoritative. The statue reference reconstructed with a bronze/brown finish; it is a reviewable draft rather than an approved stone sculpt.

All eight new GLBs decoded in the production browser viewer without observed warnings/errors. Seed 104729 again passed extinction, active Hunt, navigated escape and sanctuary recovery in 0:59. The recovery view observed 60 FPS and 56 draws on this desktop; this is not sustained device profiling. See `catalog-assets/landmark-meshes.jpg` for actual rendered meshes.

The official hosted NVIDIA Kimodo demo accepted a six-second cautious torch-carrying walk prompt using Kimodo-SOMA-RP-v1. Generation returned to its idle UI, but the BVH export stalled and the five-minute session expired. No downloaded motion was verified or integrated. Current runtime clips remain the authored donors; local Kimodo inference and motion retargeting remain pending. No paid Space or new hardware was provisioned.
