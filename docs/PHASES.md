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

## P0b · Nền móng [PARTIAL]
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

## P1 · Renderer & hiệu ứng [DONE]
Read: docs/DESIGN.md#rendering-look #effects, docs/spec/tech.md#quality-tiers
Do: finish low-res pipeline per tier; ink outline pass; grit textures (generated greyscale, 32–64 px); impact frame; smear meshes; ghost blur (TB) + directional blur (Cao); pooled particles + blood decals with tier caps; ASCII glyph material + dissolve; slow-mo colour drain shader (keeps blood/weapon colour). Bans: no bloom/glow/gradients.
Done when: [ ] effect test scene toggles every effect at all 3 tiers · [ ] 60 fps desktop at Cao, no allocations per frame in effects (check with a counter)
Model: Sonnet 5.5 · medium — look locked by the slice
Deploy: no · Screenshots: ≤4

## P2 · Camera [DONE]
Read: docs/spec/camera.md (all), docs/spec/notes.md#first-person-camera
Do: rail + speed profile, shot track with spring-blended look, all body layers from the table, trauma shake, moves library (wake, peek, coverDash, leap, dodge, pickup, cinematicCut), "Giảm rung camera". A debug scene that plays every move in sequence.
Done when: [ ] all moves play in the debug scene · [ ] no snaps except `cut:true` · [ ] hitstop freezes body layers but shake decays
Model: Sonnet 5.5 · medium — base rig already in the slice, spec has numbers
Deploy: yes · Screenshots: ≤3

## P3 · Combat lõi [DONE]
Read: docs/spec/weapon.md#5, docs/spec/combat.md#1-#4
Do: weapon runtime (finger→tip spring by inertia), swept voxel hit test, damage formula, feedback bus (hitstop/impact/smear/sound/camera), blood per enemy colour, Màu motes, player HP + checkpoint death, Khối rubbing.
Done when: [ ] heavy test weapon visibly lags the finger, light one sticks · [ ] unit tests for damage · [ ] slash feel matches the approved slice or better
Model: Opus 5.5 · medium — game feel; wrong calls here are expensive later
Deploy: yes · Screenshots: ≤3

## P4 · Âm thanh [DONE]
Read: docs/DESIGN.md#sound-direction, docs/spec/notes.md#sound, docs/spec/tech.md#audio
Do: audition page (`/audition.html`): whoosh by speed slider, impacts per material (3 variants), heavy charged hit, slow-mo in/out, footsteps per floor type, UI tap/toggle/back, Bóng sounds. Then the engine: buses, recipes, reverb per space (generated IR), limiter, music slot. Record chosen variants in DESIGN.md after the user picks (leave defaults if no answer).
Done when: [ ] audition page deployed · [ ] all game events mapped to sounds · [ ] min gap per sound, pause on hidden
Model: Sonnet 5.5 · medium
Deploy: yes · Screenshots: 0

## P5 · Quái chương 1 [DONE]
Read: docs/spec/combat.md#5 #4
Do: enemy registry, shared procedural locomotion (shuffle/limp, sprint, lunge), 5 types with telegraphs, weakpoints, deaths, nhieu static shader, vo splitting.
Done when: [ ] each type in Phòng tập debug spawn · [ ] every attack has pose + sound + flash telegraph
Model: Sonnet 5.5 · medium
Deploy: no · Screenshots: ≤4

## P6 · Xưởng (editor) [DONE]
Read: docs/spec/weapon.md#1-#4 #8, docs/DESIGN.md#ui, docs/spec/levels.md#tutorial-beats
Do: grid editor DOM (pinch zoom, pan, tools, mirror, Làm gọn, undo), part selector for Bản vẽ, ghost silhouettes, live 3D preview, 5 stat bars, "Thử" swing, save designs. Bans apply.
Done when: [ ] drawing on a 360-px-tall phone viewport is comfortable (cells ≥18 px) · [ ] shots pass · [ ] ugly random drawings still produce a clean mesh
Model: Opus 5.5 · medium — touch UX is easy to get wrong
Deploy: yes · Screenshots: ≤4

## P7 · Phân tích vũ khí & vật liệu [DONE]
Read: docs/spec/weapon.md#4 #6 #7
Do: analyze() (connectivity, mass, reach, inertia, thickness, tips, necks, class, regions) with unit tests; material registry with effects per region; status effects (Bỏng, Chảy máu, Đóng băng, Choáng, Đẩy lùi); breakable necks; economy (Màu, stock).
Done when: [ ] tests cover each rule · [ ] each material demonstrable in Phòng tập
Model: Sonnet 5.5 · medium
Deploy: no · Screenshots: ≤2

## P8 · Vũ khí nặng, Đỡ, Né [DONE]
Read: docs/spec/combat.md#1 #6, docs/spec/weapon.md#5
Do: Lực bar + charge timing, Đỡ, Phản đòn window, duel Né with slow-mo, counter windows, contextual left buttons.
Done when: [x] a test duel dummy exercises every move · [x] perfect parry feels distinct (hitstop+impact frame+sound)
Model: Opus 5.5 · medium — timing feel
Deploy: yes · Screenshots: ≤3

## P9 · Bản vẽ Dao, Kiếm, Búa [DONE]
Read: docs/spec/weapon.md#3
Do: blueprint registry + 3 blueprints (parts, anchors, ghosts, grips), equip flow.
Done when: [x] each blueprint drawable, equippable, swings correctly
Model: Sonnet 5.5 · medium
Deploy: no · Screenshots: ≤3

## P10 · Boss 1 — Người gác [DONE]
Read: docs/spec/combat.md#6, docs/spec/story.md (L5)
Do: lobby room, ring rail, moveset, phases, feint, round-walk opening, drops, radio line.
Done when: [ ] beatable with only Né, and with Phản đòn · [ ] every attack readable without arrows
Model: Sonnet 5.5 · medium (raise to high only if it fails twice)
Deploy: yes · APK: no · Screenshots: ≤3

## P11 · Boss 2 — Đống [DONE]
Read: docs/spec/combat.md#7, docs/spec/camera.md#3, docs/spec/story.md (L8)
Do: car-park arena, giant built from car meshes, 6 covers + destruction, throws/sweep/slam, leap + arm run + apex slow-mo, seams, phase 3 family car reveal.
Done when: [ ] full fight playable start→end · [ ] 30+ fps at Thấp on 240p
Model: Opus 5.5 · medium — biggest set piece
Deploy: yes · APK: yes · Screenshots: ≤4

## P12 · Chương 1: màn chơi & cốt truyện [DONE via P12b]
Done: L1–L4 (chapter runner, rooms, voice 1–4, pickups, Xưởng 3×3/5×5). Left → P12b: L5 wiring, L6, L7, L8 wiring + messages 5–6, remaining rooms (road), Ve's doodles/tutorial beats for L5/L8, end card.
Read: docs/spec/levels.md, docs/spec/story.md, docs/spec/camera.md#3
Do: room builders (corridor, office, stairwell, alley, lobby, road, carpark), L1–L8 data, voice messages, pickups, Ve's doodles, tutorial beats, chapter end card. If too big: L1–L4 first, mark PARTIAL.
Done when: [ ] Chapter 1 playable start→end · [ ] every setup/payoff in story.md present
Model: Sonnet 5.5 · medium
Deploy: yes · Screenshots: ≤4

## P13 · Menu, chế độ, cài đặt [DONE via P13b; Phòng tập polish optional]
Read: docs/spec/levels.md#app-flow, docs/DESIGN.md#ui #lexicon, docs/spec/combat.md#8
Do: main screen with live backdrop, chapter map with stains, Vô tận, Phòng tập, settings, thuật ngữ, icon set, transitions. Bans apply.
Done when: [ ] shots pass on all screens · [ ] no text where an icon works
Model: Sonnet 5.5 · medium
Deploy: yes · APK: yes · Screenshots: ≤4

## P14 · Hoàn thiện chương 1 [DONE]
Read: docs/INBOX.md, docs/PROGRESS.md
Do: perf on 240p tier, balance pass, bug sweep, release notes.
Done when: [ ] Thấp 30 fps steady in L8 headless profile · [ ] no open INBOX bugs
Model: Sonnet 5.5 · medium
Deploy: yes · APK: yes · Screenshots: ≤3

---
# Round 2 — user playtest feedback (2026-11-28)

## P15 · Nhịp chơi & camera chiến đấu [DONE]
Feedback: too much waiting, enemies too slow; camera looks at far enemies while one is attacking at the feet; view too low/"chill", arm shows too much.
Read: docs/spec/camera.md#2 #4, docs/spec/combat.md#3 #5, src/scenes/chapter.ts, src/enemies/base.ts, src/levels/ch1/*.ts (grep encounter data)
Do:
- **Pace:** enemy speeds ×1.7 (Bóng 0.6→1.0, khien 0.45→0.8, nhieu 0.7→1.15, vo sizes ×1.6; chay unchanged). Walk speed between encounters 1.6→2.6 m/s. Encounters overlap: next wave starts spawning when the current wave has ≤1 alive (not 0). Clear beat ≤ 0.8 s. No scripted wait > 1.2 s anywhere except story beats (signals play while walking, not standing). Spawn delays inside a wave ≤ 0.6 s apart.
- **Entries:** no enemy may appear inside the view. Every spawn enters from: a door/opening already in view (walks out), or from off-screen left/right edge (walk in sideways 1.5–3 m), or drops from above (only nhieu may "phase in"). Add `entry: 'door'|'left'|'right'|'drop'|'phase'` to wave data; validate in a test that spawn points are outside the camera frustum at spawn time unless entry is door/phase.
- **Look priority:** replace "nearest/centroid" with a threat score per enemy: closeness (strong), state windup/lunge (×3), below eye level & within 1.6 m (×2, pitch the head down to it, max −40°), off-screen penalty. Look target = highest score, spring half-life 90 ms when the target changes to a closer threat. A lunging enemy within 1.5 m must always be in view.
- **View:** eye height 1.62→1.72, default pitch −6° in fights; weapon rest pose higher and more forward (hand at ~y −0.12, z −0.42), forearm mesh mostly out of frame — the player sees hand + weapon, not the arm. FOV 78→84 in fights only (spring).
Done when:
- [ ] L1 start→end takes ≤ 60% of the old time (log it); no standing wait > 1.2 s outside story beats
- [ ] frustum test passes; enemies visibly walk in from sides/doors
- [ ] headless check: an enemy lunging at the feet is on screen in every frame of its windup
Model: Opus 5.5 · medium — game feel + camera judgment
Deploy: yes · Screenshots: ≤4

## P16 · Tầm chém & độ nhạy [DONE]
Feedback: reach tiny; a long slash needs a whole-screen swipe; normal swipes short and weak; boss 2 leap slashes clip through the body.
Read: docs/spec/weapon.md#5, src/combat/weapon.ts, src/combat/sweep.ts, src/scenes/boss2.ts (leap/seam parts only)
Do:
- **Mapping:** finger→weapon target is no longer 1:1. Use a gain curve: target offset = finger delta × gain, gain grows with finger speed (slow 1.6, fast 3.2, smooth curve), plus a swing arc: horizontal motion also rotates the weapon around the hand (yaw/roll up to 70°) so a short flick produces a wide arc. Range of target: x ±0.55, y −0.2..+0.35.
- **Reach:** arm extension on fast swings up to 0.45 m forward; enemy hit capsules +15% radius; add a 0.25 m "reach forgiveness" along the slash direction for the tip sample only. Encounter stop distance 1.05→1.35 m so enemies fight at weapon range.
- **Force feel:** a 6 cm flick at normal speed must produce tip speed > 4 m/s with Khối and Dao. Heavy weapons keep their lag (spring stiffness from inertia unchanged), only the gain changes.
- **Smear:** length follows the arc (more samples), so wide swings show a wide crescent.
- **Boss 2 contact:** Đống's body gets real colliders (boxes per car chunk + seam capsules). Weapon samples that enter a body collider stop at the surface: weapon pose is pushed back (no clipping), hit registers on contact, spawns sparks (hard-edged unlit quads, white + orange) and a scratch decal on the car surface along the slash path; seams bleed. Same rule for khien's sign and any metal prop (sparks + scratch, no blood).
- Expose all numbers in one data file `src/combat/feel.ts`.
Done when:
- [ ] unit test: 6 cm flick at 0.08 s → tip speed > 4 m/s (Khối); full-screen swipe no longer needed for a long arc
- [ ] boss 2 leap: weapon never passes inside the body (debug overlay check), sparks + scratches visible
Model: Opus 5.5 · medium — touch feel
Deploy: yes · Screenshots: ≤3

## P17 · Cốt truyện v2 (bí ẩn) [DONE]
Read: docs/spec/story.md (v2, whole file — the "Removed from v1" list is mandatory)
Do: replace all story content in code: signals msg.1–6 (header = source · time instead of only time), L2 wristbands prop, L4 watching TV frame, L5 radio line, L6 billboards countdown, L7 broadcast tower (replace hospital), L8 phase 3 tally wall + chapter end card with XEL · VE signatures, Chương 2 title "Đài phát". Remove every v1 family item and word (grep: Ve as sister, mẹ, chị, em, bệnh viện, xe gia đình, Chú Bảy). VE marks = orange doodles/arrows signed VE along every level.
Done when: [ ] grep for removed words in src/ returns nothing · [ ] every setup/payoff row exists in its level
Model: Sonnet 5.5 · medium
Deploy: no · Screenshots: ≤2

## P18 · Hướng dẫn có chữ [DONE]
Read: docs/DESIGN.md#ui (Tutorial prompts), docs/spec/levels.md#tutorial-beats
Do: a `tutorial` module: one-line prompt slab + icon, shown the first time each mechanic appears, hidden after the player performs it twice, stored in save. Prompts (i18n): Vuốt để chém · Vuốt nhanh để chém mạnh · Chém vào đầu để gây thêm sát thương · Mở Xưởng để vẽ vũ khí · Giữ để nạp Lực · Giữ Đỡ ngay khi nó đánh · Bấm ‹ › để né theo hướng nó vung · Bấm ‹ › để đổi chỗ nấp · Bấm ↑ để nhảy lên chém. Xưởng first open: 3 prompts in sequence (Vẽ vào lưới · Bật đối xứng · Bấm Thử). Keep Ve's doodles and ghost finger.
Done when: [ ] every prompt appears once at the right moment in a headless run · [ ] shots pass
Model: Sonnet 5.5 · medium
Deploy: no · Screenshots: ≤3

## P19 · Texture cho từng loại Voxel [DONE]
Read: docs/spec/weapon.md#6 #8, src/weapon/mesh.ts, src/weapon/materials/*
Do: each material gets its own texture (procedural canvas, 16–32 px, nearest, generated once and cached), mapped per voxel face. Two families:
- **2D phẳng** (flat graphic, 2–3 tones, hard pixel shapes): Voxel thô (orange with one darker pixel corner), Cao su (black with tread chevrons), Lõi Người gác (ink with blue crack lines).
- **2D realistic** (photo-like low-res noise, highlights, scratches): Chì (dull grey, soft dents), Nhôm (bright brushed streaks), Thuỷ tinh (pale cyan, white diagonal glints, slight transparency), Magie (silver-white with fine speckle), Đá khô (frosty white-blue, mist pixels), Đồng (copper with green oxide spots), Lõi Đống (rusted steel, paint flakes).
Texture id lives in each material file (registry rule). Xưởng palette swatches show the texture too.
Done when: [ ] a test weapon using all materials renders distinct and readable at Thấp (240p) and Cao · [ ] no per-frame texture creation
Model: Sonnet 5.5 · medium
Deploy: yes · Screenshots: ≤3

## P20 · UI kiểu game (thiết kế lại) [DONE]
Feedback: UI looks like generic AI web UI; must look like a game.
Read: docs/DESIGN.md#ui (v2 — whole section) and #bans, src/ui/*, src/scenes/menu*.ts
Do: implement the v2 concept on: tokens/base components (slab, skewed button, paper strip, voxel selector), "chém màn" transition, main screen, chapter map, HUD (HP, Lực, boss bar, contextual buttons), end/game-over cards, settings, Thuật ngữ. Keep layout anchoring and safe areas. Xưởng is P20b.
Done when:
- [ ] `npm run shots` passes on every screen at all 6 viewports
- [ ] no rectangle-with-border cards left; every screen uses slabs/strips; transition works and is interruptible
Model: Opus 5.5 · medium — first-time aesthetics, expensive if wrong
Deploy: yes · Screenshots: ≤4

## P20b · UI kiểu game: Xưởng & màn phụ [TODO]
Read: docs/DESIGN.md#ui, P20's components (src/ui/)
Do: apply the P20 components to Xưởng (grid frame as a technical drawing sheet, tool bar as skewed slabs, stat bars skewed), Vô tận HUD/cards, Phòng tập, signals UI, tutorial slab. Reuse only; no new styles.
Done when: [ ] shots pass · [ ] no leftover v1 styles (grep old class names)
Model: Sonnet 5.5 · medium
Deploy: yes · Screenshots: ≤3

## P21 · Icon app 3D (người chơi chọn 1 trong 3) [TODO]
Read: docs/DESIGN.md (palette, concept, bans), src/weapon/mesh.ts (reuse voxel mesh)
Do:
1. `scripts/icons/render.ts` (headless three.js via the existing playwright-core setup): render 3 icon concepts at 1024×1024, real 3D, good composition, readable at 48 px:
   - **1 · Vũ khí:** a voxel cleaver (Voxel thô + Chì) at a hero 3/4 angle, slight low camera, ink outline, on a paper background cut by one diagonal ink slab; one splash of purple blood pixels.
   - **2 · Voxel cam:** the single orange voxel, large, bevelled, floating, hard key light + ink shadow shape below, a diagonal slash cut across the background (black/paper halves).
   - **3 · Bóng:** a charcoal Bóng head and shoulders, low-poly, a slash cut across with purple blood pixels flying, paper background, orange voxel small in a corner.
   Each: no text (or at most "X" pixel glyph), no gradients/glow, strong silhouette.
2. Make `icons-preview.html` (contact sheet: each concept at 512, 192, 96, 48 px, on light and dark launcher backgrounds, plus a round-mask version) → deploy to Pages.
3. **Stop and ask the user in Vietnamese:** "Chọn icon 1, 2 hay 3?" with the Pages link. Wait for the reply in this same session.
4. When the user answers: generate Android adaptive icons (foreground/background layers, all mipmap densities, round), Play-store 512, favicon set + PWA icons from the chosen one; set the app name "XELVE"; build APK.
Done when: [ ] user picked; [ ] installed APK shows the new icon on the launcher (adaptive mask looks right)
Model: Opus 5.5 · medium — visual quality is the whole point
Deploy: yes · APK: yes · Screenshots: ≤4
