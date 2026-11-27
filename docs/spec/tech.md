# Tech spec

## Stack
TypeScript + Vite + three.js (no physics engine; custom light kinematics) → Capacitor Android (APK). Web build also deployed to GitHub Pages as a preview (repo is public).
No other runtime deps unless a phase justifies it in one line. Fonts via @fontsource/be-vietnam-pro (latin + vietnamese only).

## Folders (≤ ~300 lines per file; registries so new types = 1 file + 1 line)
```
src/main.ts            boot, loading overlay, scene router
src/core/              loop (fixed 60 Hz sim, variable render), time (timescale, hitstop), input (touch zones), save, settings, quality, i18n
src/render/            lowres pipeline, outline, palette, post (impact frame, ghost blur, directional blur, ascii), smear, particles, decals
src/camera/            rig, springs, layers, shots, moves
src/combat/            weaponRuntime, hit, damage, status effects, hitstop/feedback bus
src/weapon/            model, analyze, mesh, materials/*, blueprints/*
src/forge/             editor UI (DOM over canvas)
src/enemies/           registry + one file per type + shared locomotion
src/bosses/            gac.ts, dong.ts
src/levels/            ch1/L1.ts … (rail points, shots, encounters, pickups, messages), builders for rooms
src/story/             voice messages, pickups display, chapter cards
src/audio/             engine, synth recipes, sample bank, reverb, music slot
src/ui/                hud, menus, icons/*.svg, tokens.css
src/i18n/vi.ts         every player-facing string (en.ts later)
scripts/shots.mjs      device screenshot + layout checker
android/               Capacitor project (MainActivity edits for immersive)
```

## Quality tiers (`src/core/quality.ts`, single table)
| | Thấp | Trung bình | Cao |
|---|---|---|---|
| render height | 240 | 360 | 480 |
| fps cap | 30 | 60 | 60 |
| particles | 150 | 500 | 1500 |
| decals | 20 | 80 | 300 |
| blur | none | 2 ghosts | directional |
| shadows | blob | blob | 1 shadow map 1024 |
| ascii/static shaders | cheap | full | full |
| max enemies on screen | 6 | 10 | 14 |
Auto-pick on first launch: 2 s benchmark of a test scene behind the boot logo. Changing tier applies live (no restart).

## Fullscreen & orientation
- Android: MainActivity → `WindowCompat.setDecorFitsSystemWindows(false)`, `WindowInsetsControllerCompat.hide(systemBars())`, behaviour transient-by-swipe, re-apply on focus/resume; `layoutInDisplayCutoutMode = SHORT_EDGES`; manifest `screenOrientation="sensorLandscape"`. Native passes insets to CSS vars `--safe-l/r/t/b`.
- Web: first tap → requestFullscreen + orientation lock; portrait → rotate-phone overlay (web only).

## Loading
No separate loading screen. Boot: XELVE logo assembles from voxels while assets load (progress = voxels placed). Level change: voxel wipe over the current frame, small cube fills in the corner, wipe out when ready. Assets are small (procedural geometry + few textures) so loads are < 1 s on mid phones.

## UI safety ("không lỗi UI")
- HUD/menus are DOM with CSS anchored to safe-area corners; sizes use `clamp()` on `min(vw,vh)`.
- `scripts/shots.mjs` (Playwright, chromium) renders key screens at 640×360, 800×360 (20:9), 915×412, 1024×768 (4:3 tablet), 1280×800, 1600×720; fails if any interactive element is outside the viewport, overlaps another, or is < 40 px. Every UI phase runs it.

## Audio
WebAudio graph: master → (sfx, ui, music) buses; synth recipes in `src/audio/recipes/*`; sample bank optional (`assets/sfx/*.ogg`). Unlock on first gesture; pause on hidden. Music: if `assets/music/*.mp3` exists, MusicManager plays per-scene mapping in `src/audio/music.ts`; else silent.

## Save
localStorage (+ Capacitor Preferences on Android) JSON with version + migration. Holds progress, weapons, materials, settings.

## Build & deploy
- `npm run dev`, `npm run build`, `npm test` (vitest for pure logic: analyze, damage, i18n keys), `npm run shots`.
- Commit with `[deploy]` → GitHub Actions: build web → GitHub Pages (preview link), build signed APK → release tag `latest` (fixed URL `.../releases/download/latest/xelve.apk`).
- APK only at milestones (P0 pipeline check, P10, P12, P13). Pages preview on every `[deploy]`.
- Keystore: generated in P0, stored as repo secrets `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASS`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASS`. Never commit it.
