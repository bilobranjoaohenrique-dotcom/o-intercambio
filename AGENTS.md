# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: implement docs/PROMPT-MASTER-09.md, the automatic luggage-gated garage exit and Brazilian airport farewell. Preserve the house and the rule that parents stay in the kitchen until the suitcase is collected. One E boards the existing rear seat, shows the same parents and existing gate opening, then fades to the compact night-time Gate 24 terminal without streets or driving. Reuse the same parents/heads; add only their standing travel poses and the mother's airport cardigan. Keep every view first person with no protagonist body. Use the existing text dialogue for the nine specified lines, a short affectionate gesture, then unlock the walking route and E boarding into the existing plane; do not rebuild its interior. Checkpoint airport-farewell must not skip goodbye, while a completed farewell stays complete. Isolate airport lighting/audio/UI from the home. Run focused state/collision tests, TypeScript/build and one garage → airport → goodbye → Gate 24 browser flow with actual captures; inspect composition before declaring visual fidelity. No new libraries, voices, sprawling scenery or unrelated repeated suites.
