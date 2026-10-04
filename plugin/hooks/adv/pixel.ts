// Pixel helpers shared by the art modules and the timeline builder. No imports from the engine.
import type { Layer, Sprite, Tile } from './types'

export type RGB = [number, number, number]

export const hex = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]
export const toHex = (c: RGB) =>
  '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
export const mix = (a: string, b: string, t: number): string => {
  const x = hex(a)
  const y = hex(b)
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

// A deterministic number in [0, 1) from a seed.
export const rnd = (seed: number) => {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Build a sprite and refuse a malformed one with a message that names the problem.
export const sprite = (rows: string[], pal: Record<string, string>): Sprite => {
  if (rows.length === 0) throw new Error('sprite: no rows')
  const w = rows[0]!.length
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`sprite: row ${i} is ${r.length} wide, row 0 is ${w}`)
    for (const ch of r) {
      if (ch !== '.' && !pal[ch]) throw new Error(`sprite: row ${i} uses '${ch}' which is not in the palette`)
    }
  })
  for (const [k, v] of Object.entries(pal)) {
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) throw new Error(`sprite: palette '${k}' is ${v}, not #rrggbb`)
  }
  return { rows, pal, w, h: rows.length }
}

// Horizontal runs of a pixel set as path data: one `M x y h len v1 h-len z` per run.
export const runsPath = (cells: Set<number>, w: number, h: number): string => {
  if (cells.size === 0) return ''
  const parts: string[] = []
  for (let y = 0; y < h; y++) {
    let x = 0
    while (x < w) {
      if (cells.has(y * w + x)) {
        let len = 1
        while (x + len < w && cells.has(y * w + x + len)) len++
        parts.push(`M${x} ${y}h${len}v1h-${len}z`)
        x += len
      } else x++
    }
  }
  return parts.join('')
}

// A sprite as one path per color. Coordinates are sprite-local with the origin at the bottom left
// (x to the right, y negative upward), so `translate(x, 17)` stands it on the ground.
export const spritePaths = (s: Sprite, color?: string): [string, string][] => {
  const byColor = new Map<string, string[]>()
  s.rows.forEach((row, y) => {
    let x = 0
    while (x < s.w) {
      const ch = row[x]!
      if (ch === '.') {
        x++
        continue
      }
      let len = 1
      while (x + len < s.w && row[x + len] === ch) len++
      const c = color ?? s.pal[ch]!
      let arr = byColor.get(c)
      if (!arr) byColor.set(c, (arr = []))
      arr.push(`M${x} ${y - s.h}h${len}v1h-${len}z`)
      x += len
    }
  })
  return [...byColor].map(([c, d]) => [c, d.join('')])
}

// The shape of a sprite as ONE path with no fill, so a <use fill=...> can color it (flashes, afterimages).
export const spriteMono = (s: Sprite): string => {
  const parts: string[] = []
  s.rows.forEach((row, y) => {
    let x = 0
    while (x < s.w) {
      if (row[x] === '.') {
        x++
        continue
      }
      let len = 1
      while (x + len < s.w && row[x + len] !== '.') len++
      parts.push(`M${x} ${y - s.h}h${len}v1h-${len}z`)
      x += len
    }
  })
  return `<path d="${parts.join('')}"/>`
}

export const spriteSvg = (s: Sprite, color?: string): string =>
  spritePaths(s, color).map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')

// A pixel canvas for drawing tiles by code. Later puts overwrite earlier ones.
export class Canvas {
  readonly w: number
  readonly h: number
  private px: (string | null)[]
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.px = new Array(w * h).fill(null)
  }
  put(x: number, y: number, color: string | null) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.px[y * this.w + x] = color
  }
  // a put that wraps horizontally, so a feature can cross the seam of a repeating tile
  putWrap(x: number, y: number, color: string | null) {
    this.put(((Math.round(x) % this.w) + this.w) % this.w, y, color)
  }
  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.px[y * this.w + x]!
  }
  rect(x: number, y: number, w: number, h: number, color: string | null) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.putWrap(x + i, y + j, color)
  }
  line(x0: number, y0: number, x1: number, y1: number, color: string | null) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5))
    for (let i = 0; i <= n; i++) this.putWrap(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, color)
  }
  disc(cx: number, cy: number, r: number, color: string | null) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.25) this.putWrap(x, y, color)
      }
    }
  }
  // paint a sprite with its top-left corner at (x, y); `flip` mirrors it
  sprite(s: Sprite, x: number, y: number, flip = false) {
    s.rows.forEach((row, j) => {
      for (let i = 0; i < s.w; i++) {
        const ch = row[flip ? s.w - 1 - i : i]!
        if (ch !== '.') this.putWrap(x + i, y + j, s.pal[ch]!)
      }
    })
  }
  // one layer per color, in order of first appearance
  layers(): Layer[] {
    const sets = new Map<string, Set<number>>()
    this.px.forEach((c, i) => {
      if (!c) return
      let s = sets.get(c)
      if (!s) sets.set(c, (s = new Set()))
      s.add(i)
    })
    return [...sets].map(([fill, cells]) => ({ fill, d: runsPath(cells, this.w, this.h) }))
  }
  tile(extra?: string): Tile {
    return { w: this.w, layers: this.layers(), ...(extra ? { extra } : {}) }
  }
}
