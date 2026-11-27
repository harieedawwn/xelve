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

## UI (v2 — game UI, not web UI; user: v1 looked like generic AI web UI)
Concept: **"Vết chém trên giấy kỹ thuật."** Every UI surface is a black ink slab or a strip of technical drawing paper, cut on a diagonal as if sliced by the weapon. Selection = the orange voxel. Transitions = the screen gets slashed.
- **Shapes:** no rectangles-with-borders cards. Panels are parallelograms / slabs with one or two 12–18° diagonal cuts (clip-path polygons). Buttons are ink slabs skewed −12°, text un-skewed inside. Corners sharp.
- **Layering:** big decorative-free typography as structure: chapter/mode titles in Be Vietnam Pro 900 at 12–22vh, tight tracking, cropped by the screen edge or by a slab. Small labels set rotated 90° along slab edges like drawing annotations (measurement ticks, "XEL-07", level numbers).
- **Paper:** technical-drawing strip = paper colour with thin stone hairline ruler ticks on one edge only (the only "pattern" allowed; no grid backgrounds).
- **Selection:** the orange voxel square snaps next to the focused item (FLIP, 160 ms); focused slab shifts 6px along its skew.
- **Signature transition:** "chém màn": a diagonal ink slash wipes across (220 ms), the screen splits along it and the halves slide apart (380 ms) revealing the next screen. Back = reverse. Reduced motion: crossfade 150 ms.
- **HUD:** HP = 6 short skewed ink bars with a paper hairline; Lực = a skewed bar that fills from the weapon side; boss bar = full-width ink slab at the top with the boss name rotated small at its left end; contextual buttons (Đỡ, ‹ › ↑) = skewed ink slabs with white glyphs, press = slab drops 3px + white flash frame 1 frame.
- **Cards (end of level, game over):** huge number/word + one slab of actions; enters with "chém màn".
- **Tutorial prompts (allowed now):** one short line, ≤ 8 words, in a skewed ink slab at bottom-centre with the relevant icon ("Vuốt để chém", "Giữ Đỡ khi nó đánh"). Shows the first time a mechanic appears, hides after the player does it twice. No paragraphs, no "Mẹo" boxes.
- Font, icons, sound rules unchanged: Be Vietnam Pro (900/600/400), own SVG icons 2px square caps, no emoji.
- Text still minimal: icons first.

## Bans (name these in every spec)
Gradients, neon, glow, soft bloom, coloured/blurred shadows, frosted glass/backdrop-filter, emoji, decorative blobs/dots/noise backgrounds in UI, pill buttons, centred hero with slogan, a column of buttons in the middle of the main menu, "Mẹo" boxes or explanatory paragraphs (one-line tutorial prompts are allowed, see UI), monospace ALL CAPS as decoration, arcade/8-bit sounds, high bright UI sounds, cringe/try-hard words.

## Sound direction
Realistic and heavy. Swing whoosh tracks tip speed. Impacts layered transient/body/low per material (metal ring, flesh thud, glass shatter, rubber bounce). Heavy charged hit adds a sub-bass drop + short silence before (anticipation). Slow-mo: lowpass + pitch down world, heartbeat. UI: low "cộc" body + dry "tách" transient, no high chimes. Music: slot only (assets/music/*.mp3 picked up automatically; volume slider exists).
Audition page: `/audition.html` (P4). Mặc định giữ nguyên các biến thể 1 cho tới khi người dùng chọn.
Audition results go here: *(pending — user picks after listening; defaults = variant 1 / random of 3)*.

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
