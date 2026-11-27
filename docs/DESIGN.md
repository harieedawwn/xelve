# XELVE — Design (locked; later phases assemble from this)

## Concept
"Màu chảy lại vào thế giới trắng." A white, erased city in low-res 3D; charcoal Bóng; the only colour is blood (stolen colour spilling back) and the weapon the player drew. One signature: **the drawn weapon in your hand, always centre-stage, and every hit splashing colour onto white.**

Not Superhot: no red glass people, no shattering-glass deaths, no "SUPER HOT" style text. Not Ghostrunner: no neon, no cyber HUD.

## Rendering look
- Scene rendered into a low-res target (tier: 240/360/480 px tall) and upscaled with nearest filtering. Pixel look = performance win.
- World: off-white/grey, lit flat-ish with one key light + hemisphere fill. Surfaces use tiny (32–64 px) photo-ish greyscale textures with dithering (concrete, carpet, plaster) — Ultrakill-like grit, not clean.
- Enemies (Bóng): near-black low-poly, matte. Wounds/weakpoints show their colour as hard-edged cracks (no glow).
- Weapon: extruded voxels, bevelled, 1-px dark outline, per-material colour/texture.
- Outline pass: depth/normal edge → 1 px ink line in low-res space.
- ASCII is a *material*, not a filter: Bóng nhiễu bodies, death dissolves (body breaks into glyphs), chapter-map backdrop, loading wipe.

## Effects (anime language, hard light)
- **Bloom: removed.** Replaced with hard light: flares, sparks, slash smears and flashes are solid shapes with crisp edges, drawn as unlit meshes/sprites. No soft halo anywhere.
- **Hitstop:** light 40 ms, normal 70 ms, heavy 110 ms, kill 90 ms, parry 160 ms. Freeze enemy + weapon, camera keeps a tiny punch.
- **Impact frame:** heavy/parry/finisher: 2 frames: frame A = scene thresholded to pure black/white inverted, frame B = normal with colour. Max once per 400 ms.
- **Smear:** slash = solid crescent mesh along the weapon tip path, lives 70–120 ms, colour = weapon's dominant material, thickness from speed.
- **Speed lines:** radial solid lines on dash/leap/slow-mo entry.
- **Slow-mo:** timescale ease to 0.2–0.3 over 80 ms, colour drains toward greyscale except blood/weapon; exit snaps in 60 ms with a whoosh.
- **Motion blur:** Cao = directional blur from camera angular velocity during swings/dashes; Trung bình = 2 ghost copies of weapon; Thấp = smear only.
- **Blood:** droplets (instanced quads), splats that stick to walls/floor as decals (cap per tier), arterial spray on Chảy máu. Colour per enemy type.

## Palette (tokens in src/styles/tokens.css + src/render/palette.ts)
| Token | Hex | Use |
|---|---|---|
| paper | #ECEBE6 | world base, UI paper |
| paper-2 | #CFCDC6 | world shade |
| stone | #8E8C86 | world dark |
| ink | #16161A | Bóng, UI ink, outline |
| ve | #E8590C | Ve's orange voxel, accent (sparingly) |
| blood-tim | #4A0E6B | Bóng thường |
| blood-do | #6E0B14 | Bóng chạy |
| blood-lam | #0B2F6E | Bóng nhiễu |
| blood-luc | #0E4D2A | Bóng vỡ |
| blood-dat | #6B4A06 | Bóng khiên |
Materials: chì #59606C, nhôm #C8D0D8, thuỷ tinh #A6DCE8 (alpha .6), magie #D8D8CF, cao su #24242A, đá khô #C4E9FF, đồng #B5672C.

## UI
- Style: paper + ink. Square corners (radius 2px), solid 2px ink borders, hard offset shadow (3px, ink, no blur). Pressed = translate 2px + shadow gone + scale .97 + sound.
- Font: Be Vietnam Pro (@fontsource, latin+vietnamese subsets): 900 for display (tight tracking −2%), 600 for buttons, 400 body. Numbers tabular. Line-height ≥1.15 display, ≥1.4 buttons.
- Icons: own SVG set, 24 grid, 2px stroke, square caps, stepped corners (pixel feel). Based on Lucide/Tabler shapes, redrawn. No emoji.
- Minimal text: icons first; labels only where an icon is ambiguous.
- HUD: HP = segmented pixel bar top-left; charge meter = thin arc near the right thumb zone; Đỡ bottom-left; < > ↑ slide in only in duel/boss arenas; pause top-right. Everything anchored to safe-area corners.
- Locked features: lock icon + "Sắp ra mắt".
- Transitions: scene change = voxel wipe (screen fills with squares in the tap direction, 450 ms); menus = paper sheet slide with slight rotation settle.
- Loading never switches to a separate screen: the current view gets the voxel wipe, a small cube in the corner fills as progress; boot = XELVE logo assembling from voxels.

## Bans (name these in every spec)
Gradients, neon, glow, soft bloom, coloured/blurred shadows, frosted glass/backdrop-filter, emoji, decorative blobs/dots/noise backgrounds in UI, pill buttons, centred hero with slogan, a column of buttons in the middle of the main menu, hint/"Mẹo" boxes, monospace ALL CAPS as decoration, arcade/8-bit sounds, high bright UI sounds, cringe/try-hard words.

## Sound direction
Realistic and heavy. Swing whoosh tracks tip speed. Impacts layered transient/body/low per material (metal ring, flesh thud, glass shatter, rubber bounce). Heavy charged hit adds a sub-bass drop + short silence before (anticipation). Slow-mo: lowpass + pitch down world, heartbeat. UI: low "cộc" body + dry "tách" transient, no high chimes. Music: slot only (assets/music/*.mp3 picked up automatically; volume slider exists).
Audition results go here: *(pending — audition page in P3)*.

## Lexicon (use exactly these words)
| Concept | In-game word |
|---|---|
| special pixel / material unit | Voxel |
| currency from blood | Màu |
| forge screen | Xưởng |
| drawing grid | Lưới |
| blueprint | Bản vẽ |
| enemies | Bóng |
| the erasure | Trắng |
| block / perfect parry / dodge | Đỡ / Phản đòn / Né |
| charge | Lực |
| weak point | Điểm yếu |
| modes | Tiếp tục, Vô tận, Phòng tập |
| status | Chảy máu, Bỏng, Đóng băng, Choáng, Đẩy lùi, Làm chậm |
| settings | Cài đặt; Đồ hoạ: Thấp / Trung bình / Cao; Âm thanh; Nhạc; Giảm rung camera; Ngôn ngữ |
| not built yet | Sắp ra mắt |
