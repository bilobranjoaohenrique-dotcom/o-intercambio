# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: keep both existing parents visible while the protagonist is inside the parked family car. Boarding places the player on the existing rear bench in the same active home scene, with normal first-person mouse look and translation disabled. Save and restore this seated state; pausing must not enable walking. A separate E action continues the existing airport transition, hiding the home only under an opaque fade. Reuse both parent identities and the parked car; preserve the breakfast/bag gating, architecture, furniture, lighting, dialogues and other chapters. No new streets, models, libraries or navigation AI. Run focused boarding/checkpoint tests, TypeScript/build and one real browser garage → rear seat → look/pause/reload → airport flow with an actual inside-car capture; avoid replaying unrelated scene suites or performance benchmarks.
