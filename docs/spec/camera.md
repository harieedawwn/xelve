# Camera spec — scripted direction + living body

The player never controls the look direction. Every look is authored. On top of the authored path, procedural layers make it feel like a real head on a real body. Code: `src/camera/`.

## 1. Structure
```
final = Rail(body position, s) ∘ Shot(look target / roll / fov, authored) ∘ Body layers (springs) ∘ Shake
```
- **Rail**: Catmull-Rom spline per level segment; body moves along it with speed profile (walk 1.6 m/s, run 4.2 m/s, sprint 6.5 m/s), acceleration-limited (no instant speed changes).
- **Shot track**: keyframes along rail distance `s` or time: `{look: point|entityId, fov, roll, ease, holdMs}`. Look target is blended with a critically damped spring (half-life 120–250 ms) so changes feel like a head turning, never a snap — unless the key is `cut:true` (cinematics only).
- **Head leads body**: on curves, look target is sampled 0.35 s ahead on the rail (anticipation), then body follows.
- **Events**: `glance(target, 600ms)` for points of interest (enemy entering, Ve's doodle, pickup). Encounter start = head turns to the threat with slight dip (bracing).

## 2. Body layers (all springs: `x'' = k(target-x) - c x'`, tuned per state)
| Layer | Rule |
|---|---|
| Gait bob | step cycle by distance (stride 0.7 m walk / 1.1 m run). Vertical 1.2 cm walk / 2.5 cm run (keep small, Mirror's Edge lesson), lateral sway at half freq 0.8 cm, roll ±0.4°. Footstep sound at each trough. |
| Breathing | idle: pitch ±0.25°, y ±0.4 cm at 0.22 Hz; after combat 0.45 Hz for 3 s. |
| Accel sway | pitch forward ∝ acceleration (max 2°), settles with slight overshoot. |
| Turn lean | roll ∝ curvature × speed² (max 4°). |
| Jump | anticipation crouch −6 cm/120 ms → launch pitch up 3° → air float + gentle drift noise → landing impulse: dip ∝ fall speed (max −14 cm), roll 1–2° random side, recovery underdamped (ζ≈0.55) 350 ms, heavy thud sound. |
| Attack coupling | each slash rotates camera 1.5–3° along swipe direction and pushes 3–5 cm forward, returns via spring. Heavy charged hit: lean in 6 cm before, kick back after. |
| Hit taken | trauma +0.35..0.7 and a directional kick (yaw/roll away from the hit source 3–5°). |
| Shake | trauma model: trauma ∈[0,1], decays 1.4/s; offset = maxRot × trauma² × perlin(t·25) per axis (yaw 2°, pitch 2°, roll 3°, small translation). |
| Low HP | slow pulse in fov −1° + vignette darkening (hard-edged stepped vignette, not a soft gradient). |

"Giảm rung camera" setting scales bob, shake and lean by 0.35.

## 3. Authored moves (library in `src/camera/moves.ts`)
- `wake`: lying on floor, blink (eyelid black bars), roll from 70° to 0 while sitting up, look at hand with voxel, stand.
- `peek(dir)`: lean out from cover 25 cm with 6° roll.
- `coverDash(from,to)`: boss arena — low sprint along an arc, head looks at boss for first 40% then at the destination, slide-in stop with forward pitch.
- `leap(targetPoint)`: anticipation crouch, launch along a parabola to apex near boss face, FOV 78→92 punch, slow-mo at apex (0.25×, up to 1.6 s real), then fall with wind roar, landing impulse.
- `dodge(side)`: duel — 0.5 m side-step with 7° roll toward the side and quick return; or slide under for low attacks.
- `pickup(object)`: glance down, object rises into view for 2 s, return.
- `cinematicCut(shots[])`: used only for chapter intros/outros (cuts allowed).

## 4. Rules
- FOV 78 default (landscape phones). Never change FOV by more than 14° except `leap`.
- Never more than one authored move at once; layers keep running underneath.
- Everything runs on scaled game time except UI and shake decay (real time) so hitstop freezes motion but shake still settles.
