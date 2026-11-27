import { vi, Key } from './vi'
export type { Key }
export const t = (key: Key): string => vi[key]
