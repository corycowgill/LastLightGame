# Multi-angle Mesh2Motion fitting — work in progress

Session: 2026-10-18, https://app.mesh2motion.org/create, release b04ee333b.

These are candidate assets, **not installed or deployed**. Preserve the original site exports unchanged. `export-audit.json` records SHA-256 hashes, animation names, joint counts and inverse-bind joint positions.

## Saved work

| Model | Multi-angle evidence | Export | Status |
| --- | --- | --- | --- |
| Torchbearer | Front, back, both sides, fingers | 66 joints, 59 animations | Requires deformation, ground contact and symmetry review |
| Hunter | Front, back, both sides, fingers | 66 joints, 44 animations | Requires deformation, ground contact and symmetry review |
| Stalker | Front, back, both sides, fingers | Not saved | Browser detached during animation-library loading; clavicle placement needs another check |
| Hollow | Front placement started, side inspection pending | Not saved | Browser stopped responding during side inspection |

## Method and limitations

Upload the original unrigged neural GLB. Choose Human and All Fingers. Fit shoulder, elbow and wrist chains with child movement enabled; disable child movement for individual torso, head, hip, knee and ankle corrections. Rotate the model through front, rear and both profiles. Select each joint and read its displayed bone name before moving it, especially where finger nodes overlap.

Use the transform widget for depth adjustments in profile. Mesh-volume placement in profile can collapse left/right separation. Drag the widget shaft rather than its tip when another joint overlaps the arrow. Inspect both mirrored sides after edits: the current raw exports contain small left/right height differences that need review before acceptance.

The site's Human template has foot/ball/end joints, not independent toe chains. Fused source fingers or toes cannot become separately articulated geometry through skeleton placement. The Stalker has fewer clearly separated digits than a human hand. Do not describe these limitations as fully independent finger/toe rigging.

Selected library clips include locomotion, crouching, turns, listening, fear, interactions, reactions and death; player exports additionally include torch/lantern carrying and flame gestures, while the Hunter includes zombie and levitation motions. Full exact names are in the audit JSON. Export selection does not mean every clip is connected to gameplay.

## Resume

Chrome Mesh2Motion tabs: Torchbearer 14524399, Stalker 14524401, Hollow 14524404. Browser control repeatedly timed out or reported detached tabs; do not reload an unfinished tab until its work is recovered or deliberately abandoned. Hunter export is already saved locally.

Recover Stalker and Hollow sessions, finish multi-angle fitting and export their applicable library motions. Recheck symmetry, clavicles, knees, feet and finger placement on all candidates. Then adapt bone names/root motion, preserve finger weights during corrective skinning, test sampled animation deformation and ground contact, inspect in the game, and only then promote runtime models. Update provenance, README and BUILD_STATUS before committing and deploying.

## Gameplay integration update

Torchbearer and Hunter candidates are now installed in the game's runtime model paths for user validation. The table above records the earlier export checkpoint. Raw exports remain unchanged; runtime weights, root motion, facing, clip aliases and player carry pose are adapted by the documented pipeline. Stalker and Hollow remain pending.
