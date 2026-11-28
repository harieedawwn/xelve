// 3D pickup objects shown in front of the eyes for 2 s: a page with VE's handwriting, or a lump of the material.
import * as THREE from 'three'
import { t } from '../i18n'

const COLOR: Record<string, number> = { chi: 0x55555c, nhom: 0xc4c3bd, magie: 0xe8590c, thuytinh: 0xdfe6e8, caosu: 0x16161a, dakho: 0xcfd8dc }
export function pickupMesh(gives: string): THREE.Object3D {
  if (gives.startsWith('grid') || gives === 'bua') { // sketchbook page: 3×3 grid, orange middle, "bắt đầu từ một ô"
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; const g = cv.getContext('2d')!
    g.fillStyle = '#ECEBE6'; g.fillRect(0, 0, 96, 96); g.strokeStyle = '#16161A'; g.lineWidth = 2
    g.strokeRect(14, 10, 68, 60); for (const k of [1, 2]) { g.beginPath(); g.moveTo(14 + k * 22.7, 10); g.lineTo(14 + k * 22.7, 70); g.moveTo(14, 10 + k * 20); g.lineTo(82, 10 + k * 20); g.stroke() }
    g.fillStyle = '#E8590C'; g.fillRect(37, 30, 22, 20)
    g.fillStyle = '#16161A'; g.font = "600 9px 'Be Vietnam Pro', system-ui, sans-serif"; g.textAlign = 'center'; g.fillText(t('note.l2'), 48, 86)
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); m.renderOrder = 10; return m
  }
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshLambertMaterial({ color: COLOR[gives] ?? 0x888888, flatShading: true })); m.renderOrder = 10; return m
}
