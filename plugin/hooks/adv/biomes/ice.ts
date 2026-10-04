// Ice: a pale sky with a faint aurora, snowy peaks, snow-laden pines and ice crystals, glittering snow.
import { Canvas, rnd } from '../pixel'
import type { BiomeArt } from '../types'
import { ahead, fillDown, over, pack, profile, stamp } from './_kit'

const SKY: BiomeArt['sky'] = ['#5b8cc6', '#79a6d6', '#9bc0e3', '#bdd8ed', '#ddedf6']

// far (108): an aurora ribbon high up (blended into the sky), a pale back range, sharp snowy peaks in front
const far = (() => {
  const c = new Canvas(108, 17)
  const AUR = '#7ff0c8'
  for (let x = 0; x < 108; x++) {
    const y = Math.round(2.2 + 1.6 * Math.sin((x / 108) * Math.PI * 4 + 0.6))
    c.put(x, y, over(SKY, y, AUR, 0.42))
    c.put(x, y - 1, over(SKY, y - 1, AUR, 0.2))
  }
  fillDown(c, profile(108, [[0, 11], [9, 8], [19, 11], [31, 9], [44, 12], [55, 7], [66, 11], [80, 9], [93, 12], [101, 10]]), 16, '#c3d5e6')
  // peaks: [cx, top]; slopes of one row per column on the left, a little steeper on the right
  const peaks: [number, number][] = [[14, 5], [40, 8], [61, 4], [88, 6]]
  const LIT = '#a9c2da'
  const SHADE = '#8eaac6'
  const SNOW = '#eff7fb'
  const SNOW2 = '#cfe0ee'
  for (const [cx, top] of peaks) {
    for (let dx = -14; dx <= 14; dx++) {
      const t = top + Math.round(dx < 0 ? -dx * 0.9 : dx * 1.1)
      if (t > 16) continue
      const snow = top + 2 + Math.round(rnd(cx * 31 + dx) * 1.6) + (Math.abs(dx) < 2 ? 1 : 0)
      for (let y = t; y <= 16; y++) {
        const col = y <= snow ? (dx <= 0 ? SNOW : SNOW2) : dx <= 0 ? LIT : SHADE
        c.putWrap(cx + dx, y, col)
      }
    }
  }
  return pack(c)
})()

// mid (54): a tall snowy pine with a small one beside it, and a cluster of ice crystals
const mid = (() => {
  const c = new Canvas(54, 17)
  const pal = { W: '#e6f2f8', w: '#b9d2e2', N: '#4b7c80', D: '#3a6467', T: '#5b4b4a' }
  const PINE = [
    '....W....',
    '...WWN...',
    '..WWNND..',
    '..NNNDD..',
    '...WWN...',
    '..WWWNN..',
    '.WWNNNDD.',
    '.NNNNDDD.',
    '..WWWNN..',
    '.WWWNNNDD',
    'WWNNNNDDD',
    'NNNNNDDDD',
    '....T....',
  ]
  stamp(c, 6, 4, PINE, pal)
  stamp(c, 16, 9, [
    '...W...',
    '..WWN..',
    '.WWNND.',
    '.NNNDD.',
    '.WWWNN.',
    'WWNNNDD',
    'NNNNDDD',
    '...T...',
  ], pal)
  stamp(c, 2, 15, ['wWWWWwwWW..wWWWWww', 'WWWWWWWWWWWWWWWWWW'], pal)
  stamp(c, 37, 9, [
    '.....L...',
    '....LLC..',
    '....LLC..',
    '.L..LLC..',
    '.LC.LLCL.',
    'LLC.LLCLC',
    'LLCDLLCLC',
    'wWWWWWWWw',
  ], { L: '#c4ebf7', C: '#85c6e0', D: '#5d9cc0', W: '#e6f2f8', w: '#b9d2e2' })
  // a glint on the tall crystal, once every 3 s
  const extra = `<path fill="#ffffff" d="M42 10h1v1h-1z" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.8;.87;1" dur="3s" begin="-0.7s" repeatCount="indefinite"/></path>`
  return pack(c, extra)
})()

// ground (18): packed snow with a blue ice patch, soft shadows and a glint
const ground = (() => {
  const c = new Canvas(18, 20)
  stamp(c, 0, 17, [
    '..........s.......',
    '.s..IIII.....+..s.',
    '...IIIIII...s.....',
  ], { I: '#a6c9df', s: '#b3cee0', '+': '#ffffff' })
  return pack(c)
})()

// snowfall: two sheets falling and drifting right, each with a copy one sheet above for a seamless loop;
// glints twinkling on the snow
const flakes = (seed: number, n: number) =>
  Array.from({ length: n }, (_, i) => `M${Math.floor(rnd(seed + i * 5) * 190)} ${Math.floor(rnd(seed + i * 11 + 2) * 20)}h1v1h-1z`).join('')
const sheet = (id: string, seed: number, n: number, dur: number, op: number, dx: number) =>
  `<g opacity="${op}"><animateTransform attributeName="transform" type="translate" values="-${dx} -20;0 0" dur="${dur}s" repeatCount="indefinite"/>` +
  `<path id="${id}" fill="#ffffff" d="${flakes(seed, n)}"/><use href="#${id}" x="${dx}" y="20"/></g>`
const glint = (x: number, y: number, begin: number) =>
  `<path fill="#ffffff" d="M${x} ${y}h1v1h-1z" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.75;.85;1" dur="3s" begin="${ahead(begin)}" repeatCount="indefinite"/></path>`
const ambient =
  sheet('ice-s1', 5, 12, 12, 0.55, 3) + sheet('ice-s2', 77, 14, 6, 0.9, 4) +
  glint(58, 18, 0) + glint(97, 19, 1.4) + glint(162, 18, 2.3)

export const ART: BiomeArt = {
  id: 'ice',
  sky: SKY,
  far,
  mid,
  ground: { base: '#c8dbe9', line: '#f2f8fc', tile: ground },
  ambient,
  weapon: {
    blade: '#ecfeff', hilt: '#3b82c4',
    // deeper than the pale backdrop, so the arc and the afterimage still read on snow
    slash: ['#ffffff', '#67e8f9', '#06b6d4', '#0e7490'],
    spark: ['#ffffff', '#a5f3fc', '#06b6d4'],
    ring: '#22d3ee', ghost: '#38bdf8',
  },
}
