// Authored camera moves. A move writes into `Out` each frame; the rig layers body springs underneath. Local frame: x side, y up, z forward.
import * as THREE from 'three'
import type { CameraRig } from './rig'
import { EYE, FOV } from './consts'
import { smooth, lerp, clamp } from './springs'

export interface Out {
  local: THREE.Vector3          // offset from rail body
  abs: THREE.Vector3 | null     // world feet position (replaces rail body)
  look: THREE.Vector3 | null; lookW: number
  roll: number; pitch: number   // radians, added directly
  fov: number | null; wide: boolean
  eyelid: number                // 0 open … 1 closed
  cut: boolean                  // hard cut (cinematics only)
  slowmo: [number, number] | null
}
export interface Move { name: string; dur: number; endCut?: boolean; begin?(rig: CameraRig): void; update(t: number, o: Out, rig: CameraRig): void }

export const makeOut = (): Out => ({ local: new THREE.Vector3(), abs: null, look: null, lookW: 0, roll: 0, pitch: 0, fov: null, wide: false, eyelid: 0, cut: false, slowmo: null })
export function resetOut(o: Out) { o.local.set(0, 0, 0); o.abs = null; o.look = null; o.lookW = 0; o.roll = 0; o.pitch = 0; o.fov = null; o.wide = false; o.eyelid = 0; o.cut = false }
const deg = Math.PI / 180
const lookBuf = new THREE.Vector3(), absBuf = new THREE.Vector3()
const bump = (t: number, up: number, hold: number, down: number) => smooth(t / up) * (1 - smooth((t - up - hold) / down))

/** lying on the floor → blink twice → roll 70°→0 while sitting up → look at hand → stand */
export function wake(): Move {
  return {
    name: 'wake', dur: 4.4,
    update(w, o, rig) {
      o.eyelid = w < 0.6 ? 1 : w < 1.0 ? 1 - smooth((w - 0.6) / 0.4) : w < 1.25 ? smooth((w - 1.0) / 0.12) - smooth((w - 1.13) / 0.12) : 0
      const eye = lerp(0.32, EYE, smooth((w - 2.2) / 1.4))
      o.local.y = eye - EYE
      o.roll = lerp(1.15, 0, smooth((w - 1.6) / 1.6))
      const hand = smooth((w - 0.9) / 0.6) * (1 - smooth((w - 3.2) / 0.8))
      o.look = lookBuf.copy(rig.bodyPos).addScaledVector(rig.right, 0.35).addScaledVector(rig.fwd, 0.6); o.look.y = eye - 0.9; o.lookW = hand
    },
  }
}

/** lean out from cover 25 cm with 6° roll */
export function peek(dir: -1 | 1): Move {
  return { name: 'peek', dur: 1.5, update(t, o) { const k = bump(t, 0.35, 0.5, 0.5); o.local.x = dir * 0.25 * k; o.roll = -dir * 6 * deg * k } }
}

/** boss arena: low sprint along an arc; head on boss for 40%, then destination; slide-in stop with forward pitch */
export function coverDash(from: THREE.Vector3, to: THREE.Vector3, boss: THREE.Vector3): Move {
  const mid = from.clone().add(to).multiplyScalar(0.5)
  const side = new THREE.Vector3().subVectors(to, from).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(1.4)
  mid.add(side)
  const dur = clamp(from.distanceTo(to) / 6.5, 0.5, 3) + 0.25
  return {
    name: 'coverDash', dur,
    update(t, o) {
      const u = 1 - Math.pow(1 - clamp(t / dur, 0, 1), 2.2) // fast out, sliding stop
      const a = 1 - u
      o.abs = absBuf.set(0, 0, 0).addScaledVector(from, a * a).addScaledVector(mid, 2 * a * u).addScaledVector(to, u * u)
      o.local.y = -0.55 * bump(t, 0.25, dur - 0.7, 0.4)
      o.look = t / dur < 0.4 ? boss : to; o.lookW = 1
      if (o.look === to) { lookBuf.copy(to); lookBuf.y = EYE; o.look = lookBuf }
      o.pitch = -7 * deg * smooth((t - dur + 0.35) / 0.15) * (1 - smooth((t - dur + 0.15) / 0.15))
      o.roll = 3 * deg * Math.sin(Math.PI * clamp(t / dur, 0, 1)) * Math.sign(side.x || 1)
    },
  }
}

/** crouch → parabola to the target (boss face; stops 1.6 m short) → FOV punch → slow-mo at apex → fall → landing impulse */
export function leap(target: THREE.Vector3): Move {
  const crouch = 0.28, fly = 1.1, dur = crouch + fly + 0.5
  const start = new THREE.Vector3(), end = new THREE.Vector3(); let apex = false, landed = false
  return {
    name: 'leap', dur,
    begin(rig) { start.copy(rig.bodyPos); end.copy(target).sub(start).setY(0).setLength(Math.max(0, Math.hypot(target.x - start.x, target.z - start.z) - 1.6)).add(start); end.y = target.y - EYE },
    update(t, o, rig) {
      o.wide = true
      if (t < crouch) { o.local.y = -0.18 * smooth(t / crouch); o.pitch = 3 * deg * smooth(t / crouch); return }
      const u = clamp((t - crouch) / fly, 0, 1)
      o.abs = absBuf.copy(start).lerp(end, u); o.abs.y = lerp(start.y, end.y, u) + 1.1 * 4 * u * (1 - u)
      o.local.y = -0.18 * (1 - smooth(u / 0.2))
      o.fov = FOV + 14 * Math.sin(Math.PI * Math.min(1, u * 1.3)) + 0 // punch 78→92
      o.look = target; o.lookW = 1
      if (u >= 0.5 && !apex) { apex = true; o.slowmo = [1.6, 0.25] }
      if (u >= 1 && !landed) { landed = true; rig.land(9) }
    },
  }
}

/** duel: 0.5 m side-step with 7° roll toward the side and a quick return; 'low' slides under */
export function dodge(side: -1 | 1 | 'low'): Move {
  return {
    name: 'dodge', dur: 0.75,
    update(t, o) {
      const k = bump(t, 0.18, 0.12, 0.35)
      if (side === 'low') { o.local.y = -0.7 * k; o.pitch = 6 * deg * k; o.local.z = 0.25 * k } else { o.local.x = side * 0.5 * k; o.roll = -side * 7 * deg * k }
    },
  }
}

/** glance down, object rises into view for 2 s, return. onRise(0..1) drives the object */
export function pickup(onRise?: (k: number) => void): Move {
  return {
    name: 'pickup', dur: 3.0,
    update(t, o) {
      o.pitch = -26 * deg * bump(t, 0.4, 2.0, 0.5); o.local.y = -0.08 * bump(t, 0.4, 2.0, 0.5)
      onRise?.(smooth((t - 0.5) / 0.5) * (1 - smooth((t - 2.5) / 0.4)))
    },
  }
}

export interface CutShot { dur: number; pos: THREE.Vector3; look: THREE.Vector3; fov?: number }
/** chapter intros/outros only: hard cuts between shots */
export function cinematicCut(shots: CutShot[]): Move {
  const dur = shots.reduce((a, s) => a + s.dur, 0); let last = -1
  return {
    name: 'cinematicCut', dur, endCut: true,
    update(t, o) {
      let acc = 0, i = 0
      while (i < shots.length - 1 && t >= acc + shots[i].dur) acc += shots[i++].dur
      const s = shots[i]
      o.abs = absBuf.copy(s.pos); o.abs.y -= EYE; o.look = s.look; o.lookW = 1; o.fov = s.fov ?? null; o.wide = true
      if (i !== last) { o.cut = true; last = i }
    },
  }
}

export interface ArmRunPts { hand: THREE.Vector3; up: THREE.Vector3; apex: THREE.Vector3; seam: THREE.Vector3; back: THREE.Vector3 }
/** boss arena opening (combat.md#7): crouch → leap onto the lowered arm → run up it → jump to the face, slow-mo at apex
 *  (0.25×, ≤1.6 s real) while the seams are in reach → fall back to the nearest cover with a landing impulse. Feet positions in. */
export function armRun(p: ArmRunPts, hold = 0.5): Move {
  const crouch = 0.25, hop = 0.7, run = 1.0, jump = 0.55, fall = 1.0
  const t1 = crouch + hop, t2 = t1 + run, t3 = t2 + jump, t4 = t3 + hold, dur = t4 + fall + 0.3
  const start = new THREE.Vector3(); let apex = false, landed = false
  const arc = (a: THREE.Vector3, b: THREE.Vector3, u: number, h: number) => absBuf.copy(a).lerp(b, u).setY(lerp(a.y, b.y, u) + h * 4 * u * (1 - u))
  return {
    name: 'armRun', dur,
    begin(rig) { start.copy(rig.bodyPos) },
    update(t, o, rig) {
      o.wide = true; o.look = p.seam; o.lookW = 1
      if (t < crouch) { o.local.y = -0.18 * smooth(t / crouch); o.pitch = 3 * deg * smooth(t / crouch); o.abs = absBuf.copy(start); return }
      if (t < t1) { const u = (t - crouch) / hop; o.abs = arc(start, p.hand, u, 1.6); o.fov = FOV + 8 * Math.sin(Math.PI * u); return }
      if (t < t2) { // run along the arm: quick gait bob, slight lean in
        const u = (t - t1) / run; o.abs = absBuf.copy(p.hand).lerp(p.up, u)
        o.local.y = -Math.abs(Math.sin(u * Math.PI * 5)) * 0.05; o.pitch = 4 * deg; return
      }
      if (t < t3) {
        const u = (t - t2) / jump; o.abs = arc(p.up, p.apex, u, 1.2); o.fov = FOV + 14 * smooth(u)
        if (u > 0.85 && !apex) { apex = true; o.slowmo = [1.6, 0.25] }
        return
      }
      if (t < t4) { o.abs = absBuf.copy(p.apex); o.abs.y += 0.15 * Math.sin((t - t3) / hold * Math.PI); o.fov = FOV + 14; return }
      const u = clamp((t - t4) / fall, 0, 1)
      o.abs = arc(p.apex, p.back, u, 0.8); o.abs.y = lerp(p.apex.y, p.back.y, u * u) + 0.8 * 4 * u * (1 - u)
      o.fov = FOV + 14 * (1 - smooth(u)); o.lookW = 1 - smooth(u * 1.4)
      if (u >= 1 && !landed) { landed = true; rig.land(11) }
    },
  }
}
