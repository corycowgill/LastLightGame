# Graphics surface and fire pass

The aim is richer close-range materials and a readable fire silhouette without a post-processing framebuffer chain or additional shadow lights.

- Original catalog stone/albedo maps provide a subtle 0.022 bump scale when no authored normal/bump map exists. This approximates relief; it is not newly authored high-resolution normal data. Embedded maps use four-times anisotropic filtering for oblique views.
- Chain/cage/iron materials use metalness 0.45 and roughness 0.62. Stone remains rough and minimally metallic; bone remains matte. The old generic dressing-material rule now excludes metal identifiers.
- Exposure moves from 1.12 to 1.02; lit ambient fill from 0.55 to 0.46. Darkness adaptation and all simulation visibility rules are unchanged.
- Handheld fire uses a small subdivided plane, a bounded shader, translucent tapered silhouette, warm core and animated tip. It faces the camera after camera updates. Existing flame sockets and mode/fuel flickering still control position, size and light.
- Torch embers use a small radial texture rather than solid square point sprites. No additional particles are allocated during play.
- Two pooled soft ground-contact shadow quads follow the player and primary Hunter. They do not cast shadows or affect collision. This is a local grounding cue, not screen-space ambient occlusion. The second Hunter still uses the existing dynamic-shadow system.

Implementation: `graphics-polish.ts`, integrated by `catalog-assets.ts` and `scene.ts`. Generated catalog GLBs are preserved; no replacement procedural prop/character meshes were created. Small canvas textures and shader geometry are rendering effects. Existing expedition disposal releases their materials, maps and geometry.

151 tests and production build pass. Targeted Chrome review of seed 1 / burial-web fixture observed about 57 FPS with no shader errors. Existing auto pixel-ratio reduction, low mode and one-shadow-refresh-per-frame scheduling remain unchanged. Long-run GPU/memory and physical-phone review remain open. This pass does not claim new high-resolution assets, realistic global illumination, or a complete art overhaul.
