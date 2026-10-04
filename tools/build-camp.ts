// TREE=... USAGE=mid bun tools/build-camp.ts <outdir> : the camp of every biome as camp-<biome>.svg, with its size
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
const tree = process.env.TREE ?? join(import.meta.dir, '..')
const { buildCamp } = await import(`${tree}/plugin/hooks/adv/camp.ts`)
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
mkdirSync(out, { recursive: true })
for (const b of ['dungeon', 'plateau', 'ice', 'volcano']) {
  const svg: string = buildCamp(b, usage)
  writeFileSync(`${out}/camp-${b}.svg`, svg)
  console.log(b, 'chars', svg.length)
}
