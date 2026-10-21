"""Master completed HF drafts into bounded, browser-compatible MP3 assets."""
import hashlib
import json
import subprocess
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[2]


def prepare(samples, sample_rate, loop=False, music=False):
    samples = np.asarray(samples, dtype=np.float32)
    if samples.ndim == 1:
        samples = samples[:, None]
    if not np.isfinite(samples).all() or len(samples) < sample_rate / 2:
        raise ValueError("Invalid or truncated audio")
    samples = samples - samples.mean(axis=0)
    samples = sosfilt(butter(2, 35, btype="highpass", fs=sample_rate, output="sos"), samples, axis=0)
    rms = float(np.sqrt(np.mean(samples ** 2)))
    if rms < 0.0001:
        raise ValueError("Silent generation")
    if loop:
        n = min(int(sample_rate * (1 if music else 0.3)), len(samples) // 4)
        phase = np.linspace(0, np.pi/2, n)[:, None]
        seam = samples[-n:] * np.cos(phase) + samples[:n] * np.sin(phase)
        samples = np.concatenate([samples[n:-n], seam])
    else:
        n = min(int(sample_rate * 0.04), len(samples) // 4)
        samples[:n] *= np.linspace(0, 1, n)[:, None]
        samples[-n:] *= np.linspace(1, 0, n)[:, None]
    target_rms = 10 ** ((-24 if music else -21) / 20)
    samples *= target_rms / max(0.0001, float(np.sqrt(np.mean(samples**2))))
    samples *= min(1, 0.70 / max(0.001, float(np.max(np.abs(samples)))))
    return samples.astype(np.float32)


def main():
    import soundfile as sf
    plan = json.loads((Path(__file__).with_name("audio-prompts.json")).read_text())
    dest = ROOT / "public" / "audio"
    dest.mkdir(parents=True, exist_ok=True)
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ids",nargs="*")
    args=parser.parse_args()
    selected=set(args.ids)
    manifest_path=dest / "manifest.json"
    existing=json.loads(manifest_path.read_text(encoding="utf-8"))["clips"] if selected and manifest_path.exists() else []
    entries=[e for e in existing if e["id"] not in selected]
    for clip in plan["clips"]:
        if selected and clip["id"] not in selected: continue
        folder = ROOT / ".asset-tools" / "audio" / "raw" / clip["id"]
        record_path = folder / "complete.json"
        if not record_path.exists():
            print("Pending", clip["id"])
            continue
        record = json.loads(record_path.read_text())
        source = ROOT / record["file"]
        decoded = folder / "decoded.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(source), str(decoded)], check=True)
        samples, sr = sf.read(decoded, always_2d=True)
        if clip["kind"] == "sfx":
            samples = samples.mean(axis=1, keepdims=True)
        # New isolated foley needs an immediate onset and bounded overlap in gameplay.
        if clip["id"] in {"cough","foot_stone","foot_water","crypt_creak","chain_rattle","bone_crunch"}:
            peak=float(np.max(np.abs(samples)))
            energetic=np.flatnonzero(np.max(np.abs(samples),axis=1)>max(0.003,peak*0.07))
            if len(energetic): samples=samples[max(0,int(energetic[0]-sr*.02)):]
            limit={"cough":2.2,"foot_stone":0.65,"foot_water":0.8,"crypt_creak":4.5,"chain_rattle":1.8,"bone_crunch":0.9}[clip["id"]]
            samples=samples[:int(sr*limit)]
        samples = prepare(samples, sr, clip["loop"], clip["kind"] == "music")
        mastered = folder / "mastered.wav"
        sf.write(mastered, samples, sr, subtype="PCM_16")
        output = dest / (clip["id"] + ".mp3")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mastered), "-ar", "32000", "-codec:a", "libmp3lame", "-b:a", "128k", str(output)], check=True)
        entries.append({**clip, "prompt": record.get("prompt", clip["prompt"]), "file": output.name, "model": plan["music_model"] if clip["kind"] == "music" else plan["sfx_model"],
                        "provider": record["space"], "seconds_mastered": len(samples)/sr,
                        "bytes": output.stat().st_size, "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
                        "peak_dbfs": float(20*np.log10(max(np.abs(samples).max(), 1e-8))),
                        "rms_dbfs": float(20*np.log10(max(np.sqrt(np.mean(samples**2)), 1e-8))),
                        "status": "generated and technically mastered; listening review required"})
        print("Mastered", clip["id"], output.stat().st_size, "bytes")
    (dest / "manifest.json").write_text(json.dumps({"version": 1, "clips": entries}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
