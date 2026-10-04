// Plateau: a bright sky warming to the horizon, hazy blue mesas, red rock columns, a flowered meadow.
import { Canvas, mix } from '../pixel'
import type { BiomeArt } from '../types'
import { ahead, fillDown, pack, profile, stamp } from './_kit'

const SKY: BiomeArt['sky'] = ['#3b7bd4', '#5893dc', '#7aabe0', '#a3c3dc', '#d8c9a8']

// far (108): a pale back range, and in front two mesas and a butte with lit tops and a stratum
const far = (() => {
  const c = new Canvas(108, 17)
  const BACK = '#a9bdd4'
  const MESA = '#8ba3c2'
  const TOP = '#a5b9d2'
  const BAND = '#7f97b8'
  fillDown(c, profile(108, [[0, 12], [10, 9], [20, 12], [29, 15], [37, 9], [48, 12], [57, 15], [64, 11], [74, 13], [86, 10], [97, 14], [104, 12]]), 16, BACK)
  // mesas: flat top from a to b at row y, a cliff of `cliff` rows, then talus spreading 1.6 columns per row;
  // the face turned away from the sun is shaded
  const mesas: [number, number, number, number][] = [[8, 27, 6, 3], [47, 52, 9, 2], [70, 91, 7, 3]]
  for (const [a, b, y, cliff] of mesas) {
    const out = (r: number) => (r < y + cliff ? 0 : Math.round((r - y - cliff + 1) * 1.6))
    for (let r = y; r <= 16; r++) c.rect(a - out(r), r, b - a + 1 + out(r) * 2, 1, MESA)
    for (let r = y + 1; r <= 16; r++) c.rect(b - 1, r, out(r) + 2, 1, BAND)
    c.rect(a, y, b - a + 1, 1, TOP)
    c.rect(a, y + cliff + 1, b - a + 1, 1, BAND)
  }
  return pack(c)
})()

// mid (54): a red rock column with a cap stone, a low boulder pair, grass tufts at their feet
const mid = (() => {
  const c = new Canvas(54, 17)
  // a little of the sky's haze keeps the rocks behind the sprites
  const haze = (s: string) => mix(s, '#8fb3dc', 0.3)
  const pal = {
    H: haze('#b97a5c'), R: haze('#a1664c'), S: haze('#82503e'), g: haze('#4f8a38'), G: haze('#6aa646'),
  }
  stamp(c, 42, 14, [
    '.G.g.',
    'gGgGg',
    'GgGgG',
  ], pal)
  stamp(c, 8, 6, [
    '.HHRRR..',
    'HHRRRRSS',
    '.SSRSSS.',
    '..HRS...',
    '..HRRS..',
    '.HHRRS..',
    '.HRRRS..',
    '.HRRRSS.',
    'HHRRRRS.',
    'HRRRRRSS',
    'gGHRRSGg',
  ], pal)
  stamp(c, 17, 12, [
    '...HHR.......',
    '..HRRRS..HR..',
    '.HRRRRSSHRRS.',
    'GHRRRRSSRRRSg',
    'gGgRRSgGgRSGg',
  ], pal)
  return pack(c)
})()

// ground (18): grass with a lighter blade here and there, soil specks, two flowers
const ground = (() => {
  const c = new Canvas(18, 20)
  stamp(c, 0, 17, [
    '..Y....l.....P..l.',
    '.d...d.....d....d.',
    '...s.......d..s...',
  ], { Y: '#f2d24c', P: '#ee93b6', l: '#93cf62', d: '#3c7429', s: '#5c4a2c' })
  return pack(c)
})()

// clouds drifting left across the top rows, and a pair of far birds
const cloud = (rows: string[]) =>
  rows.map((r, y) => { const a = r.indexOf('X'); const n = r.lastIndexOf('X') - a + 1; return `M${a} ${y}h${n}v1h-${n}z` }).join('')
const drift = (d: string, y: number, dur: number, begin: number, op: number) =>
  `<g><animateTransform attributeName="transform" type="translate" values="196 ${y};-22 ${y}" dur="${dur}s" begin="${ahead(begin)}" repeatCount="indefinite"/><path fill="#ffffff" opacity="${op}" d="${d}"/></g>`
// a far bird: wings up (v) and down (^), swapped twice a second
const bird = (x: number, y: number, phase: number) =>
  `<path d="M${x} ${y}h1v1h-1zM${x + 2} ${y}h1v1h-1zM${x + 1} ${y + 1}h1v1h-1z"><animate attributeName="opacity" values="1;0" dur=".5s" begin="${ahead(phase)}" calcMode="discrete" repeatCount="indefinite"/></path>` +
  `<path d="M${x} ${y + 1}h1v1h-1zM${x + 1} ${y}h1v1h-1zM${x + 2} ${y + 1}h1v1h-1z" opacity="0"><animate attributeName="opacity" values="0;1" dur=".5s" begin="${ahead(phase)}" calcMode="discrete" repeatCount="indefinite"/></path>`
const ambient =
  drift(cloud(['....XXXX......', '..XXXXXXXXXX..', 'XXXXXXXXXXXXXX']), 0, 48, 6, 0.85) +
  drift(cloud(['..XXX....', 'XXXXXXXX.']), 1, 48, 30, 0.7) +
  drift(cloud(['...XXXXX.....', 'XXXXXXXXXXXXX']), 0, 48, 20, 0.6) +
  `<g fill="#41506b"><animateTransform attributeName="transform" type="translate" values="-8 0;198 0" dur="24s" begin="-5s" repeatCount="indefinite"/>${bird(0, 2, 0)}${bird(5, 3, 0.25)}</g>`

export const ART: BiomeArt = {
  id: 'plateau',
  sky: SKY,
  far,
  mid,
  ground: { base: '#4a8a34', line: '#79b84e', tile: ground },
  ambient,
  weapon: {
    blade: '#fff4d6', hilt: '#b7791f',
    slash: ['#fffbeb', '#fde68a', '#f59e0b', '#b45309'],
    spark: ['#ffffff', '#fde047', '#f59e0b'],
    ring: '#fef3c7', ghost: '#f2b84b',
  },
}
