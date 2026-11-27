// Device screenshots + layout check. Usage: npm run shots  (builds first if dist/ is missing)
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const VIEWPORTS = [[640, 360], [800, 360], [915, 412], [1024, 768], [1280, 800], [1600, 720]]
const MIN = 40
const exe = ['/opt/pw-browsers/chromium', process.env.CHROME_PATH].find(p => p && existsSync(p))
if (!existsSync('dist/index.html')) await new Promise(r => spawn('npm', ['run', 'build'], { stdio: 'inherit' }).on('close', r))
const srv = spawn('npx', ['vite', 'preview', '--port', '4177', '--strictPort'], { stdio: 'ignore', detached: true })
await new Promise(r => setTimeout(r, 2500))
mkdirSync('shots', { recursive: true })

const check = () => {
  const out = []
  const els = [...document.querySelectorAll('button, input, a, [role=button]')].filter(e => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e)
    if (!(r.width > 0 && r.height > 0) || cs.visibility === 'hidden' || cs.display === 'none' || e.closest('.rotate') || e.closest('.card:not(.show)')) return false
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) // skip what is covered by a sheet
    return top && (e === top || e.contains(top))
  })
  const R = els.map(e => ({ e, r: e.getBoundingClientRect(), n: (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 24) }))
  for (const { r, n } of R) {
    if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) out.push(`outside: ${n}`)
    if (r.width < 40 - 0.5 || r.height < 40 - 0.5) out.push(`small ${Math.round(r.width)}x${Math.round(r.height)}: ${n}`)
  }
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    if (R[i].e.contains(R[j].e) || R[j].e.contains(R[i].e)) continue
    const a = R[i].r, b = R[j].r
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`overlap: ${R[i].n} / ${R[j].n}`)
  }
  // text overflow inside its own box
  document.querySelectorAll('.sheet-box, .card, .f-top, .f-bars, .f-side').forEach(b => { if (b.scrollWidth > b.clientWidth + 1) out.push('horizontal overflow: ' + b.className) })
  return out
}

const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] })
let fail = 0
for (const [w, h] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto('http://localhost:4177/')
  await page.waitForSelector('.title.ready', { timeout: 20000 })
  await page.click('.title .corner')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `shots/settings-${w}x${h}.png` })
  const problems = await page.evaluate(check)
  console.log(`${w}x${h}: ${problems.length ? 'FAIL\n  ' + problems.join('\n  ') : 'ok'}`)
  fail += problems.length
  await page.close()
  // Xưởng: every Bản vẽ and each of its parts; cells must stay ≥ 18 px
  const fp = await browser.newPage({ viewport: { width: w, height: h } })
  await fp.goto('http://localhost:4177/?forge&grid=8')
  await fp.waitForSelector('.forge .lw canvas', { timeout: 20000 }); await fp.waitForTimeout(400)
  const fprob = []
  for (const bp of ['khoi', 'dao', 'kiem', 'bua']) {
    await fp.click(`.f-bps [data-bp=${bp}]`); await fp.waitForTimeout(150)
    const parts = await fp.$$eval('.f-parts button', bs => bs.filter(b => b.offsetParent).map(b => b.dataset.part))
    for (const part of parts.length ? parts : ['']) {
      if (part) { await fp.click(`.f-parts [data-part=${part}]`); await fp.waitForTimeout(120) }
      const cs = await fp.evaluate(() => window.__forge.grid.cs)
      if (cs < 18) fprob.push(`cell ${cs}px: ${bp}/${part}`)
      fprob.push(...(await fp.evaluate(check)).map(p => `${bp}/${part} ${p}`))
    }
  }
  await fp.click('.f-bps [data-bp=kiem]'); await fp.waitForTimeout(200)
  await fp.screenshot({ path: `shots/forge-${w}x${h}.png` })
  console.log(`forge ${w}x${h}: ${fprob.length ? 'FAIL\n  ' + [...new Set(fprob)].join('\n  ') : 'ok'}`)
  fail += fprob.length
  await fp.close()
}
await browser.close(); process.kill(-srv.pid)
process.exit(fail ? 1 : 0)
