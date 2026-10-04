// bun tools/preview-biome.ts <outdir> [biome]
// biome-<id>.png: four frames of the world scrolled to different distances, the knight at x = 34 and the first monster
// at x = 118 (then the boss in a fifth frame). seams-<id>.png: each tile repeated side by side so a visible seam shows.
import { HERO_IDLE } from '../plugin/hooks/adv/art/hero'
import { BOSSES, MONSTERS } from '../plugin/hooks/adv/art/monsters'
import { BIOME_ART } from '../plugin/hooks/adv/biomes'
import { BIOMES } from '../plugin/hooks/adv/types'
import type { BiomeArt, BiomeId, Tile } from '../plugin/hooks/adv/types'
import { blit, img, paintLayer, put, savePng } from './lib'
import type { Img } from './lib'

const W = 190
const H = 20
const GY = 17
const out = process.argv[2]!
const only = process.argv[3] as BiomeId | undefined

const paintTile = (im: Img, t: Tile, x0: number, scroll: number) => {
  const start = -(((scroll % t.w) + t.w) % t.w)
  for (let x = start; x < im.w; x += t.w) for (const l of t.layers) paintLayer(im, l, x0 + x, 0)
}

const scene = (art: BiomeArt, u: number, monster?: { sprite: any; hover?: number }, mx = 118): Img => {
  const im = img(W, H, art.sky[0])
  const bandOf = (y: number) => Math.min(4, Math.floor((y / GY) * 5))
  for (let y = 0; y < GY; y++) for (let x = 0; x < W; x++) put(im, x, y, art.sky[bandOf(y)]!)
  paintTile(im, art.far, 0, u * 0.25)
  paintTile(im, art.mid, 0, u * 0.5)
  for (let y = GY; y < H; y++) for (let x = 0; x < W; x++) put(im, x, y, art.ground.base)
  for (let x = 0; x < W; x++) put(im, x, GY, art.ground.line)
  paintTile(im, art.ground.tile, 0, u)
  blit(im, HERO_IDLE, 34, GY - HERO_IDLE.h)
  if (monster) blit(im, monster.sprite, mx, GY - monster.sprite.h - (monster.hover ?? 0))
  return im
}

for (const b of BIOMES) {
  if (only && b !== only) continue
  const art = BIOME_ART[b]
  const frames = [
    scene(art, 0),
    scene(art, 50, MONSTERS[b][0]),
    scene(art, 100, MONSTERS[b][1], 124),
    scene(art, 150, MONSTERS[b][2], 120),
    scene(art, 200, BOSSES[b], 124),
  ]
  const sheet = img(W, frames.length * (H + 1) - 1, '#000000')
  frames.forEach((f, i) => sheet.px.set(f.px, i * (H + 1) * W * 3))
  savePng(sheet, `${out}/biome-${b}.png`, 6)
  // seams: far x3, mid x6, ground x10 repeated on a plain strip
  const strip = img(W, 3 * (H + 1) - 1, '#000000')
  const rows: [Tile, number][] = [[art.far, 3], [art.mid, 6], [art.ground.tile, 10]]
  rows.forEach(([t, n], i) => {
    const row = img(W, H, art.sky[2])
    for (let k = 0; k < n; k++) for (const l of t.layers) paintLayer(row, l, k * t.w - 0, 0)
    strip.px.set(row.px, i * (H + 1) * W * 3)
  })
  savePng(strip, `${out}/seams-${b}.png`, 6)
  console.log(b, 'far', art.far.w, 'mid', art.mid.w, 'ground', art.ground.tile.w, 'layers', art.far.layers.length, art.mid.layers.length, art.ground.tile.layers.length)
}
