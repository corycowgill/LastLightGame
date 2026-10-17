# Generated character pipeline

Research/checkpoint: 2026-10-17. No new generated characters are in the game yet.

## Selected components

| Stage | Candidate | Reason and status |
| --- | --- | --- |
| Local image to mesh | [stabilityai/TripoSR](https://huggingface.co/stabilityai/TripoSR) | MIT source/weights, official default inference about 6 GB VRAM. Feasible first local baseline, not the highest-fidelity option. Needs an original clean character reference image. |
| Higher fidelity mesh | [microsoft/TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B) | PBR/GLB workflow; official hardware requirement is at least 24 GB VRAM, so not selected for this 8 GB GPU. |
| Automatic rig | [VAST-AI/UniRig](https://huggingface.co/VAST-AI/UniRig) | Skeleton and skin-weight prediction. Must test deforming topology and map the resulting skeleton to the motion skeleton. Official Python 3.11/CUDA extension stack needs a separate environment; not installed or validated here. |
| Offline motion authoring | [nvidia/Kimodo-SOMA-RP-v1.2](https://huggingface.co/nvidia/Kimodo-SOMA-RP-v1.2) | Official NVIDIA human motion model, SOMA skeleton, BVH export. Apache-2.0 code; NVIDIA Open Model License weights. Not a mesh generator or automatic skinning tool. |
| Cleanup/export | Blender | Installed locally. Retarget, bake, remove locomotion root translation, attach torch socket, clean loops/contacts, export skinned GLB with named clips. |

Primary implementation references: [TripoSR](https://github.com/VAST-AI-Research/TripoSR), [UniRig](https://github.com/VAST-AI-Research/UniRig), [Kimodo](https://github.com/nv-tlabs/kimodo), [Kimodo installation](https://research.nvidia.com/labs/sil/projects/kimodo/docs/getting_started/installation.html).

## Local audit

- `hf` installed and authenticated; CUDA PyTorch 2.8.0+cu128 is available.
- NVIDIA RTX 4060, approximately 8 GB VRAM; approximately 16 GB system RAM.
- Blender installed at `C:/Users/coryc/Tools/Blender/blender.exe`; Ubuntu WSL is available.
- Official sources cloned into ignored `.asset-tools/TripoSR` and `.asset-tools/kimodo`.
- Source commits inspected: TripoSR `107cefdc244c39106fa830359024f6a2f1c78871`; Kimodo `e1c219c99b4b94ba48be1fb6a1cbc64ecee4c954`.
- TripoSR config and 1,677,246,742-byte checkpoint downloaded with the user's local `hf`. Model revision: `5b521936b01fbe1890f6f9baed0254ab6351c04a`. NVIDIA checkpoint download status is recorded in BUILD_STATUS.md. Downloads are not successful inference or accepted assets.
- **Kimodo encoder access blocked:** existing account received HTTP 403 for `meta-llama/Meta-Llama-3-8B-Instruct/config.json`. The account owner must obtain access on the [official gated model page](https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct). Do not paste tokens into the repository or chat. The official encoder is an 8B model; access alone will not establish that its memory requirements fit this PC. Use a measured sequential/offload strategy or separately authorized larger hardware. No cloud job was launched.
- Keep TripoSR and Kimodo in separate Python environments: upstream currently requires incompatible Transformers versions (4.35.0 vs 5.1.0). Do not replace the user's global Python packages.

## Production sequence

1. Make original front-view A-pose references for the cloaked Torchbearer and humanoid Hunter/Stalker. Keep arms away from the torso, legs separated and fingers simple. Generate the torch separately so it can attach to a hand socket. Avoid a solid cloak joining arms/legs; disconnected or fused anatomy needs mesh cleanup.
2. Use local TripoSR as the first mesh experiment. Run the official entry point in its own environment, initially with a small extraction chunk and one image at a time. For example, from the source directory:

   ```powershell
   python run.py ../../art-source/torchbearer.png --pretrained-model-name-or-path ../models/TripoSR --output-dir ../raw/torchbearer --model-save-format glb --chunk-size 4096
   ```

   Check actual silhouette/backside/topology before proceeding. This command is prepared from the inspected upstream CLI, not a claim of a successful local generation.
3. Retopologize/decimate in Blender, preserve shoulder/elbow/knee deformation loops, normalize scale and ground the feet. Generate a rig with UniRig only after its isolated environment works. Inspect and correct skin weights in crouch and raised-arm poses. Do not assume UniRig bone names/rest axes match SOMA.
4. Generate draft motions with Kimodo after encoder access and memory are resolved. `tools/assets/motions.json` contains original prompts and exact target clip names. A command for a single draft is:

   ```powershell
   kimodo_gen "A person walks forward carefully, keeping their right hand raised at shoulder height as if carrying a torch." --model Kimodo-SOMA-RP-v1.2 --duration 4 --num_samples 1 --seed 104729 --bvh --bvh_standard_tpose --output .asset-tools/motions/torchbearer/walk
   ```

   For all character drafts, use `python tools/assets/generate_motions.py torchbearer` from the isolated Kimodo environment (or `--dry-run` to inspect commands); repeat for hunter/stalker. The script stops on a failed generation or missing BVH.

   Bind any local text encoder server to `127.0.0.1`; upstream defaults to `0.0.0.0`. No server has been started. Kimodo has no awareness of our torch geometry: enforce hand placement after retargeting. Human motion is only a starting point for the Hunter; author its unnatural proportions and movement in Blender.
5. Retarget BVH onto the cleaned character rig using an explicit bone map and rest-pose correction. Bake all motion, including constraints. Export in-place locomotion: simulation owns movement/collision. Keep one-shot death/capture/relight/burst clips unlooped. Trim cyclic clips to matching start/end poses; fix foot skating and torch clipping. Verify crouch height and hand attachment visually.
6. Export final files to `public/models/torchbearer.glb`, `hunter.glb`, `stalker.glb` only after review. glTF convention: metres, Y up. Choose a consistent forward axis and document the loader correction. Target <=20k triangles, <=96 joints, 1K textures and <=12 MiB per character. Keep original source, model revision, seed, prompt and license provenance with every accepted asset.
7. Run the structural gate, then a full glTF validator and visual animation preview. Our small checker is intentionally not a complete glTF validator:

   ```powershell
   python tools/assets/validate_glb.py public/models/torchbearer.glb --character torchbearer
   python -m unittest discover -s tools/assets -p "test_*.py"
   ```

8. Integrate via Three.js GLTFLoader/AnimationMixer, with crossfades tied to simulation state and separate torch attachment. Keep the existing playable character until the replacement loads, deforms, animates and performs correctly on desktop and iPhone. No empty/missing GLB URLs have been added to the runtime.

## Required clips

- Torchbearer: idle, walk, sprint, crouch_idle, crouch_walk, interact, relight, burst, death.
- Hunter: idle, search, pursue, capture, banish.
- Stalker: idle, investigate, recoil.

Smoke and disappearance remain runtime effects. A skeletal clip alone cannot implement banishment. Model generations and all motion drafts require visual review before replacing the existing assets.
