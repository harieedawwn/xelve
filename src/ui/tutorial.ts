// One-line prompt slab (skewed ink, bottom-centre) with an icon. One at a time; counters live in save().tutorial.
import { t } from '../i18n'
import { save, persist } from '../core/save'
import { el, ICON } from './dom'
import { TUTORIAL, TUT_KEY, TutId, needed, bump } from './tutorialLogic'

const sv = (d: string) => `<svg viewBox="0 0 24 24">${d}</svg>`
const TI: Record<TutId, string> = {
  swipe: sv('<path d="M4 18c6-1 12-5 16-12"/><path d="M15 6h5v5"/>'),
  fast: sv('<path d="M3 17l8-10M9 19l8-10M15 21l6-10"/>'),
  head: sv('<path d="M8 9a4 4 0 0 1 8 0v4H8z"/><path d="M12 15v6M9 21h6"/>'),
  forge: ICON.forge,
  luc: sv('<path d="M5 20h14M7 20V9l5-5 5 5v11"/>'),
  block: sv('<path d="M5 4h14v9l-7 7-7-7z"/>'),
  dodge: sv('<path d="M8 5l-6 7 6 7M16 5l6 7-6 7"/>'),
  cover: sv('<path d="M8 5l-6 7 6 7M16 5l6 7-6 7"/>'),
  leap: sv('<path d="M4 15l8-8 8 8"/><path d="M12 7v13"/>'),
  draw: sv('<path d="M4 20l3-1 11-11-2-2L5 17z"/><path d="M14 6l2 2"/>'),
  mirror: sv('<path d="M12 3v18M9 6L3 12l6 6zM15 6l6 6-6 6z"/>'),
  try: ICON.play,
}

export class Tutorial {
  root = el('div', 'tut'); private cur: TutId | null = null; private timer = 0
  constructor(parent: HTMLElement) { parent.appendChild(this.root) }
  get shown() { return this.cur }
  /** show a prompt if the player still needs it and no other is up; returns whether it is up now */
  show(id: TutId): boolean {
    if (this.cur === id) return true
    if (this.cur || !needed(save().tutorial, id)) return false
    this.cur = id; this.root.innerHTML = `${TI[id]}<span>${t(TUT_KEY[id])}</span>`
    requestAnimationFrame(() => this.root.classList.add('show'))
    clearTimeout(this.timer); this.timer = window.setTimeout(() => { if (this.cur === id) this.hide() }, TUTORIAL.showSecs * 1000)
    ;((window as any).__tut ??= { log: [] as string[] }).log.push(id)
    return true
  }
  /** the player did the thing: count it; the prompt goes away once it was done enough (or at once if `now`) */
  did(id: TutId) {
    const c = save().tutorial; if (!needed(c, id)) return
    const done = bump(c, id); persist()
    if (done && this.cur === id) this.hide()
  }
  hide() { this.cur = null; this.root.classList.remove('show'); clearTimeout(this.timer) }
}
