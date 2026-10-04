// TREE=... bun tools/build-usage.ts <outdir> : strips for a handful of readings
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
const tree = process.env.TREE ?? join(import.meta.dir, '..')
const { buildStrip } = await import(`${tree}/plugin/hooks/adv/usage.ts`)
const out = process.argv[2]!
mkdirSync(out, { recursive: true })
const now = Date.parse('2026-10-04T14:00:00Z')
const iso = (ms: number) => new Date(now + ms).toISOString()
const H = 3600_000
const cases: Record<string, unknown[]> = {
  none: [],
  zero: [{ kind: 'five_hour', percentUsed: 0, resetsAt: iso(5 * H) }, { kind: 'seven_day', percentUsed: 0, resetsAt: iso(7 * 24 * H) }],
  mid: [{ kind: 'five_hour', percentUsed: 37, resetsAt: iso(2.2 * H) }, { kind: 'seven_day', percentUsed: 12.5, resetsAt: iso(5.1 * 24 * H) }],
  amber: [{ kind: 'five_hour', percentUsed: 72, resetsAt: iso(1.1 * H) }, { kind: 'seven_day', percentUsed: 64, resetsAt: iso(2.4 * 24 * H) }],
  danger: [{ kind: 'five_hour', percentUsed: 91, resetsAt: iso(0.4 * H) }, { kind: 'seven_day', percentUsed: 88, resetsAt: iso(1.2 * 24 * H) }],
  full: [{ kind: 'five_hour', percentUsed: 100, resetsAt: iso(0.9 * H) }, { kind: 'seven_day', percentUsed: 97.5, resetsAt: iso(0.5 * 24 * H) }],
  reset: [{ kind: 'five_hour', percentUsed: 80, resetsAt: iso(-60_000) }, { kind: 'seven_day', percentUsed: 30, resetsAt: iso(3 * 24 * H) }],
  oneonly: [{ kind: 'five_hour', percentUsed: 55, resetsAt: iso(3 * H) }],
}
for (const [name, limits] of Object.entries(cases)) {
  const s = buildStrip(limits, now)
  writeFileSync(`${out}/strip-${name}.svg`, s.source)
  console.log(name, s.source.length, '|', s.alt)
}
