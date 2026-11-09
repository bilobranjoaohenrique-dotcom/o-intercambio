# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: the compact PS2-style in-flight cabin from Prompt Master 10. After Gate 24, place the first-person camera in the window seat, with the detailed front seat centered, oval window/wing/sunset/cloud layers on the left and the aisle/passengers on the right. Keep translation locked and bound mouse look only in the plane. Reuse subtitles for the two window reflections, smooth focus/return, and a short optional advance to the existing arrival scene. The parents must stay at the Brazilian airport. Preserve the house, airport, father GLB, mother and later scenes; no new libraries, full aircraft, flight physics or new principal characters. Run only focused look/reflection tests, a build and one boarding → cabin → window → arrival browser check with actual front/window captures. Keep documentation brief and do not repeat earlier scene suites.
