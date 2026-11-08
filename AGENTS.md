# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: parents must stay in the kitchen after the breakfast dialogue ends. The protagonist stands normally and goes upstairs; only collecting the existing travel bag moves both parents to the parked car, while the player is away in the bedroom. A pack-suitcase checkpoint must still restore them in the kitchen, even when talk-parents is completed. Preserve the same identities, rear-seat boarding, mouse look, movement lock and explicit E airport departure. No changes to scenery, models, lighting or dialogue. Run focused progression/checkpoint tests, TypeScript/build and one real browser dialogue end → parents remain at table → saved reload → upstairs bag pickup → parents in car → rear-seat entry flow, with actual captures. Avoid unrelated suites, new systems and performance benchmarks.
