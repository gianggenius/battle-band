// bun tools/term/rasterize.ts <picture.svg> <outdir> <t1> <t2> ...
// The terminal band's rasterizer on a picture, at those seconds: one raw RGB file per time (<outdir>/<t>.rgb, width * height * 3 bytes) and meta.json.
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parseScene } from '../../plugin/hooks/term/svgraster'

const [file, out, ...times] = process.argv.slice(2)
if (!file || !out || times.length === 0) throw new Error('usage: bun tools/term/rasterize.ts <picture.svg> <outdir> <t1> <t2> ...')
mkdirSync(out, { recursive: true })
const scene = parseScene(readFileSync(file, 'utf8'))
for (const t of times) writeFileSync(join(out, `${t}.rgb`), scene.frame(Number(t)))
writeFileSync(join(out, 'meta.json'), JSON.stringify({ width: scene.width, height: scene.height, times: times.map(Number) }))
