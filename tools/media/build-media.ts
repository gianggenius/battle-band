// bun tools/media/build-media.ts <outdir>
// Builds every picture the README media is made from, with the plugin's own code and art:
//   adv-<biome>-t<tier>.svg   the adventure of each place, laps 1 and 2 (elite monsters), a sample usage reading
//   camp-<biome>.svg          the camp of each place
//   usage-<state>.svg         the plateau adventure with each usage state: none, fresh, mid, amber, danger, full
// Every adventure starts at the beginning of its 48 s lap (offset 0), so frame times are seconds into the lap.
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const tree = process.env.TREE ?? join(import.meta.dir, '../..')
const { buildAdventure } = await import(`${tree}/plugin/hooks/adv/adventure.ts`)
const { buildCamp } = await import(`${tree}/plugin/hooks/adv/camp.ts`)
const { stripParts } = await import(`${tree}/plugin/hooks/adv/usage.ts`)

const now = Date.parse('2026-10-04T14:00:00Z')
const H = 3600_000
const iso = (ms: number) => new Date(now + ms).toISOString()
const reading = (five: number, fiveLeftH: number, week: number, weekLeftD: number) => [
  { kind: 'five_hour', percentUsed: five, resetsAt: iso(fiveLeftH * H) },
  { kind: 'seven_day', percentUsed: week, resetsAt: iso(weekLeftD * 24 * H) },
]
export const STATES: Record<string, unknown[]> = {
  none: [],
  fresh: reading(4, 4.8, 1, 6.9),
  mid: reading(37, 2.2, 12.5, 5.1),
  amber: reading(72, 1.1, 64, 2.4),
  danger: reading(91, 0.4, 88, 1.2),
  full: reading(100, 0.9, 97.5, 0.5),
}

const out = process.argv[2]
if (!out) throw new Error('usage: bun tools/media/build-media.ts <outdir>')
mkdirSync(out, { recursive: true })
const BIOMES = ['dungeon', 'plateau', 'ice', 'volcano']
const mid = stripParts(STATES.mid!, now)
const save = (name: string, svg: string) => {
  if (svg.length > 131072) throw new Error(`${name} is over the 131072 character limit (${svg.length})`)
  writeFileSync(join(out, name), svg)
  console.log(name.padEnd(24), svg.length)
}
for (const b of BIOMES) {
  for (const tier of [0, 1]) save(`adv-${b}-t${tier}.svg`, buildAdventure(b, tier, 0, mid))
  save(`camp-${b}.svg`, buildCamp(b, mid))
}
for (const [name, limits] of Object.entries(STATES)) save(`usage-${name}.svg`, buildAdventure('plateau', 0, 0, stripParts(limits, now)))
