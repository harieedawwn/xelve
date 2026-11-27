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
