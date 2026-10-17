# The Last Light audio

Nine original prompt-based drafts are bundled in `public/audio` (about 2.13 MB). Listen at `/audio/listen.html`. They require no runtime account, inference service, or API key.

Music was generated through the official [ACE-Step demo](https://huggingface.co/spaces/ACE-Step/ACE-Step), using [ACE-Step-v1-3.5B](https://huggingface.co/ACE-Step/ACE-Step-v1-3.5B). Effects were generated through the official [MOSS demo](https://huggingface.co/spaces/OpenMOSS-Team/MOSS-SoundEffect-v2.0), using [MOSS-SoundEffect-v2.0](https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0). Both model cards identify Apache-2.0 licensing. No model weights are redistributed. The newer ACE-Step 1.5 demo failed, so these recordings use the older model; local inference was not used.

Exploration uses restrained strings, stone resonance and sparse bells. The Hunt uses a quiet drone and pulse; sanctuary provides fragile relief. Effects cover torch crackle, wind/drips, extinction, relighting, Hunter emergence, and flame burst. No generated footsteps are placed in ambient loops: actual enemy footsteps remain spatial gameplay signals.

`tools/assets/audio-prompts.json` preserves prompts and seeds. `generate_audio.py` uses authenticated HF requests to official demo queues without paid endpoints. Raw provider responses and sources live in ignored `.asset-tools/audio/raw`. Shared demo availability and reproducibility may vary. `master_audio.py` removes DC and low rumble, crossfades loop boundaries, bounds peaks, and encodes browser-compatible MP3. `public/audio/manifest.json` records exact prompts, models, hashes, duration and technical metrics.

Playback crossfades between three states, lowers music during the Hunt, caps simultaneous one-shots, and retains procedural audio if downloads fail. Settings provide separate soundtrack and master levels. Audio starts after a user gesture. Pausing mutes the mixer.

These are generated and technically mastered drafts; listening review and device speaker/headphone balancing remain required. Automated checks do not establish artistic quality. Physical iPhone and Xbox testing remain pending.
