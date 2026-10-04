// bun tools/check-biome.ts [biome]
// Contract checks for a biome module. Prints OK or FAIL lines; exit code 1 on any FAIL.
import { BIOME_ART } from '../plugin/hooks/adv/biomes'
import { BIOMES } from '../plugin/hooks/adv/types'
import type { BiomeId, Tile } from '../plugin/hooks/adv/types'
import { hex } from '../plugin/hooks/adv/pixel'

const only = process.argv[2] as BiomeId | undefined
let bad = 0
const fail = (b: string, m: string) => { bad++; console.log(`FAIL ${b}: ${m}`) }
const okHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s)
const RUN = /M-?\d+ -?\d+h\d+v1h-\d+z/g

const pixels = (t: Tile): Map<string, string> => {
  const m = new Map<string, string>()
  for (const l of t.layers) {
    const re = /M(-?\d+) (-?\d+)h(\d+)v1h-\d+z/g
    let r: RegExpExecArray | null
    while ((r = re.exec(l.d))) for (let i = 0; i < Number(r[3]); i++) m.set(`${Number(r[1]) + i},${r[2]}`, l.fill)
  }
  return m
}
const seam = (t: Tile) => {
  const px = pixels(t)
  const diff = (a: number, b: number) => { let n = 0; for (let y = 0; y < 20; y++) if ((px.get(`${a},${y}`) ?? '') !== (px.get(`${b},${y}`) ?? '')) n++; return n }
  let inner = 0
  for (let x = 0; x < t.w - 1; x++) inner += diff(x, x + 1)
  const mean = inner / (t.w - 1)
  return { across: diff(t.w - 1, 0), mean }
}

for (const b of BIOMES) {
  if (only && b !== only) continue
  const a = BIOME_ART[b]
  if (!a) { fail(b, 'missing'); continue }
  if (a.id !== b) fail(b, `id is ${a.id}`)
  if (a.sky.length !== 5 || !a.sky.every(okHex)) fail(b, 'sky must be five #rrggbb')
  if (!okHex(a.ground.base) || !okHex(a.ground.line)) fail(b, 'ground base/line must be #rrggbb')
  const tiles: [string, Tile, number, number][] = [['far', a.far, 108, 2500], ['mid', a.mid, 54, 3000], ['ground', a.ground.tile, 18, 700]]
  for (const [name, t, w, budget] of tiles) {
    if (t.w !== w) fail(b, `${name}.w is ${t.w}, must be ${w}`)
    let size = (t.extra ?? '').length
    for (const l of t.layers) {
      if (!okHex(l.fill)) fail(b, `${name} layer fill ${l.fill}`)
      if (l.d.replace(RUN, '') !== '') fail(b, `${name} layer d has something other than runs (use Canvas.layers())`)
      size += l.d.length
    }
    if ((t.extra ?? '').length > 600) fail(b, `${name}.extra is ${(t.extra ?? '').length} chars, max 600`)
    if (size > budget) fail(b, `${name} is ${size} chars of data, budget ${budget}`)
    const px = pixels(t)
    for (const k of px.keys()) { const [x, y] = k.split(',').map(Number); if (x! < 0 || x! >= w || y! < 0 || y! >= 20) { fail(b, `${name} paints outside the tile at ${k}`); break } }
    if (name !== 'ground') for (const k of px.keys()) { if (Number(k.split(',')[1]) >= 17) { fail(b, `${name} paints at y >= 17 (the ground covers it)`); break } }
    const s = seam(t)
    if (s.across > s.mean * 2 + 3) fail(b, `${name} seam: ${s.across} differing pixels across the join vs ${s.mean.toFixed(1)} on average inside`)
    console.log(`${b} ${name}: ${size} chars, ${t.layers.length} layers, ${px.size} pixels, seam ${s.across}/${s.mean.toFixed(1)}`)
  }
  if (a.ambient.length > 3000) fail(b, `ambient is ${a.ambient.length} chars, max 3000`)
  if (/<script|on[a-z]+=/i.test(a.ambient)) fail(b, 'ambient must not hold script or event handlers')
  for (const m of a.ambient.matchAll(/\bid="([^"]+)"/g)) if (!m[1]!.startsWith(b)) fail(b, `ambient id "${m[1]}" must start with "${b}"`)
  const w = a.weapon
  const cols = [w.blade, w.hilt, ...w.slash, ...w.spark, w.ring, w.ghost]
  if (w.slash.length !== 4 || w.spark.length !== 3 || !cols.every(okHex)) fail(b, 'weapon palette: slash x4, spark x3, all #rrggbb')
  void hex
}
console.log(bad ? `${bad} FAIL` : 'OK')
process.exit(bad ? 1 : 0)
