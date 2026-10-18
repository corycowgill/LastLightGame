# Mesh2Motion rig replacement — in progress

Requested source: https://app.mesh2motion.org/create (official project https://mesh2motion.org).

Opened in the user's Chrome. The site advertises fresh model rigging, humanoid/creature rigs, bundled GLB animation exports and CC0 animation assets. No new Mesh2Motion rig or animation export has yet been obtained or integrated.

Clean original neural geometry, verified with zero skins, is prepared locally:

- `.asset-tools/mesh2motion/torchbearer-unrigged.glb`
- `.asset-tools/mesh2motion/hunter-unrigged.glb`
- `.asset-tools/mesh2motion/stalker-unrigged.glb`

These are exact copies of the prepared library sources, not the current bound runtime models. Runtime assets remain unchanged while the new site output is pending.

Chrome upload chooser timed out, then browser control reported an unattached debugger. The browser tool's upload troubleshooting requires enabling Allow access to file URLs on the ChatGPT Chrome extension. User was informed and asked to confirm when enabled. Do not claim the upload or re-rig succeeded.

Resume the existing Mesh2Motion Create tab in Chrome. Upload Torchbearer first, choose the appropriate human A-pose rig, fit bones visibly, bind, review locomotion and crouch, then export a bundled GLB. Repeat for Hunter and Stalker using the matching human/creature setup. Review feet, shoulders, hands, cloak and torch attachment before promotion. Preserve original site exports and licensing provenance; adapt runtime bone/socket names and clip mappings to actual exports rather than guessing them.

Validate export packaging, scale, clip availability, sampled deformations, torch attachment and gameplay before replacing aliases. Existing runtime clips were authored and baked in Blender; no NVIDIA motion export was previously verified. This task is specifically replacing those with reviewed Mesh2Motion output.
