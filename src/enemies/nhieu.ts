// Bóng nhiễu: body is TV static. Cycle solid 2.2 s → out 1.0 s → gone → in 1.4 s. Only hittable when solid; core in the chest.
import * as THREE from 'three'
import { Enemy, BASE_DEF, EnemyDef } from './base'
import { PAL } from '../render/palette'
import type { FX } from '../render/fx'

export const NHIEU_DEF: EnemyDef = { ...BASE_DEF, id: 'nhieu', hp: 35, blood: PAL.bloodLam, speed: 1.15, windup: 0.6 }
const SOLID = 2.2, OUT = 1.0, IN = 1.4
const vert = 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
const frag = `uniform vec3 ink, paper; uniform float solid, time;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 c = floor(gl_FragCoord.xy / 3.0); float n = h(c + floor(time * 20.0));
  if (n > solid) discard;                       // static eats the body when phased
  gl_FragColor = vec4(n < 0.12 ? paper : ink, 1.0);
}`
export function makeStaticMaterial() {
  return new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag,
    uniforms: { ink: { value: new THREE.Color(PAL.ink) }, paper: { value: new THREE.Color(PAL.paper2) }, solid: { value: 1 }, time: { value: 0 } } })
}
export class Nhieu extends Enemy {
  private ph: 'solid' | 'out' | 'in' = 'in'; private pt = 0; private su: THREE.ShaderMaterial
  constructor(scene: THREE.Scene, from: THREE.Vector3) {
    const m = makeStaticMaterial(); super(scene, from, NHIEU_DEF, m); this.su = m; this.setSolid(0)
  }
  private setSolid(v: number) { this.su.uniforms.solid.value = v }
  get isSolid() { return this.ph === 'solid' }
  get hittable() { return this.ph === 'solid' }
  protected attackAllowed() { return this.ph === 'solid' }
  protected tick(dt: number) {
    this.su.uniforms.time.value += dt
    if (this.state === 'windup' || this.state === 'lunge') { this.ph = 'solid'; this.pt = 0; this.setSolid(1); return } // never phases mid-attack
    this.pt += dt
    if (this.ph === 'solid') { if (this.pt > SOLID) { this.ph = 'out'; this.pt = 0 } }
    else if (this.ph === 'out') { this.setSolid(1 - this.pt / OUT); if (this.pt > OUT) { this.ph = 'in'; this.pt = 0; this.setSolid(0) } }
    else {
      const k = this.pt / IN; this.setSolid(k < 0.55 ? 0 : (k - 0.55) / 0.45)
      if (this.pt > IN) { this.ph = 'solid'; this.pt = 0; this.setSolid(1); this.onSound('bong.appear') } // click on becoming solid
    }
  }
  protected filter(dmg: number, at: THREE.Vector3, _d: THREE.Vector3, _fx: FX, weak: boolean) {
    if (this.ph !== 'solid') return 0
    return weak ? dmg : dmg * (at.y > this.root.position.y + 0.9 * this.root.scale.x ? 1.5 : 1) // chest core
  }
}
