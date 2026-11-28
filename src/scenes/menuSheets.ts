// Chapter map (ink city, stains on cleared levels, Chương 2 locked) and the Thuật ngữ sheet.
import type { SaveData } from '../core/save'
import { CH1 } from '../levels/ch1'
import { el, ICON } from '../ui/dom'
import { t, Key } from '../i18n'
import { nodeState, stains } from './menuLogic'
import { voxel } from '../ui/vox'

export interface Sheet { root: HTMLElement; show(v: boolean): void }
function sheet(title: string, body: HTMLElement, click: () => void): Sheet {
  const root = el('div', 'sheet'), box = el('div', 'sheet-box wide'), head = el('div', 'sheet-head')
  head.appendChild(el('h2', '', title))
  const close = el('button', 'ib', ICON.close); close.setAttribute('aria-label', t('menu.close'))
  head.appendChild(close); box.append(head, body); root.appendChild(box)
  const show = (v: boolean) => root.classList.toggle('show', v)
  close.onclick = (e) => { e.stopPropagation(); click(); show(false) }
  root.onclick = (e) => { if (e.target === root) show(false) }
  return { root, show }
}

export function chapterMap(s: SaveData, play: (id: number) => void, click: () => void): Sheet {
  const body = el('div', 'map')
  // road drawn as ink squares between nodes, two rows of four
  const nodes = el('div', 'nodes')
  for (const lv of CH1) {
    const st = nodeState(s, lv.id)
    const b = el('button', 'node ' + st) as HTMLButtonElement
    b.dataset.level = String(lv.id)
    if (st === 'cleared') for (const [x, y, z] of stains(lv.id)) { const i = el('i'); i.style.cssText = `left:${x}%;top:${y}%;width:${z}px;height:${z}px`; b.appendChild(i) }
    b.append(el('b', '', String(lv.id)), el('span', '', t(lv.name as Key)))
    if (st === 'locked') { b.insertAdjacentHTML('beforeend', ICON.lock); b.setAttribute('aria-disabled', 'true') }
    b.onclick = (e) => { e.stopPropagation(); if (st === 'locked') return; click(); play(lv.id) }
    nodes.appendChild(b)
  }
  const ch2 = el('div', 'ch2', ICON.lock + `<b>${t('chapter.2')}</b><small>${t('locked.soon')}</small>`)
  body.append(nodes, ch2)
  const sh = sheet(t('map.chapter1'), body, click), vox = voxel(nodes)
  const cur = nodes.querySelector<HTMLElement>('.node.current')
  return { root: sh.root, show(v: boolean) { sh.show(v); if (v && cur) requestAnimationFrame(() => { vox.to(cur); vox.place() }) } }
}

const TERMS = ['voxel', 'mau', 'xuong', 'luoi', 'banve', 'bong', 'trang', 'do', 'ne', 'luc', 'diemyeu'] as const
export function glossary(click: () => void): Sheet {
  const body = el('dl', 'terms')
  for (const k of TERMS) body.append(el('dt', '', t(`term.${k}` as Key)), el('dd', '', t(`term.${k}.d` as Key)))
  return sheet(t('menu.terms'), body, click)
}
