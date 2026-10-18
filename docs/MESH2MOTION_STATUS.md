# Mesh2Motion Torchbearer replacement

## Current result — 2026-10-18

Chrome file access was enabled by the user. The original neural Torchbearer was uploaded into https://app.mesh2motion.org/create, fitted with its Human skeleton and Single Hand Bone option, bound on the site, and exported with 14 selected library animations. Site revision: `b04ee333b-release`.

The first fit was rejected after visual review: the upper body was misaligned. Pelvis, spine, neck, head and hips were fitted individually without moving their children, with mirrored arms positioned against the generated A-pose. Arm-plane correction was enabled. The second export is preserved at [mesh2motion/torchbearer-site-export.glb](mesh2motion/torchbearer-site-export.glb); its hash and settings are in [torchbearer.json](mesh2motion/torchbearer.json).

The game now uses the site's skeleton and skin weights on the original neural mesh. No new body geometry was authored. Runtime adaptation maps bones/clips, removes horizontal root travel, corrects the fitted pelvis height and forward axis, closes loop endpoints and attaches a torch socket. The site's Idle Torch right-arm pose is carried into locomotion. Death root translation is grounded against sampled mesh bounds. Rotations remain site-derived rather than the previous authored gait.

## Reproduce from the preserved export

From the repository, using its Node dependencies, Python and NumPy:

```sh
python tools/assets/prepare_mesh2motion.py docs/mesh2motion/torchbearer-site-export.glb .asset-tools/mesh2motion/torchbearer-runtime.glb
python tools/assets/smooth_mesh2motion_weights.py .asset-tools/mesh2motion/torchbearer-runtime.glb
npx tsx tools/assets/ground_mesh2motion.ts .asset-tools/mesh2motion/torchbearer-runtime.glb
python tools/assets/promote_character.py cha_torchbearer .asset-tools/mesh2motion/torchbearer-runtime.glb docs/mesh2motion/torchbearer.json
npm test
npm run build
```

The preparation offsets are fitted to this exact export, not a generic converter for arbitrary models. Original site clips are retained in the source GLB. Runtime aliases are listed in the preparation script. Relight uses Interact; chalk/refill use PickUp Table; burst uses Spell Simple Shoot. These mappings are practical fallbacks, not bespoke motion capture for every interaction.

## Validation and limits

63 TypeScript tests, eight Python tests and production build pass. Character checks cover normalized weights, lower-leg bone influence, foot/wrist envelopes, clip/socket motion, loop endpoints and animated bounds. The ankle pivot is lower on this skeleton; crouch lowers the carrying wrist, while sprint has a larger arm-height range. Test bounds now reflect these anatomical differences rather than the legacy donor's exact coordinates.

Walk and crouch were inspected in the actual Three.js review viewer; screenshots are in `docs/mesh2motion/`. This is an integrated animation draft. Generated cloak topology, hands/fingers, occasional cloth intersection and foot sliding still limit quality. Clothing has no cloth simulation. Hunter and Stalker retain their prior rigs and motion; their Mesh2Motion replacement remains outstanding. No NVIDIA-generated output is claimed.

## Earlier upload blocker

The old chooser failures were caused by Chrome extension file access. That blocker is resolved for this session; it is not a remaining task for the user. The downloads completed in the user's Downloads folder even though the browser download-event notification timed out. File headers, content and subsequent GLTF decoding verified the actual artifacts before use.

## Skin-weight repair follow-up

The first site-bound replacement passed structural checks but retained visibly discontinuous weights. Adjacent shoulder, cloak and waist vertices could switch sharply between unrelated bone pairs. A sampled edge-deformation audit found 14–18x peaks, which the old bounds/socket checks missed.

`smooth_mesh2motion_weights.py` welds UV-seam positions for the weight solve, diffuses existing weights along mesh adjacency for 48 passes, then retains four normalized influences. It prevents upper-limb/head influence below the knees. Mesh positions, indices, texture coordinates, skeleton, inverse bind matrices and source rotations are preserved. This is a corrective skin-weight pass, not a new rig or geometry generator. Re-run the death grounding pass after smoothing.

| Clip        | Sampled edges stretching >2.5x, before | After |
| ----------- | -------------------------------------: | ----: |
| Idle        |                                  4,180 |    28 |
| Walk        |                                  3,861 |    36 |
| Sprint      |                                  5,732 |    53 |
| Crouch walk |                                  6,982 |   113 |

Counts include directed triangle edges across four fixed phases and omit original edges shorter than 5 mm. Across these samples, severe-edge count falls about 98.9%; this is not a claim about every possible pose. Worst sampled stretch falls from about 18x to 4.25x. `skin-deformation.test.ts` rejects peaks >=5x or widespread >2.5x stretching. The unchanged original export fails this gate. Some local distortion, source cloak holes, finger shape and cloth intersection remain; these require further art work.
