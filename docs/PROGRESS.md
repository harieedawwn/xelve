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

## P10 · Boss 1 — Người gác — DONE
- src/bosses/nguoigac.ts: `NguoiGac extends DuelDummy` (body + poses reused), all numbers in `DATA` (hp 520, phases at 66/33 %, per-phase move order / flurry length / walk time / tempo / idle, openMult ×1.5, parryStun 1.5). Flurry → he walks his round facing away (every hit lands ×1.5 = the opening) → next flurry. Phase change = 1.4 s stagger + `onPhase`. Phase 3 adds `feint` (overhead → sweepR at 200 ms) and `slam`.
- Reuse: `DuelScript.tempo` (faster wind-ups per phase), `DuelDummy.immortal`/def param, new move `thrustN` (his thrust: Đỡ/Phản đòn OR a Né to either side — spec says thrust is Đỡ-only, but "beatable with only Né" needs it; the dummy keeps the old `thrust`).
- src/levels/lobby.ts (hall, reception desk, thermos, radio, Ve's drawing of Chú Bảy), src/scenes/boss1.ts (route `?boss`, `&weapon=nhe|vua|nang`): duel wiring as `?duel`, ring camera drift (±0.35 rad authored), boss bar with phase ticks, 6 HP pips, restart duel on death, defeat → slow-mo, drops, radio crackle + caption "Tầng mười bốn ổn chưa?".
- Drops: `src/story/drops.ts` (`grant`), save gained `unlocked: ['khoi']` + `drops: []` (merged by defaults, no version bump). Nguoigac → Bản vẽ Dao + Kiếm + item `loi_nguoigac` (flag only; Lõi has no use until P11).
- Checked: tsc, 112 vitest (6 boss + 1 drops: phases, Né-only answerable, baton blocks until open, round-walk ×1.5, phase stagger/defeat, drops once), build OK. Headless 640×360 `?boss`: bot with only Né + swipes beat all 3 phases, drop granted, no console errors. 1 screenshot.
- Left: (1) real-phone feel/balance — the bot is unrepresentative (hp 520 is a guess; check ~60–90 s fight with a Dao/Kiếm); (2) the ring camera only drifts, ‹ › still = Né (no ring strafe); (3) `?boss` is dev-only until P12 wires L5 (Bản vẽ gating via `save().unlocked` is not read by Xưởng/menus yet — P13); (4) shots.mjs has no boss room entry; (5) Lõi Người gác has no weapon use yet; (6) he shares Bóng sound recipes.
- Gotchas: `Enemy.phase` is the gait clock — boss stage is `stage`. Radio caption uses a setTimeout (real time).

Next: P11

## P11 · Boss 2 — Đống — DONE
- src/bosses/dong.ts (pure, all numbers in `DONG`): `DongBrain` state machine idle → windup → (throw: flight → down/opening 2 s → assault while the player is on the arm) / (sweep, slam: impact → recover); per-phase order + tempo; phases at 66/33 % wait until he is back in idle; phase 3 = `reveal` (rips the roof panel, seams move to the chest). Helpers: `nextCover` (‹ › skips broken covers), `nearestCover`, `throwBreaks` (staying = cover breaks; an empty cover cracks, the 2nd car breaks it; never below 2), `impactDamage` (throw only on its cover, sweep on its half, slam everywhere: 1 in cover, 2 caught mid-dash, Đỡ −1), `inReach` (↑ only from a cover next to the lowered arm).
- src/levels/car.ts (merged car/van/old-car geometry + ink edges, shared), src/levels/carpark.ts (top deck, painted bays, parked cars, parapet, 6 covers on an arc: pillar/van/booth/pillar/barrier/car, `destroy()` → rubble + debris, hospital across the road with a slow white colour pulse).
- src/bosses/dongBody.ts: ~12 m giant from cars (legs on end, torso stack, crushed-car head, 2 arms × 2 long cars), family car (old, silver) behind a roof panel in the chest, seams = blood-colour cracks (no glow), eased poses for throw / sweep / slam / stagger / reveal, slam shock ring, `collapse()` (pieces fall away from the player, the family car settles upright in front).
- Camera: new `armRun` move in camera/moves.ts (crouch → leap onto the arm → run up it → jump to the seam, slow-mo 0.25× ≤1.6 s at the apex → fall back to the nearest cover, landing impulse). coverDash for ‹ ›; sweep wind-up = 0.9 s cinematicCut showing the arm (combat.md#7 asks for a jump-cut); ‹ › pressed during a dash or the cut is queued.
- src/scenes/boss2.ts + boss2ui.ts (route `?dong`, `&weapon=nhe|vua|nang`, `&tier=thap|tb|cao`, `&loi=1`): thrown cars fly a parabola with a growing hard shadow + scrape + throw slow-mo; seams are sweep targets (reachable only from the apex); sóng chém = Lực-1 slash from cover while Lõi Người gác is owned (`save().drops` has nguoigac) → orange crescent chips a seam; player death = white-out 1.2 s then reload (checkpoints are P12). Ending: collapse → walk to the family car → pickup of Ve's sticky note (canvas texture from i18n `note.l8`) → message 6 typed subtitle (waveform, 05:46, breaks into static) → look up at the hospital → white → card "Chương 2 · Ve / Sắp ra mắt". Drop `dong` → item `loi_dong`.
- FX takes optional bounds (open arenas); sounds recipes/dong.ts (groan, scrape, crash, slam, sweep, rip, wind, fall, wave); CSS .voice/.whiteout/.chcard; shots.mjs checks the Đống arena on all 6 viewports.
- Checked: tsc, 119 vitest (7 new Đống), build, `npm run shots` all ok (incl. dong ×6). Headless 640×360 Thấp (240p): ~88 draw calls / 3.6k tris, 60 fps headless (cap 30 on Thấp); bot fight with vua + Lõi won start→end in ~110 s (before the wave nerf); with current numbers the crude bot dies in phase 2 (it ignores slams and runs out of covers) — ending flow verified by skipping hp. No page errors. 4 screenshots.
- Left: (1) real-phone feel + balance (hp 540, sóng chém 9 dmg / 1.8 s, sweep wind-up 4 s, cover crack rule are first guesses; target ~2–3 min fight); (2) the throw always uses the right arm (also for left covers); (3) the voice-message UI here is local to boss2ui — P12 should make it the shared story component for messages 1–6; (4) death reloads the page — P12 checkpoint; (5) ↑ icon has no fade-in animation (just shows); (6) Lõi Đống has no use yet; (7) real 30 fps on a low phone untested.
- Gotchas: `rig.rail` is swapped to a tiny 2-point rail at each cover (and at the family car) so endMove absorbs no offset. Seam targets are only swept while `assault` is true. `__dong` exposed for tests (dash, leap, brain, body…).

Next: P12

## P12 · Chương 1: màn chơi & cốt truyện — PARTIAL (L1–L4 done)
- Data: src/levels/ch1/{types,L1..L4,index}.ts (id, room, length, speed, encounters, pickups, message, doodles, unlocks, forge). New level = 1 file + 1 line.
- Rooms: src/levels/rooms.ts `buildRoom(scene, 'office'|'stairwell'|'alley')` (+ existing corridor.ts, lobby.ts, carpark.ts). Office: desks, glass partitions, Ve's wall of rubbed-out faces, taped sketchbook page, framed silver-car drawing. Stairwell: steps, rail, pipes, window frames. Alley: shopfronts, TV shop with animated static screens, welding crate, Ve's sticker on a shutter.
- Runner: src/scenes/chapter.ts replaces slice.ts (deleted). `?level=N[&go=1]` (go=1 skips the title); default = save.progress.level+1. Flow: walk → encounters → pickup (stop, look, object 2 s in front of the eyes + caption) → voice message → level end: unlocks saved, Xưởng opens (L2 3×3, L4 5×5), then the next level by page load.
- Story: src/story/voice.ts (shared messages 1–5; tap = finish text, hold 0.6 s = skip ring), progress.ts (completeLevel, pickup names), pickups.ts (page / material lump). `khoiSize(save)` in economy.ts from flags grid3/grid5/grid8. i18n: msg.1–5, level.1–4, note.l2, drop.grid3/5.
- Checked: tsc, 126 vitest (7 new level-data tests), build; headless 640×360 bot ran L2 start→end (3 waves, page pickup, message 2, Xưởng opens, unlocks saved), no page errors. L3 and L4 bots also ran start→end with no page errors (pickups Chì+Nhôm, Magie; unlocks l3/l4, grid5 saved).
- Left (P12b): (1) L5 (lobby + boss1 → needs routing into the chapter flow + Bản vẽ gating), L6 road room + Bóng khiên + Bản vẽ Búa pickup + message 5 + Cao su, L7 car park + Bóng vỡ + Đá khô, L8 = boss2 + message 6 + end card; chain `?level=` through them; (2) tutorial beats (ghost finger in L1, Ve's 3-frame doodle exists only in corridor.ts; L5/L8 pulses exist in boss scenes); (3) boss2ui.voice should use story/voice.ts; (4) material pickups give stock but Xưởng does not enforce Màu yet (P13); (5) death inside a level restarts the current wave only; (6) 'run' encounter mode unused; (7) stairwell is flat (no descent), Ve's doodles list unused.
- Gotchas: scenes read `lv.pickups` in order — keep `atS` sorted and not inside an encounter's stop; message waits until no encounter is pending before its atS.

Next: P12b (finish P12: L5–L8)

## P12b · Chương 1: L5–L8 — DONE (polish left)
- Data: src/levels/ch1/L5..L8.ts + index (8 levels). `LevelData.boss` ('nguoigac' | 'dong') = boss levels; main.ts runs boss1/boss2 scene for them (`?level=5`, `?level=8`). Dev routes `?boss` / `?dong` unchanged.
- L5: boss1 completes level 5 (drops Dao/Kiếm/Lõi) and, when entered via `?level=`, wipes to L6 7 s after defeat. L8: boss2 `win()` calls completeLevel(8); the end card already follows.
- L6 Đường cái (road room: kerb cars, crashed van, signs, hoarding with hammer page, tyres, bus stop 8×8 page): Bóng khiên/vỡ/chạy/nhiễu, pickups Bản vẽ Búa (`bua`), Cao su, Lưới 8×8 (`grid8`), message 5, Xưởng opens 8×8. L7 Bãi đỗ xe (pillars, bays, parked cars, cooler box): Bóng vỡ + khiên, Đá khô.
- src/levels/rooms2.ts = road + carpark furniture (called from buildRoom, themes in rooms.ts). i18n: level.5–8, drop.grid8, drop.bua. pickups.ts: `bua` uses the page mesh.
- Checked: tsc, 127 vitest (level data: messages 1–6, boss levels, forge 3/5/8, new pickup names), build; headless 640×360 loads L5–L8 without page errors; L6/L7 bot swipes (see gotchas). 1 screenshot checked.
- Left (polish, → P14/P13): (1) L1 ghost-finger tutorial + Ve's 3-frame doodle only in corridor.ts; (2) boss2ui.voice still local, should use story/voice.ts (ending=true); (3) Xưởng does not enforce Màu/stock yet (P13); (4) 'run' encounter mode unused, stairwell flat; (5) balance of L6/L7 waves is a first guess; (6) boss1 in chapter mode: death restarts the duel (no checkpoint); boss2 death reloads page (back to L8 start via ?level=8).
- Gotchas: bosses' camera/tier fixed at 'tb'; L5/L8 need `?level=` in the URL to chain (finishLevel in chapter.ts sets it). Page mesh for `bua` shows note.l2 text.

Next: P13

## P13 · Menu, chế độ, cài đặt — PARTIAL (Vô tận left)
- Main screen: src/scenes/menu.ts (live backdrop = last cleared room, slow authored drift; Tiếp tục bottom-right with level name; icon row bottom-left: Xưởng, Phòng tập, Vô tận, Bản đồ, Thuật ngữ, Cài đặt). Shown at boot when progress.level ≥ 1 (no `level`/`go` param) or `?menu`. First launch still goes straight to L1.
- src/scenes/menuLogic.ts (pure + 5 tests): access (Xưởng/Phòng tập after l2, Vô tận flag l3), resumeLevel, node states, deterministic stains. menuSheets.ts: chapter map (8 nodes, orange stains on cleared, current inverted, locked + lock icon, Chương 2 "Sắp ra mắt") and Thuật ngữ sheet (11 lexicon terms). Replay any cleared/current level from the map (`?level=N&go=1`).
- Home icon added to the in-level HUD bar and Phòng tập; Phòng tập (`?enemies`) now player-facing: i18n enemy names, Dọn sạch, back icon; material demos only with `&dev`.
- Icons: ICON.play/forge/gym/endless/map/book/home/back in ui/dom.ts. i18n: menu.*, enemy.*, term.*, gym.clear, map.chapter1. CSS block "main screen" in style.css.
- Checked: tsc, 132 vitest, build, `npm run shots` ok on 6 viewports (new `menu` entry: main screen, map, terms with seeded save). 2 screenshots viewed.
- Left (P13b): (1) Vô tận mode itself (arena, waves, mini-boss every 5, best wave saved) — icon is locked "Sắp ra mắt" for now; (2) Phòng tập: damage numbers, quick-swap saved weapons, slow-mo toggle, spawn only unlocked enemies; (3) menu→scene uses wipe + page load, no "?" chips for odd terms yet; (4) Xưởng does not enforce Màu/stock (P14 or P13b); (5) backdrop is a corridor-style drift, no player stains in 3D yet; (6) real-phone check of tap sizes.
- Gotchas: menu skipped whenever URL has `level` or `go`; chapter flow chains with those. Locked icon label shows only on press/focus.

Next: P13b (Vô tận + Phòng tập polish), then P14

## P13b · Vô tận — DONE (Phòng tập polish left)
- src/scenes/endlessLogic.ts (pure + 6 tests, all numbers in `ENDLESS`): wave size/types from unlocked flags (bong; chay l3; nhieu l4; khien+vo l6), mini-boss every 5th wave (first enemy ×1.45 scale, ×5 hp), 4 rotating backdrops (corridor/office/alley/road, 5 waves each), rewards (Màu every wave, +3 common material every 5th), best wave in `save().bests.endless` (new field, merged by defaults, no version bump).
- src/scenes/endless.ts (route `?endless`): standing arena, same combat wiring as chapter (Đỡ/Phản đòn, Lực pad), HUD "Đợt N / Kỷ lục M", death → game-over card (Đợt, Kỷ lục, Chơi lại, home). Menu icon now opens it once `l3` is unlocked. i18n endless.*.
- Checked: tsc, 138 vitest, build; headless 640×360 (thấp) with seeded save: 6 waves cleared, Màu 6 + Chì 3 saved, best 6, no page errors. 1 screenshot.
- Left (P13c, optional): (1) mini-boss is a scaled/tanky normal enemy, no unique moves; (2) the arena is a straight room, not truly circular (look is authored-only, so enemies come from the front); (3) backdrop swap is instant (no wipe); (4) Phòng tập: damage numbers, quick-swap weapons, slow-mo toggle, unlocked-only enemies; (5) "?" chips for odd terms; (6) Xưởng does not enforce Màu/stock; (7) real-phone check of balance and tap sizes.
- Gotchas: backdrops are built into a temp Scene and their non-light children moved into a Group; lights/background/fog come from the first room built. `__endless.kill()` is a test helper.

Next: P14

## P14 · Hoàn thiện chương 1 — DONE
- Perf: headless 640×360 `tier=thap` L8, L6 and Vô tận each ~60 fps (uncapped), no page errors. INBOX empty. Release notes in docs/RELEASE.md. No code changes (no bugs found).
- Checked: tsc, vitest, build.
- Left: real-phone 30 fps and balance check; Xưởng Màu/stock enforcement; boss death checkpoints; Phòng tập polish.
- Gotchas: playwright is not a project dependency here; use playwright-core as scripts/shots.mjs does.

Next: none (Chương 1 complete)

## Manager — round 2 (2026-11-28)
- User playtest feedback turned into P15–P21 (PHASES.md "Round 2"). story.md rewritten (v2: mystery, family drama removed). DESIGN.md UI section rewritten (v2: game UI concept "Vết chém trên giấy kỹ thuật"); one-line tutorial prompts now allowed.

Next: P15

## P15 · Nhịp chơi & camera chiến đấu — DONE
- Pace: enemy speeds ×1.7 (bong 1.0, khien 0.8, nhieu 1.15, vo 0.96/1.44/2.08; chay unchanged); walk speed 2.6 m/s in L1–L7; emerge walk-in ≥ 1.8 m/s. Numbers in src/levels/entry.ts (`ENTRY`, `PACE`).
- Flow (chapter.ts): a wave starts spawning `PACE.lead` 3 m before the stop (walks in while the player slows), spawns 0.35 s apart; with ≤ 1 left and more encounters ahead the walk resumes at 0.6 m/s (straggler keeps fighting, next wave overlaps); clear beat 0.8 s (+0.4 s slow-mo); pickups play while walking at 0.7 m/s; nothing story-side starts while enemies are alive.
- Entries: `Spawn.entry: 'door'|'left'|'right'|'drop'|'phase'` (+ `door` index). 'far' is gone; far/behind doors in L1–L7 swapped for near doors or side entries; nhieu uses 'phase'. Side entries start 2.6 m out, 0.3 m behind the eye; `Enemy` x-clamp waits until emerge brings it inside. Vô tận uses the same entries.
- Look: src/camera/threat.ts (pure, 6 tests): closeness² + attack ×3 + low-and-near ×2 + off-screen ×0.25 (never for an attacker within 1.5 m), hysteresis ×1.25; switching to a closer threat → look half-life 90 ms for 0.45 s (`rig.snapLook`); pitch clamp −40°.
- View: EYE 1.62→1.72 (all scenes), `rig.fight` springs FOV 78→84 and pitch −6°; weapon rest (0.21, −0.12, −0.42), forearm reduced to a short wrist stub.
- Checked: tsc, 146 vitest (new: spawn frustum test over 3 aspects × yaw × pitch, threat tests, fight FOV test), build. `node scripts/pace.mjs 1`: L1 83 s → 22 s (26%), longest stand with no enemy near 0.9 s (clear beat); L2 25 s, L3 26 s, L4 42 s, L6 42 s, L7 40 s, all to the end, no page errors (bot kills within 1.5 m; khien guard/nhieu phase make it slower). `node scripts/feet.mjs`: chay/bong lunging at the feet with 2 Bóng further away → on screen in every windup/lunge frame (worst |ndc| 0.94). 3 screenshots.
- Left: real-phone feel (speeds, 2.6 m/s walk may feel like a jog with bob amplitude); straggler creep backs the enemy slightly (it keeps its 1.05 m gap); drop entry is supported but unused in data; boss scenes keep their own look logic (only EYE changed).
- Gotchas: headless swiftshader fps drops with nhieu/many enemies → wall-clock times in pace.mjs are pessimistic. `__xelve.spawn/kill/cam` are test helpers. Encounter index advances at the stop; `waveIdx` = last spawned wave (death respawns it).

Next: P16

## P16 · Tầm chém & độ nhạy — DONE
- All numbers in src/combat/feel.ts (`FEEL`). src/combat/aim.ts (pure): touch-down sets the start like the old map, then finger motion in cm (63 css px/cm) × 0.057 m/cm × gain (1.6 slow ≤10 cm/s → 3.2 fast ≥60 cm/s, smoothstep); target range x ±0.55, y −0.2..+0.35. weapon.ts: yaw (order YXZ) + roll from hand velocity, capped 70°; forward extension up to 0.45 m with tip speed; `resample()` / `nudge()` for contact push-back.
- Reach: sweep capsule/head radius ×1.15, extra tip test point 0.25 m ahead along the tip's motion (`touches()` exported). Enemies stand at 1.35 m (`FEEL.stopGap`, base.ts).
- Smear: 64 samples, life 0.16 s, sub-samples inserted every 5 cm so wide swings draw a wide crescent (fx.smearPush).
- Contact: src/combat/contact.ts (`boxOf` local box colliders that follow their piece, `probe`, `resolveContact` push-out 2 passes, `BladeContact` glue, `hardOf`, `showColliders` debug). src/render/sparks.ts: pooled hard-edged quads (paper + orange) and scratch strips parented to the hit piece; `fx.withSparks(cam)`. Đống: every body car is a collider (family car excluded, roof panel until ripped, off after the win); `?dong&debug` draws the boxes. Bóng khiên: the sign plate is a collider while held; blocked hits spark + scratch the sign (paper splash only where a scene has no sparks). Wired in chapter, endless, Phòng tập, boss2. Clank = 'hit.metal' + 30–40 ms hitstop.
- Checked: tsc, 152 vitest (feel.test: 6 cm flick in 0.08 s → tip > 4 m/s with Khối and nhe/Dao weight, travel ≥ 1.8× old map, yaw > 0.6 rad; contact.test: rotated/scaled box exit, swing through a box never stays inside), build. `node scripts/leap.mjs`: 2 arm runs with hard swipes → contact frames 55/131, residual depth 0, seam hits register, no page errors (1 screenshot with debug boxes). pace.mjs L1 22 s, L6 42 s to the end; feet.mjs all on screen.
- Left: real-phone feel (pxPerCm assumes 160 css dpi; tablets will feel a bit slower — could read screen size); room props (parked cars in L6/L7) are not colliders — the player walks the centre so the blade never reaches them; scratches are a light strip only (no blood) and only on Đống/khien; boss1 (Người gác) has no hard parts.
- Gotchas: `Sparks` runs its own clock (scrape continuity), scenes must call fx.update. `BladeContact.stats.residual` is the debug "inside the body" measure. Samples 1–3 only are pushed (sample 0 sits at the hand).

Next: P17

## P17 · Cốt truyện v2 (bí ẩn) — DONE
- vi.ts: msg.1–6 rewritten (header `msg.N.time` now = "nguồn · giờ"), radio.l5 = "Số 07 đã qua sảnh.", chapter.2 = "Chương 2 · Đài phát", note.l2 = "VE", card.xel/card.ve added; note.l8 removed.
- Props: L2 stack of 6 blank wristbands on VE's desk (faces and framed family car gone); L4 frozen high-angle alley TV frame; L5 lobby: VE round-diagram replaces Chú Bảy drawing; L6 three billboards "05:47" stopped; L7 tower seen through a gap; car park top deck: hospital → Đài phát tower (`park.tower`). VE orange arrow marks (`veArrowTex`, rooms.ts) added in L2/L3/L4/L6/L7.
- L8: family car → tally wall (src/levels/tally.ts, last group has 6 strokes struck out) inside Đống, settles upright after the collapse; sticky note removed (noteMesh deleted); end card shows XEL — VE signatures above "Chương 2 · Đài phát / Sắp ra mắt".
- Checked: tsc, 152 vitest, build, headless L2/L4/L6/L8 at 640×360 no page errors. grep for removed words in src returns nothing (except CSS `font-family`). No screenshots viewed.
- Left: tally wall/billboard/wristband visuals not eyeballed; boss2ui voice still local (not story/voice.ts); tower in rail L7 is a flat picture; VE doodles only as static marks (no Doodle data used).
- Gotchas: msg.N.time holds source + time; voice header may be long on 640 px (ellipsis not added).

Next: P18

## P18 · Hướng dẫn có chữ — DONE
- src/ui/tutorialLogic.ts (pure, `TUTORIAL` numbers: need 2, fastSpeed 6 m/s, showSecs 14; `needed/bump/nextOf`) + src/ui/tutorial.ts (`Tutorial` slab: skewed ink, icon + one line, one at a time, bottom-centre; `show(id)` / `did(id)` / `hide()`). Counters in new `save().tutorial` (merged by defaults, no version bump). 12 prompts in vi.ts `tut.*`.
- Wiring: chapter.ts — swipe → fast → head on hits, Đỡ while an enemy winds up, Lực (charged weapons, counts when the bar fills), "Mở Xưởng" just before the Xưởng opens at level end; menu — "Mở Xưởng" on the main screen; boss1 — ‹ › né (then Đỡ) during the boss windup; boss2 — ‹ › đổi chỗ nấp on a telegraph, ↑ when the arm is open; forge.ts — sequence Vẽ vào lưới → Bật đối xứng → Bấm Thử (advances as each is done twice). Prompts hide when no enemy is alive.
- Checked: tsc, 156 vitest (new tutorial.test.ts), build. `node scripts/tutorial.mjs <level> [shot.png]` (SEED='{"swipe":2}' to skip ahead): L1 fresh → "swipe"; seeded L3 → "fast"; L6 → "forge"; no page errors. 1 screenshot viewed (640×360). `npm run shots` run (see commit).
- Left: block/luc/dodge/cover/leap/Xưởng-sequence not run headless (bot kills before any windup) — only type-checked; ghost finger on L1 does not exist in code yet (levels.md beat unimplemented); prompts are not shown in Vô tận/Phòng tập; "?" chips for odd terms still open.
- Gotchas: `window.__tut.log` lists shown prompts (test helper). A prompt that was shown but not done re-appears next session.

Next: P19

## P19 · Texture cho từng loại Voxel — DONE
- src/weapon/materials/textures.ts: 10 procedural 32 px recipes (flat: tho, caosu, gac; real: chi, nhom, thuytinh, magie, dakho, dong, dong_core) drawn once into one nearest-filtered atlas (`atlasTexture()`, cached; `tileDataUrl()` for swatches, `tileSrc()` for the grid). `MaterialDef.tex` = texture id (set in each material file). Seeded RNG → same look every run.
- mesh.ts: one quad per voxel face with tile UVs (greedy merge dropped so every voxel shows a whole tile); vertex colour is now only face shade, the texture carries colour. Falls back to no map in node tests.
- Xưởng: palette swatches and the grid cells show the texture (grid draws the tile with smoothing off).
- Checked: tsc, 157 vitest (new textures.test.ts; forge mesh test updated), build; headless 640×360 Xưởng with all 7 materials painted: distinct, no page errors. 1 screenshot viewed.
- Left: dong, gac, dong_core textures exist but those materials are not registered yet (they come with Chương 2 / boss rewards → add 1 file + 1 line each with `tex`); Thuỷ tinh has no real transparency (pale cyan with glints only); in-game 3D at Cao tier not eyeballed beyond the Xưởng preview.
- Gotchas: the atlas needs `document`; node tests get `null`. Adding a recipe changes tile slots (order of keys) — append new ones at the end.

Next: P20
