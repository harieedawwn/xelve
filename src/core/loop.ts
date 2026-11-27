// Fixed 60 Hz sim, variable render. `fpsCap` 30 skips render frames on Thấp.
export interface LoopOpts { step: (dt: number) => void; render: (alpha: number, realDt: number) => void; fpsCap: () => number }
export function startLoop(o: LoopOpts) {
  const H = 1 / 60; let acc = 0, last = 0, lastRender = 0
  const frame = (ts: number) => {
    requestAnimationFrame(frame)
    const cap = o.fpsCap()
    if (cap === 30 && ts - lastRender < 1000 / 30 - 2) return
    const realDt = Math.min(0.05, (ts - last) / 1000 || 1 / 60); last = ts; lastRender = ts
    acc += realDt
    while (acc >= H) { o.step(H); acc -= H }
    o.render(acc / H, realDt)
  }
  requestAnimationFrame(frame)
}
