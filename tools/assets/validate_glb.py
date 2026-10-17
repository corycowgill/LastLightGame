"""Structural release gate for generated Last Light characters (stdlib only).

This checks packaging, not visual quality, skin deformation or seamless loops.
"""
import argparse
import json
import struct
from pathlib import Path

CLIPS = {
    "torchbearer": {"idle", "walk", "sprint", "crouch_idle", "crouch_walk", "interact", "relight", "burst", "death"},
    "hunter": {"idle", "search", "pursue", "capture", "banish"},
    "stalker": {"idle", "investigate", "recoil"},
}


def inspect(path, character):
    raw = Path(path).read_bytes()
    if len(raw) < 20:
        raise ValueError("Truncated GLB")
    magic, version, size = struct.unpack_from("<4sII", raw)
    if magic != b"glTF" or version != 2 or size != len(raw):
        raise ValueError("Expected a complete glTF 2 binary")
    length, kind = struct.unpack_from("<II", raw, 12)
    if kind != 0x4E4F534A or 20 + length > size:
        raise ValueError("Missing or truncated JSON chunk")
    doc = json.loads(raw[20:20 + length])
    errors = []
    if len(raw) > 12 * 1024 * 1024:
        errors.append("Character exceeds 12 MiB budget")
    for entry in doc.get("buffers", []) + doc.get("images", []):
        if "uri" in entry:
            errors.append("Embed buffers/textures; external URIs are not allowed")
    skins = doc.get("skins", [])
    if not skins or not any(s.get("joints") for s in skins):
        errors.append("No skeleton joints")
    if any(len(s.get("joints", [])) > 96 for s in skins):
        errors.append("Skin exceeds 96-joint budget")
    if not any("skin" in n and "mesh" in n for n in doc.get("nodes", [])):
        errors.append("No mesh bound to skeleton")
    primitives = [p for m in doc.get("meshes", []) for p in m.get("primitives", [])]
    if not any("JOINTS_0" in p.get("attributes", {}) and "WEIGHTS_0" in p.get("attributes", {}) for p in primitives):
        errors.append("No vertex skinning attributes")
    clips = {a.get("name") for a in doc.get("animations", []) if a.get("channels") and a.get("samplers")}
    missing = CLIPS[character] - clips
    if missing:
        errors.append("Missing usable animation clips: " + ", ".join(sorted(missing)))
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("glb", type=Path)
    parser.add_argument("--character", choices=CLIPS, required=True)
    args = parser.parse_args()
    try:
        errors = inspect(args.glb, args.character)
    except (ValueError, OSError, KeyError, struct.error) as exc:
        parser.exit(1, f"FAIL: {exc}\n")
    if errors:
        parser.exit(1, "FAIL:\n- " + "\n- ".join(errors) + "\n")
    print("PASS: structural character gate. Visual and motion review still required.")
