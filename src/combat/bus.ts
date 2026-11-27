// Feedback bus: combat emits facts, one wiring turns them into hitstop/impact/smear/sound/camera.
import type * as THREE from 'three'
export interface HitEvent { dmg: number; head: boolean; killed: boolean; at: THREE.Vector3; dir: THREE.Vector3; speed: number; lastOfWave: boolean; blood: number }
export interface Events { hit: HitEvent; hurt: { side: number; dead: boolean }; mote: { n: number } }
type Fn<T> = (e: T) => void
export class Bus {
  private m: Record<string, Fn<any>[]> = {}
  on<K extends keyof Events>(k: K, f: Fn<Events[K]>) { (this.m[k] ??= []).push(f) }
  emit<K extends keyof Events>(k: K, e: Events[K]) { this.m[k]?.forEach(f => f(e)) }
}
