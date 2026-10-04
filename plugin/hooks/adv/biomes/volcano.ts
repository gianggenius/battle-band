// Volcano: an ash-red sky, a far volcano glowing at the crater, basalt spires, lava seeping through black rock.
import { Canvas, rnd } from '../pixel'
import type { BiomeArt } from '../types'
import { ahead, fillDown, pack, profile, stamp } from './_kit'

const SKY: BiomeArt['sky'] = ['#1a0a0d', '#270e11', '#361214', '#4a1815', '#5f2117']

// far (108): a big cone with a glowing crater, lava threads and a smoke plume; a smaller cone; low ridges
const far = (() => {
  const c = new Canvas(108, 17)
  const CONE = '#2a1315'
  const RIDGE = '#1f0d0f'
  const SMOKE = '#331b1d'
  const LAVA = '#8e2a16'
  const HOT = '#e0581c'
  const CORE = '#ffb347'
  // the crater's glow on the ash above it, then the plume rising and leaning right
  c.disc(60, 3, 2.6, '#3f1715')
  stamp(c, 58, 0, [
    '.......ssss...sssss.',
    '....ssSSSSSssssss...',
    '..sSSSSs............',
    '.sSs................',
  ], { S: SMOKE, s: '#281416' })
  fillDown(c, profile(108, [[0, 14], [15, 10], [18, 8], [20, 8], [23, 10], [34, 15], [40, 16], [42, 16], [57, 4], [62, 4], [82, 16], [96, 15]]), 16, CONE)
  // crater glow and a fountain of sparks
  c.put(59, 4, HOT); c.put(60, 4, CORE); c.put(61, 4, HOT)
  c.put(60, 3, HOT); c.put(59, 2, LAVA); c.put(62, 2, LAVA)
  c.put(19, 8, LAVA)
  // lava threads down the flanks, hot at the rim and cooling below
  const thread = (pts: [number, number][]) => pts.forEach(([x, y], i) => c.put(x, y, i < 2 ? HOT : i < 6 ? LAVA : '#5c1a14'))
  thread([[58, 5], [57, 6], [56, 7], [56, 8], [55, 9], [54, 10], [54, 11], [53, 12], [52, 13], [52, 14]])
  thread([[61, 5], [62, 6], [63, 7], [63, 8], [64, 9], [65, 10], [65, 11]])
  fillDown(c, profile(108, [[0, 15], [8, 13], [18, 15], [30, 13], [44, 16], [70, 14], [78, 12], [90, 15], [100, 14]]), 16, RIDGE)
  return pack(c)
})()

// mid (54): a tall basalt spire and a short one, and a lava stream at their feet that pulses
const mid = (() => {
  const c = new Canvas(54, 17)
  const pal = { E: '#4c2522', B: '#2c191b', K: '#1d1012', r: '#5e1a12', o: '#b8421a' }
  stamp(c, 6, 3, [
    '...E....',
    '..EB....',
    '..EBK...',
    '..EBK.E.',
    '.EBBK.EK',
    '.EBBK.EK',
    '.EBBBKEK',
    'EBBBBKBK',
    'EBBBBKBK',
    'EBBBBBKK',
    'EBBBBBBK',
    'EBBBBBBK',
    'EBBBBBBK',
    'EBBBBBBBK',
  ].map(r => r.padEnd(9, '.')), pal)
  stamp(c, 20, 10, [
    '..E..',
    '.EBK.',
    '.EBK.',
    'EBBK.',
    'EBBBK',
    'EBBBK',
    'EBBBK',
  ], pal)
  stamp(c, 29, 15, [
    '...rrrrr.....',
    'rrroooooorrr.',
  ], pal)
  // the stream pulses: two sets of hot pixels in counter-phase over a faint glow
  const extra =
    `<path fill="#ff7a2a" opacity=".1" d="M31 14h8v2h-8z"><animate attributeName="opacity" values=".1;.18;.1" dur="1.5s" repeatCount="indefinite"/></path>` +
    `<path fill="#ffb347" d="M32 16h2v1h-2zM35 15h1v1h-1zM36 16h1v1h-1z"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"/></path>` +
    `<path fill="#ffb347" d="M34 16h2v1h-2zM34 15h1v1h-1z" opacity=".2"><animate attributeName="opacity" values=".2;1;.2" dur="1s" repeatCount="indefinite"/></path>`
  return pack(c, extra)
})()

// ground (18): black rock with one glowing crack and ash specks
const ground = (() => {
  const c = new Canvas(18, 20)
  stamp(c, 0, 18, [
    '....r.......a.....',
    '.a.rorr.........a.',
  ], { r: '#5e1c12', o: '#d4521a', a: '#2e2224' })
  return pack(c)
})()

// embers rising and fading, ash drifting down
const ember = (x: number, d: number, b: number) =>
  `<rect x="${x}" y="17" width="1" height="1" fill="#ff8a3d" opacity="0"><animate attributeName="y" values="17;3" dur="${d}s" begin="${ahead(b)}" repeatCount="indefinite"/>` +
  `<animate attributeName="opacity" values="0;.9;.6;0" keyTimes="0;.15;.7;1" dur="${d}s" begin="${ahead(b)}" repeatCount="indefinite"/></rect>`
const ash = (seed: number, n: number) =>
  Array.from({ length: n }, (_, i) => `M${Math.floor(rnd(seed + i * 9) * 190)} ${Math.floor(rnd(seed + i * 4 + 1) * 20)}h1v1h-1z`).join('')
const ambient =
  [[12, 3, 0], [57, 4, 1.3], [88, 3, 2.1], [109, 6, 3.7], [151, 4, 0.6], [176, 3, 1.9]].map(([x, d, b]) => ember(x!, d!, b!)).join('') +
  `<g opacity=".5"><animateTransform attributeName="transform" type="translate" values="2 -20;0 0" dur="12s" repeatCount="indefinite"/>` +
  `<path id="volcano-a" fill="#8a7a78" d="${ash(31, 12)}"/><use href="#volcano-a" x="-2" y="20"/></g>`

export const ART: BiomeArt = {
  id: 'volcano',
  sky: SKY,
  far,
  mid,
  ground: { base: '#1f1517', line: '#3a2826', tile: ground },
  ambient,
  weapon: {
    blade: '#fff1e0', hilt: '#7f1d1d',
    slash: ['#fff7d6', '#fdba74', '#f97316', '#c2410c'],
    spark: ['#ffffff', '#fde047', '#f97316'],
    ring: '#ffedd5', ghost: '#ff7a3d',
  },
}
