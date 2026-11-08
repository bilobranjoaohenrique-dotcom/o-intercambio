# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: correct only the placement and ground-floor integration of the already approved living room, following docs/CORRECAO-POSICAO-SALA.md. Move the approved room as one rigid set; preserve its furniture, decorations, materials, UVs, dimensions, relative transforms and light parameters. Keep the bedroom, upper hallway, original 18-step staircase, kitchen props and characters, narrative, missions, controls and other chapter sets unchanged. Adapt only the downstairs connection shell, floors and apertures needed for the direct route: bedroom → upper hallway → original stairs → living room directly ahead → kitchen. Do not route the player through the kitchen first, rebuild the stairs, teleport the player or add a loading transition. Validate the fresh waking-to-kitchen path with real controls and capture the player's unchanged descent view at the final tread before any sideways movement or staged camera turn. Recheck the moved room's interaction and audio anchors. This is a placement correction, not another visual redesign; generated art is not runtime evidence.
