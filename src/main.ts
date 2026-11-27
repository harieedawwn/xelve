// Boot: logo assembles from voxels (title DOM) while the quality benchmark runs, then the scene router starts the slice.
import './ui/style.css'
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/be-vietnam-pro/latin-900.css'
import '@fontsource/be-vietnam-pro/vietnamese-900.css'
import * as THREE from 'three'
import { loadSave } from './core/save'
import { settings, setSetting } from './core/settings'
import { benchmark } from './core/quality'
import { Renderer } from './render/pipeline'
import { Audio } from './audio/engine'
import { UI } from './ui/ui'
import { startSlice } from './scenes/slice'
import { startFxTest } from './scenes/fxtest'
import { startCamTest } from './scenes/camtest'

async function boot() {
  await loadSave()
  const canvas = document.getElementById('c') as HTMLCanvasElement
  const renderer = new Renderer(canvas)
  if (location.search.includes('fx')) { renderer.resize('tb'); startFxTest(renderer); return }
  if (location.search.includes('cam')) { renderer.resize('tb'); startCamTest(renderer); return }
  const ui = new UI()
  const audio = new Audio()
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
  startSlice(canvas, renderer, ui, audio, settings().tier!)
}
boot()
