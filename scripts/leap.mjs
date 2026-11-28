// P16 check: during Đống's arm run the blade never passes inside the body; sparks + scratches show on contact.
// Usage: node scripts/leap.mjs [shot.png]   (needs dist/)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
const exe = ['/opt/pw-browsers/chromium', process.env.CHROME_PATH].find(p => p && existsSync(p))
const srv = spawn('npx', ['vite', 'preview', '--port', '4181', '--strictPort'], { stdio: 'ignore', detached: true })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 640, height: 360 } })
const errs = []; page.on('pageerror', e => errs.push(String(e)))
await page.goto('http://localhost:4181/?dong&tier=thap&weapon=vua&debug')
await page.waitForFunction(() => window.__dong, null, { timeout: 20000 })
const out = []
for (let run = 0; run < 2; run++) {
  await page.waitForFunction(() => window.__dong.brain.open && !window.__dong.rig.busy, null, { timeout: 60000, polling: 50 })
  await page.evaluate(() => window.__dong.leap())
  let shot = false
  // swipe hard left↔right and down while the camera runs up the arm and hangs at the seam
  for (let i = 0; i < 40 && await page.evaluate(() => window.__dong.assault); i++) {
    const y = 150 + (i % 3) * 60
    await page.mouse.move(i % 2 ? 560 : 80, y); await page.mouse.down()
    for (let k = 1; k <= 4; k++) await page.mouse.move(i % 2 ? 560 - 120 * k : 80 + 120 * k, y + 25 * k)
    if (!shot && run === 1 && process.argv[2] && (await page.evaluate(() => window.__dong.contact.frames)) > 4) { await page.screenshot({ path: process.argv[2] }); shot = true }
    await page.mouse.up()
  }
  out.push(await page.evaluate(() => ({ ...window.__dong.contact, hits: window.__dong.stats.hits })))
}
console.log(JSON.stringify(out), errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors')
await browser.close(); process.kill(-srv.pid)
