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
  // main screen + chapter map + Thuật ngữ with a seeded save (L1-L4 cleared)
  const mp = await browser.newPage({ viewport: { width: w, height: h } })
  await mp.addInitScript(() => localStorage.setItem('xelve.save', JSON.stringify({ v: 1, settings: { tier: 'thap', sound: true, music: 0.7, reduceShake: false, lang: 'vi' }, progress: { chapter: 1, level: 4 }, unlocked: ['khoi', 'l1', 'l2', 'l3', 'l4', 'grid3', 'grid5'] })))
  await mp.goto('http://localhost:4177/?menu')
  await mp.waitForSelector('.menu .btn.big', { timeout: 20000 }); await mp.waitForTimeout(1200)
  const mprob = (await mp.evaluate(check)).map(p => 'menu ' + p)
  if (w === 640 || w === 915) await mp.screenshot({ path: `shots/menu-${w}x${h}.png` })
  for (const [i, name] of [[3, 'map'], [4, 'terms']]) {
    await mp.click(`.iconrow .ib:nth-child(${i + 1})`); await mp.waitForTimeout(500)
    mprob.push(...(await mp.evaluate(check)).map(p => name + ' ' + p))
    if (w === 640 && name === 'map') await mp.screenshot({ path: `shots/map-${w}x${h}.png` })
    await mp.click('.sheet.show .sheet-head .ib'); await mp.waitForTimeout(300)
  }
  console.log(`menu ${w}x${h}: ${mprob.length ? 'FAIL\n  ' + mprob.join('\n  ') : 'ok'}`)
  fail += mprob.length
  await mp.close()
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
  // combat pad (Đỡ ‹ › + Lực bar) in the duel room: inside the left 40 %, ≥ 64 px, in safe areas; dev buttons removed first
  const dp = await browser.newPage({ viewport: { width: w, height: h } })
  await dp.goto('http://localhost:4177/?duel&weapon=nang')
  await dp.waitForSelector('.pad .pb.blk', { timeout: 20000 }); await dp.waitForTimeout(300)
  await dp.evaluate(() => { document.querySelectorAll('[data-en]').forEach(b => b.remove()); document.querySelectorAll('.pb.hide').forEach(b => b.classList.remove('hide')) })
  const dprob = await dp.evaluate(check)
  dprob.push(...await dp.evaluate(() => [...document.querySelectorAll('.pb, .luc')].flatMap(b => { const r = b.getBoundingClientRect(), n = b.getAttribute('aria-label')
    return [...(b.classList.contains('pb') && r.right > innerWidth * 0.4 + 0.5 ? [`pad past 40%: ${n}`] : []), ...(b.classList.contains('pb') && (r.width < 63.5 || r.height < 63.5) ? [`pad < 64px: ${n}`] : []),
      ...(r.left < 0 || r.bottom > innerHeight || r.top < 0 ? [`outside: ${n}`] : [])] })))
  if (w === 640) await dp.screenshot({ path: `shots/duel-${w}x${h}.png` })
  console.log(`duel ${w}x${h}: ${dprob.length ? 'FAIL\n  ' + dprob.join('\n  ') : 'ok'}`)
  fail += dprob.length
  await dp.close()
  // Đống arena: boss bar, HP, ‹ › (+ Đỡ with nặng) and ↑ all inside safe areas; pad inside the left 40 %
  const bp = await browser.newPage({ viewport: { width: w, height: h } })
  await bp.goto('http://localhost:4177/?dong&weapon=nang')
  await bp.waitForSelector('.pad .pb.l', { timeout: 20000 }); await bp.waitForTimeout(300)
  await bp.evaluate(() => document.querySelectorAll('.pb.hide').forEach(b => b.classList.remove('hide')))
  const bprob = await bp.evaluate(check)
  bprob.push(...await bp.evaluate(() => [...document.querySelectorAll('.pb, .luc, .bossbar, .hp')].flatMap(b => { const r = b.getBoundingClientRect(), n = b.getAttribute('aria-label') ?? b.className
    return [...(b.classList.contains('pb') && r.right > innerWidth * 0.4 + 0.5 ? [`pad past 40%: ${n}`] : []), ...(r.left < 0 || r.right > innerWidth || r.bottom > innerHeight || r.top < 0 ? [`outside: ${n}`] : [])] })))
  console.log(`dong ${w}x${h}: ${bprob.length ? 'FAIL\n  ' + bprob.join('\n  ') : 'ok'}`)
  fail += bprob.length
  await bp.close()
}
await browser.close(); process.kill(-srv.pid)
process.exit(fail ? 1 : 0)
