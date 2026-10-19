# Performance pass — 2026-10-18

## Changes

- Static camera collision broad phase: query eight-metre buckets, then run the original exact Three.js ray tests. Rendering/physics positions are unchanged. Candidate lists are reused until the query crosses a bucket boundary.
- Navigation paths cached per immutable generated World, capped at 128 entries. Public paths are copied so route consumers cannot corrupt cache entries. Hearing reads cached distances without allocating path copies and skips searches when vision already detects the player. Unreachable paths now mean infinite hearing distance, rather than zero.
- HUD refreshed at 10 Hz, immediately on phase transitions. Inventory markup changes only when its values change; movement, input, camera and simulation remain at full frequency.
- Catalog fetch/decode limited to two concurrent GLBs. Static anchors and instanced props no longer rebuild local transform matrices each frame.
- Expedition preparation waits for catalog and character loads, asynchronously compiles material programs, and warms the first render before enabling play or burning fuel. This trades a visible loading phase for fewer in-game first-use spikes. Failed assets retain their existing fallbacks.
- Shadow light counts stay stable through extinction and room transitions; distant/extinguished shadow maps stop refreshing without changing shader variants. Shadow render targets are explicitly disposed between expeditions.
- Periodic autosaves use an idle callback when supported; explicit pause/progression saves remain immediate.

## Measurements

Local Windows desktop / Codex in-app browser, production preview, seed 104729. These are machine-specific samples, not guarantees for other devices.

| Focused CPU benchmark, 3,000 iterations | Before | After |
| --- | ---: | ---: |
| Repeated hearing path query | 28.06 ms | 0.63 ms |
| Camera rays, 2,000 synthetic colliders | 182.28 ms | 8.34 ms |

Camera benchmark candidates: 25 instead of 2,000. These compare specific operations, not total frame time or whole-game FPS.

Loaded crypt sample: 60 FPS, 16.8 ms frame-time p95, 0% frames above 33.4 ms in the final four-second window. All 33 catalog types loaded.

The pre-warm-up development variant exposed a roughly 300 ms startup frame. After adding preparation, the accelerated browser expedition passed extinction, Hunt, navigated escape and sanctuary with sampled p95 16.8 ms and worst gameplay frame 33.4 ms. One frame exceeded 33.4 ms before rounding; final rolling window had none. The final scene queried two camera candidates out of 555 total colliders. Shader/asset preparation still takes time before play.

## Reproduce

- `npm test`: 67 tests, including exact camera-ray equivalence across positive/negative buckets, load concurrency/error recovery, path-cache mutation isolation, navigation and full escape regression.
- `npm run build` then `npm run preview -- --port 4173`.
- Open `/?debug&seed=104729` and select **Run expedition check**; use `/?debug&dressing&seed=104729` for the dense crypt view.
- `npx tsx tools/performance-benchmark.ts` compares CPU operations against commit `343d75a` (requires that commit in local Git history). It writes a temporary baseline module under ignored `.asset-tools/`.
- The game viewport's DOM data attributes expose `frameP95`, `frameWorst`, `longFramePercent`, `longFrameTotal`, `cameraCandidates`, `cameraColliders` and `catalogModels`. p95 and percentage use a rolling 240-frame window; worst/count reset each expedition. Rendering stalls during the explicit preparation phase are excluded from gameplay samples.

Physical iPhone and Xbox-connected device profiling remains a separate hardware check. Existing low graphics mode is retained. The existing Three.js bundle-size warning remains; this pass addresses runtime work rather than concealing that warning.
