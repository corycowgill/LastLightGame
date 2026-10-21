# Audio gap audit and foley pass — 2026-10-21

## Findings and changes

| Gameplay signal | Previous gap | Implemented response |
| --- | --- | --- |
| Mist exposure cough | Filtered noise and oscillator did not resemble a physical cough | Generated close suppressed cough, triggered by the actual simulation cough counter |
| Player stone footstep | Low tone and short noise tick | Isolated generated leather-boot impact, triggered by traveled distance; quieter when crouched/upgraded |
| Water crossing | Added synthetic noise splash | Generated shallow-water boot splash on water surfaces |
| Hunter/Stalker footstep | Fully synthesized contact | Spatial stone-foot samples with lower Hunter / higher Stalker playback rate; retained restrained identifying body tone |
| Hanging chain hazard | Metallic tone placeholder | Generated chain rattle on actual upright contact; crouching remains quiet |
| Loose bone/rubble contact | Broadband placeholder | Generated brittle crunch on the existing hazard event |
| Crypt movement / return gate | Synthetic low scrape | Generated timber/stone creak for director stone events and gate movement; chain rattle accompanies the gate |

No fake approaching footsteps were inserted into ambient loops. Enemy movement remains a trustworthy positional signal. Mist coughing still drives the same AI noise independently of whether audio is loaded or muted. Accessible visual cues remain available; generated audio supplements the recent visual UX rather than relying on prose to explain each contact.

## Model and pipeline

Existing `hf auth whoami` and `hf spaces info OpenMOSS-Team/MOSS-SoundEffect-v2.0` confirmed the authenticated account and RUNNING official ZeroGPU demo. The local CLI manages discovery/authentication; inference runs through the existing authenticated official demo queue, not a newly started local model or paid endpoint. Source: [MOSS-SoundEffect-v2.0](https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0), official [Space](https://huggingface.co/spaces/OpenMOSS-Team/MOSS-SoundEffect-v2.0).

`tools/assets/audio-prompts.json` contains six new isolated-foley prompts and seeds 210100–210105. `generate_audio.py cough foot_stone foot_water crypt_creak chain_rattle bone_crunch` saves provider responses and raw WAVs under ignored `.asset-tools/audio/raw`. Credential-free completion records, including job IDs and parameters, are copied into `docs/audio-foley/`.

Run `.asset-tools/audio-env/Scripts/python.exe tools/assets/master_audio.py cough foot_stone foot_water crypt_creak chain_rattle bone_crunch` using the existing audio environment. Selective mastering preserves prior clip files and hashes. It trims leading silence, caps duration, removes DC/low rumble, applies edge fades and peak limits, then encodes 32kHz mono 128kbps MP3. No voices are cloned, no copyrighted samples are sourced, and no model weights are distributed.

| Clip | Runtime duration |
| --- | --- |
| Cough | 2.2s |
| Stone footfall | 0.65s |
| Water footfall | 0.8s |
| Crypt creak | 4.5s |
| Chain rattle | 1.8s |
| Bone crunch | 0.9s |

`public/audio/manifest.json` records source model, prompts, seeds, runtime hashes and mastering metrics. `docs/audio-foley/analysis.json` records actual decoded MP3 peak/RMS/duration and finite/no-clipping checks. This is technical validation, not an artistic listening approval.

## Runtime mix

Six simultaneous one-shots remain the cap. Serial decoding limits startup spikes. A successful sample substitutes the corresponding noise placeholder; missing/busy samples fall back to the old synth cue. Rates are bounded to 0.8–1.2 and stereo pan to -1–1. Occluded effects use a 650Hz low-pass filter; unobstructed effects retain their top end. Completed and stopped voices release nodes. Existing music ducking, master/music levels, user-gesture startup and pause behavior remain.

## Remaining gaps, in priority order

1. Exertion and mist recovery breathing still use filtered noise; a small set of nonverbal breath samples would improve embodiment.
2. Hunter contact uses pitched human boot foley plus a low tone. Bespoke dragging/crawling impacts and material-specific variants would distinguish creatures better.
3. Votive whisper/cry and vent hiss remain synthesized. A restrained wordless layer and pressure-jet samples are candidates; avoid speech that could confuse cues.
4. More variants would reduce repetition. This pass adds one source per event family; pitch changes are not new performances.
5. Subjective headphone mix, speech/music contamination in generated drafts, and phone-speaker intelligibility require listening review. Technical decoding alone cannot certify those properties.

## Validation

163 TypeScript/game tests pass, including file/hash/provenance bounds and voice-cap/filter/rate behavior. Two Python mastering tests pass. Production build passes. All six runtime MP3s decode to finite, non-silent PCM with peaks below full scale. Listen to the expanded 15-clip collection at `/audio/listen.html`; these remain technically mastered drafts until subjective review.

Chrome validation decoded all 15 runtime clips, exercised normal forward movement through a chain hazard without console errors, and played the generated 2.2-second cough in the review player (readyState 4, no media error). This confirms browser loading/playback, not subjective listening quality.
