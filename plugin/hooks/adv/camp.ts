// The camp: what the band shows while Claude is not working. The knight sits by a fire in the place he last reached.
import { HERO_SIT } from './art/hero'
import { BIOME_ART } from './biomes'
import { BAND_H, GY, STRIP_H, W } from './consts'
import { sprite, spriteSvg } from './pixel'
import { groundRects, skyRects, staticStrip, svgOpen, tileDefs, veil } from './scenery'
import { stripParts } from './usage'
import type { StripParts } from './usage'
import type { BiomeId } from './types'

// the fire: three flames that sway, and the logs under them
const FIRE_PAL = { r: '#dc2626', O: '#f97316', A: '#fbbf24', C: '#fff7d6' }
const FLAMES = [
  sprite(['...r...', '..rOr..', '..rOOr.', '.rOOAr.', '.rOAAOr', 'rOAACAO', 'rOACCAO', '.rOAAO.'], FIRE_PAL),
  sprite(['....r..', '...rOr.', '..rOOr.', '.rOAOr.', '.rOAAOr', 'rOAACAO', 'rOACCAO', '.rOAAO.'], FIRE_PAL),
  sprite(['..r....', '..rOr..', '.rOOr..', '.rOAOr.', '.rOAAOr', 'rOAACAO', 'rOACCAO', '.rOAAO.'], FIRE_PAL),
]
const LOGS = sprite(['.bLLLLLb.', 'bDDDDDDDb'], { b: '#3b2410', L: '#8b5a2b', D: '#5a3a1a' })
// the sleeping z, in a color that shows on each place's sky
const Z_COLOR: Record<BiomeId, string> = { dungeon: '#dbeafe', plateau: '#1e3a8a', ice: '#1e3a8a', volcano: '#fde68a' }
const zOf = (biome: BiomeId) => sprite(['ZZZ', '..Z', '.Z.', 'ZZZ'], { Z: Z_COLOR[biome] })

// how much of the biome's own light is taken away so the fire reads: bright places dim more
const DUSK: Record<BiomeId, number> = { dungeon: 0.16, plateau: 0.34, ice: 0.34, volcano: 0.2 }
// where the far strip starts, so something pleasant stands behind the fire
const FAR_AT: Record<BiomeId, number> = { dungeon: -18, plateau: -40, ice: -30, volcano: -34 }

const FIRE_X = 96 // centre of the fire
const KNIGHT_X = 79 // left edge of the sitting knight

const kt = (v: number) => String(Math.round(v * 1000) / 1000).replace(/^0\./, '.')
const px = (x: number, y: number, fill: string, inner = '') => `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}">${inner}</rect>`

// a looping discrete animation whose values are spread evenly, or at the given fractions of `dur`
const ani = (attr: string, values: string[], dur: number, begin = 0, times?: number[], translate = false): string => {
  const ts = times ?? values.map((_, i) => i / values.length)
  const tag = translate ? 'animateTransform' : 'animate'
  const name = translate ? 'attributeName="transform" type="translate"' : `attributeName="${attr}"`
  return `<${tag} ${name} calcMode="discrete" dur="${dur}s" repeatCount="indefinite"${begin ? ` begin="-${begin}s"` : ''} keyTimes="${ts.map(kt).join(';')}" values="${values.join(';')}"/>`
}

// an ember that climbs one unit at a time, drifts sideways, and fades near the top
const ember = (x: number, steps: number, dur: number, begin: number, drift: number[]): string => {
  const idx = Array.from({ length: steps }, (_, i) => i)
  const ys = idx.map(i => String(GY - 6 - i))
  const xs = idx.map(i => String(x + drift[i % drift.length]!))
  const ops = idx.map(i => (i < steps - 2 ? '1' : i === steps - 2 ? '0.6' : '0.25'))
  return px(x, GY - 6, '#ffd27a', ani('y', ys, dur, begin) + ani('x', xs, dur, begin) + ani('opacity', ops, dur, begin))
}

// a sleeping z that fades in above the helmet and out again; `top` is the row of its upper edge (the sprite hangs from its feet)
const sleepZ = (biome: BiomeId, x: number, top: number, dur: number, begin: number): string =>
  `<g opacity="0" transform="translate(${x} ${top + 4})">` +
  ani('opacity', ['0', '0.9', '0.9', '0'], dur, begin, [0, 0.15, 0.55, 0.8]) +
  spriteSvg(zOf(biome)) +
  '</g>'

export const buildCamp = (biome: BiomeId, usage: StripParts = stripParts([], 0)): string => {
  const art = BIOME_ART[biome]
  const head = sprite(HERO_SIT.rows.slice(0, 6), HERO_SIT.pal)
  const body = sprite(HERO_SIT.rows.slice(6), HERO_SIT.pal)
  const defs =
    tileDefs(art) +
    `<g id="cHead">${spriteSvg(head)}</g><g id="cBody">${spriteSvg(body)}</g><g id="cLogs">${spriteSvg(LOGS)}</g>` +
    FLAMES.map((f, i) => `<g id="cF${i}">${spriteSvg(f)}</g>`).join('')

  // the three flames in turn
  // (each one shown by opacity: the host drops an animated href)
  const flame =
    `<use href="#cF0">${ani('opacity', ['1', '0', '1', '0'], 0.8)}</use>` +
    `<use href="#cF1" opacity="0">${ani('opacity', ['0', '1', '0', '0'], 0.8)}</use>` +
    `<use href="#cF2" opacity="0">${ani('opacity', ['0', '0', '0', '1'], 0.8)}</use>`
  // a warm pool of light on the ground that breathes with the fire
  const glow = (x: number, w: number, h: number, o: number, dur: number, begin: number) =>
    `<rect x="${x}" y="${GY - h}" width="${w}" height="${h}" fill="#ffb347" opacity="${o}">${ani('opacity', [o, o * 1.5, o * 0.8, o * 1.25].map(v => String(Math.round(v * 1000) / 1000)), dur, begin)}</rect>`

  const fireLeft = FIRE_X - 3
  // the knight sits with his head dipping, the way a tired man does by a fire
  const knight =
    `<g transform="translate(${KNIGHT_X} ${GY})"><use href="#cBody"/>` +
    `<g transform="translate(0 -6)"><g transform="translate(0 0)">${ani('', ['0 0', '0 1', '0 1', '0 0'], 4.8, 0, [0, 0.5, 0.8, 0.9], true)}<use href="#cHead"/></g></g></g>`
  // the sword he stuck in the ground
  const sword =
    px(75, GY - 7, '#f1f5f9') + px(75, GY - 6, '#e2e8f0') + px(75, GY - 5, '#e2e8f0') + px(75, GY - 4, '#cbd5e1') + px(75, GY - 3, '#cbd5e1') +
    px(74, GY - 2, '#e7b83a') + px(75, GY - 2, '#e7b83a') + px(76, GY - 2, '#e7b83a') + px(75, GY - 1, '#7c4a21')

  const embers =
    ember(FIRE_X - 1, 8, 2.4, 0, [0, 1, 1, 0, -1, 0]) +
    ember(FIRE_X + 1, 9, 3.0, 1.1, [0, -1, -1, 0, 1, 1]) +
    ember(FIRE_X, 7, 2.0, 0.6, [0, 1, 0, -1]) +
    ember(FIRE_X + 2, 8, 2.8, 1.9, [0, 0, 1, 1, 0, -1])
  const zs = sleepZ(biome, KNIGHT_X + 8, 1, 3.6, 0) + sleepZ(biome, KNIGHT_X + 12, 0, 3.6, 1.8)

  const entry = veil('#0b0a14', '1', '<animate attributeName="opacity" from="1" to="0" begin="0s" dur="0.3s" fill="freeze"/>')
  const body2 =
    skyRects(art) +
    staticStrip('far', art.far.w, FAR_AT[biome]) +
    staticStrip('mid', art.mid.w, 0) +
    groundRects(art) +
    staticStrip('gnd', art.ground.tile.w, 0) +
    art.ambient +
    veil('#0b0a14', String(DUSK[biome])) +
    glow(FIRE_X - 20, 40, 2, 0.05, 0.9, 0) +
    glow(FIRE_X - 16, 32, 4, 0.06, 0.7, 0.3) +
    glow(FIRE_X - 12, 24, 6, 0.07, 0.8, 0.1) +
    glow(FIRE_X - 8, 16, 8, 0.08, 0.6, 0.4) +
    glow(FIRE_X - 5, 10, 10, 0.1, 0.5, 0.2) +
    sword +
    knight +
    `<use href="#cLogs" x="${fireLeft - 1}" y="${GY}"/>` +
    `<g transform="translate(${fireLeft} ${GY - 2})">${flame}</g>` +
    embers +
    zs
  // the camp sits under the usage strip, and the entry veil covers both
  return svgOpen(W, BAND_H) + `<defs>${defs}${usage.defs}</defs><g transform="translate(0 ${STRIP_H})">${body2}</g>${usage.body}${entry}</svg>`
}

export const CAMP_ALT = 'A knight rests by a campfire'
