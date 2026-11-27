// Enemy registry: new type = 1 file + 1 line here.
import type * as THREE from 'three'
import type { Enemy } from './base'
import { Bong } from './bong'
import { Chay } from './chay'
import { Nhieu } from './nhieu'
import { Khien } from './khien'
import { Vo } from './vo'

export const ENEMIES: Record<string, (scene: THREE.Scene, from: THREE.Vector3) => Enemy> = {
  bong: (s, f) => new Bong(s, f),
  chay: (s, f) => new Chay(s, f),
  nhieu: (s, f) => new Nhieu(s, f),
  khien: (s, f) => new Khien(s, f),
  vo: (s, f) => new Vo(s, f),
}
