// Bóng: charcoal low-poly humanoid copying a human habit; zombie shuffle, telegraphed lunge. Teaches basic slashing.
import type * as THREE from 'three'
import { Enemy, BASE_DEF } from './base'

export class Bong extends Enemy {
  constructor(scene: THREE.Scene, from: THREE.Vector3) { super(scene, from, BASE_DEF) }
}
