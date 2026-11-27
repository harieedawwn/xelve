// Music slot: any assets/music/*.mp3 is picked up automatically; none → silent.
const files = import.meta.glob('../../assets/music/*.mp3', { query: '?url', import: 'default', eager: true }) as Record<string, string>
/** scene → file base name, e.g. { title: 'title', slice: 'corridor' } */
export const SCENE_MUSIC: Record<string, string> = { title: 'title', slice: 'corridor' }
export function musicUrl(scene: string): string | null {
  const base = SCENE_MUSIC[scene]; if (!base) return null
  const k = Object.keys(files).find(p => p.endsWith('/' + base + '.mp3'))
  return k ? files[k] : null
}
export class Music {
  private el: HTMLAudioElement | null = null; private src: MediaElementAudioSourceNode | null = null
  constructor(private ctx: AudioContext, private bus: AudioNode) {}
  play(scene: string) {
    const url = musicUrl(scene); if (!url) return
    this.stop(); const el = new Audio(url); el.loop = true; el.crossOrigin = 'anonymous'
    this.src = this.ctx.createMediaElementSource(el); this.src.connect(this.bus); this.el = el; el.play().catch(() => {})
  }
  stop() { this.el?.pause(); this.src?.disconnect(); this.el = null; this.src = null }
}
