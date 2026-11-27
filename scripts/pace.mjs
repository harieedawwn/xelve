// Pace check (P15): bot plays a level start→end headless, kills enemies once they are within reach, logs time and longest standing wait.
// Usage: node scripts/pace.mjs [level=1]   (needs dist/: npm run build)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
const lvl = process.argv[2] ?? '1'
const exe = ['/opt/pw-browsers/chromium', process.env.CHROME_PATH].find(p => p && existsSync(p))
const srv = spawn('npx', ['vite', 'preview', '--port', '4178', '--strictPort'], { stdio: 'ignore', detached: true })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 640, height: 360 } })
const errs = []; page.on('pageerror', e => errs.push(String(e)))
await page.goto(`http://localhost:4178/?level=${lvl}&go=1&tier=thap`)
await page.waitForFunction(() => window.__xelve && window.__xelve.state !== 'title', null, { timeout: 20000 })
const res = await page.evaluate(async () => {
  const x = window.__xelve, t0 = performance.now()
  let idle = 0, maxIdle = 0, at = '', still = 0, maxStill = 0, lastS = x.rig.s, log = []
  while (x.state !== 'end' && performance.now() - t0 < 240000) {
    await new Promise(r => setTimeout(r, 100))
    x.kill(1.5)
    if (x.state === 'end') break
    const story = x.state === 'pick' || x.state === 'wake'
    const near = x.enemies().some(e => e.alive && Math.hypot(e.root.position.x, e.root.position.z + x.rig.s) < 2.2)
    if (Math.abs(x.rig.s - lastS) < 0.01 && !story && !near) { idle += 0.1; maxIdle = Math.max(maxIdle, idle) } else idle = 0
    if (Math.abs(x.rig.s - lastS) < 0.01 && !story) { still += 0.1; if (still > maxStill) { maxStill = still; at = `${x.state}@${x.rig.s.toFixed(1)} alive ${x.enemies().filter(e => e.alive).length}` } } else still = 0
    log.push(`${((performance.now() - t0) / 1000).toFixed(1)} ${x.state} ${x.rig.s.toFixed(2)} ${x.enemies().filter(e => e.alive).length}`)
    lastS = x.rig.s
  }
  return { log: log.join("\n"), secs: (performance.now() - t0) / 1000, maxIdle, maxStill, at, state: x.state, hp: x.hp }
})
const { log, ...sum } = res
if (process.env.LOG) console.log(log)
console.log(`L${lvl}`, JSON.stringify(sum), errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors')
await browser.close(); process.kill(-srv.pid)
