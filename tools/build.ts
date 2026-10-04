// USAGE=none|mid|danger [TREE=<a copy of the repo>] bun tools/build.ts <outdir> [biome|all] [tier] [offset]
// Builds the adventure of a biome from the tree (default: the real plugin), with a sample usage strip, and reports the size.
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
const tree = process.env.TREE ?? join(import.meta.dir, '..')
const { buildAdventure, marks } = await import(`${tree}/plugin/hooks/adv/adventure.ts`)
const { stripParts } = await import(`${tree}/plugin/hooks/adv/usage.ts`)
const now = Date.parse('2026-10-04T14:00:00Z')
const iso = (ms: number) => new Date(now + ms).toISOString()
const H = 3600_000
const SAMPLES: Record<string, unknown[]> = {
  none: [],
  mid: [{ kind: 'five_hour', percentUsed: 37, resetsAt: iso(2.2 * H) }, { kind: 'seven_day', percentUsed: 12.5, resetsAt: iso(5.1 * 24 * H) }],
  danger: [{ kind: 'five_hour', percentUsed: 91, resetsAt: iso(0.4 * H) }, { kind: 'seven_day', percentUsed: 88, resetsAt: iso(1.2 * 24 * H) }],
}
const usage = stripParts(SAMPLES[process.env.USAGE ?? 'none']!, now)
const out = process.argv[2]!
const only = process.argv[3]
const tier = Number(process.argv[4] ?? 0)
const offset = Number(process.argv[5] ?? 0)
mkdirSync(out, { recursive: true })
for (const b of ['dungeon', 'plateau', 'ice', 'volcano']) {
  if (only && only !== 'all' && b !== only) continue
  const t0 = performance.now()
  const svg: string = buildAdventure(b, tier, offset, usage)
  writeFileSync(`${out}/${b}.svg`, svg)
  if (only === b) console.log(JSON.stringify(marks))
  console.log(b, 'chars', svg.length, svg.length > 131072 ? 'TOO BIG' : svg.length > 120000 ? 'NEAR LIMIT' : 'ok', 'ms', (performance.now() - t0).toFixed(0))
}
