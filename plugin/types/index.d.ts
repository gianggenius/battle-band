export type Biome = 'dungeon' | 'plateau' | 'ice' | 'volcano'
// Where the knight is on his endless walk. `pos` is seconds into the biome at `since` (ms epoch); `tier` counts the laps.
export type Progress = { biome: Biome; pos: number; tier: number; since: number; running: boolean }
// One rate-limit window as the engine reports it.
export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
