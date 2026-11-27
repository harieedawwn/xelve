# Combat spec — controls, enemies, bosses

Code: `src/combat/`, `src/enemies/` (registry, 1 file per type), `src/bosses/`.

## 1. Controls (landscape, two thumbs)
- **Right 60% of screen = weapon.** Touch down → weapon raises to ready (180 ms). Drag → weapon tip follows finger (spring, see weapon.md §5). Release → lowers. A slash is any segment where tip speed > 2.2 m/s; its direction = tip velocity direction.
- **Left 40%**: contextual buttons, 64 px min, bottom-left cluster:
  - **Đỡ** (hold) — only with nặng weapons (and vừa in duels). Perfect window: pressed ≤150 ms before an impact → **Phản đòn** (hitstop 160 ms, impact frame, attacker Choáng 1.2 s, free slow-mo 0.4 s).
  - **‹ ›** — duel: Né left/right. Boss arena: run to the next cover position.
  - **↑** — boss arena: leap (only when the boss is in reach; icon fades in).
- No virtual joystick. The body moves only on rails; the player decides *when*, never *where*.

## 2. Player
- HP 6 segments. Hits remove 1 (boss heavy 2). Regenerates 1 per 6 s out of combat. Checkpoint at every encounter start.
- Death: hitstop, colour drains to white from the edges, restart from checkpoint (no game-over screen, 1.2 s).

## 3. Encounter flow
Rail walk → encounter trigger → head turns to threat → body stops (or keeps running in runner sections) → waves → "clear" beat (breathing, glance at stains) → walk on. Levels mix ~70% stop-and-fight, 30% run-and-slash corridors.

## 4. Telegraphs (no arrows, no text)
Every enemy attack has: wind-up pose (readable silhouette), weapon/limb angle showing the side, a sound cue (scrape/inhale), and a 1-frame flash of the attacking limb's crack colour at the last 150 ms. Slow-mo is used only for dodge/parry moments in duels and boss throws.

## 5. Enemies (Chapter 1)
| Id | Name | Blood | HP | Behaviour | Teaches |
|---|---|---|---|---|---|
| bong | Bóng | tím | 30 | zombie shuffle (procedural limp, head lolls), lunge-grab at 1.2 m with 600 ms wind-up | basic slashing |
| chay | Bóng chạy | đỏ | 20 | sprints on all fours, leaps; vulnerable while airborne | timing, swipe up |
| nhieu | Bóng nhiễu | lam | 35 | body is TV static (ASCII/noise shader); phases out 1 s / in 1.4 s, only hittable when solid (clicks before solid) | rhythm |
| khien | Bóng khiên | đất | 50 | holds a road sign; blocks light hits (sparks, bounce); a Lực ≥ .9 or cùn hit breaks guard | heavy weapons/charge |
| vo | Bóng vỡ | lục | 40 | splits into 2 small (12 HP) on death; smalls split once more into 4 tiny (4 HP) | crowd, wide swings |
Death: hitstop + body breaks into ink chunks + glyphs (ASCII dissolve on Trung bình/Cao), big blood burst, Màu motes fly to the voxel in hand.
Weakpoints: head for all; nhieu core in chest when solid; khien hand holding the sign.

## 6. Boss 1 — Người gác (lobby duel, L5)
Human-size, very fast, baton. 3 phases (100/66/33%).
- Moves: overhead (baton raised high → dodge sideways), side sweep (baton angled left → dodge right, and vice-versa), thrust (baton pointed at camera → Đỡ/Phản đòn only), feint in phase 3 (starts overhead, switches to sweep 200 ms later — the angle change is visible).
- Every attack enters slow-mo 0.3× at 300 ms before impact for ≤ 0.6 s real time. Correct Né → counter window 0.5 s (he staggers). Phản đòn → Choáng 1.5 s.
- Between flurries he walks his "round" (copies the guard's habit) — the opening to hit him from behind.
- Arena camera: circles around him on a ring rail; ‹ › also strafe the ring.
- Drops: Lõi Người gác, Bản vẽ Dao, Bản vẽ Kiếm.

## 7. Boss 2 — Đống (car-park giant, L8)
~12 m tall, built from white cars. Arena has 6 cover positions on an arc (concrete pillars, a van, ticket booth…). The player moves between them with ‹ › (`coverDash`).
- Attacks: throws a car at the current cover (shadow grows on the ground + scrape sound → move away; staying = cover destroyed and -2 HP); ground sweep with arm (all covers on one side → jump-cut camera shows arm wind-up, move to the other side); slam (shockwave, Đỡ reduces).
- Covers get destroyed permanently (6 → as few as 2), raising pressure.
- Openings: after a throw, the arm stays down 2 s → **↑ leap** to the arm, run along it (rail), slow-mo at apex near the face: slash the seams (weakpoints = glowing-free cracks with its blood colour). Fall back to the nearest cover.
- From cover, a Lực-1 hit with Lõi Người gác sends sóng chém to chip seams (ranged poke).
- Phases: 3. Phase 3 it rips off its own roof panel, exposing the silver family car in its chest (story beat) = final weak point.
- Drops: Lõi Đống.

## 8. Modes
- **Vô tận** (after L3): circular arena (rotating set of 4 backdrops), waves of unlocked enemy types, every 5 waves a mini-boss variant. Rewards: Màu + common materials. Best wave saved.
- **Phòng tập** (after L2): dummy with damage numbers, spawn any unlocked enemy, quick-swap saved weapons, slow-mo toggle.
