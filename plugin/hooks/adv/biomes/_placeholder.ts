// PLACEHOLDER used until the art lane writes the real biomes.
import { Canvas, mix } from '../pixel'
import type { BiomeArt, BiomeId } from '../types'

export const placeholder = (id: BiomeId, sky: string, far: string, mid: string, ground: string): BiomeArt => {
  const f = new Canvas(108, 20)
  for (let x = 0; x < 108; x++) {
    const h = 5 + Math.round(3 * Math.sin((x / 108) * Math.PI * 4) + 2 * Math.sin((x / 108) * Math.PI * 6))
    f.rect(x, 17 - h, 1, h, far)
  }
  const m = new Canvas(54, 20)
  m.rect(10, 6, 5, 11, mid)
  m.rect(36, 8, 5, 9, mid)
  const g = new Canvas(18, 20)
  g.rect(0, 17, 18, 3, ground)
  g.rect(2, 18, 3, 1, mix(ground, '#000000', 0.3))
  g.rect(11, 19, 3, 1, mix(ground, '#000000', 0.3))
  return {
    id,
    sky: [sky, sky, sky, sky, sky],
    far: f.tile(),
    mid: m.tile(),
    ground: { base: ground, line: mix(ground, '#ffffff', 0.25), tile: g.tile() },
    ambient: '',
    weapon: { blade: '#f8fafc', hilt: '#e7b83a', slash: ['#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8'], spark: ['#ffffff', '#fde047', '#fb923c'], ring: '#ffffff', ghost: '#44b7ff' },
  }
}
