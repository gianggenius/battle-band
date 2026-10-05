// bun tools/media/term-frames.ts <outdir>
// What the terminal band paints, as data: for each frame the text of the roads and the cells of the scene, exactly as the plugin makes
// them. term-render.js draws them as a terminal would. Frames: a still of a fight, a still of the camp, and 8 s of fighting.
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const tree = process.env.TREE ?? join(import.meta.dir, '../..')
const { buildAdventure } = await import(`${tree}/plugin/hooks/adv/adventure.ts`)
const { buildCamp } = await import(`${tree}/plugin/hooks/adv/camp.ts`)
const { fitScene, fitted, toCells, base64 } = await import(`${tree}/plugin/hooks/term/cells.ts`)
const { stripLines } = await import(`${tree}/plugin/hooks/term/strip.ts`)
const { parseScene } = await import(`${tree}/plugin/hooks/term/svgraster.ts`)

const out = process.argv[2]
if (!out) throw new Error('usage: bun tools/media/term-frames.ts <outdir>')
mkdirSync(out, { recursive: true })

const NO_STRIP = { defs: '', body: '', alt: '' }
const now = Date.parse('2026-10-04T14:00:00Z')
const H = 3600_000
const limits = [
  { kind: 'five_hour', percentUsed: 37, resetsAt: new Date(now + 2.2 * H).toISOString() },
  { kind: 'seven_day', percentUsed: 12.5, resetsAt: new Date(now + 5.1 * 24 * H).toISOString() },
]
const COLUMNS = 160 // a window of a usual width: the picture is cropped around the action, every pixel shown
const fit = fitScene(COLUMNS, 10)

const frame = (scene: ReturnType<typeof parseScene>, t: number) => ({
  roads: stripLines(limits, now, COLUMNS),
  columns: fit.columns,
  rows: fit.rows,
  cells: base64(toCells(fitted(scene.frame(t), scene.width, scene.height, fit), fit)),
})

const ice = parseScene(buildAdventure('ice', 0, 0, NO_STRIP))
const dungeon = parseScene(buildAdventure('dungeon', 0, 0, NO_STRIP))
const camp = parseScene(buildCamp('dungeon', NO_STRIP))
const FPS = 12
const clip: ReturnType<typeof frame>[] = []
for (let i = 0; i < 8 * FPS; i++) clip.push(frame(dungeon, 9 + i / FPS))
writeFileSync(
  join(out, 'frames.json'),
  JSON.stringify({ fps: FPS, columns: COLUMNS, stills: { fight: frame(ice, 37.5), camp: frame(camp, 3) }, clip }),
)
console.log(`${COLUMNS} columns, ${fit.rows} rows of cells, ${clip.length} frames of the clip`)
