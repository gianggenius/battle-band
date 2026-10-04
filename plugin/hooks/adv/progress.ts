// The endless walk: where the knight is, and how it moves on while Claude works. Pure functions over the state.
import type { Biome, Progress } from '../../types'
import { CYCLE } from './consts'

export type { Progress }

const ORDER: Biome[] = ['dungeon', 'plateau', 'ice', 'volcano']

export const initial: Progress = { biome: 'dungeon', pos: 0, tier: 0, since: 0, running: false }

// after the volcano the dungeon comes round again, one lap harder
export const nextBiome = (biome: Biome, tier: number): { biome: Biome; tier: number } => {
  const i = ORDER.indexOf(biome)
  return i === ORDER.length - 1 ? { biome: ORDER[0]!, tier: tier + 1 } : { biome: ORDER[i + 1]!, tier }
}

const r2 = (v: number) => Math.round(v * 100) / 100

// the walk carried forward to `now`: whole biomes are crossed, `pos` is where he is in the one he is in
export const advance = (p: Progress, now: number): Progress => {
  if (!p.running) return p
  let { biome, tier, pos } = p
  let left = Math.max(0, (now - p.since) / 1000)
  while (pos + left >= CYCLE) {
    left -= CYCLE - pos
    pos = 0
    ;({ biome, tier } = nextBiome(biome, tier))
  }
  return { ...p, biome, tier, pos: r2(pos + left), since: now }
}

export const begin = (p: Progress, now: number): Progress => (p.running ? p : { ...p, running: true, since: now })
export const stop = (p: Progress, now: number): Progress => ({ ...advance(p, now), running: false, since: now })

// milliseconds from `now` until the biome he is in comes to its end
export const untilBoundary = (p: Progress, now: number): number => Math.max(0, (CYCLE - p.pos) * 1000 - (now - p.since))
