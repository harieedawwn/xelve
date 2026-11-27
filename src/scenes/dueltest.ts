// Phòng tập — đấu tay đôi (dev, open with ?duel): a dummy cycles every duel move; the player answers with Đỡ / Phản đòn / Né
// and hits back inside the counter window. Dev labels only (top bar); the left pad and Lực bar are the real HUD pieces.
import * as THREE from 'three'
import { Renderer } from '../render/pipeline'
import { FX } from '../render/fx'
import { buildCorridor } from '../levels/corridor'
import { Weapon } from '../combat/weapon'
import { PROFILES } from '../combat/profiles'
import { equippedDesign } from '../weapon/store'
import { sweep } from '../combat/sweep'
import { Bus } from '../combat/bus'
import { Defense, DEFENSE, canBlockWith, type Answer, type Side } from '../combat/defense'
import { Audio } from '../audio/engine'
import { DuelDummy } from '../enemies/dummy'
import { CombatPad } from '../ui/combatPad'
import { startLoop } from '../core/loop'
import { bindFinger } from '../core/input'
import { Time } from '../core/time'
import { lerp, clamp } from '../camera/springs'

export function startDuelTest(canvas: HTMLCanvasElement, renderer: Renderer, audio: Audio) {
  renderer.resize('tb')
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 50)
  cam.position.set(0, 1.5, 0); scene.add(cam)
  buildCorridor(scene)
  const fx = new FX(scene), weapon = new Weapon(cam), bus = new Bus(), time = new Time(), def = new Defense()
  const player = new THREE.Vector3(0, 0, 0), look = new THREE.Vector3(0, 1.3, -1.1)
  const dummy = new DuelDummy(scene, new THREE.Vector3(0, 0, -3))
  dummy.mult = DEFENSE.counterMult; dummy.onSound = (n) => audio.play(n)
  const count: Record<Answer, number> = { parry: 0, block: 0, dodge: 0, hit: 0 }, seen = new Set<string>()
  let hp = 6, last = '', hits = 0, blocked = 0, impactQ = 0, vig = 0, desat = 0
  let camX = 0, camXV = 0, dodgeT = 0, dodgeSide: Side = 1, kick = 0

  const pad = new CombatPad({
    block: (d) => { if (d) { def.press(time.now); if (def.guarding) audio.play('guard.up') } else def.release(); weapon.guarding = def.guarding },
    dodge: (side) => { if (def.dodge(side, time.now)) { dodgeT = DEFENSE.dodgeTime; dodgeSide = side; audio.play('dodge') } },
    leap: () => {},
  })
  document.getElementById('ui')!.append(pad.root, pad.luc)
  const context = () => {
    def.canBlock = canBlockWith(weapon.profile.cls, true); def.canDodge = true
    if (!def.canBlock) { def.release(); weapon.guarding = false }
    pad.set({ block: def.canBlock, dodge: true, leap: false, luc: weapon.profile.charged })
  }
  const w = new URLSearchParams(location.search).get('weapon')
  if (w && PROFILES[w]) weapon.setProfile(PROFILES[w]); else { const d = equippedDesign(); if (d) weapon.setDesign(d); else weapon.setProfile(PROFILES.vua) }
  context()

  bindFinger(canvas, weapon.finger, (d) => { weapon.touching = d })
  addEventListener('pointerdown', () => audio.unlock(), { once: true })
  bus.on('hit', (e) => {
    if (e.blocked) { blocked++; audio.play('hit.metal'); time.freeze(0.04); return }
    hits++; audio.hit(e.dmg / 10, e.head); time.freeze(0.07); kick = 0.4
  })

  dummy.onEvent = (e, m) => {
    seen.add(m.id)
    if (e === 'slow') { time.slowmo(DEFENSE.duelSlowReal, DEFENSE.duelSlowScale); audio.slowIn() }
    if (e !== 'impact') return
    const r = def.resolve(m, time.now); count[r.answer]++; last = `${m.id}→${r.answer}`
    time.slow = Math.min(time.slow, 0.08)
    if (r.answer === 'parry') {
      time.freeze(DEFENSE.parryHitstop); impactQ = 3; audio.play('parry', 1.2); pad.pulse('block')
      time.slowmo(DEFENSE.parrySlow, DEFENSE.parrySlowScale); dummy.reel(DEFENSE.parryStun); weapon.charge = 1; kick = 1
      dummy.vel.set(0, 0, -2.2)
    } else if (r.answer === 'block') {
      audio.play('block'); time.freeze(0.06); weapon.spend(); kick = 0.6
    } else if (r.answer === 'dodge') {
      dummy.reel(DEFENSE.counterWindow); audio.play('duel.whoosh')
    }
    if (r.dmg > 0) { hp = Math.max(0, hp - r.dmg); if (!hp) hp = 6; audio.playerHurt(); vig = 1; kick = 1.2 }
  }

  const bar = document.createElement('div')
  bar.style.cssText = 'position:fixed;left:0;top:0;right:0;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px;padding:4px;z-index:50;font:12px monospace'
  const info = document.createElement('div'); info.style.cssText = 'position:fixed;right:4px;bottom:4px;z-index:50;font:12px monospace;background:#16161a;color:#ecebe6;padding:2px 6px'
  document.body.append(bar, info)
  const btn = (label: string, on: () => void) => {
    const b = document.createElement('button'); b.textContent = label; b.dataset.en = label
    b.style.cssText = 'min-height:40px;min-width:48px;padding:0 8px;border:2px solid #16161a;background:#ecebe6;color:#16161a;font:inherit;border-radius:0'
    b.onclick = on; bar.append(b)
  }
  for (const id of ['nhe', 'vua', 'nang', 'khoi']) btn(id, () => { weapon.setProfile(PROFILES[id]); context() })
  btn('equipped', () => { const d = equippedDesign(); if (d) weapon.setDesign(d); context() })
  addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); renderer.resize('tb') })

  startLoop({
    step: (h) => {
      const dt = time.tick(h, () => audio.slowOut()), now = time.now
      dummy.open = def.counterMult(now) > 1
      // Né: the body sidesteps on a spring and comes back (authored, not player look)
      dodgeT = Math.max(0, dodgeT - dt)
      const want = dodgeT > 0 ? dodgeSide * 0.62 : 0
      camXV += ((want - camX) * 160 - camXV * 22) * dt; camX += camXV * dt
      cam.position.set(camX, 1.5 - Math.abs(camX) * 0.12 - kick * 0.03, 0)
      look.lerp(dummy.head.getWorldPosition(new THREE.Vector3()).setY(1.3), 1 - Math.exp(-8 * dt))
      cam.lookAt(look); cam.rotateZ(clamp(-camXV * 0.025, -0.12, 0.12) + Math.sin(time.real * 60) * kick * 0.01)
      kick = Math.max(0, kick - h * 3)
      weapon.update(time.hitstop > 0 ? 0 : h, now)
      dummy.update(dt, player)
      sweep(weapon, [dummy], fx, bus)
      audio.swing(weapon.touching ? weapon.tipSpeed : 0, time.scale)
      if (weapon.tipSpeed > 3 && weapon.touching && dt > 0) fx.smearPush(weapon.inner, weapon.tip, now)
      fx.update(dt, now)
    },
    render: (_a, realDt) => {
      vig = Math.max(0, vig - 1.5 * realDt); renderer.vig = vig
      desat = lerp(desat, time.slow > 0 ? 0.85 : 0, 1 - Math.exp(-12 * realDt)); renderer.desat = desat
      renderer.mode = impactQ > 0 ? (impactQ-- > 1 ? 2 : 1) : 0
      pad.setLuc(weapon.profile.charged ? weapon.charge : 0)
      renderer.render(scene, cam)
      const s = dummy.script
      info.textContent = `${weapon.profile.cls ?? 'khoi'} · ${s.move.id} ${s.state} · ${last} · P${count.parry} Đ${count.block} N${count.dodge} H${count.hit} · hp ${hp} · hits ${hits}/${blocked} · dmg ${dummy.lastDmg.toFixed(1)}${dummy.open ? ' · OPEN' : ''}`
    },
    fpsCap: () => 60,
  })
  ;(window as any).__duel = { def, dummy, weapon, time, pad, get stats() { return { count: { ...count }, seen: [...seen], hp, hits, blocked, last } } }
}
