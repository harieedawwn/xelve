// Fight look priority (P15): every enemy gets a threat score; the head looks at the highest one.
// Close beats far, an attack in progress beats walking, a low enemy at the feet pulls the head down, off-screen ones wait their turn.
import * as THREE from 'three'

export const THREAT = {
  near: 0.35,         // closeness = 1 / (d + near)²  (strong)
  attack: 3,          // windup / lunge
  low: 2, lowR: 1.6,  // below eye level and within lowR m
  offscreen: 0.25,    // not attacking and outside the frame
  mustSee: 1.5,       // attacking within this range: never off-screen, never penalised
  maxDown: -40 * Math.PI / 180,
  fastMs: 90,         // look half-life when the target switches to a closer threat
  holdS: 0.45,        // how long the fast half-life stays on
  keep: 1.25,         // hysteresis: a new target must beat the current one by this factor
}

export interface ThreatIn { pos: THREE.Vector3; aim: THREE.Vector3; attacking: boolean; onScreen: boolean }

export function threatScore(t: ThreatIn, eye: THREE.Vector3) {
  const d = Math.hypot(t.pos.x - eye.x, t.pos.z - eye.z)
  let s = 1 / ((d + THREAT.near) * (d + THREAT.near))
  if (t.attacking) s *= THREAT.attack
  if (t.aim.y < eye.y - 0.25 && d < THREAT.lowR) s *= THREAT.low
  if (!t.onScreen && !(t.attacking && d < THREAT.mustSee)) s *= THREAT.offscreen
  return s
}

/** index of the target to look at; cur = current target (kept unless beaten by THREAT.keep) */
export function pickThreat(list: ThreatIn[], eye: THREE.Vector3, cur = -1) {
  let best = -1, bs = 0
  list.forEach((t, i) => { const s = threatScore(t, eye); if (s > bs) { bs = s; best = i } })
  if (cur >= 0 && cur < list.length && best !== cur && threatScore(list[cur], eye) * THREAT.keep >= bs) return cur
  return best
}

/** clamp a look point so the head never pitches down more than maxDown */
export function clampPitch(eye: THREE.Vector3, p: THREE.Vector3) {
  const h = Math.hypot(p.x - eye.x, p.z - eye.z), min = eye.y + Math.tan(THREAT.maxDown) * Math.max(h, 0.05)
  if (p.y < min) p.y = min
  return p
}
