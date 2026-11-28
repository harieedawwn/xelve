// Tutorial check (P18): fresh save, bot plays level N (default 1) with kills; prints which prompts appeared (window.__tut.log) and saves one screenshot.
// Usage: node scripts/tutorial.mjs [level=1] [shot.png]   (needs dist/: npm run build)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
const lvl = process.argv[2] ?? '1', shot = process.argv[3]
const exe = ['/opt/pw-browsers/chromium', process.env.CHROME_PATH].find(p => p && existsSync(p))
const srv = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { stdio: 'ignore', detached: true })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 640, height: 360 } })
const errs = []; page.on('pageerror', e => errs.push(String(e)))
if (process.env.SEED) await page.addInitScript(s => { try { const d = JSON.parse(localStorage.getItem('xelve.save') || '{"v":1}'); d.tutorial = JSON.parse(s); localStorage.setItem('xelve.save', JSON.stringify(d)) } catch {} }, process.env.SEED)
await page.goto(`http://localhost:4179/?level=${lvl}&go=1&tier=thap`)
await page.waitForFunction(() => window.__xelve && window.__xelve.state !== 'title', null, { timeout: 20000 })
let shotDone = !shot
const t0 = Date.now()
while (Date.now() - t0 < 120000) {
  const r = await page.evaluate(() => { const x = window.__xelve; const s = x.state; const log = (window.__tut?.log ?? []); const shown = document.querySelector('.tut.show span')?.textContent ?? null; if (s !== 'end') x.kill(1.5); return { s, log, shown } })
  if (!shotDone && r.shown) { await page.waitForTimeout(400); await page.screenshot({ path: shot }); shotDone = true }
  if (r.s === 'end') break
  await page.waitForTimeout(100)
}
const log = await page.evaluate(() => window.__tut?.log ?? [])
console.log(`L${lvl} prompts:`, log.join(' → ') || '(none)', errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors')
await browser.close(); process.kill(-srv.pid)
