# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: build the connected living room following docs/PROMPT-MASTER-05-SALA.md and the two user reference images. Preserve the approved bedroom, upper hallway, original staircase, kitchen furniture and characters, narrative, controls and other chapter sets. The only architectural exceptions are a local lower stairwell side-wall opening and a local kitchen north-wall passage needed to connect the new room; do not duplicate, move or replace the stairs. Keep the breakfast route and mission. Use the existing centre-ray E interaction registry and single audio context for the TV, phone, family photo and locked front door. No added voices, scares, new journey or optional future systems. Inspect ten real runtime views, exercise TV/audio/collisions and benchmark stationary and walking separately; generated art is not game-test evidence. Use neutral landscapes or the existing family, never the individual girl portrait.
