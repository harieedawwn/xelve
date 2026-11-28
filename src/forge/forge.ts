// Xưởng: Bản vẽ + part tabs, tools, Lưới, materials, live 3D preview, 5 stat bars, Thử, Lưu. All text from vi.ts.
import './forge.css'
import { t, Key } from '../i18n'
import { BLUEPRINTS, BlueprintDef, SOON } from '../weapon/blueprints/registry'
import { MATERIALS } from '../weapon/materials/registry'
import { WeaponDesign, assemble, cloneDesign, gripOf, makeDesign, makePart, partDef, getCell, setCell } from '../weapon/model'
import { analyze, Stats } from '../weapon/analyze'
import { designProfile } from '../weapon/runtime'
import { savedDesign, storeDesign } from '../weapon/store'
import { GridView } from './grid'
import { Preview } from './preview'
import { History } from './history'
import { fill, lineCells, paint, tidy } from './ops'
import { FI } from './icons'
import { Tutorial } from '../ui/tutorial'
import { FORGE_SEQ, nextOf, TutId } from '../ui/tutorialLogic'
import { save } from '../core/save'

type Tool = 'pen' | 'eraser' | 'fill' | 'line'
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e }
const STATS = ['dmg', 'speed', 'reach', 'sharp', 'heavy'] as const

export interface ForgeOpts { khoiSize: number; unlocked: string[]; onBack: () => void; onSound: (name: string, p?: number) => void }

export class Forge {
  root = el('div', 'forge')
  private designs: Record<string, WeaponDesign> = {}
  private bp!: BlueprintDef; private d!: WeaponDesign; private part = ''
  private tool: Tool = 'pen'; private matId = 'tho'; private mirror = false
  private hist = new History(); private stats!: Stats
  private grid: GridView; private preview = new Preview()
  private lineFrom: [number, number] | null = null; private lineTo: [number, number] | null = null
  private last: [number, number] | null = null; private changed = false
  private showNums = false; private dirty = true
  private ui: Record<string, HTMLElement> = {}

  private tut = new Tutorial(this.root)
  private tutNext() { const n = nextOf(save().tutorial, FORGE_SEQ); if (n) this.tut.show(n); else this.tut.hide() }
  private tutDid(id: TutId) { this.tut.did(id); if (this.tut.shown === null) this.tutNext() }
  constructor(private o: ForgeOpts) {
    this.grid = new GridView({ start: (x, y) => this.strokeStart(x, y), move: (x, y) => this.strokeMove(x, y), end: () => this.strokeEnd(), cancel: () => this.strokeCancel() })
    this.preview.onHit = (p, heavy) => this.o.onSound(heavy ? 'hit.heavy' : 'hit.flesh', 0.6 + p * 0.6)
    this.build(); setTimeout(() => this.tutNext(), 500)
    this.selectBp(o.unlocked[0] ?? 'khoi')
    const tick = () => { if (this.dirty) { this.dirty = false; this.refresh() } requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }

  private btn(cls: string, html: string, label: Key | string, on: () => void, sound = 'ui.tap') {
    const b = el('button', cls, html); b.setAttribute('aria-label', label.includes('.') ? t(label as Key) : label)
    b.onclick = e => { e.stopPropagation(); this.o.onSound(sound); on() }
    return b
  }

  private build() {
    const top = el('div', 'f-top')
    top.append(this.btn('ib', FI.back, 'forge.back', () => this.o.onBack(), 'ui.back'), el('h2', '', t('forge.title')))
    const bps = el('div', 'seg f-bps')
    for (const id of Object.keys(BLUEPRINTS)) {
      const b = this.btn('', t(BLUEPRINTS[id].name), BLUEPRINTS[id].name, () => this.selectBp(id))
      b.dataset.bp = id; if (!this.o.unlocked.includes(id)) { b.classList.add('locked'); b.innerHTML = FI.lock + `<span>${t(BLUEPRINTS[id].name)}</span>`; b.setAttribute('aria-disabled', 'true') }
      bps.appendChild(b)
    }
    const soon = el('button', 'locked', FI.lock + `<small>${t('locked.soon')}</small>`)
    soon.setAttribute('aria-label', SOON.map(k => t(k)).join(', ') + ': ' + t('locked.soon')); soon.setAttribute('aria-disabled', 'true')
    bps.appendChild(soon)
    const saveB = this.btn('btn f-save', FI.save + `<span>${t('forge.save')}</span>`, 'forge.save', () => this.save())
    this.ui.save = saveB
    top.append(bps, saveB)

    const tools = el('div', 'f-tools')
    for (const k of ['pen', 'eraser', 'fill', 'line'] as Tool[]) { const b = this.btn('ib', FI[k], `tool.${k}`, () => { this.tool = k; this.syncTools() }); b.dataset.tool = k; tools.appendChild(b) }
    this.ui.mirror = this.btn('ib', FI.mirror, 'tool.mirror', () => { this.mirror = !this.mirror; this.syncTools(); this.dirty = true; if (this.mirror) this.tutDid('mirror') })
    this.ui.tidy = this.btn('ib', FI.tidy, 'tool.tidy', () => { this.hist.push(this.d); if (tidy(this.cur())) this.dirty = true; else this.hist.drop(); this.syncTools() })
    this.ui.undo = this.btn('ib', FI.undo, 'tool.undo', () => { const p = this.hist.undo(this.d); if (p) this.setDesign(p) })
    this.ui.redo = this.btn('ib', FI.redo, 'tool.redo', () => { const p = this.hist.redo(this.d); if (p) this.setDesign(p) })
    tools.append(this.ui.mirror, this.ui.tidy, this.ui.undo, this.ui.redo)

    this.ui.parts = el('div', 'seg f-parts')
    const mats = el('div', 'f-mats'); mats.setAttribute('role', 'group'); mats.setAttribute('aria-label', t('forge.material'))
    for (const m of Object.values(MATERIALS)) {
      const b = this.btn('f-mat', '', m.name, () => { this.matId = m.id; if (this.tool === 'eraser') this.tool = 'pen'; this.syncTools() })
      b.style.setProperty('--m', '#' + m.color.toString(16).padStart(6, '0')); b.dataset.mat = m.id; mats.appendChild(b)
    }

    const side = el('div', 'f-side')
    const bars = this.btn('f-bars', '', 'stat.dmg', () => { this.showNums = !this.showNums; this.renderBars() })
    bars.setAttribute('aria-label', STATS.map(k => t(`stat.${k}`)).join(', '))
    for (const k of STATS) {
      const r = el('div', 'f-bar'); r.title = t(`stat.${k}`)
      r.append(el('i', '', FI[k]), el('b', '', '<u></u>'), el('em', '')); r.dataset.k = k; bars.appendChild(r)
    }
    this.ui.bars = bars
    this.ui.loose = el('div', 'f-loose', FI.crack + `<span></span>`); this.ui.loose.title = t('forge.loose')
    const tryB = this.btn('btn f-try', FI.play + `<span>${t('forge.try')}</span>`, 'forge.try', () => { this.preview.swing(); this.tutDid('try') })
    side.append(this.preview.root, bars, this.ui.loose, tryB)
    this.root.append(top, tools, this.ui.parts, this.grid.root, mats, side)
  }

  private cur() { return this.d.parts[this.part] }

  selectBp(id: string) {
    if (!this.o.unlocked.includes(id)) return
    if (this.d) this.designs[this.d.blueprint] = this.d
    this.bp = BLUEPRINTS[id]
    this.d = this.designs[id] ?? savedDesign(id) ?? makeDesign(id, this.o.khoiSize)
    if (id === 'khoi') this.fitKhoi()
    this.mirror = this.bp.mirror; this.hist = new History(); this.part = this.bp.parts.find(p => p.grip === undefined)?.id ?? this.bp.parts[0].id
    this.root.querySelectorAll<HTMLElement>('.f-bps button[data-bp]').forEach(b => b.classList.toggle('on', b.dataset.bp === id))
    const parts = this.ui.parts; parts.innerHTML = ''; parts.style.display = this.bp.parts.length > 1 ? '' : 'none'
    for (const p of this.bp.parts) { const b = this.btn('', t(p.name), p.name, () => this.selectPart(p.id)); b.dataset.part = p.id; parts.appendChild(b) }
    this.selectPart(this.part)
  }
  /** a saved Khối from a smaller grid keeps its drawing, bottom-centre aligned */
  private fitKhoi() {
    const p = this.d.parts.khoi, n = this.o.khoiSize
    if (p.w === n && p.h === n) return
    const q = makePart('khoi', n, n), dx = Math.floor((n - p.w) / 2), dy = n - p.h
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = getCell(p, x, y); if (c) setCell(q, x + dx, y + dy, c) }
    this.d.parts.khoi = q
  }
  private selectPart(id: string) {
    this.part = id
    this.ui.parts.querySelectorAll<HTMLElement>('button').forEach(b => b.classList.toggle('on', b.dataset.part === id))
    this.syncTools(); this.dirty = true
  }
  private setDesign(d: WeaponDesign) { this.d = d; this.syncTools(); this.dirty = true }

  // strokes
  private apply(x: number, y: number) {
    const p = this.cur(), c = this.tool === 'eraser' ? null : { mat: this.matId }
    if (this.tool === 'fill') { if (fill(p, x, y, c, this.mirror)) this.changed = true; return }
    const from = this.last ?? [x, y]
    for (const [cx, cy] of lineCells(from[0], from[1], x, y)) if (paint(p, cx, cy, c, this.mirror)) this.changed = true
    this.last = [x, y]
  }
  private strokeStart(x: number, y: number) {
    this.hist.push(this.d); this.changed = false; this.last = null
    if (this.tool === 'line') { this.lineFrom = this.lineTo = [x, y] } else this.apply(x, y)
    this.dirty = true
  }
  private strokeMove(x: number, y: number) {
    if (this.tool === 'line') { this.lineTo = [x, y]; this.dirty = true; return }
    if (this.tool === 'fill' || (this.last && this.last[0] === x && this.last[1] === y)) return
    this.apply(x, y); this.dirty = true
  }
  private strokeEnd() {
    if (this.tool === 'line' && this.lineFrom && this.lineTo) {
      this.last = this.lineFrom; this.tool = 'pen'; this.apply(this.lineTo[0], this.lineTo[1]); this.tool = 'line'
      this.lineFrom = this.lineTo = null
    }
    if (this.changed) this.tutDid('draw')
    if (!this.changed) this.hist.drop()
    this.last = null; this.syncTools(); this.dirty = true
  }
  private strokeCancel() {
    const p = this.hist.pop(); if (p) this.d = p
    this.lineFrom = this.lineTo = null; this.last = null; this.syncTools(); this.dirty = true
  }

  private syncTools() {
    this.root.querySelectorAll<HTMLElement>('.f-tools [data-tool]').forEach(b => { const on = b.dataset.tool === this.tool; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)) })
    this.ui.mirror.classList.toggle('on', this.mirror); this.ui.mirror.setAttribute('aria-pressed', String(this.mirror))
    this.root.querySelectorAll<HTMLElement>('.f-mat').forEach(b => { const on = b.dataset.mat === this.matId && this.tool !== 'eraser'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)) })
    this.ui.undo.toggleAttribute('disabled', !this.hist.canUndo); this.ui.redo.toggleAttribute('disabled', !this.hist.canRedo)
    if (this.ui.save.classList.contains('done')) { this.ui.save.classList.remove('done'); this.ui.save.innerHTML = FI.save + `<span>${t('forge.save')}</span>` }
  }

  private refresh() {
    this.stats = analyze(this.d)
    const def = partDef(this.bp, this.part), p = this.cur(), a = assemble(this.d), loose = new Set<number>()
    for (const v of this.stats.loose) if (v.part === this.part) loose.add((v.y - def.at[1]) * p.w + (v.x - def.at[0]))
    const preview = this.lineFrom && this.lineTo ? lineCells(this.lineFrom[0], this.lineFrom[1], this.lineTo[0], this.lineTo[1]) : []
    this.grid.set({ part: p, rotate: this.bp.id !== 'khoi', ghost: def.ghost, loose, preview, mirror: this.mirror, grip: def.grip ?? (this.bp.parts.length === 1 ? gripOf(this.bp, p) : undefined) })
    this.preview.set(this.stats.connected, a.grip, a.voxel, designProfile(this.stats))
    this.renderBars()
    const n = this.stats.loose.length
    this.ui.loose.style.visibility = n ? 'visible' : 'hidden'; this.ui.loose.querySelector('span')!.textContent = String(n)
  }
  private renderBars() {
    const st = this.stats; if (!st) return
    const nums: Record<string, string> = {
      dmg: (st.bars.dmg * 10).toFixed(1), speed: Math.round(st.bars.speed * 100) + '%', reach: Math.round(st.reach * 100) + ' cm',
      sharp: Math.round(st.sharp * 100) + '%', heavy: st.mass.toFixed(0),
    }
    this.ui.bars.classList.toggle('nums', this.showNums)
    this.ui.bars.querySelectorAll<HTMLElement>('.f-bar').forEach(r => {
      const k = r.dataset.k as typeof STATS[number]
      r.querySelector('u')!.style.transform = `scaleX(${st.bars[k]})`; r.querySelector('em')!.textContent = nums[k]
    })
  }

  private save() {
    if (!this.stats.connected.length) return
    storeDesign(this.d); this.designs[this.d.blueprint] = cloneDesign(this.d)
    this.ui.save.classList.add('done'); this.ui.save.innerHTML = FI.check + `<span>${t('forge.saved')}</span>`
  }
  dispose() { this.preview.dispose(); this.root.remove() }
}
