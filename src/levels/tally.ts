// The tally wall inside Đống (story.md L8): hundreds of orange VE tally marks; the last group has 6 strokes, struck out in ink.
import * as THREE from 'three'

export function tallyTex() {
  const cv = document.createElement('canvas'); cv.width = 136; cv.height = 96; const g = cv.getContext('2d')!
  g.fillStyle = '#ECEBE6'; g.fillRect(0, 0, 136, 96)
  g.strokeStyle = '#E8590C'; g.lineWidth = 1.4
  const COLS = 6, ROWS = 7; let n = 0
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++, n++) {
    const x = 6 + c * 21, y = 6 + r * 13, last = r === ROWS - 1 && c === COLS - 1
    for (let k = 0; k < (last ? 6 : 4); k++) { g.beginPath(); g.moveTo(x + k * 3, y); g.lineTo(x + k * 3 + ((n + k) % 3 - 1) * 0.6, y + 10); g.stroke() }
    if (!last) { g.beginPath(); g.moveTo(x - 2, y + 8); g.lineTo(x + 12, y + 2); g.stroke() }
  }
  const lx = 6 + (COLS - 1) * 21, ly = 6 + (ROWS - 1) * 13
  g.strokeStyle = '#16161A'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(lx - 3, ly + 6); g.lineTo(lx + 19, ly + 4); g.stroke()
  const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** group origin at the base of the wall so it can settle on the ground */
export function tallyWall() {
  const grp = new THREE.Group(), geo = new THREE.PlaneGeometry(3.4, 2.4)
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tallyTex(), side: THREE.DoubleSide })); m.position.y = 1.2
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x16161a })); e.position.y = 1.2
  grp.add(m, e); return grp
}
