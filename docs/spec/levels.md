# Levels, flow, unlocks

## App flow
Boot (logo assembles from voxels) → Main screen → chapter map / Xưởng / Phòng tập / Vô tận / Cài đặt.
- **Main screen**: live 3D backdrop (the last cleared location, white with the player's colour stains). Big **Tiếp tục** button anchored bottom-right (thumb), icon row bottom-left: Xưởng, Phòng tập, Vô tận, Cài đặt. No column of buttons in the centre. First launch: no main screen — game starts directly with L1 `wake`; the main screen appears after L1.
- **Chapter map**: ASCII/ink city map; cleared levels show their blood stains; Chương 2 card locked "Sắp ra mắt". Replay any cleared level (for materials).
- Cutscene/voice lines skippable by tap-and-hold 0.6 s (ring fills).

## Unlock table (Chapter 1)
| Level | New | Unlock after |
|---|---|---|
| L1 Hành lang | swipe, Bóng | Main screen |
| L2 Văn phòng | Xưởng 3×3, Thuỷ tinh | Phòng tập |
| L3 Cầu thang | Bóng chạy, Chì, Nhôm | Vô tận |
| L4 Con hẻm | Bóng nhiễu, Magie, Lưới 5×5 | — |
| L5 Sảnh — Người gác | duel, Né, Đỡ/Phản đòn | Bản vẽ Dao, Kiếm; Lõi Người gác |
| L6 Đường cái | Bóng khiên, Cao su, Lưới 8×8 | Bản vẽ Búa |
| L7 Bãi đỗ xe | Bóng vỡ, Đá khô | — |
| L8 Đống | cover arena, leap | Lõi Đống, chapter end card |

## Level data shape (`src/levels/ch1/Lx.ts`)
```ts
{ id, room: RoomBuilderId, rail: Vec3[], speedProfile: [s, speed][], shots: ShotKey[],
  encounters: { atS, waves: {type,count,spawn}[] , mode:'stop'|'run' }[],
  pickups: { atS, object, gives }[], message?: { atS, id }, doodles?: {atS, id}[] }
```
Room builders (procedural, reusable): corridor, office (desks, glass partitions), stairwell, alley (shopfronts), lobby, road (cars, signs), carpark (pillars, ramps). All geometry low-poly white with grit textures; props from a shared kit.

## Tutorial beats (no text boxes)
- L1: Ve's 3-frame doodle on the wall (swipe). First Bóng walks slowly from far; if no swipe in 4 s a ghost finger traces the swipe once.
- L2: sketchbook page shows 3×3 with dotted outline to trace; Xưởng opens with that page as the template.
- L5: the guard's first attack is slowed extra long, ‹ › pulse once in the arc colour; first thrust: Đỡ pulses.
- L8: first throw: ‹ › pulse; first opening: ↑ pulses.
- English/odd terms ("Voxel", "Bản vẽ"…): "?" chip first time → 1 line + looping mini animation.
