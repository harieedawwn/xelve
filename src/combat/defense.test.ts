import { describe, it, expect } from 'vitest'
import { Defense, DEFENSE, canBlockWith } from './defense'
import { DuelScript, MOVES, DUMMY_ORDER, type DuelEvent } from './duel'

const normal = { dmg: 1, dodge: 0 as const, blockable: true }
const mk = () => { const d = new Defense(); d.canBlock = d.canDodge = true; return d }

describe('Đỡ / Phản đòn', () => {
  it('Đỡ only with nặng, and vừa in duels', () => {
    expect(canBlockWith('nang', false)).toBe(true)
    expect(canBlockWith('vua', false)).toBe(false)
    expect(canBlockWith('vua', true)).toBe(true)
    expect(canBlockWith('nhe', true)).toBe(false)
    expect(canBlockWith(undefined, true)).toBe(false)
  })
  it('pressed ≤150 ms before impact = Phản đòn, earlier = Đỡ', () => {
    let d = mk(); d.press(1.0); expect(d.resolve(normal, 1.14).answer).toBe('parry')
    d = mk(); d.press(1.0); expect(d.resolve(normal, 1.2)).toEqual({ answer: 'block', dmg: 0 })
    d = mk(); d.press(1.0); expect(d.resolve({ ...normal, dmg: 2 }, 1.5)).toEqual({ answer: 'block', dmg: 1 })
  })
  it('without a block-capable weapon the press does nothing', () => {
    const d = new Defense(); d.press(1); expect(d.resolve(normal, 1.05).answer).toBe('hit')
  })
  it('mashing gets no perfect window; one parry per press', () => {
    const d = mk(); d.press(1.0); d.release(); d.press(1.2)
    expect(d.resolve(normal, 1.25).answer).toBe('block')
    const e = mk(); e.press(1.0); expect(e.resolve(normal, 1.05).answer).toBe('parry'); expect(e.resolve(normal, 1.1).answer).toBe('block')
  })
  it('Phản đòn opens a counter window as long as the Choáng', () => {
    const d = mk(); d.press(2); d.resolve(normal, 2.1)
    expect(d.counterMult(2.1 + DEFENSE.parryStun - 0.01)).toBe(DEFENSE.counterMult)
    expect(d.counterMult(2.1 + DEFENSE.parryStun + 0.01)).toBe(1)
  })
})

describe('Né', () => {
  it('right side avoids, wrong side is hit, thrust cannot be dodged', () => {
    let d = mk(); d.dodge(1, 0); expect(d.resolve({ ...normal, dodge: 1 }, 0.2).answer).toBe('dodge')
    d = mk(); d.dodge(-1, 0); expect(d.resolve({ ...normal, dodge: 1 }, 0.2).answer).toBe('hit')
    d = mk(); d.dodge(-1, 0); expect(d.resolve({ ...normal, dodge: 0 }, 0.2).answer).toBe('dodge')
    d = mk(); d.dodge(1, 0); expect(d.resolve({ ...normal, dodge: null }, 0.2).answer).toBe('hit')
  })
  it('dodge ends, has a cooldown, and opens a 0.5 s counter window', () => {
    const d = mk(); expect(d.dodge(1, 0)).toBe(true); expect(d.dodge(-1, 0.3)).toBe(false)
    expect(d.resolve(normal, DEFENSE.dodgeTime + 0.01).answer).toBe('hit')
    expect(d.dodge(-1, DEFENSE.dodgeTime + DEFENSE.dodgeCooldown)).toBe(true)
    d.resolve(normal, 0.7); expect(d.counterMult(0.7 + 0.49)).toBe(DEFENSE.counterMult); expect(d.counterMult(1.21)).toBe(1)
  })
  it('Né wins over a held Đỡ (thrust still needs Đỡ)', () => {
    const d = mk(); d.press(0); d.dodge(1, 0.5); expect(d.resolve({ ...normal, dodge: null }, 0.6).answer).toBe('hit')
  })
})

describe('DuelScript', () => {
  const run = (s: DuelScript, secs: number) => { for (let t = 0; t < secs; t += 1 / 60) s.update(1 / 60) }
  it('cycles every move: telegraph → slow (300 ms before) → impact', () => {
    const log: [DuelEvent, string, number][] = []
    const s = new DuelScript(DUMMY_ORDER, (e, m) => log.push([e, m.id, s.toImpact]))
    run(s, 16)
    const tele = log.filter(l => l[0] === 'telegraph').map(l => l[1])
    expect(tele.slice(0, DUMMY_ORDER.length)).toEqual(DUMMY_ORDER)
    for (const l of log.filter(l => l[0] === 'slow')) expect(l[2]).toBeLessThanOrEqual(0.3 + 1e-9)
    expect(log.filter(l => l[0] === 'impact').length).toBeGreaterThanOrEqual(DUMMY_ORDER.length)
  })
  it('feint switches overhead → sweep 200 ms in, and the impact uses the new answers', () => {
    const ev: string[] = []; let hit = ''
    const s = new DuelScript(['feint'], (e, m) => { ev.push(e); if (e === 'impact') hit = m.id })
    run(s, 0.8 + 0.25); expect(s.move.pose).toBe('right'); expect(s.move.dodge).toBe(-1)
    run(s, 1); expect(ev.slice(0, 4)).toEqual(['telegraph', 'switch', 'slow', 'impact']); expect(hit).toBe('sweepR')
  })
  it('stagger interrupts the wind-up: no impact until it ends', () => {
    let impacts = 0; const s = new DuelScript(['overhead'], (e) => { if (e === 'impact') impacts++ })
    run(s, 1.2); s.stagger(1.2); run(s, 1.1); expect(impacts).toBe(0)
    run(s, 2.5); expect(impacts).toBe(1)
  })
  it('every move is answerable: Đỡ always, Né unless thrust', () => {
    for (const m of Object.values(MOVES).filter(m => m.id !== 'thrustN')) { expect(m.blockable).toBe(true); if (m.pose === 'thrust') expect(m.dodge).toBeNull() }
  })
})
