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
