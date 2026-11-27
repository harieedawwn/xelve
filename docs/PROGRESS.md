# Progress (append-only)

## Setup (manager chat)
- Wrote CLAUDE.md, docs/DESIGN.md, docs/spec/* (tech, camera, combat, weapon, levels, story, notes), PHASES.md.
- prototype/: draft modules only (springs, camera, world, fx, enemy, weapon, audio, render, ui, style.css). NOT wired, NOT run, NOT typechecked. main.ts missing. P0a finishes it.

Next: P0a

## P0a · Bản chơi thử 30 giây — DONE
- Fixed draft typecheck (enemy.ts definite-assignment). Wrote prototype/main.ts: title → wake → corridor (doodle glance) → 2 encounters → lift end card; look rule, hit sweep (dmg formula from phase), hitstop, kick/trauma, blood/splash/smear, impact frame, last-kill slow-mo + desat, Bóng strike → HP/vignette, HP 0 → restart encounter, live tier switch (resize, fx caps, 30 fps cap, ghost on Cao).
- Added .github/workflows/deploy.yml (Pages on `[deploy]` in commit message). Pages must be set to "GitHub Actions" source in repo Settings.
- Checked: tsc clean, `npm run build` OK, headless Chrome 640x360 scripted playthrough reaches `end` (title/walk/fight/end screenshots viewed). Not checked: touch feel, audio by ear, real-device FPS, Cao ghost look.
- Left: nothing for P0a. Gotchas: "Chơi lại" = page reload (back to title); two harmless 404s in dev console (favicon); weapon sweep untested for tuning on a real phone.

Next: P0b
