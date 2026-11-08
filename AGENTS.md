# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: only the three localized house integration fixes requested by the user: replace the grey kitchen partition finish with matching full-height kitchen tiles, slightly enlarge the living room for circulation, and widen its passage into the kitchen. Preserve furnishings/material style, kitchen furniture and parents, story/objectives/dialogue, bedroom, upper hallway and stairs. Adapt only the affected shell, openings and matching collision boundaries; small furniture offsets may clear the aisle without changing models. Use one production build and one short actual-browser walk/capture focused on this connection. Do not rerun the breakfast, travel or other room suites, refactor unrelated systems, or write extensive documentation.
