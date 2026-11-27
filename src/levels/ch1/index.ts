// Chapter 1 level registry: new level = 1 file + 1 line.
import type { LevelData } from './types'
import { L1 } from './L1'
import { L2 } from './L2'
import { L3 } from './L3'
import { L4 } from './L4'
import { L5 } from './L5'
import { L6 } from './L6'
import { L7 } from './L7'
import { L8 } from './L8'
export const CH1: LevelData[] = [L1, L2, L3, L4, L5, L6, L7, L8]
export const level = (n: number) => CH1.find(l => l.id === n)
