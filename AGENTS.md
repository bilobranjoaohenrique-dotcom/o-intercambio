# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: Prompt Master 07, only a compact garage connected physically to the existing ground-floor passage. Preserve the bedroom, upper corridor, stair, living room, furnished kitchen, parents and dialogue. Open only the necessary exterior passage wall for its internal door. Reuse the existing bedroom bag and airport transition; the car must remain blocked until the bag objective is completed. No laundry, vehicle physics, unrelated refactors or extra dependencies. Use the four focused garage unit tests, one production build and one actual-browser garage walk/capture including the bag gate, rather than repeating the older room or breakfast suites. Inspect the actual garage captures before claiming visual completion.
