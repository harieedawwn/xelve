# Phases

Each phase = one session. Status: [TODO] / [DONE] / [PARTIAL]. Every UI/look phase restates the bans from DESIGN.md.
APK only where it says `APK: yes`. `Deploy: yes` = Pages preview (web link, no install).

## P0a · Bản chơi thử 30 giây [DONE]
Read: CLAUDE.md, docs/DESIGN.md#effects, docs/spec/camera.md#2, prototype/*.ts (drafts, typecheck them first)
Do:
- Write prototype/main.ts wiring the drafts: title (tap → fullscreen + orientation lock + audio unlock) → `wake` → walk the corridor (glance at Ve's doodle at s 2.2–4) → encounter 1 at s=8.5 (3 Bóng from doors −9, −11.5, −15) → clear beat → encounter 2 at s=19 (doors −21, −23, far end) → stop at s=31, look at lift, end card.
- Look rule: walking = ahead; fighting = blend nearest enemy head + group centroid (spring does the smoothing).
- Hit sweep: weapon samples prev→cur vs Bóng capsule/head; dmg = (4 + 9·clamp(v/5,.2,2.2))·(head ? 2 : 1); per-enemy cooldown 80 ms.
- Feedback: hitstop (70/90 ms, real-time), camera slashKick + trauma, audio.hit/kill, blood + splash, smear pushes when tip speed > 3 (game time), impact frame [1,2] on kills and fast head hits, slow-mo 0.25× for 0.55 s + desat on the last kill of a wave, Bóng lunge → player hit (camera.hitTaken, vignette, HP −1; HP 0 → drain and restart the encounter).
- Tier switch live (render.resize, fx caps, 30 fps cap on Thấp, ghost amount from camera angular speed on Cao).
- Minimal GitHub Actions workflow: build → GitHub Pages on `[deploy]`.
- Fix whatever in the drafts doesn't work; keep their numbers unless clearly wrong.
Done when:
- [ ] `npm run build` passes; slice plays start→end in headless Chrome screenshot check (title, walking, fight, end card)
- [ ] Pages link works; report the link
Model: Sonnet 5.5 · medium — drafts + numbers already written; raise to Opus medium only if the feel is wrong after the user tests
Deploy: yes · Screenshots: ≤4

## P0b · Nền móng [TODO]
Read: CLAUDE.md, docs/spec/tech.md (all), prototype/ (skim structure)
Do:
- Move the approved prototype code into the src/ layout from tech.md (keep behaviour identical; prototype/ stays as reference, excluded from build). Apply the user's feedback on the slice from docs/INBOX.md first.
- src/core: fixed-step loop, time (timescale + hitstop API), input zones, save (versioned), settings (Đồ hoạ, Âm thanh, Nhạc, Giảm rung camera, Ngôn ngữ with English "Sắp ra mắt"), quality table + 2 s auto benchmark, i18n (vi.ts, `t(key)`, test that every key used exists).
- Capacitor Android: immersive fullscreen in MainActivity, sensorLandscape, cutout shortEdges, insets → CSS vars. Web: fullscreen + orientation lock on first tap, rotate overlay in portrait.
- GitHub Actions: on `[deploy]` build web → Pages; on `[deploy][apk]` build signed release APK → release tag `latest` asset `xelve.apk`. Generate keystore locally, set the 4 secrets with `gh secret set` if permitted; otherwise write exact steps for the user in the report.
- scripts/shots.mjs (Playwright) with the 6 viewports + overlap/outside/size checks; `npm run shots`.
- Boot: voxel-assembling XELVE logo as loading; voxel wipe helper for scene changes.
Done when:
- [ ] `npm run build` + `npm test` pass; the slice plays the same from src/
- [ ] Pages link works on a phone in landscape fullscreen
- [ ] APK built by Actions installs and runs fullscreen with no system bars
- [ ] `npm run shots` passes for the settings screen
Model: Sonnet 5.5 · medium — clear spec, mostly config
Deploy: yes · APK: yes (pipeline check) · Screenshots: ≤4

## P1 · Renderer & hiệu ứng [TODO]
Read: docs/DESIGN.md#rendering-look #effects, docs/spec/tech.md#quality-tiers
Do: finish low-res pipeline per tier; ink outline pass; grit textures (generated greyscale, 32–64 px); impact frame; smear meshes; ghost blur (TB) + directional blur (Cao); pooled particles + blood decals with tier caps; ASCII glyph material + dissolve; slow-mo colour drain shader (keeps blood/weapon colour). Bans: no bloom/glow/gradients.
Done when: [ ] effect test scene toggles every effect at all 3 tiers · [ ] 60 fps desktop at Cao, no allocations per frame in effects (check with a counter)
Model: Sonnet 5.5 · medium — look locked by the slice
Deploy: no · Screenshots: ≤4

## P2 · Camera [TODO]
Read: docs/spec/camera.md (all), docs/spec/notes.md#first-person-camera
Do: rail + speed profile, shot track with spring-blended look, all body layers from the table, trauma shake, moves library (wake, peek, coverDash, leap, dodge, pickup, cinematicCut), "Giảm rung camera". A debug scene that plays every move in sequence.
Done when: [ ] all moves play in the debug scene · [ ] no snaps except `cut:true` · [ ] hitstop freezes body layers but shake decays
Model: Sonnet 5.5 · medium — base rig already in the slice, spec has numbers
Deploy: yes · Screenshots: ≤3

## P3 · Combat lõi [TODO]
Read: docs/spec/weapon.md#5, docs/spec/combat.md#1-#4
Do: weapon runtime (finger→tip spring by inertia), swept voxel hit test, damage formula, feedback bus (hitstop/impact/smear/sound/camera), blood per enemy colour, Màu motes, player HP + checkpoint death, Khối rubbing.
Done when: [ ] heavy test weapon visibly lags the finger, light one sticks · [ ] unit tests for damage · [ ] slash feel matches the approved slice or better
Model: Opus 5.5 · medium — game feel; wrong calls here are expensive later
Deploy: yes · Screenshots: ≤3

## P4 · Âm thanh [TODO]
Read: docs/DESIGN.md#sound-direction, docs/spec/notes.md#sound, docs/spec/tech.md#audio
Do: audition page (`/audition.html`): whoosh by speed slider, impacts per material (3 variants), heavy charged hit, slow-mo in/out, footsteps per floor type, UI tap/toggle/back, Bóng sounds. Then the engine: buses, recipes, reverb per space (generated IR), limiter, music slot. Record chosen variants in DESIGN.md after the user picks (leave defaults if no answer).
Done when: [ ] audition page deployed · [ ] all game events mapped to sounds · [ ] min gap per sound, pause on hidden
Model: Sonnet 5.5 · medium
Deploy: yes · Screenshots: 0

## P5 · Quái chương 1 [TODO]
Read: docs/spec/combat.md#5 #4
Do: enemy registry, shared procedural locomotion (shuffle/limp, sprint, lunge), 5 types with telegraphs, weakpoints, deaths, nhieu static shader, vo splitting.
Done when: [ ] each type in Phòng tập debug spawn · [ ] every attack has pose + sound + flash telegraph
Model: Sonnet 5.5 · medium
Deploy: no · Screenshots: ≤4

## P6 · Xưởng (editor) [TODO]
Read: docs/spec/weapon.md#1-#4 #8, docs/DESIGN.md#ui, docs/spec/levels.md#tutorial-beats
Do: grid editor DOM (pinch zoom, pan, tools, mirror, Làm gọn, undo), part selector for Bản vẽ, ghost silhouettes, live 3D preview, 5 stat bars, "Thử" swing, save designs. Bans apply.
Done when: [ ] drawing on a 360-px-tall phone viewport is comfortable (cells ≥18 px) · [ ] shots pass · [ ] ugly random drawings still produce a clean mesh
Model: Opus 5.5 · medium — touch UX is easy to get wrong
Deploy: yes · Screenshots: ≤4

## P7 · Phân tích vũ khí & vật liệu [TODO]
Read: docs/spec/weapon.md#4 #6 #7
Do: analyze() (connectivity, mass, reach, inertia, thickness, tips, necks, class, regions) with unit tests; material registry with effects per region; status effects (Bỏng, Chảy máu, Đóng băng, Choáng, Đẩy lùi); breakable necks; economy (Màu, stock).
Done when: [ ] tests cover each rule · [ ] each material demonstrable in Phòng tập
Model: Sonnet 5.5 · medium
Deploy: no · Screenshots: ≤2

## P8 · Vũ khí nặng, Đỡ, Né [TODO]
Read: docs/spec/combat.md#1 #6, docs/spec/weapon.md#5
Do: Lực bar + charge timing, Đỡ, Phản đòn window, duel Né with slow-mo, counter windows, contextual left buttons.
Done when: [ ] a test duel dummy exercises every move · [ ] perfect parry feels distinct (hitstop+impact frame+sound)
Model: Opus 5.5 · medium — timing feel
Deploy: yes · Screenshots: ≤3

## P9 · Bản vẽ Dao, Kiếm, Búa [TODO]
Read: docs/spec/weapon.md#3
Do: blueprint registry + 3 blueprints (parts, anchors, ghosts, grips), equip flow.
Done when: [ ] each blueprint drawable, equippable, swings correctly
Model: Sonnet 5.5 · medium
Deploy: no · Screenshots: ≤3

## P10 · Boss 1 — Người gác [TODO]
Read: docs/spec/combat.md#6, docs/spec/story.md (L5)
Do: lobby room, ring rail, moveset, phases, feint, round-walk opening, drops, radio line.
Done when: [ ] beatable with only Né, and with Phản đòn · [ ] every attack readable without arrows
Model: Sonnet 5.5 · medium (raise to high only if it fails twice)
Deploy: yes · APK: no · Screenshots: ≤3

## P11 · Boss 2 — Đống [TODO]
Read: docs/spec/combat.md#7, docs/spec/camera.md#3, docs/spec/story.md (L8)
Do: car-park arena, giant built from car meshes, 6 covers + destruction, throws/sweep/slam, leap + arm run + apex slow-mo, seams, phase 3 family car reveal.
Done when: [ ] full fight playable start→end · [ ] 30+ fps at Thấp on 240p
Model: Opus 5.5 · medium — biggest set piece
Deploy: yes · APK: yes · Screenshots: ≤4

## P12 · Chương 1: màn chơi & cốt truyện [TODO]
Read: docs/spec/levels.md, docs/spec/story.md, docs/spec/camera.md#3
Do: room builders (corridor, office, stairwell, alley, lobby, road, carpark), L1–L8 data, voice messages, pickups, Ve's doodles, tutorial beats, chapter end card. If too big: L1–L4 first, mark PARTIAL.
Done when: [ ] Chapter 1 playable start→end · [ ] every setup/payoff in story.md present
Model: Sonnet 5.5 · medium
Deploy: yes · Screenshots: ≤4

## P13 · Menu, chế độ, cài đặt [TODO]
Read: docs/spec/levels.md#app-flow, docs/DESIGN.md#ui #lexicon, docs/spec/combat.md#8
Do: main screen with live backdrop, chapter map with stains, Vô tận, Phòng tập, settings, thuật ngữ, icon set, transitions. Bans apply.
Done when: [ ] shots pass on all screens · [ ] no text where an icon works
Model: Sonnet 5.5 · medium
Deploy: yes · APK: yes · Screenshots: ≤4

## P14 · Hoàn thiện chương 1 [TODO]
Read: docs/INBOX.md, docs/PROGRESS.md
Do: perf on 240p tier, balance pass, bug sweep, release notes.
Done when: [ ] Thấp 30 fps steady in L8 headless profile · [ ] no open INBOX bugs
Model: Sonnet 5.5 · medium
Deploy: yes · APK: yes · Screenshots: ≤3
