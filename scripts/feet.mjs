// P15 check: an enemy lunging at the feet stays on screen in every frame of its wind-up and lunge, even with others further away.
// Usage: node scripts/feet.mjs   (needs dist/)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
const exe = ['/opt/pw-browsers/chromium', process.env.CHROME_PATH].find(p => p && existsSync(p))
const srv = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { stdio: 'ignore', detached: true })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 640, height: 360 } })
const errs = []; page.on('pageerror', e => errs.push(String(e)))
await page.goto('http://localhost:4179/?level=2&go=1&tier=thap')
await page.waitForFunction(() => window.__xelve && window.__xelve.state === 'walk', null, { timeout: 20000 })
const res = await page.evaluate(async () => {
  const x = window.__xelve, out = []
  for (const [type, dx, dz] of [['chay', 1.1, -2.2], ['bong', -0.9, -0.9], ['chay', -1.2, -1.8]]) {
    x.skip(1); await new Promise(r => setTimeout(r, 400))
    const far = [x.spawn('bong', 0.6, -4.5), x.spawn('bong', -0.5, -5)], e = x.spawn(type, dx, dz)
    let frames = 0, off = 0, worst = 0
    const t0 = performance.now()
    await new Promise(done => {
      const tick = () => {
        if (e.state === 'windup' || e.state === 'lunge') {
          frames++
          const p = e.torso.getWorldPosition(e.root.position.clone()).project(x.cam)
          const m = Math.max(Math.abs(p.x), Math.abs(p.y)); worst = Math.max(worst, m); if (m > 1 || p.z > 1) off++
        } else if (frames > 0 && e.state !== 'windup') return done()
        if (performance.now() - t0 > 12000) return done()
        requestAnimationFrame(tick)
      }
      tick()
    })
    out.push({ type, frames, off, worst: +worst.toFixed(2) })
    x.kill(99); await new Promise(r => setTimeout(r, 1200))
  }
  return out
})
console.log(JSON.stringify(res), errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors')
await browser.close(); process.kill(-srv.pid)
