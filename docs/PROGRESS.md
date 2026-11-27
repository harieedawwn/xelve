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

## P0b · Nền móng — PARTIAL
- Moved prototype → src/ (camera/, render/, combat/weapon, enemies/bong, levels/corridor, audio/engine, ui/, scenes/slice.ts). prototype/ is gone. Slice behaviour kept; sim now runs in fixed 60 Hz steps (core/loop), hitstop/slow-mo via core/time.
- src/core: loop, time, input, save (versioned + migrations, localStorage + Capacitor Preferences), settings, quality (full tech.md table + 2 s benchmark behind the logo on first launch, live tier switch). src/i18n (vi.ts, t(), test that every used key exists).
- Cài đặt sheet (Đồ hoạ, Âm thanh, Nhạc, Giảm rung camera, Ngôn ngữ with English locked "Sắp ra mắt"), opened from title corner + HUD. Nhạc value is stored only (no music yet). Rotate overlay (portrait). Voxel wipe helper (ui/wipe.ts) used on "Chơi lại".
- Android (Capacitor 8): android/ added; MainActivity immersive (hide bars, swipe-transient, re-apply on focus/resume), cutout shortEdges, insets → --safe-l/r/t/b, sensorLandscape. Not built locally (no Android SDK here) — first build happens in CI.
- Workflow: [deploy] → tests + Pages; [deploy][apk] → APK → release `latest` asset xelve.apk. No keystore secrets yet → falls back to debug-signed APK (installs fine; later signed builds won't update over it).
- scripts/shots.mjs + `npm run shots`: 6 viewports, settings sheet, checks outside/overlap/<40px/overflow. All ok. 8 vitest tests pass; tsc clean; build OK.
- Left: (1) keystore + 4 secrets (gh not authenticated here): `keytool -genkeypair -v -keystore xelve.keystore -alias xelve -keyalg RSA -keysize 2048 -validity 10000`, then `base64 -w0 xelve.keystore` → secrets ANDROID_KEYSTORE_B64, ANDROID_KEYSTORE_PASS, ANDROID_KEY_ALIAS (xelve), ANDROID_KEY_PASS. (2) verify CI APK installs fullscreen on a phone; Pages in landscape fullscreen. (3) boot logo is the title logo (voxels drop in); a true progress-driven loader + corner cube for level change comes with P1/levels (wipe helper exists).
- Gotchas: Pages source must be "GitHub Actions". Splash is Capacitor default. Swiftshader headless is slow: slice ran at tier Thấp.

Next: P1 (after user checks APK/Pages)

## P0b · Keystore & secrets — DONE (user + executor)
- Keystore tạo bằng keytool (alias `xelve`, RSA 2048, hạn 10000 ngày); người dùng đã dán đủ 4 repo secrets trên GitHub: ANDROID_KEYSTORE_B64, ANDROID_KEYSTORE_PASS, ANDROID_KEY_ALIAS, ANDROID_KEY_PASS (đã xác nhận qua ảnh chụp trang Secrets).
- Workflow `[deploy][apk]` giờ ký release bằng keystore này (không còn fallback debug). Người dùng giữ bản backup `xelve.keystore`; KHÔNG commit (.keys/ và *.keystore bị gitignore). Mất file = không cập nhật đè được APK đã cài.
- Ghi chú cho AI khác: không thể đặt secrets từ session (gh chưa đăng nhập, request_credential không nhận token github.com). Nếu cần đổi secrets, hướng dẫn người dùng dán tay ở Settings → Secrets and variables → Actions.
- Chuỗi APK cài trước đó (nếu có, ký debug) phải gỡ trước khi cài bản ký release.

## P1 · Renderer & hiệu ứng — DONE
- pipeline.ts: depth texture on the low-res target → 1 px ink depth-edge outline (toggle `renderer.outline`); Cao directional blur (`renderer.blur`, uv vector from camera angular velocity); ghost accumulation moved to Trung bình (quality table: tb = ghost, cao = directional; slice wires both).
- render/ascii.ts: ASCII glyph *material* (screen-space 8 px cells, generated atlas) + `setDissolve()` death break-up; cheap tier = frozen glyphs. Not yet used by Bóng (P5 wires it).
- fx.ts: removed per-frame allocations (scratch vectors/colors, smear trail reuse, no array literals); particle buffer 1500 / decals 300 match tier caps; `particleCount`/`decalCount` getters.
- scenes/fxtest.ts: dev scene `?fx` — buttons for tier ×3 and each effect (outline, blur, ghost, impact, drain, smear, dissolve, spray, burst, stress), stats line (fps, particles, decals, heap KB). Labels are dev-only, not in vi.ts.
- Already existed from P0: impact frame, slow-mo colour drain (keeps saturated blood/weapon), smear crescent, pooled particles/decals, grit textures (levels/corridor gritTex).
- Checked: tsc clean, 8 tests, build OK; headless 640x360 all effects at 3 tiers, no errors (swiftshader: 56/54/44 fps). Steady-state heap growth ≈270 KB/4 s in the test scene (test's own Vector3s + three internals); effects code itself allocation-free.
- Left: real-device FPS / look check at Cao; normal-based outline edges (depth only now); ASCII on real Bóng meshes (P5); speed lines belong to P2/P3.
- Gotchas: Chromium-only heap counter (performance.memory); `?fx` skips UI/benchmark.

Next: P2

## P2 · Camera — DONE
- src/camera: rail.ts (Catmull-Rom, arc-length table, tangent, curvature), shots.ts (ShotTrack keys by rail distance, half-life spring 120–250 ms, `cut:true` only snap), moves.ts (wake, peek, coverDash, leap, dodge(side|'low'), pickup, cinematicCut), consts.ts. rig.ts rewritten: rail + shots + one authored move at a time (`rig.play`) + layers (gait bob, breathing 0.22/0.45 Hz after combat, accel sway, turn lean, jump/landing underdamped, attack coupling, hit kick, low-HP fov pulse, FOV ±14° clamp except leap) + trauma shake (decays and noise run on real time → hitstop freezes body, shake still settles). "Giảm rung camera" = ×0.35 on bob/shake/lean via `rig.reduceMotion` (slice updated; `shakeScale` removed).
- Moves that move the body in world space (coverDash, leap) hand the leftover offset to the `off` spring at the end, so the body eases back onto the rail (no snap). Leap stops 1.6 m short of the target, calls `rig.onSlowmo(1.6, 0.25)` at apex and `rig.land(9)`.
- Debug scene `?cam` (camtest.ts): curved rail, plays every move in sequence, buttons hitstop/hit/jump/lowHp/reduce; dev-only labels.
- Checked: tsc clean, 15 vitest (rail, curvature sign, no look snaps, hitstop freeze vs shake decay, single move, leap slow-mo/landing, FOV clamp, reduce motion), build OK. Headless 640x360 `?cam`: all moves played, worst look speed ≤3.2°/frame outside cut (found + fixed a degenerate look target in the leap/debug track).
- Left: feel on a real phone; footstep/landing sounds not wired (hooks `onStep`, `onLand` exist); slice still uses its own lookWant and `startWake`, shot tracks come with levels (P6+).
- Gotchas: a look target at the camera's own position makes lookAt flip (≥150° snap) — keep targets away from the body; moves with `abs` must end near the rail or they ease back via the spring.

Next: P3

## P3 · Combat lõi — DONE
- src/combat: damage.ts (pure: damage = BASE·√m·clamp(v/VREF,.2,2)·shape·lực·mat·weak, swingSpring k=K0/(I+I0) damping 0.8 critical, speedCap, chargeTime), profiles.ts (nhe/nang/khoi test profiles, registry), sweep.ts (swept hit test extracted from slice, 2.2 m/s slash threshold, 80 ms cooldown on enemy), bus.ts (typed feedback bus: hit/hurt/mote), motes.ts (Màu motes: pooled cubes burst → home to the weapon in hand), player.ts (6 HP, regen 1/6 s out of combat, checkpoint = wave restart).
- weapon.ts: spring from profile inertia, tip speed cap, lực charge (spends on hit, refills), mesh scale per profile. Dev: `?weapon=nhe|nang|khoi`.
- slice.ts wires bus → hitstop/impact/camera/sound/motes; HP via PlayerHP.
- Checked: tsc clean, 24 vitest (damage, swing, HP), build OK. Headless 640x360: heavy lags the finger more (0.149 vs 0.105 NDC·m) and kills fewer in the same swing time; no errors; motes visible.
- Left: real-phone feel; Màu counter is in-memory (`motes.collected`), persisting/spending comes with economy (P7+); profiles are stand-ins until analyze() (P7); Đỡ/Né P8; blood per enemy colour already via `Target.blood`.
- Gotchas: needs `npm ci` in fresh sessions; `__xelve.weapon` exposed for tests.

Next: P4

## P4 · Âm thanh — DONE
- Engine split: src/audio/synth.ts (toolbox), recipes/{impacts,world,ui,bong}.ts (one registry `RECIPES`, each with min gap + 3 variants, ±3% pitch), reverb.ts (generated IR per space: corridor/hall/small/open, `setSpace`), music.ts (slot: assets/music/*.mp3 auto-picked, mapping SCENE_MUSIC; silent when none), engine.ts (buses sfx/ui/music → master → lowpass → limiter; `play(name,p,v)`; pause on hidden; old API kept as wrappers).
- Recipes: hit.{flesh,metal,glass,rubber,stone,wood}, hit.heavy (silence → sub drop), hit.weak, kill, step.{concrete,metal,wood,wet}, player.hurt, heartbeat, slow.in/out, ui.{tap,on,off,back}, bong.{appear,telegraph,lunge,hurt,death}.
- Wired in slice: Bóng appear/telegraph/lunge/hurt/death via `Bong.onSound`; music volume from settings (Nhạc slider now drives the music bus); music.play('slice') on start.
- Audition page `/audition.html` (dev labels, 60 buttons, whoosh slider, reverb spaces). vite builds it as a second page.
- Checked: tsc, 26 tests, build, headless click of all 60 audition buttons with no errors.
- Left: user listens and picks variants → record in DESIGN.md; ui.back/ui.on/ui.off not yet wired to the settings UI (only `tap` used); step floor type still concrete (levels P6+); heavy hit/material hits get wired when analyze()/materials land (P7/P8); no real music files yet.
- Gotchas: needs `npm ci` first; global `Audio` is shadowed by our class only in files that import engine.

Next: P5

## P5 · Quái chương 1 — DONE
- src/enemies/base.ts: shared `Enemy` (procedural rig, shuffle/limp + sprint gait, wind-up → lunge → recover, telegraph = pose + `<sound>.telegraph` + crack-colour flash of the arms in the last 150 ms, debris death). Types = `EnemyDef` + small hooks (`filter`, `tick`, `onDie`). `Bong` is now a thin subclass (slice unchanged in behaviour).
- bong, chay (sprint on all fours, crouch, leap with arc; grounded hits ×0.3, only airborne hits stagger), nhieu (static shader, solid 2.2 s / out 1 s / gone / in 1.4 s, click on solid, never phases mid-attack, chest core ×1.5), khien (road sign; guard up only while walking; blocked hits = sparks + `hit.metal`; breaks on Lực ≥ .9, cùn weapon or hit on sign hand; guard open during its own attack), vo (40 → 2×12 → 4×4 each, children inherit sound/spawn hooks). `registry.ts` = 1 line per type.
- sweep.ts: `HitMeta {charge, blunt}` passed to takeHit, `hittable`/`blocked` on Target; HitEvent.blocked (slice plays metal hit, no damage/motes).
- Phòng tập `?enemies` (scenes/enemytest.ts): spawn buttons per type, ×5 bong, ×6 vo, clear; stats line. Dev labels only.
- Checked: tsc, 34 vitest (9 new: registry, vo split chain, khien block/break/open guard, chay glance/air, chay leap, nhieu phasing, bong strike), build OK; headless 640x360 `?enemies`: all five spawn, chay windup→lunge→recover seen, nhieu phases, no console errors; 1 screenshot.
- Left: real-phone feel; all types share Bóng sound recipes (own recipes later); ASCII dissolve on death (Trung bình/Cao) not wired yet (ascii.ts ready); nhieu blood/deaths use the shared debris; sound for khien block uses `hit.metal`; slice still spawns only Bóng.
- Gotchas: `Enemy.update` must run before `sweep`; `hittable` is a getter (nhieu). Vo children need `onSpawn` wired by the owner to join the enemy list.

Next: P6

## P6 · Xưởng (editor) — DONE
- src/weapon: model.ts (Cell/Part/WeaponDesign, makeDesign, assemble → global grid + grip), blueprints/{khoi,dao,kiem,bua}.ts + registry (parts, anchors, depth 2 for Búa đầu, ghost silhouettes, Đối xứng default; Ch2 names in SOON), materials/*.ts + registry (id, name, density, colour only — effects P7), analyze.ts (P6 part: connectivity from grip, mass, reach, inertia, thickness → sắc, 5 bars 0..1), mesh.ts (greedy front/back per material, culled sides incl. depth-2 seams, crack-free ink hull), runtime.ts (stats → combat Profile, stand-in until P7), store.ts (one saved design per Bản vẽ + `equipped` in the save).
- src/forge: forge.ts (layout, Bản vẽ seg + locked "Sắp ra mắt", part tabs, tools, 7 materials, stats bars tap → numbers, loose count, Thử, Lưu → "Đã lưu"), grid.ts (canvas Lưới; Bản vẽ parts lie horizontal with tip right, Khối upright; 1 finger draws, 2 fingers pan + pinch 18–56 px, second finger cancels the stroke; wheel pans, ctrl+wheel zooms; ghost, loose = red frame + hatch, mirror axis, grip mark), preview.ts (own low-res WebGL canvas, rotating; Thử = swing at a dummy with swingSpring(inertia) lag + hit sound + hitstop), ops.ts (line, fill, mirror paint, Làm gọn), history.ts (Hoàn tác/Làm lại, stroke cancel).
- Weapon.setDesign(): mesh + samples + profile from the design. Slice and Phòng tập (`?enemies`) use the equipped design (`?weapon=` still overrides).
- Route: `?forge` (dev until menus P13), `&grid=1|3|5|8` for the Khối size; `khoiSize(level)` follows weapon.md#2. Back → title.
- shots.mjs: also opens Xưởng on all 6 viewports, every Bản vẽ and part, checks cells ≥ 18 px + overlap/outside/overflow; fixed the leftover vite preview process (detached group kill).
- Checked: tsc, 49 vitest (15 new: line, mirror, fill, Làm gọn, history, Khối progression, anchors/grip, loose cells, mass/reach/inertia/speed, sắc vs cùn, bars in range for random drawings on all Bản vẽ, greedy mesh finite/merged, full 8×8 = 1 front quad, outward winding), build OK, `npm run shots` all ok. Headless 640×360: drawing, fill, eraser, undo/redo, Làm gọn, pinch (18→56 px, no stray cell), Lưu, saved Dao used in `?enemies`; no page errors. 3 screenshots.
- Left: (1) feel on a real phone (drawing comfort, pinch); (2) 8% bevel + baked AO on the mesh (greedy + hull only now); (3) Thuỷ tinh alpha .6 not rendered (opaque); (4) stats are P6 stand-ins — P7 replaces with full analyze() (tips, necks, class, regions) and Màu cost/stock; (5) unlock gating (`unlocked`, khoiSize from progress) is wired by P12/P13 menus; (6) "?" chip for odd terms (levels.md) not done.
- Gotchas: `assemble()` anchors are integer cells (Búa cán sits at x=3 under a 10-wide head). Bản vẽ grids are shown rotated: view col = h−1−y, view row = x. `__forge` is exposed on window for tests.

Next: P7

## P7 · Phân tích vũ khí & vật liệu — DONE
- src/weapon/regions.ts (pure): thickness runs → sắc/vừa/cùn, tips (mũi), necks (BFS layers from grip; narrowest, outermost cut where mass beyond / width > NECK_LIMIT 40, min mass 4), region tags cạnh/mũi/lõi/đầu. analyze.ts: `analyze` + `analyzeVoxels(a, connected, loose)`; Stats gained tips, neck, cls (nhẹ ≤ 6 < vừa ≤ 60 < nặng, inertia Σρd², tuned so filled Dao=nhẹ, Kiếm=vừa, Búa=nặng), tags.
- Materials: `MaterialDef.effect {region, weak, minCharge, dmg, knock, status, noCut, chip, bounce, spread}` + `speed` (nhôm −30 % inertia by mass share). chì ×1.3 dmg ×1.5 knock; thuỷ tinh cạnh Chảy máu ×1.6 + chips on armour; magie cạnh/mũi + Điểm yếu → Bỏng 3 s, spreads 1.2 m (`spreadBurn`); cao su no cut, Đẩy lùi ×2.5, bounce; đá khô lực ≥ .9 → Đóng băng 2 s (heavy/cùn hit shatters ×3).
- src/combat/effects.ts `resolveEffects(contacts, ctx)` (pure; every sharp cạnh contact = base Chảy máu), status.ts (`Status`: chaymau/bong DoT, dongbang freezes time, choang), sweep.ts picks the contact per blade sample and passes `HitMeta.fx`; Enemy has `status` (DoT kills, tint blue/ember, frozen = no update, stunned = held in stagger, Đẩy lùi multiplies knockback).
- Weapon: `contacts[4]` per sample, `current` stats, `breakNeck()` (once, on a full-lực hit of a charged weapon; bus event `break`), `chip(k)`, `restore()` (end of level regrows). Class from analyze() sets Lực (`charged = cls ≠ nhẹ`).
- Economy: src/weapon/economy.ts (pure cost/left/canPaint/affordable; wallet in save.materials, Màu under `mau`, `earn()`). i18n keys for status/class/"Dễ gãy" added.
- Phòng tập `?enemies`: buttons `mat:<id>` (src/weapon/demo.ts), `bua gãy`, `restore`; status letters in the info line.
- Checked: tsc, 83 vitest (34 new: tips/thickness/tags/necks/class/economy/effects/status/weapon break+chip+restore), build OK. Headless 640×360: thuỷ tinh → Chảy máu, magie → Bỏng on both enemies (spread), cao su → no bleed, đá khô → frozen; no console errors.
- Left: (1) Xưởng UI: show class, "Dễ gãy" crack mark on the neck region, loose voxels etc. (keys exist); (2) forge does NOT enforce Màu/stock yet (no income until P12 — enforcing now would soft-lock); wire `canPaint` + earn from blood/objects in P12/P13; (3) Choáng/Đẩy lùi have no material source yet (Phản đòn P8 uses Choáng); (4) real-phone feel; thresholds NECK_LIMIT/CLASS are first guesses; (5) Thuỷ tinh alpha render, dong/gac/dong_core boss materials (Ch2/P10/P11).
- Gotchas: Khối weapons are always nhẹ (no Lực, no neck break); `Enemy.update` returns early while frozen; tint overrides the telegraph flash until thawed.

Next: P8

## P8 · Vũ khí nặng, Đỡ, Né — DONE
- src/combat/defense.ts (pure, data `DEFENSE`): `Defense` press/release (Đỡ), dodge(side) (Né, 0.4 s + 0.25 s cooldown), `resolve(attack, now)` → parry/block/dodge/hit + damage; Phản đòn = Đỡ pressed ≤150 ms before impact (no perfect window if pressed again within 0.35 s = no mashing; one parry per press); Đỡ soaks 1 dmg (slam 2 → 1); counter window 0.5 s after Né, = Choáng 1.2 s after Phản đòn, `counterMult` ×1.5. `canBlockWith(cls, duel)`: nặng always, vừa only in duels.
- src/combat/duel.ts (pure): `MOVES` registry (overhead/sweepL/sweepR/thrust/feint/slam: pose, windup, recover, dmg, dodge side or null, feint switch at 200 ms) + `DuelScript` (telegraph → switch → slow 300 ms before impact → impact → recover; `stagger(secs)`). Người gác (P10) reuses it with its own order.
- Profile has `cls` (nhe/vua/nang, Khối none); test profile `vua` added; designProfile passes analyze() class.
- Weapon: `guarding` → crosswise guard pose (eased). Đỡ that blocks spends Lực; Phản đòn refills it to full (counter at full Lực).
- UI: src/ui/combatPad.ts — left-thumb cluster (↑ / ‹ Đỡ › grid, ≥64 px, inside left 40 %, square + hard ink shadow, fires on pointerdown, Đỡ releases on up/cancel; hidden buttons keep their slot) + Lực bar under HP (fill = scaleX, full = vệ colour). i18n keys act.* / hud.luc.
- Sounds (recipes/duel.ts): parry (50 ms silence → bright ring + sub + tail, distinct from all hits), block, dodge, guard.up, duel.telegraph, duel.whoosh.
- Phòng tập đấu `?duel` (scenes/dueltest.ts, `&weapon=nhe|vua|nang|khoi`): DuelDummy (enemies/dummy.ts: Bóng body + baton, poses readable — baton high / out left / out right / pointed at camera, crack flash last 150 ms) loops all 6 moves; slow-mo 0.3× from 300 ms before each impact (≤0.6 s real) with colour drain; Né = authored body sidestep on a spring + roll; Phản đòn = hitstop 160 ms + 3-frame impact frame + parry sound + 0.4 s slow-mo + dummy reels; dummy's baton blocks hits outside counter windows. Dev top bar swaps weapon class; info line counts answers.
- Slice: pad with Đỡ when the weapon is nặng; Bóng strikes go through `Defense` (Phản đòn → Choáng 1.2 s + push back); Lực bar for charged weapons.
- shots.mjs: duel room on all 6 viewports — pad inside left 40 %, ≥64 px, no overlap/outside. All ok.
- Checked: tsc, 95 vitest (12 new: Đỡ class rule, perfect window, mashing, counter windows, Né sides/thrust/cooldown, script order/slow timing/feint/stagger), build, `npm run shots` ok. Headless 640×360 `?duel&weapon=vua` bot answering via real pad buttons: all 6 moves seen, 3 Phản đòn, 3 Né, 1 Đỡ, 0 hits taken, 25 counter hits landed; slice `?weapon=nang` holding Đỡ → hp stays 6, default weapon → no Đỡ button. No page errors.
- Left: (1) real-phone feel of the windows (150 ms perfect, 0.4 s Né) and of the parry hit; (2) ↑ leap is wired as a hidden slot only (boss arena P11); ‹ › strafing the ring = P10; (3) holding Đỡ forever in the slice blocks all Bóng hits (only cost: Lực) — tune in P12 if it is too safe (e.g. Đỡ slows walking or chips HP every 3rd block); (4) a 404 in the duel room is the empty music slot (no files yet).
- Gotchas: defence uses game time (`time.now`), so slow-mo widens the real-time windows on purpose. DuelDummy never dies (hp reset each tick); `__duel` exposed for tests. Pad buttons call `setPointerCapture` in try (synthetic events in tests).

Next: P9

## P9 · Bản vẽ Dao, Kiếm, Búa — DONE
- The blueprint registry, the 3 blueprints (parts, anchors, ghosts, grips) and the equip flow (`storeDesign` equips, `equippedDesign` feeds slice and Phòng tập) already shipped in P6. P9 audited them against weapon.md#3 and locked them with tests.
- src/weapon/blueprints.test.ts (10 tests): part sizes = spec (Dao 4×12 + 3×6; Kiếm 5×24 + 9×3 + 3×8; Búa 10×8 depth 2 + 3×20), grip only in cán and inside it, all parts join to the grip (no loose cells), grip in the lower half, ghosts non-empty, swing profile order Dao < Kiếm < Búa inertia with charged = false/true/true, cut at the neck → loose cells, equip flow (one saved design per Bản vẽ, switching).
- Checked: tsc, 105 vitest, build OK. No code changes were needed, so no screenshots taken.
- Left: real-phone feel of the swing per Bản vẽ; Ch2 Bản vẽ stay "Sắp ra mắt".
- Gotchas: tests use the default in-memory save (don't call loadSave in vitest: no window).

Next: P10
