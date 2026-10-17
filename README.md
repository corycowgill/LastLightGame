# The Last Light

A browser survival horror expedition built with TypeScript, Three.js, Vite, and synthesized Web Audio. All artwork is original procedural geometry. No backend or API keys.

## Run

Node.js 22+ recommended.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Open the URL printed by Vite. Click Begin Expedition, then click the game to capture the mouse. Escape releases the mouse and pauses. Desktop keyboard/mouse and WebGL2 are required. Audio begins after a user gesture.

## Controls

WASD move, mouse look, Shift sprint, C/Ctrl crouch, E interact or relight, Q chalk, F flame burst, 1/2/3 torch modes, Tab journal, Escape pause. Settings include sensitivity, volume, visual sound cues, and graphics quality.

Reach the far golden sanctuary with artifacts to bank discoveries. Fuel depletion starts the Hunt; it does not kill you. Use a match to relight, break sight and quiet your footsteps, or reach sanctuary. Death loses carried artifacts. Progress saves to this browser and origin.

## Architecture

- `src/simulation.ts`: seeded walkable world, fixed-step gameplay, collision, pathfinding, perception, torch and Hunt state machines, expedition and save state. No rendering dependencies.
- `src/scene.ts`: original dungeon geometry, character and creature models, lighting, particles, camera collision, and Three.js lifecycle.
- `src/audio.ts`: synthesized atmospheric and gameplay audio.
- `src/main.ts`: input, fixed-step accumulator, menus, HUD and integration.
- `src/simulation.test.ts`: deterministic rules and scenario regression tests.

The simulation advances at 60 Hz. World grid cells represent two metres. Gameplay light and perception use simulation values independently of renderer settings. Room generation and AI navigation share the same walkable graph.

## Deployment

`npm run build` creates `dist/`. Serve this directory from any static host. The included `render.yaml` configures a Render static site with `npm ci && npm run build`. The game does not require server routes. Optional Google Fonts have system font fallbacks.

## Developer mode

Append `?debug` to the URL. H forces extinction/Hunt, R refills fuel, T teleports to the destination sanctuary. Use `?debug&seed=104729` for a reproducible seed. The header shows frame rate, AI state and draw calls. The developer menu has an accelerated physical route check for extinction, Hunt activation, escape and artifact banking. Developer controls are for verification and do not represent normal expedition progression.

## Scope

This is the playable Catacombs checkpoint toward the complete vertical slice. The intended 10–20 minute pacing, visual acceptance and hardware performance still need review. Additional biomes, advanced progression branches, region streaming and a full developer visualization suite are future work. See BUILD_STATUS.md for verification and known limitations. Do not treat a successful build alone as playtest acceptance.
