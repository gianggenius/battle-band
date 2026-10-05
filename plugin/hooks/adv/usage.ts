// The usage strip: the two rate-limit windows drawn as two roads. A small knight walks each road as the window fills; at the
// end stands a tower (5 hours) or a castle (the week), and arriving there means the tokens are gone.
import { STRIP_H, W } from './consts'
import { sprite, spriteSvg } from './pixel'
import { svgOpen } from './scenery'

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Strip = { source: string; alt: string }
// What the strip adds to a scene: the shapes it defines, the shapes it draws (in the top STRIP_H rows), and what it says in words.
export type StripParts = { defs: string; body: string; alt: string }

const X0 = 11 // where a road starts: after the label and the start flag
const X1 = 177 // where it ends, at the foot of the finish
const LEN = X1 - X0
const ROAD_ROWS = 5 // rows of one road
const ROW_PITCH = ROAD_ROWS + 1 // the second road starts one row below the first one's last

export const ROADS = [
  { kind: 'five_hour', name: 'Giới hạn 5 giờ', label: '5H', windowMs: 5 * 3600_000, castle: false },
  { kind: 'seven_day', name: 'Giới hạn tuần', label: '1W', windowMs: 7 * 24 * 3600_000, castle: true },
] as const

// the road labels, in a small pixel font: 5 columns by 7 rows, each pixel half a unit (only the letters the labels use)
const FONT: Record<string, string[]> = {
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
}
const LABEL = '#e6ebff'
// the pixels of a word as one path, in font pixels (a run per row of each letter, letters one pixel apart)
const wordPath = (text: string): string => {
  let d = ''
  let cx = 0
  for (const ch of text) {
    const g = FONT[ch]!
    g.forEach((row, j) => {
      for (let i = 0; i < row.length; ) {
        if (row[i] !== '#') {
          i++
          continue
        }
        let n = 1
        while (row[i + n] === '#') n++
        d += `M${cx + i} ${j}h${n}v1h-${n}z`
        i += n
      }
    })
    cx += g[0]!.length + 1
  }
  return d
}
// the word at (x, y) in units, half a unit to the pixel, with a dark shadow so it reads on any sky
const word = (text: string, x: number, y: number): string => {
  const d = wordPath(text)
  return `<g transform="translate(${x} ${y}) scale(.5)"><path fill="${DARK}" fill-opacity=".8" transform="translate(1 1)" d="${d}"/><path fill="${LABEL}" d="${d}"/></g>`
}

// the little knight's body is left out of the sprite and drawn in the color of the road's level, which shows on any sky
const PAL = { P: '#e11d48', H: '#cbd5e1', V: '#0f172a', L: '#475569' }
const KNIGHT_A = sprite(['.P.', 'HVH', '...', 'L.L'], PAL)
const KNIGHT_B = sprite(['.P.', 'HVH', '...', '.L.'], PAL)
export const COLOR = ['#4ade80', '#fbbf24', '#f87171', '#6b7280'] // green, amber, red, no data
const DOTS = '#47446a'
const STONE = '#8b8aa8'
const STONE_TOP = '#b4b3d0'
const DARK = '#0d0b16'

export const level = (pct: number | undefined) => (pct === undefined ? 3 : pct < 60 ? 0 : pct < 85 ? 1 : 2)

// "2 giờ 10 phút", "5 ngày 3 giờ", "dưới 1 phút"
export const span = (ms: number): string => {
  const min = Math.max(0, Math.round(ms / 60_000))
  if (min < 1) return 'dưới 1 phút'
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d >= 1) return h ? `${d} ngày ${h} giờ` : `${d} ngày`
  if (h >= 1) return m ? `${h} giờ ${m} phút` : `${h} giờ`
  return `${m} phút`
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const rect = (x: number, y: number, w: number, h: number, fill: string, inner = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${inner ? `>${inner}</rect>` : '/>'}`
const px = (x: number, y: number, fill: string, inner = '') => rect(x, y, 1, 1, fill, inner)
const blink = (values: string[], dur: number) =>
  `<animate attributeName="fill" calcMode="discrete" dur="${dur}s" repeatCount="indefinite" keyTimes="${values.map((_, i) => String(Math.round((i / values.length) * 1000) / 1000).replace(/^0\./, '.')).join(';')}" values="${values.join(';')}"/>`

export type Road = (typeof ROADS)[number]
export type Reading = { pct: number | undefined; elapsed: number | undefined; left: number | undefined; reset: boolean }

export const read = (limits: Limit[], road: Road, now: number): Reading => {
  const l = limits.find(x => x.kind === road.kind)
  if (!l) return { pct: undefined, elapsed: undefined, left: undefined, reset: false }
  const ends = l.resetsAt ? Date.parse(l.resetsAt) : NaN
  const known = Number.isFinite(ends)
  // a window that has already reset: the last reading is old, the road starts over
  if (known && ends <= now) return { pct: 0, elapsed: 0, left: undefined, reset: true }
  return {
    pct: Math.max(0, Math.min(100, l.percentUsed)),
    elapsed: known ? Math.max(0, Math.min(1, 1 - (ends - now) / road.windowMs)) : undefined,
    left: known ? ends - now : undefined,
    reset: false,
  }
}

const tip = (road: Road, r: Reading): string => {
  if (r.pct === undefined) return `${road.name}: chưa có số liệu (hiện sau câu trả lời đầu tiên)`
  if (r.reset) return `${road.name}: đã làm mới, bắt đầu lại từ 0%`
  const used = `${road.name}: đã dùng ${Math.round(r.pct * 10) / 10}%`
  const left = r.left === undefined ? '' : `, làm mới sau ${span(r.left)}`
  return r.pct >= 100 ? `${used}, đã hết${left}` : used + left
}

const drawRoad = (road: Road, r: Reading, y0: number, title: string): string => {
  const lv = level(r.pct)
  const base = lv === 3 ? 0 : r.pct! / 100
  const hx = Math.round(X0 + base * LEN) // the knight's middle
  const line = y0 + 3
  let out = ''
  // the road: walked part solid, the rest dotted
  out += rect(X0, line, Math.max(0, hx - X0), 1, COLOR[lv]!)
  let dots = ''
  for (let x = hx + (hx - X0) % 2; x < X1; x += 2) dots += `M${x} ${line}h1v1h-1z`
  out += `<path fill="${DOTS}" d="${dots}"/>`
  // quarter marks
  for (const f of [0.25, 0.5, 0.75]) {
    const x = Math.round(X0 + f * LEN)
    if (x > hx + 1) out += px(x, line - 1, DOTS)
  }
  // time: how much of the window has passed
  if (r.elapsed !== undefined) {
    const tx = Math.round(X0 + r.elapsed * LEN)
    if (tx > X0) out += rect(X0, y0 + 4, tx - X0, 1, '#35507d')
    out += px(Math.min(X1, tx), y0 + 4, '#bcdcff')
  }
  // the label, and the start flag
  out += word(road.label, 1, y0 + 0.75)
  out += rect(X0 - 3, y0, 1, 4, '#9aa0b4') + rect(X0 - 2, y0, 1, 2, lv === 3 ? COLOR[3]! : '#4ade80')
  // the finish: a tower or a castle; flames when the end is near
  const danger = lv === 2
  const fx = road.castle ? 179 : 181
  const topFlame = (x: number, y: number) => px(x, y, danger ? '#fbbf24' : road.castle ? '#ef4444' : '#7c4a21', danger ? blink(['#fbbf24', '#ef4444', '#fb923c'], 0.6) : '')
  if (road.castle) {
    out += rect(fx, y0, 1, 1, STONE_TOP) + rect(fx + 2, y0, 1, 1, STONE_TOP) + rect(fx + 6, y0, 1, 1, STONE_TOP) + rect(fx + 8, y0, 1, 1, STONE_TOP)
    out += topFlame(fx + 4, y0) + rect(fx, y0 + 1, 9, 1, STONE_TOP) + rect(fx, y0 + 2, 9, 2, STONE) + rect(fx + 3, y0 + 2, 3, 2, DARK)
  } else {
    out += rect(fx, y0 + 1, 1, 1, STONE_TOP) + rect(fx + 2, y0 + 1, 1, 1, STONE_TOP) + rect(fx + 4, y0 + 1, 1, 1, STONE_TOP)
    out += topFlame(fx + 2, y0) + rect(fx, y0 + 2, 5, 1, STONE_TOP) + rect(fx, y0 + 3, 5, 1, STONE) + px(fx + 2, y0 + 3, DARK)
  }
  // the knight on his road, his feet taking turns (shown by opacity: the host drops an animated href)
  const kx = Math.max(X0 - 1, Math.min(X1 - 1, hx - 1))
  const step = (values: string) => `<animate attributeName="opacity" calcMode="discrete" dur="0.8s" repeatCount="indefinite" keyTimes="0;.5" values="${values}"/>`
  out += rect(kx, y0 + 2, 3, 1, COLOR[lv]!)
  out += `<use href="#kA" x="${kx}" y="${y0 + 4}">${step('1;0')}</use><use href="#kB" x="${kx}" y="${y0 + 4}" opacity="0">${step('0;1')}</use>`
  // the whole road answers a hover, not only its thin lines
  const hit = `<rect x="0" y="${y0}" width="${W}" height="${ROAD_ROWS}" fill="#000" fill-opacity="0"/>`
  return `<g><title>${esc(title)}</title>${hit}${out}</g>`
}

export const stripParts = (limits: Limit[], now: number): StripParts => {
  const reads = ROADS.map(rd => read(limits, rd, now))
  const tips = ROADS.map((rd, i) => tip(rd, reads[i]!))
  // the knight sprite hangs from its feet (origin bottom left), so a `<use>`'s y is the row below his last one
  const defs = `<g id="kA">${spriteSvg(KNIGHT_A)}</g><g id="kB">${spriteSvg(KNIGHT_B)}</g>`
  // no plate behind the roads: the scene's sky shows through
  const body = ROADS.map((rd, i) => drawRoad(rd, reads[i]!, i * ROW_PITCH, tips[i]!)).join('')
  return { defs, body, alt: `Hành trình giới hạn: ${tips.join('. ')}` }
}

// the strip on its own, as a picture (for looking at it)
export const buildStrip = (limits: Limit[], now: number): Strip => {
  const p = stripParts(limits, now)
  return { source: svgOpen(W, STRIP_H, DARK) + `<defs>${p.defs}</defs>${p.body}</svg>`, alt: p.alt }
}
