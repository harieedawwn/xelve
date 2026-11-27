// Boot: logo assembles from voxels (title DOM) while the quality benchmark runs, then the scene router starts the slice.
import './ui/style.css'
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/be-vietnam-pro/latin-900.css'
import '@fontsource/be-vietnam-pro/vietnamese-900.css'
import * as THREE from 'three'
import { loadSave, save } from './core/save'
import { settings, setSetting } from './core/settings'
import { benchmark } from './core/quality'
import { Renderer } from './render/pipeline'
import { Audio } from './audio/engine'
import { UI } from './ui/ui'
import { startMenu } from './scenes/menu'
import { startChapter } from './scenes/chapter'
import { startEndless } from './scenes/endless'
import { level, CH1 } from './levels/ch1'
import { startFxTest } from './scenes/fxtest'
import { startCamTest } from './scenes/camtest'
import { startEnemyTest } from './scenes/enemytest'
import { startDuelTest } from './scenes/dueltest'
import { startBoss1 } from './scenes/boss1'
import { startBoss2 } from './scenes/boss2'
import { Forge } from './forge/forge'
import { BLUEPRINTS } from './weapon/blueprints/registry'

async function boot() {
  await loadSave()
  const canvas = document.getElementById('c') as HTMLCanvasElement
  const renderer = new Renderer(canvas)
  if (location.search.includes('fx')) { renderer.resize('tb'); startFxTest(renderer); return }
  if (location.search.includes('cam')) { renderer.resize('tb'); startCamTest(renderer); return }
  const ui = new UI()
  const audio = new Audio()
  if (location.search.includes('forge')) { // Xưởng (dev route until menus land in P13): ?forge&grid=1|3|5|8
    ui.hideTitle(); addEventListener('pointerdown', () => audio.unlock(), { once: true })
    const g = Number(new URLSearchParams(location.search).get('grid') ?? 8)
    const f = new Forge({ khoiSize: [1, 3, 5, 8].includes(g) ? g : 8, unlocked: Object.keys(BLUEPRINTS), onBack: () => { location.href = location.pathname }, onSound: (n, p) => audio.play(n, p) })
    document.getElementById('ui')!.appendChild(f.root); (window as any).__forge = f; return
  }
  if (location.search.includes('dong')) { ui.hideTitle(); startBoss2(canvas, renderer, audio); return }
  if (location.search.includes('boss')) { ui.hideTitle(); startBoss1(canvas, renderer, audio); return }
  if (location.search.includes('duel')) { ui.hideTitle(); startDuelTest(canvas, renderer, audio); return }
  if (location.search.includes('endless')) { ui.hideTitle(); startEndless(canvas, renderer, ui, audio); return }
  if (location.search.includes('enemies')) { ui.hideTitle(); startEnemyTest(canvas, renderer, audio); return }
  if (!settings().tier) {
    // 2 s benchmark: a throw-away heavy scene behind the logo
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 50)
    const mat = new THREE.MeshStandardMaterial({ color: 0x888888 })
    for (let i = 0; i < 400; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.4, .4, .4), mat); m.position.set(Math.random() * 8 - 4, Math.random() * 4 - 2, -Math.random() * 12 - 2); sc.add(m) }
    sc.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1))
    renderer.resize('cao')
    const tier = await benchmark(() => { sc.rotation.y += 0.01; renderer.render(sc, cam) })
    sc.traverse(o => { (o as THREE.Mesh).geometry?.dispose() })
    setSetting('tier', tier)
  } else await new Promise(r => setTimeout(r, 900)) // logo finishes assembling
  ui.setReady()
  const q = new URLSearchParams(location.search)
  if ((q.has('menu') || (!q.has('level') && save().progress.level >= 1)) && !q.has('go')) { startMenu(canvas, renderer, ui, audio); return }
  const want = Number(q.get('level')) || Math.min(save().progress.level + 1, CH1.length)
  const lv = level(want) ?? CH1[0]
  if (lv.boss) { ui.hideTitle(); addEventListener('pointerdown', () => audio.unlock(), { once: true }); if (lv.boss === 'nguoigac') startBoss1(canvas, renderer, audio); else startBoss2(canvas, renderer, audio); return }
  startChapter(canvas, renderer, ui, audio, settings().tier!, lv, q.get('go') === '1')
}
boot()
