// Input zones: a finger on the canvas drives the weapon; never the camera.
export function bindFinger(el: HTMLElement, f: { x: number; y: number }, setDown: (d: boolean) => void) {
  let down = false
  const set = (e: PointerEvent) => { f.x = (e.clientX / innerWidth) * 2 - 1; f.y = 1 - (e.clientY / innerHeight) * 2 }
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); set(e); down = true; setDown(true) })
  el.addEventListener('pointermove', (e) => { if (down) set(e) })
  const up = () => { down = false; setDown(false) }
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
}
