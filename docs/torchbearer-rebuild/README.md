# Torchbearer rebuild, October 19, 2026

This is a replacement body and animation pipeline, not another repair of the old Mesh2Motion player. The prior neural body, long cloak, skin weights and player clips are not imported into the new build. Hunter/Stalker are unchanged.

## Sources and prompts

- Original body reference: [image](../../art-source/torchbearer-rebuild/character-reference.png). A clean A-pose, empty gloves, short cowl, separated sleeves and fitted tunic/trousers avoid the fused cloak/arm surfaces of the earlier mesh.
- Original independent torch reference: [image](../../art-source/torchbearer-rebuild/torch-reference.png). Unlit wood and iron basket, without a hand, flame or baked glow.
- Both images were reconstructed serially through the external asset library's HF TRELLIS worker, then reduced and normalized in Blender. Body: 18,000 triangles, 1.65 m. Torch: 2,500 triangles, 0.65 m.
- Exact reconstruction specifications, prompts, generation records and preparation manifests sit beside this file. The normalized **unrigged neural GLBs are preserved here** for rebuilding. No procedural replacement body or torch geometry is shipped.
- Nine actual motion FBXs were generated with the official [Tencent HY-Motion-1.0 HF Space](https://huggingface.co/spaces/tencent/HY-Motion-1.0). Exact prompts, settings, seed, completion status and source hashes are in [motions](../../art-source/torchbearer-rebuild/motions) and [provenance](provenance.json). Walk is the separately generated pilot; the other eight use the serial runner. Default duration 4 seconds, CFG 5.0.

HF CLI was used for account/model/service discovery; authenticated `gradio_client` called the Space's generation API. The game never makes inference calls or needs credentials. NVIDIA Kimodo was researched locally, but its encoder requirements made it unsuitable for this pass; no NVIDIA motion is claimed.

## Fresh bind and motion preparation

`build_rebuilt_player.py` imports a generated motion skeleton, immediately removes the provider's template body, and creates a new 52-joint rig fitted to this A-pose. A temporary watertight proxy permits a fresh heat solve; only weights are transferred back to the original neural surface. The proxy is never exported. Anatomical masks isolate torso, hood and lower legs; broader knee/shoulder transitions prevent sharp weight changes during crouches.

A direct heat solve failed on thin fingers. The shipped gloves follow the wrist as one unit, with source finger joints retained for compatibility. This does **not** provide individual articulated finger skinning.

The nine generated motions are retargeted with rest-axis correction. Horizontal root motion and provider turns are removed so simulation owns movement. Locomotion trims the lead-in/out, closes the cycle, and receives a constant floor adjustment. Blender only renames paths in the active action, so every action's bone paths are explicitly rewritten before export; omitting that step produced static clips in an early rejected build.

Generated wrist rolls tipped the torch over the hood during sprinting. A two-bone carry IK pass retains body and free-arm motion while keeping the right grip within reach, outside the body. A consistent wrist carry frame keeps the torch upright. This is generated motion **with retargeting and carry constraints**, rather than untouched provider output. Death retains the generated fall. Gesture playback fits game interaction durations, including upgraded relight speed. The provider idle raised the free hand to the face; a relaxed left-arm pose corrects that while retaining generated body breathing.

`finish_rebuilt_player.ts` calibrates the grip against the actual rebuilt glove surface and adds the right-hand `torch_socket`, then prepares a separate torch with a grip-origin pivot and `flame_socket`. Runtime `TorchAttachment` copies the grip's full position and quaternion; fire/light/particles follow the actual prop tip. The previous shoulder/flame offset hacks are removed. Small runtime flame geometry supplies fire; the neural prop stays unlit after extinction.

Nine unique sources drive fourteen gameplay names. `chalk`/`refill` alias interaction; `fear`/`quick_turn`/`extinguish` alias idle. Those aliases are recorded, not presented as five more generated performances.

## Reproduce

Requirements for authoring: Python with authenticated Hugging Face Hub and `gradio_client`, Blender, and the repository's Node dependencies. Preserve local raw FBXs if you want byte-identical motion sources; regenerating on a hosted service is not guaranteed to reproduce identical bytes.

```powershell
hf auth whoami
hf models ls --search 'HY-Motion-1.0' --limit 5
python tools/assets/generate_rebuilt_player_motions.py
```

The runner submits sequentially, skips verified complete files, and refuses to blindly retry uncertain jobs. On a new clone, restore the ignored original FBXs to reproduce byte-identical output, or explicitly run with `--regenerate-missing` to request new motion files; prior completed records are backed up locally and new hashes must be promoted and retested. It uses the existing HF token without printing it. Raw downloaded FBXs stay in the ignored `art-source/torchbearer-rebuild/motions/raw` directory because they contain the provider template mesh; only the new body and retargeted skeletal output are distributed. Request records and SHA-256 hashes are committed. Template body geometry is removed during retargeting.

```powershell
blender --background --python tools/assets/build_rebuilt_player.py -- docs/torchbearer-rebuild/cha_torchbearer_clean_v2-unrigged.glb art-source/torchbearer-rebuild/motions/raw .asset-tools/rebuilt-player/torchbearer-v2.glb
npx tsx tools/assets/finish_rebuilt_player.ts .asset-tools/rebuilt-player/torchbearer-v2.glb docs/torchbearer-rebuild/pro_torch_unlit_v2-unrigged.glb .asset-tools/rebuilt-player/finished
python -c "from tools.assets.compact_glb import compact; compact('.asset-tools/rebuilt-player/finished/torchbearer.glb',1024); compact('.asset-tools/rebuilt-player/finished/torch.glb',512)"
```

`promote_rebuilt_player.py LIBRARY FINISHED` updates runtime aliases, catalog integrity fields, source records and final hashes from the external library. Keep generation through that library's serial worker; do not run a competing local Comfy/TRELLIS job. Re-exporting alone does not approve an asset in that library: its `needs_review` status is preserved.

## Validation and limits

`npm test` passes 78 tests. Player tests check normalized weights, no upper-body influence on lower legs, in-place loops, ankle bounds, hand movement, and skin edge stretch across twelve phases of **all nine** source clips. Attachment tests sample 24 phases of eight carry motions with a translated and rotated parent, checking grip contact against deformed glove geometry, tip alignment, uprightness and clearance from the hood. The full production build passes. The browser expedition check passed extinction, active Hunt, navigated escape and sanctuary recovery; manual keyboard movement was also exercised. Twelve-phase peak skin-edge stretch stayed below 3.6x with fewer than 0.1% of sampled edges exceeding 2.5x in each clip.

Actual browser review covers front/back/side views and the walking, sprinting and crouching poses, plus the in-game expedition check. The viewer at `/asset-review.html?rebuild` loads the same player and separate torch used by gameplay. This remains a stylized neural reconstruction with small surface/texture artifacts; terrain-aware feet, independent glove fingers and final user visual acceptance remain open. Numeric tests complement visual inspection.

Browser evidence: [walking](qa/walk.png), [crouching](qa/crouch.png), [expedition pass](qa/expedition-pass.png), and [verification record](qa/verification.json).

## Licensing

Reference images are original project art. Reconstruction records identify TRELLIS.2 and its MIT model license. Motion was produced using Tencent HY-Motion-1.0 under its community terms; the [license](HY-Motion-LICENSE.txt) is preserved. That agreement distinguishes generated Outputs from Model Derivatives and has territorial restrictions on the model Works. This repository distributes retargeted animation outputs, not model weights or the provider's SMPLH template body. Review provider terms before reusing the generation service for a different project or jurisdiction.
