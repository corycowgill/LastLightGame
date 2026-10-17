"""Generate draft SOMA BVH clips in an isolated, installed Kimodo environment.

Does not rig, retarget, clean loops, or export final character GLBs.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
manifest = json.loads((Path(__file__).with_name("motions.json")).read_text())
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("character", choices=manifest["characters"])
parser.add_argument("--dry-run", action="store_true")
args = parser.parse_args()
for i, (clip, prompt) in enumerate(manifest["characters"][args.character].items()):
    output = root / ".asset-tools" / "motions" / args.character / clip
    command = [sys.executable, "-m", "kimodo.scripts.generate", prompt,
               "--model", manifest["model"].split("/")[-1], "--duration", "4",
               "--num_samples", "1", "--seed", str(manifest["seed"] + i),
               "--bvh", "--bvh_standard_tpose", "--output", str(output)]
    print(f"{args.character}/{clip}: {prompt}", flush=True)
    if args.dry_run:
        print(subprocess.list2cmdline(command))
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(command, check=True, cwd=root)
        if not output.with_suffix(".bvh").is_file():
            raise RuntimeError(f"Kimodo did not produce {output.with_suffix('.bvh')}")
