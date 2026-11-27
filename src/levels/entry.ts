// Where an enemy enters (P15): never pops up inside the view. door = walks out of a door/opening, left/right = walks in
// sideways from beyond the screen edge, drop = falls from above the frame, phase = nhieu fades in (only one allowed in view).
import * as THREE from 'three'
import type { Spawn } from './ch1/types'

export const ENTRY = {
  sideX: 2.6,      // lateral start (m from the rail); walks 1.5–3 m sideways to its slot
  sideStep: 0.3,   // extra x per extra spawn on the same side
  sideAhead: -0.3, // m ahead of the eye (negative = just behind): beside the player → outside any landscape frustum
  dropAhead: 1.9, dropY: 4.6,
  phaseAhead: 2.6,
  stagger: 0.35,   // s between spawns of one wave (≤ 0.6)
}

/** world spawn point for the i-th spawn of a wave; playerZ = player's world z (rail runs to −z) */
export function spawnPoint(sp: Spawn, i: number, playerZ: number, doors: THREE.Vector3[], out = new THREE.Vector3()) {
  switch (sp.entry) {
    case 'door': return out.copy(doors[sp.door ?? 0])
    case 'left': case 'right': {
      const side = sp.entry === 'left' ? -1 : 1
      return out.set(side * (ENTRY.sideX + (i % 3) * ENTRY.sideStep), 0, playerZ - ENTRY.sideAhead + (i % 2) * 0.15)
    }
    case 'drop': return out.set(((i % 3) - 1) * 0.5, ENTRY.dropY, playerZ - ENTRY.dropAhead)
    case 'phase': return out.set(((i % 3) - 1) * 0.6, 0, playerZ - ENTRY.phaseAhead)
  }
}
/** entries that are allowed to start inside the view */
export const visibleEntry = (sp: Spawn) => sp.entry === 'door' || sp.entry === 'phase'

/** chapter pacing (P15) */
export const PACE = {
  lead: 3.0,        // m before the stop point the wave starts spawning (it walks in while the player slows down)
  overlapAt: 1,     // the walk resumes when this many (or fewer) enemies are left
  creep: 0.6,       // m/s while one straggler is still fighting
  clear: 0.8,       // s clear beat (breath, glance) after the last kill of a stop
  clearSlow: 0.4,   // s of slow-mo on that kill
  pickWalk: 0.7,    // m/s while a pickup is held in front of the eyes (signals play while walking)
}
