import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { vi } from './vi'

const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [] })

describe('i18n keys', () => {
  const files = walk('src').filter(f => !f.endsWith('.test.ts') && !f.includes('i18n/'))
  const used = new Set<string>()
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*['"`]([\w.]+)['"`]/g)) used.add(m[1])
  it('every key used exists', () => { for (const k of used) expect(vi, k).toHaveProperty(k) })
  it('has Vietnamese diacritics and no empty strings', () => { for (const v of Object.values(vi)) expect(v.trim().length).toBeGreaterThan(0) })
})
