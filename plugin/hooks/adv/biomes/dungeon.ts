// Dungeon: a dark arcade of vaults and corridors, torch-lit pillars, cracked flagstones.
import { Canvas, rnd } from '../pixel'
import type { BiomeArt } from '../types'
import { ahead, pack, stamp } from './_kit'

// the void behind the arches: darkest down in the corridors
const SKY: BiomeArt['sky'] = ['#100e1f', '#0e0c1c', '#0c0a19', '#0b0916', '#0a0814']

// far (108): a coursed wall with four arched openings onto corridors, hanging chains, a far lamp
const far = (() => {
  const c = new Canvas(108, 17)
  const WALL = '#1c172e'
  const LEDGE = '#241e39'
  const MORTAR = '#171327'
  const CHAIN = '#2b2544'
  const FLOOR = '#151122'
  const LAMP = '#5c3b30'
  c.rect(0, 0, 108, 17, WALL)
  c.rect(0, 1, 108, 1, LEDGE)
  c.rect(0, 2, 108, 1, MORTAR)
  for (const y of [6, 12]) c.rect(0, y, 108, 1, MORTAR)
  for (let i = 0; i < 4; i++) {
    const cx = 27 * i + 13.5
    for (let x = 27 * i; x < 27 * i + 27; x++) {
      const dx = x + 0.5 - cx
      if (Math.abs(dx) > 10.5) continue
      const top = Math.round(9 - 6 * Math.sqrt(1 - (dx / 10.5) ** 2))
      for (let y = top; y < 17; y++) c.putWrap(x, y, null)
      c.putWrap(x, 16, FLOOR)
    }
    // impost and plinth of the pillar, one pixel wider on each side
    const px = 27 * i - 4
    c.rect(px, 9, 8, 1, LEDGE)
    c.rect(px, 15, 8, 2, LEDGE)
    const x = 27 * i + 13
    if (i % 2 === 0) {
      const len = i === 0 ? 6 : 3
      for (let y = 3; y < 3 + len; y++) c.putWrap(x, y, y % 2 ? CHAIN : MORTAR)
      c.putWrap(x - 1, 3 + len, CHAIN)
      c.putWrap(x + 1, 3 + len, CHAIN)
      c.putWrap(x, 4 + len, CHAIN)
    } else {
      c.putWrap(x, 13, LAMP)
      c.putWrap(x, 14, LAMP)
    }
  }
  return pack(c)
})()

// mid (54): a stone pillar under a lintel, a torch with a warm glow, a corner web; a heap of rubble with a skull
const TORCH = 21 // torch column (tile-local)
const mid = (() => {
  const c = new Canvas(54, 17)
  const T = '#342c4c'
  const C = '#2a2342'
  const U = '#18141f'
  const L = '#332b4a'
  const S = '#262037'
  const D = '#1c172c'
  const M = '#1e192f'
  c.rect(13, 0, 17, 1, T)
  c.rect(13, 1, 17, 1, C)
  c.rect(18, 2, 7, 1, U)
  c.rect(18, 3, 7, 12, S)
  for (const y of [6, 10]) c.rect(18, y, 7, 1, M)
  for (const [x, y0, y1] of [[22, 3, 5], [20, 7, 9], [23, 11, 14]] as const) c.rect(x, y0, 1, y1 - y0 + 1, M)
  c.rect(18, 3, 1, 12, L)
  c.rect(24, 3, 1, 12, D)
  c.rect(17, 15, 9, 1, C)
  c.rect(16, 16, 11, 1, T)
  // warm light of the torch on the stone
  const warm: Record<string, string> = { [S]: '#3a2a38', [L]: '#46333f', [M]: '#2c2130', [D]: '#2a1f2c', [U]: '#2a1d26' }
  for (let y = 2; y <= 9; y++) for (let x = 18; x <= 24; x++) {
    const v = c.get(x, y)
    if (v && warm[v] && (x - TORCH) ** 2 + ((y - 5) * 0.8) ** 2 <= 6.5) c.put(x, y, warm[v]!)
  }
  stamp(c, TORCH - 1, 7, ['.h.', '.h.', 'iii'], { h: '#4f3526', i: '#56505e' })
  stamp(c, 25, 2, [
    'wwwww',
    'ww.w.',
    'w.ww.',
    'www..',
    'w....',
  ], { w: '#433d58' })
  stamp(c, 40, 12, [
    '...bbb...',
    '..bkbkb..',
    '..rbbbR..',
    '.rRRrRRr.',
    'rRRrrRRrr',
  ], { b: '#4c4659', k: '#141120', r: '#211c31', R: '#2e2842' })
  // the flame and its halo flicker; durations divide 3 s
  const extra =
    `<path fill="#ff8c3a" opacity=".1" d="M${TORCH - 2} 1h5v1h-5zM${TORCH - 3} 2h7v5h-7zM${TORCH - 2} 7h5v1h-5z"><animate attributeName="opacity" values=".1;.16;.07;.13;.1" dur=".6s" repeatCount="indefinite"/></path>` +
    `<path fill="#ff7a1c" d="M${TORCH - 1} 5h3v2h-3zM${TORCH} 4h1v1h-1z"/>` +
    `<path fill="#ff7a1c" d="M${TORCH} 3h1v1h-1z"><animate attributeName="opacity" values="1;0;1;1;0" dur=".75s" calcMode="discrete" repeatCount="indefinite"/></path>` +
    `<path fill="#ffd66b" d="M${TORCH} 5h1v2h-1z"><animate attributeName="opacity" values="1;.6;1" dur=".3s" repeatCount="indefinite"/></path>`
  return pack(c, extra)
})()

// ground (18): flagstones with staggered joints, worn edges and a crack
const ground = (() => {
  const c = new Canvas(18, 20)
  const J = '#17131f'
  c.rect(0, 19, 18, 1, '#1f1a2d')
  stamp(c, 0, 17, [
    'J.hh.....J.hhh....',
    '....J..J.....J....',
    '....J...J....J....',
  ], { J, h: '#463c62' })
  return pack(c)
})()

// dust motes drifting up through the torchlight, and three drips from the vault
const motes = (seed: number, n: number) =>
  Array.from({ length: n }, (_, i) => `M${Math.floor(rnd(seed + i * 7) * 190)} ${Math.floor(rnd(seed + i * 13 + 3) * 20)}h1v1h-1z`).join('')
const drip = (x: number, begin: number) =>
  `<rect x="${x}" width="1" height="1" fill="#6f8cc4" opacity="0"><animate attributeName="y" values="0;0;16" keyTimes="0;.7;1" dur="3s" begin="${ahead(begin)}" repeatCount="indefinite"/>` +
  `<animate attributeName="opacity" values="0;.4;.9" keyTimes="0;.3;.6" calcMode="discrete" dur="3s" begin="${ahead(begin)}" repeatCount="indefinite"/></rect>` +
  `<path fill="#6f8cc4" d="M${x - 1} 16h1v1h-1zM${x + 1} 16h1v1h-1z" opacity="0"><animate attributeName="opacity" values=".7;0" keyTimes="0;.08" calcMode="discrete" dur="3s" begin="${ahead(begin)}" repeatCount="indefinite"/></path>`
const ambient =
  `<g opacity=".35"><animateTransform attributeName="transform" type="translate" values="0 0;0 -20" dur="24s" repeatCount="indefinite"/>` +
  `<path id="dungeon-m1" fill="#b4aad8" d="${motes(11, 7)}"><animate attributeName="opacity" values="1;.2;1" dur="6s" repeatCount="indefinite"/></path><use href="#dungeon-m1" y="20"/>` +
  `<path id="dungeon-m2" fill="#d8b48a" d="${motes(57, 5)}"><animate attributeName="opacity" values=".2;1;.2" dur="6s" repeatCount="indefinite"/></path><use href="#dungeon-m2" y="20"/></g>` +
  drip(14, 0) + drip(97, 1.1) + drip(171, 2.2)

export const ART: BiomeArt = {
  id: 'dungeon',
  sky: SKY,
  far,
  mid,
  ground: { base: '#241e34', line: '#382f4f', tile: ground },
  ambient,
  weapon: {
    blade: '#f1f7ff', hilt: '#94a3b8',
    slash: ['#ffffff', '#dbeafe', '#93c5fd', '#3b82f6'],
    spark: ['#ffffff', '#bfdbfe', '#60a5fa'],
    ring: '#e0f2fe', ghost: '#44b7ff',
  },
}
