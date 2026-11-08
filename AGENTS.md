# O Intercâmbio

Implement Chapter 1 — A Despedida, following docs/PROMPT-MASTER-02.md. Continue from the existing TypeScript, Babylon.js and Vite project; preserve working gameplay and build connected, playable first-person sequences.

All dialogue is on-screen text. Never generate, synthesize, fetch, or play character voices, narration, speech-like ambience, or text-to-speech. Nonverbal ambience and interface effects are allowed.

Keep scene construction, movement/collision, interactions, dialogue, quests, transitions, audio, settings, and checkpoint logic in separable modules. Use original procedural assets where possible, maintain the PS1/PS2-inspired look, and keep controls responsive.

Run typecheck, unit tests, production build, and browser-flow checks for changes that affect gameplay. Inspect actual runtime screenshots and exercise interactions; screenshots alone do not verify controls or collisions. Report implementation separately from tested behavior and state performance environment and limits.

Current priority: move the CLOSED kitchen door clearly left of the refrigerator, not another tiny shift. User explicitly clarified: only a door there, do not create anything behind it. Final center x=-1.30,z=15.95, preserving the existing living-room wall behind the closed leaf. Adjust only the kitchen-facing tile finish and door placement/collider; restore the former tiled wall strip. Do not create a vestibule, exterior, passage, new room or story transition. Keep furniture, characters, living-room portal and other rooms untouched. One production build and a focused actual-browser capture/closed-door check suffice; no broad suites or extensive docs.
