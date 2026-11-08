# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: one closed main entrance door on the kitchen's exterior wall at the rear-right of the supplied camera composition (which faces -Z). The validated strip is x[-3.20,-1.92], z15.80; it is outside the living-room footprint. Preserve the living-room portal near the TV and all furniture, parents, lighting, other rooms and story. Cut only the narrow wall strip around the door, align frame and collisions, reuse current materials and examination interaction. Do not create any exterior scene, opening animation, laundry/garage, mission or dialogue changes. One production build and one short real-browser visual/interaction/collision check suffice; no broad suites, unrelated refactor or extensive docs.
