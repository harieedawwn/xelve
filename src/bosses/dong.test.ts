import { describe, it, expect } from 'vitest'
import { DongBrain, DONG, nextCover, nearestCover, throwBreaks, impactDamage, inReach, sideOf, type DEvent } from './dong'

const run = (b: DongBrain, secs: number, cover = 2, evs: DEvent[] = []) => { b.on = (e) => evs.push(e); for (let t = 0; t < secs; t += 1 / 60) b.update(1 / 60, cover); return evs }

describe('Đống', () => {
  it('phase 1 opens with a throw: telegraph → release → slow → impact → open → close', () => {
    const b = new DongBrain(), evs = run(b, DONG.phases[0].idle + DONG.throw.windup + DONG.throw.flight + DONG.armDown + 0.2, 4)
    expect(evs.map(e => e.e).slice(0, 6)).toEqual(['telegraph', 'release', 'slow', 'impact', 'open', 'close'])
    const imp = evs.find(e => e.e === 'impact') as Extract<DEvent, { e: 'impact' }>
    expect(imp.kind).toBe('throw'); expect(imp.target).toBe(4); expect(b.armAt).toBe(4)
  })
  it('the throw is aimed where the body is when the car leaves the hand', () => {
    const b = new DongBrain(); const evs: DEvent[] = []; b.on = (e) => evs.push(e)
    for (let t = 0; t < DONG.phases[0].idle + 0.1; t += 1 / 60) b.update(1 / 60, 1)
    for (let t = 0; t < DONG.throw.windup + 0.1; t += 1 / 60) b.update(1 / 60, 3)
    expect((evs.find(e => e.e === 'release') as { target: number }).target).toBe(3)
  })
  it('order per phase and all three attacks appear', () => {
    const b = new DongBrain(); const kinds = run(b, 60).filter(e => e.e === 'telegraph').map(e => (e as { kind: string }).kind)
    expect(kinds.slice(0, 3)).toEqual(DONG.phases[0].order)
    b.stage = 1; const k2 = run(b, 60).filter(e => e.e === 'telegraph').map(e => (e as { kind: string }).kind)
    expect(new Set(k2)).toEqual(new Set(['throw', 'sweep', 'slam']))
  })
  it('the opening holds while the player is on the arm, closes on release', () => {
    const b = new DongBrain(); run(b, DONG.phases[0].idle + DONG.throw.windup + DONG.throw.flight + 0.1)
    expect(b.open).toBe(true); b.hold(); expect(b.state).toBe('assault')
    run(b, 10); expect(b.state).toBe('assault')
    const evs: DEvent[] = []; b.on = (e) => evs.push(e); b.release(); expect(evs[0].e).toBe('close'); expect(b.state).toBe('recover')
  })
  it('phases at 66 / 33 %; phase change waits for idle; phase 3 is the reveal; seams move to the chest', () => {
    const b = new DongBrain(); b.state = 'assault'
    b.damage(DONG.hp * 0.35); expect(b.stage).toBe(0)
    b.release(); const evs = run(b, 1); expect(evs.some(e => e.e === 'phase')).toBe(true); expect(b.stage).toBe(1)
    expect(b.seams).toContain('shoulder')
    b.damage(DONG.hp * 0.35); const e3 = run(b, 8)
    expect(e3.some(e => e.e === 'reveal')).toBe(true); expect(b.stage).toBe(2); expect(b.seams).toEqual(['chest'])
    const ed: DEvent[] = []; b.on = (e) => ed.push(e); b.damage(DONG.hp); expect(b.alive).toBe(false); expect(ed[0].e).toBe('dead')
  })
  it('covers: ‹ › skips broken covers, throws never leave fewer than 2', () => {
    const a = [true, false, false, true, true, true]
    expect(nextCover(a, 0, 1)).toBe(3); expect(nextCover(a, 3, -1)).toBe(0); expect(nextCover(a, 0, -1)).toBe(0)
    expect(nearestCover(a, 1)).toBe(0); expect(nearestCover(a, 2)).toBe(3)
    expect(throwBreaks(a, 3, true, false)).toBe(true)
    expect(throwBreaks(a, 3, false, false)).toBe(false)
    expect(throwBreaks(a, 3, false, true)).toBe(true)
    expect(throwBreaks([true, false, false, false, false, true], 0, true, true)).toBe(false)
    expect(throwBreaks(a, 1, true, true)).toBe(false)
  })
  it('impact damage: throw only on its cover, sweep on its side, slam everywhere (Đỡ soaks 1, open ground hurts more)', () => {
    expect(impactDamage({ kind: 'throw', target: 2, side: -1 }, 2, false, false)).toBe(2)
    expect(impactDamage({ kind: 'throw', target: 2, side: -1 }, 1, false, false)).toBe(0)
    expect(impactDamage({ kind: 'sweep', target: 0, side: -1 }, 2, false, false)).toBe(2)
    expect(impactDamage({ kind: 'sweep', target: 0, side: -1 }, 3, false, false)).toBe(0)
    expect(impactDamage({ kind: 'slam', target: 0, side: 1 }, 3, false, false)).toBe(1)
    expect(impactDamage({ kind: 'slam', target: 0, side: 1 }, 3, true, false)).toBe(2)
    expect(impactDamage({ kind: 'slam', target: 0, side: 1 }, 3, false, true)).toBe(0)
    expect(sideOf(2)).toBe(-1); expect(sideOf(3)).toBe(1)
    expect(inReach(3, 4)).toBe(true); expect(inReach(3, 5)).toBe(false)
  })
})
