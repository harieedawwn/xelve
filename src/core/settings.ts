import { save, persist, Settings } from './save'
type Listener = (s: Settings) => void
const ls: Listener[] = []
export const settings = (): Settings => save().settings
export const onSettings = (f: Listener) => { ls.push(f) }
export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  save().settings[k] = v; persist(); ls.forEach(f => f(save().settings))
}
