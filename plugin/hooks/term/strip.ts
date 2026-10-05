// The usage roads for the terminal, as text: two lines of coloured spans, a little knight on each road. The desktop draws them as pixels;
// at one pixel to a cell the labels and the roads would be a smear, and text stays sharp at any width.
import { COLOR, level, read, ROADS } from '../adv/usage'
import type { Limit } from '../../types'

export type Span = { text: string; color?: string; bold?: boolean }

const LABEL = '#e6ebff'
const REST = '#5b5878'
const STONE = '#9aa0b4'

// how long is left in a window: "2h12m", "5d3h", "45m"
export const left = (ms: number): string => {
  const min = Math.max(0, Math.round(ms / 60_000))
  if (min < 1) return '<1m'
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d >= 1) return h ? `${d}d${h}h` : `${d}d`
  if (h >= 1) return m ? `${h}h${m}m` : `${h}h`
  return `${m}m`
}

const rep = (ch: string, n: number) => (n > 0 ? ch.repeat(n) : '')

// One road per line, `columns` cells wide: "5H ━━━━━♞┈┈┈┈┈┈┈┈ ♜ 37% 2h12m". Below 20 columns a line is the label and the number only.
export const stripLines = (limits: Limit[], now: number, columns: number): Span[][] =>
  ROADS.map(road => {
    const r = read(limits, road, now)
    const lv = level(r.pct)
    const color = COLOR[lv]!
    const pct = r.pct === undefined ? undefined : Math.round(r.pct * 10) / 10
    const info = pct === undefined ? 'no data yet' : r.reset ? '0% reset' : `${pct}%${r.left === undefined ? '' : ` ${left(r.left)}`}`
    const end = road.castle ? '♖' : '♜'
    const label: Span = { text: `${road.label} `, color: LABEL, bold: true }
    const tailLen = 3 + info.length // " ♜ " and the numbers
    const width = columns - label.text.length - tailLen
    if (width < 8) return [label, { text: info, color }]
    const at = r.pct === undefined ? 0 : Math.max(0, Math.min(width - 1, Math.round((r.pct / 100) * (width - 1))))
    return [
      label,
      { text: rep('━', at), color },
      { text: '♞', color, bold: true },
      { text: rep('┈', width - 1 - at), color: REST },
      { text: ` ${end} `, color: lv === 2 ? color : STONE, bold: lv === 2 },
      { text: info, color: lv === 3 ? REST : color },
    ]
  })
