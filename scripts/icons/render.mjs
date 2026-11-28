// Renders the 3 icon concepts (scripts/icons/render.ts) headless. Usage: node scripts/icons/render.mjs [outDir]
// Writes c{1,2,3}.png (full 1024) to public/icons/ and the bg/fg layers to outDir (default scripts/icons/out).
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const out = process.argv[2] || 'scripts/icons/out'
const exe = ['/opt/pw-browsers/chromium', process.env.CHROME_PATH].find(p => p && existsSync(p))
const srv = spawn('npx', ['vite', '--port', '4188', '--strictPort'], { stdio: 'ignore', detached: true })
await new Promise(r => setTimeout(r, 3000))
mkdirSync(out, { recursive: true }); mkdirSync('public/icons', { recursive: true })
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
try {
  const page = await browser.newPage()
  page.on('pageerror', e => console.log('page error:', e.message))
  await page.goto('http://localhost:4188/scripts/icons/render.html')
  await page.waitForFunction(() => document.title === 'ready', null, { timeout: 30000 })
  for (const i of [1, 2, 3]) {
    const r = await page.evaluate(n => window.__icon(n), i)
    const save = (p, d) => writeFileSync(p, Buffer.from(d.split(',')[1], 'base64'))
    save(`public/icons/c${i}.png`, r.full); save(`${out}/c${i}-bg.png`, r.bg); save(`${out}/c${i}-fg.png`, r.fg)
    console.log('concept', i, 'ok')
  }
} finally { await browser.close(); process.kill(-srv.pid) }
