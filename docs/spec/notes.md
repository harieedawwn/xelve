# Research notes (done once, 2026-11; don't repeat these searches)

## Tutorial
- Mobile players don't read text; text tutorials get skipped. Teach by doing inside real levels ("invisible tutorial"), one action at a time, at the moment it's needed.
- XELVE: Ve's 3-frame wall doodles show gestures in-world; ghost-finger only if player idles 4 s; English/odd terms get a "?" chip → 1 line + 2 s looping mini animation (shown once, re-openable from Cài đặt › Thuật ngữ).

## Story writing
- "Do, then show, then tell" (Skolnick). Keep it simple; environment carries history (Limbo, Sky, ABZÛ).
- Keep a lexicon and stick to it (King narrative team tip) → see glossary in docs/DESIGN.md#lexicon.
- First-person: the player character must not quip (POV error, e.g. Duke's "Come get some").

## First-person camera / body feel
- Mirror's Edge (DICE): camera at the eyes, wider FOV, reduced head bob to avoid motion sickness; body awareness sells weight.
- Industry approach (Opsive, Activision patents, UE camera plugins): procedural layers on mass-spring-dampers + coherent noise per axis; states blend (idle breathing, walk, run, air, landing impulse scaled by fall speed, turn lean/roll, acceleration sway). Authored moments (scripted shots) + procedural layer on top.
- Shake: trauma model (Eiserloh, GDC "Juicing your cameras with math"): trauma 0..1 decays linearly, shake = trauma² × perlin(t) per axis; rotation shake > translation shake in FP.
- Ghostrunner is the closest genre reference (FP sword, slow-mo dodge). Do not copy its UI or neon look.

## Android fullscreen
- Use WindowInsetsControllerCompat.hide(systemBars) with BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE, re-apply in onWindowFocusChanged/onResume. Do it natively in MainActivity (no plugin needed). Also `layoutInDisplayCutoutMode = shortEdges`, `screenOrientation="sensorLandscape"` in AndroidManifest. Android 15 forces edge-to-edge: UI must read safe-area insets (CSS env() + fallback values injected from native).
- Web preview: requestFullscreen + screen.orientation.lock('landscape') on first tap; if still portrait show a rotate icon overlay.

## Status effect names (Vietnamese standard, Liên Quân convention)
Làm chậm, Choáng, Hất tung, Đẩy lùi, Đóng băng, plus Bỏng, Chảy máu. Never invent new effect words.

## Sound
- Whooshes: synthesize (band-passed noise, centre freq + gain from tip speed) — better than samples because it tracks speed continuously.
- Impacts: 3 layers transient/body/low, per material; ±3% pitch randomisation; convolution reverb per space (generated IR).
- Real recordings only if synthesis fails the audition: CC0 only (Kenney Impact Sounds, Sonniss GDC bundle is royalty-free). Asset sites aren't reachable from cloud sessions → user downloads into assets/sfx/.
