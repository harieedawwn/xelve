import { describe, it, expect } from 'vitest'
import { RECIPES } from './engine'
import { SPACES } from './reverb'
describe('audio registry', () => {
  it('maps every game event to a recipe with a min gap', () => {
    const need = ['hit.flesh', 'hit.metal', 'hit.glass', 'hit.rubber', 'hit.heavy', 'kill', 'player.hurt', 'step.concrete', 'step.metal', 'step.wood', 'step.wet',
      'slow.in', 'slow.out', 'ui.tap', 'ui.on', 'ui.off', 'ui.back', 'bong.appear', 'bong.telegraph', 'bong.lunge', 'bong.hurt', 'bong.death',
      'parry', 'block', 'dodge', 'guard.up', 'duel.telegraph', 'duel.whoosh']
    for (const n of need) { expect(RECIPES[n], n).toBeTruthy(); expect(RECIPES[n].gap).toBeGreaterThan(0) }
  })
  it('has generated spaces', () => { expect(Object.keys(SPACES)).toContain('corridor') })
})
