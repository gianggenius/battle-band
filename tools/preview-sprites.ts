// bun tools/preview-sprites.ts <outdir> [biome]
// One sheet per biome: the knight (for scale), then each monster with its second pose, then the boss. Bottom row on the ground.
import { HERO_IDLE } from '../plugin/hooks/adv/art/hero'
import { BOSSES, MONSTERS } from '../plugin/hooks/adv/art/monsters'
import { BIOMES } from '../plugin/hooks/adv/types'
import type { BiomeId } from '../plugin/hooks/adv/types'
import { blit, img, put, savePng } from './lib'

const out = process.argv[2]!
const only = process.argv[3] as BiomeId | undefined
for (const b of BIOMES) {
  if (only && b !== only) continue
  const items = [{ s: HERO_IDLE, flip: false, hover: 0 }]
  for (const m of [...MONSTERS[b], BOSSES[b]]) {
    items.push({ s: m.sprite, flip: false, hover: m.hover ?? 0 })
    if (m.sprite2) items.push({ s: m.sprite2, flip: false, hover: m.hover ?? 0 })
  }
  const W = items.reduce((a, it) => a + it.s.w + 4, 4)
  const H = 22
  const im = img(W, H, '#2a2438')
  for (let x = 0; x < W; x++) put(im, x, H - 2, '#4a3b34')
  let x = 4
  for (const it of items) {
    blit(im, it.s, x, H - 2 - it.s.h - it.hover, it.flip)
    x += it.s.w + 4
  }
  savePng(im, `${out}/sprites-${b}.png`, 8)
  console.log(b, items.length - 1, 'sprites, sheet', W, 'x', H)
}
