# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: preserve and refine the integrated Westbridge sequence after the existing terminal welcome: rear-seat drive, parking and first-person exploration toward Daniel and Helen's blue house. Follow docs/OPERACAO-WESTBRIDGE.md and the user's staged operation request. Reuse the supplied models and existing player/interactions/audio systems, load the neighborhood selectively, and preserve local model transforms and all earlier scenes/dialogues. Validate each stage before widening scope. Keep environment lighting, camera projection and navigation scoped and restorable. Measure before optimizing; software-renderer timings do not establish physical GPU or mobile FPS. No unnecessary dependencies or broad architecture rewrite.

Preserve the existing Gate 24 → seated window-view flight → terminal flow, including bounded look, text reflections and camera restoration. The protagonist's parents remain at the Brazilian airport; Daniel and Helen are the hosts in the United States. Do not rebuild previously approved scenes or repeat unrelated scene suites.
