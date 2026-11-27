// Voxel mesh from a design: greedy-merged front/back faces per material, culled sides, ink outline hull.
// Only voxels connected to the grip are meshed (loose ones fall off; analyze.ts).
import * as THREE from 'three'
import type { Voxel } from './model'
import { mat } from './materials/registry'

const SIDES = [[1, 0, 1, 0], [-1, 0, -1, 0], [0, -1, 0, 1], [0, 1, 0, -1]] as const // grid dx, dy → world nx, ny

export function voxelGeometry(voxels: Voxel[], grip: [number, number], s: number): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = []
  const c = new THREE.Color()
  const X = (gx: number) => (gx - grip[0]) * s, Y = (gy: number) => (grip[1] - gy) * s
  const quad = (p: number[][], n: number[], hex: number, shade: number) => {
    c.setHex(hex).multiplyScalar(shade)
    for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...p[i]); nor.push(...n); col.push(c.r, c.g, c.b) }
  }
  const depth = new Map<number, number>(), K = (x: number, y: number) => y * 4096 + x
  for (const v of voxels) depth.set(K(v.x, v.y), v.depth)
  // front/back: greedy rectangles per (material, depth)
  const groups = new Map<string, Voxel[]>()
  for (const v of voxels) { const g = v.mat + ':' + v.depth; (groups.get(g) ?? groups.set(g, []).get(g)!).push(v) }
  for (const vs of groups.values()) {
    const hex = mat(vs[0].mat).color, d = vs[0].depth, z = (d * s) / 2
    const left = new Set(vs.map(v => K(v.x, v.y)))
    const sorted = vs.slice().sort((a, b) => a.y - b.y || a.x - b.x)
    for (const v of sorted) {
      if (!left.has(K(v.x, v.y))) continue
      let w = 1; while (left.has(K(v.x + w, v.y))) w++
      let h = 1
      grow: for (;;) { for (let i = 0; i < w; i++) if (!left.has(K(v.x + i, v.y + h))) break grow; h++ }
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) left.delete(K(v.x + i, v.y + j))
      const x0 = X(v.x - 0.5), x1 = X(v.x + w - 0.5), y0 = Y(v.y - 0.5), y1 = Y(v.y + h - 0.5)
      quad([[x0, y1, z], [x1, y1, z], [x1, y0, z], [x0, y0, z]], [0, 0, 1], hex, 1)
      quad([[x1, y1, -z], [x0, y1, -z], [x0, y0, -z], [x1, y0, -z]], [0, 0, -1], hex, 0.8)
    }
  }
  // sides: the part of each side not covered by the neighbour's depth
  for (const v of voxels) {
    const hex = mat(v.mat).color, z = (v.depth * s) / 2
    for (const [dx, dy, nx, ny] of SIDES) {
      const nd = depth.get(K(v.x + dx, v.y + dy)) ?? 0
      if (nd >= v.depth) continue
      const zn = (nd * s) / 2
      const strips = nd === 0 ? [[-z, z]] : [[zn, z], [-z, -zn]]
      const ex = v.x + dx * 0.5, ey = v.y + dy * 0.5 // edge centre (grid)
      const ax = dy !== 0 ? 0.5 : 0, ay = dx !== 0 ? 0.5 : 0
      for (const [za, zb] of strips) {
        const p1 = [X(ex - ax), Y(ey - ay)], p2 = [X(ex + ax), Y(ey + ay)]
        // order so the face points along (nx, ny)
        const flip = nx * (p2[1] - p1[1]) - ny * (p2[0] - p1[0]) < 0
        const [a, b] = flip ? [p2, p1] : [p1, p2]
        quad([[a[0], a[1], za], [b[0], b[1], za], [b[0], b[1], zb], [a[0], a[1], zb]], [nx, ny, 0], hex, ny > 0 ? 0.95 : ny < 0 ? 0.72 : 0.85)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.computeBoundingSphere()
  return geo
}

/** inflated copy for a BackSide ink hull; normals averaged at shared corners so the hull has no cracks */
export function outlineGeometry(src: THREE.BufferGeometry, w: number): THREE.BufferGeometry {
  const g = src.clone(), p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal
  const sum = new Map<string, THREE.Vector3>(), k = (i: number) => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`
  for (let i = 0; i < p.count; i++) { const key = k(i), v = sum.get(key) ?? sum.set(key, new THREE.Vector3()).get(key)!; v.x += n.getX(i); v.y += n.getY(i); v.z += n.getZ(i) }
  for (const v of sum.values()) { v.set(Math.sign(Math.round(v.x * 100)), Math.sign(Math.round(v.y * 100)), Math.sign(Math.round(v.z * 100))) }
  const off: THREE.Vector3[] = []; for (let i = 0; i < p.count; i++) off.push(sum.get(k(i))!)
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + off[i].x * w, p.getY(i) + off[i].y * w, p.getZ(i) + off[i].z * w)
  return g
}

/** ready-to-add group: lit body + ink hull */
export function weaponMesh(voxels: Voxel[], grip: [number, number], s: number, ink: number): THREE.Group {
  const geo = voxelGeometry(voxels, grip, s), g = new THREE.Group()
  g.add(new THREE.Mesh(outlineGeometry(geo, s * 0.12), new THREE.MeshBasicMaterial({ color: ink, side: THREE.BackSide })))
  g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })))
  return g
}
