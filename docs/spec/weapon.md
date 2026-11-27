# Weapon spec — draw it, and the shape decides how it fights

Code: `src/weapon/` (model, analysis, mesh, materials registry, blueprints registry), `src/forge/` (editor UI).

## 1. Data model
```ts
type Cell = { mat: MaterialId } | null
type Part = { id: string; w: number; h: number; cells: Cell[]; grip?: [x,y] }   // 2D grid, extruded to 1-voxel depth (2 for heads of hammers)
type WeaponDesign = { blueprint: BlueprintId; parts: Record<string, Part> }
```
Voxel world size: 3 cm (Khối free grid: 4 cm). A design is stored as JSON in save data.

## 2. Grid progression
| When | Grid |
|---|---|
| Start | Khối: 1 voxel (the orange keychain) |
| L2 | Khối 3×3 |
| L4 | Khối 5×5 |
| L6 | Khối 8×8 |
| Boss 1 | Bản vẽ Dao, Kiếm |
| L6 | Bản vẽ Búa |
Never above 16×32 per part on phones (cell must stay ≥ 18 px after zoom; editor supports pinch-zoom + pan with two fingers).

## 3. Bản vẽ (blueprints) — registry, one file each
| Bản vẽ | Parts (w×h) | Grip | Class tendency |
|---|---|---|---|
| Dao | lưỡi 4×12, cán 3×6 | fixed in cán | nhẹ, very fast, dual-wield optional later |
| Kiếm | lưỡi 5×24, chắn 9×3, cán 3×8 | fixed | vừa |
| Búa | đầu 10×8 (depth 2), cán 3×20 | fixed at cán end | nặng |
| (Ch2) Giáo, Phi tiêu, Găng, Đũa | — | — | Sắp ra mắt |
Each part shows a faint ghost silhouette (optional to trace). Parts snap together at fixed anchor points; the player only draws inside each part.

## 4. Analysis (pure functions, unit-tested) — `analyze(design) → Stats`
1. **Connectivity**: flood-fill from grip over 4-neighbours. Unconnected cells are flagged (red) and ignored; they fall off with a crumble animation on equip.
2. **Mass** m = Σ density(mat). **Reach** R = max distance grip→cell centre. **Inertia** I = Σ density·d².
3. **Thickness map**: for each filled cell, local thickness = min run length across the weapon's long axis. Boundary cells classified: thickness 1 → *sắc* (sharp), 2 → *vừa*, ≥3 → *cùn* (blunt).
4. **Tips**: boundary cells with exactly 1 filled neighbour lying at a local maximum of distance from grip → *mũi*.
5. **Necks**: minimal cut width between grip and each region (BFS layers). If mass beyond a neck / neckWidth > NECK_LIMIT → region marked *dễ gãy* (crack icon). It breaks off on the first charged hit and regrows after the level.
6. **Class**: nhẹ (I < I1), vừa, nặng (I > I2). Only vừa/nặng get the Lực bar; nặng gets Đỡ.
7. **Region tags** for material effects: cạnh (boundary sharp/medium), mũi, lõi (interior), đầu (d > 0.6R).

Stats shown in Xưởng as 5 icon bars (no numbers by default; tap to show numbers): Sát thương, Tốc độ, Tầm, Sắc, Nặng.

## 5. Swing physics (runtime)
- The weapon tip follows the finger through a 2D spring in a plane 0.6 m in front of the camera: stiffness k = K0/(I+I0), damping critical×0.8. Light weapons stick to the finger; heavy ones lag and overshoot — the player *feels* weight.
- Tip speed v (m/s) from the simulated weapon, not the finger. Max v capped by `VMAX/√(I+I0)`.
- Hit test: each frame sweep sampled voxel positions (every 2nd voxel, all tip/edge voxels) from previous to current pose against enemy part hitboxes (capsules). Per-enemy cooldown 80 ms.
- **Damage** = BASE × √(m_contact) × clamp(v/VREF,0.2,2) × shapeMult × lực × matMult × weakMult
  - m_contact = mass of voxels within 2 cells of the contact voxel
  - shapeMult: sắc 1.0 + Chảy máu chance; mũi 1.25 crit and pierce; cùn 0.8 + Choáng build-up + Đẩy lùi
  - lực (vừa/nặng only): 0.2 + 0.8·charge² ; charge refills in T = 0.25 s·√(I/I1)
  - weakMult: Điểm yếu ×2
- Khối (no class): rubbing fast works — many small hits, low damage each.

## 6. Materials — registry `src/weapon/materials/*.ts` (1 file + 1 line to add)
| Id | Name | Density | Colour | Where found | Effect (region) |
|---|---|---|---|---|---|
| tho | Voxel thô | 1.0 | ve orange | Màu only | — |
| chi | Chì | 2.6 | #59606C | rusty pipes (L2, L3) | nặng: more dmg/knockback |
| nhom | Nhôm | 0.5 | #C8D0D8 | window frames (L3) | nhẹ: faster |
| thuytinh | Thuỷ tinh | 0.9 | #A6DCE8 | glass walls (L2) | cạnh: Chảy máu mạnh ×1.6; each hit on armour chips 1 voxel (restored after level) |
| magie | Magie | 0.6 | #D8D8CF | welding shop (L4) | cạnh/mũi hitting Điểm yếu → Bỏng (DoT 3 s, spreads to touching enemies) |
| caosu | Cao su | 0.8 | #24242A | tyres (L6) | không cắt; Đẩy lùi ×2.5, weapon bounces back faster |
| dakho | Đá khô | 0.7 | #C4E9FF | reefer truck (L7) | lực ≥ 0.9 hit → Đóng băng 2 s (frozen enemy shatters on next heavy hit) |
| dong | Đồng | 1.4 | #B5672C | Ch2 | lực ≥ 0.9 → điện lan to 2 nearby |
| gac | Lõi Người gác | 1.2 | ink + blue cracks | Boss 1 | lực ≥ 0.9 → sóng chém (ranged crescent, 6 m) |
| dong_core | Lõi Đống | 3.0 | rusted steel | Boss 2 | lực = 1 slam → ground shockwave (Hất tung small enemies) |
Effects only trigger if the material sits in the required region AND that region made contact. A material outside its region just adds density.

## 7. Economy
- Each voxel costs Màu (thô 1, special 1 + that material's own stock). Erasing refunds 100%.
- Màu drops from blood; special materials from slashing environment objects (pipe → Chì). Vô tận gives Màu + common materials; Bản vẽ and rare materials only in chapters.

## 8. Making bad drawings look good
- Mesh: greedy-meshed voxels, 8% bevel, per-material texture, ink outline, baked AO between voxels.
- Tools: Bút, Tẩy, Đổ đầy, Đường thẳng, Đối xứng (on by default for Kiếm/Búa), Làm gọn (remove lone cells, fill 1-cell holes), Hoàn tác/Làm lại.
- Live 3D preview rotates beside the grid; tap "Thử" → swing it at a dummy in place.
- No moderation needed: offline, nothing shared.
