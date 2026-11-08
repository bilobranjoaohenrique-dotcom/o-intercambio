# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: implement the localized kitchen/breakfast update in docs/PROMPT-MASTER-06-CAFE.md. Reuse the kitchen and parent models, keep other rooms and chapter sets unchanged, retain the direct living-room connection. Add a compact kitchen, subtle parent animation and text-driven mouths, and a smooth first-person sit/stand interaction. End this stage at the objective to fetch the suitcase upstairs; do not add travel content or transitions. The user's efficiency requirements override the former broad validation routine: build once after changes, run focused kitchen/controller checks and one functional breakfast browser flow with actual screenshots; do not rerun unrelated chapter suites. Keep documentation short and report measured behavior honestly.
