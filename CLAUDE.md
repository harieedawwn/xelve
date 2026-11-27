# XELVE

First-person anime-style slash game for Android phones/tablets (landscape only). The player draws their weapon on a grid; the drawn shape decides how it fights. Story game: Chapter 1 now, Chapter 2 "Sắp ra mắt". Vietnamese UI (English later via i18n).

## Stack & commands
TypeScript + Vite + three.js → Capacitor Android APK; web preview on GitHub Pages.
- `npm run dev` · `npm run build` · `npm test` (vitest) · `npm run shots` (device screenshots + layout check)
- Deploy: commit message containing `[deploy]` → Actions builds Pages (+ APK when the phase says so).

## Read before working
- docs/PHASES.md — your phase; docs/PROGRESS.md — what's done
- docs/DESIGN.md — locked look, palette, bans, **lexicon (use these exact words)**
- docs/spec/tech.md · camera.md · combat.md · weapon.md · levels.md · story.md · notes.md (research, don't redo)

## Code map
- src/main.ts — boot, loading overlay, scene router
- src/core/ — loop, time/hitstop, input zones, save, settings, quality tiers, i18n
- src/render/ — low-res pipeline, outline, post effects, smear, particles, decals
- src/camera/ — rail, shots, spring body layers, authored moves
- src/combat/ — weapon runtime, hit sweep, damage, status effects, feedback bus
- src/weapon/ — design model, analyze(), voxel mesh, materials/*, blueprints/*
- src/forge/ — Xưởng editor UI
- src/enemies/, src/bosses/ — registry + one file per type
- src/levels/ — room builders, ch1/Lx.ts level data
- src/story/ — voice messages, pickups, chapter cards
- src/audio/ — engine, synth recipes, reverb, music slot
- src/ui/ — HUD, menus, icons, tokens.css · src/i18n/vi.ts — ALL player-facing text
- src/scenes/chapter.ts — Chapter 1 runner for every rail level (data in src/levels/ch1/Lx.ts; slice.ts is gone, P12)

## Hard rules
- Every player-facing string lives in src/i18n/vi.ts. Use the lexicon in DESIGN.md. No invented words, no slang, no emoji.
- Bans: gradients, neon, glow/soft bloom, blurred or coloured shadows, backdrop-filter, pill buttons, explanatory paragraphs (one-line tutorial prompts are OK), arcade/8-bit sounds.
- The player never controls look direction; all looks are authored shots + spring layers (camera.md).
- Gameplay values live in data/registry files, not inline. New enemy/material/blueprint = 1 file + 1 registry line.
- Files ≤ ~300 lines. Pure logic (analyze, damage) has unit tests.
- Performance: animate transforms only; pool particles/decals; respect the quality table; test at render height 240.
- Use `npm run shots` after any UI change; nothing may sit outside safe areas.
- Never commit keystores or secrets. Credit every third-party asset in assets/CREDITS.md.
