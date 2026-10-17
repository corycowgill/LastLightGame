"""Serial drafts via official HF demos; no paid endpoints or hardware changes.
Uses existing local HF login. Saves prompts, raw outputs and provider job IDs.
"""
import argparse
import json
import shutil
import time
from pathlib import Path
import httpx
from huggingface_hub import get_token

ROOT = Path(__file__).resolve().parents[2]
PLAN = json.loads((Path(__file__).with_name("audio-prompts.json")).read_text())
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("ids", nargs="+")
args = parser.parse_args()
clients = {}
for clip_id in args.ids:
    clip = next(c for c in PLAN["clips"] if c["id"] == clip_id)
    folder = ROOT / ".asset-tools" / "audio" / "raw" / clip_id
    if (folder / "complete.json").exists():
        print(clip_id, "already generated; preserving original", flush=True)
        continue
    folder.mkdir(parents=True, exist_ok=True)
    space = "ACE-Step/ACE-Step" if clip["kind"] == "music" else "OpenMOSS-Team/MOSS-SoundEffect-v2.0"
    base = "https://ace-step-ace-step.hf.space" if clip["kind"] == "music" else "https://openmoss-team-moss-soundeffect-v2-0.hf.space"
    client = httpx.Client(headers={"Authorization": "Bearer " + get_token()}, timeout=60)
    if clip["kind"] == "sfx":
        params = dict(prompt=clip["prompt"], seconds=clip["seconds"], steps=50, cfg_scale=4.0, sigma_shift=5.0, seed=clip["seed"])
        endpoint = "/run_inference"
    else:
        params = dict(audio_duration=clip["seconds"], prompt=clip["prompt"], lyrics="[instrumental]", infer_step=40, guidance_scale=15.0,
                      scheduler_type="euler", cfg_type="apg", omega_scale=10.0, manual_seeds=str(clip["seed"]),
                      ref_audio_input=None, oss_steps=None)
        endpoint = "/__call__"
    record = {**clip, "space": space, "endpoint": endpoint, "parameters": params, "started": time.time()}
    print("Generating", clip_id, "on", space, flush=True)
    (folder / "request.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    try:
        info = client.get(base + "/gradio_api/info").json()
        specs = info["named_endpoints"][endpoint]["parameters"]
        values = [params.get(spec["parameter_name"], spec.get("parameter_default")) for spec in specs]
        submitted = client.post(base + "/gradio_api/call" + endpoint, json={"data": values})
        submitted.raise_for_status()
        event_id = submitted.json()["event_id"]
        record["job_id"] = event_id
        record["api_base"] = base
        (folder / "request.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
        result = None
        event = ""
        with client.stream("GET", base + "/gradio_api/call" + endpoint + "/" + event_id) as stream:
            stream.raise_for_status()
            for line in stream.iter_lines():
                if line.startswith("event: "): event = line[7:]
                if line.startswith("data: "):
                    payload = json.loads(line[6:])
                    if event == "error": raise RuntimeError(str(payload))
                    if event == "complete": result = payload; break
        if result is None: raise RuntimeError("Provider stream ended without a completed generation")
        (folder / "response.json").write_text(json.dumps(result, default=str, indent=2), encoding="utf-8")
        urls = set()
        def collect(value):
            if isinstance(value, dict):
                url = value.get("url", "")
                if isinstance(url, str) and url.startswith(base + "/gradio_api/file=") and any(ext in url.lower() for ext in [".wav", ".mp3", ".flac"]): urls.add(url)
                for child in value.values(): collect(child)
            elif isinstance(value, list):
                for child in value: collect(child)
        collect(result)
        files = []
        for i, url in enumerate(sorted(urls)):
            response = client.get(url)
            response.raise_for_status()
            suffix = ".mp3" if ".mp3" in url else ".flac" if ".flac" in url else ".wav"
            target = folder / (f"download-{i}" + suffix)
            target.write_bytes(response.content)
            files.append(target)
        if not files:
            raise RuntimeError("Provider returned no audio file; inspect response.json")
        source = max(files, key=lambda p: p.stat().st_size)
        target = folder / ("source" + source.suffix)
        shutil.copy2(source, target)
        record.update(file=str(target.relative_to(ROOT)), bytes=target.stat().st_size, completed=time.time())
        (folder / "complete.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
        print("Saved", clip_id, target.stat().st_size, "bytes", flush=True)
    except Exception as error:
        record["error"] = str(error)
        (folder / "failed.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
        raise
