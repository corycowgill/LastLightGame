# Current player animation

The October 19 full rebuild replaces the earlier player described below. See [the rebuild guide](torchbearer-rebuild/README.md) for the new neural body, separate torch, fresh bind and HF-generated motions. The remainder of this document records the superseded implementation.

# Torchbearer animation revision

The generated Torchbearer mesh is retained. This pass changes its skinning, baked skeletal clips and runtime blending, not its geometry source. Motions are authored for the fitted skeleton; they are not NVIDIA/Kimodo-generated motion.

## Corrected problems

- The old spatial skinning rule assigned sufficiently wide lower-leg/boot vertices to arm bones. Lower-body vertices now remain in lower-body groups.
- The previous color mask could pin sleeves/hands to the torso. Cloth pinning is restricted to the upper central mantle, with softer distance weights around joints.
- Existing donor motion used different arm rest axes. Player motion is now baked for the fitted A-pose skeleton, with two-bone foot and arm targets, forward-bending knees, planted flat feet, deliberate swing clearance, quieter body motion and a stable elevated torch wrist.
- Walk, sprint, crouch and interaction clips have distinct timing/poses. Player playback follows measured movement speed. Walk/sprint/crouch transitions preserve cycle phase.
- Rendering can run faster than the fixed simulation. Smoothed movement speed prevents a frame without a simulation step from repeatedly switching walk back to idle.

## Reproduction

`bind_generated_character.py` imports the original neural candidate plus the existing skeleton donor, applies revised player-only weights, and invokes `player_motion.py` to bake fourteen clips into GLB. It creates no replacement mesh geometry. `promote_character.py` validates and updates both runtime aliases and provenance. Hunter/Stalker motion is unchanged.

Run Blender with the same source and rig described in docs/CATALOG_ASSETS.md; output can be an ignored `.asset-tools/torchbearer-fitted.glb`, then promote it with `promote_character.py cha_torchbearer OUTPUT.glb`.

## Validation and limits

Character tests sample idle, walk, sprint, crouch and relight clips. They reject arm/hand/head weights on lower legs, out-of-range foot heights, collapsed torch wrists and excessive torch-hand height changes. Existing clip/socket, normalized-weight, mesh bounds and catalog integrity checks remain.

The actual Three.js viewer was used to inspect idle, walk, sprint and crouch. The game expedition test exercises locomotion, extinction, active Hunt and sanctuary recovery. Review the current clips at `/asset-review.html` by choosing Torchbearer and an animation.

The source still has reconstruction artifacts and no articulated fingers or cloth simulation. Feet are targeted to the flat dungeon floor; terrain-aware runtime foot IK and final hand/finger contact polish remain future work. This is an animation improvement, not a claim of final film-quality deformation.

## Playback continuity follow-up

Runtime facing uses a shortest-arc damped turn. Locomotion selection has hysteresis and uses simulation velocity, avoiding idle frames from rendering faster than the simulation. Interrupted transitions fade out all running donor actions from their effective weights; extinguish/fear/quick-turn are one-shot actions. Two regressions cover gait jitter and frame-rate-independent turning.

This improves playback of the existing bound mesh and authored motion. It is not the pending Mesh2Motion rig replacement. Chrome's file chooser opened on the follow-up attempt, but file assignment explicitly failed with the extension file-URL access requirement. No new rig was promoted.

## Mesh2Motion source replacement — 2026-10-18

The Torchbearer rig, weights and base motion now come from an actual reviewed Mesh2Motion export. This supersedes the authored gait source described above for the player only. See MESH2MOTION_STATUS.md for exact source, adapters, validation and remaining quality limits. Hunter/Stalker remain unchanged.
