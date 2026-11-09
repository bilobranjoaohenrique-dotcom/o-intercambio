# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: replace only the father's rendered model with the latest user-supplied pai_intercambio_final.glb, stored intact as public/models/pai_intercambio.glb. Preserve his actor root, kitchen/car/airport anchors, dialogue, interactions and mission timing. Reuse the asset's embedded textures, Mixamo rig, seated/standing/talking clips and JawOpen/Smile morphs; adapt only missing driving posture through rig rotations, preserving the mesh and its proportions. Do not change the mother, other characters, scenery or quests. Register asynchronously imported meshes with the existing scoped lights/shadows before enabling play; never display duplicate procedural father geometry. Run TypeScript/build, focused asset checks and one short browser check of kitchen dialogue, seated driver and airport continuity, with actual captures. Avoid full chapter replays, new scenery or unrelated refactors.
