// Shared helpers for the biome art: stacked layer packing, wrap-aware profiles and sky blending.
import { Canvas, mix } from '../pixel'
import type { BiomeArt, Layer, Tile } from '../types'

const runLen = (x: number, y: number, n: number) => `M${x} ${y}h${n}v1h-${n}z`.length

// Repack a finished canvas into stacked layers, one per color. A layer may run under pixels of the
// colors painted after it, so a base color spans its detail holes in one run instead of many.
// The visible pixels are identical; the paint order is the one with the least path data (exact DP
// over color subsets). Every layer is still built by Canvas.layers(), so `d` stays in run form.
export const pack = (c: Canvas, extra?: string): Tile => {
  const { w, h } = c
  const colors: string[] = []
  const idx: number[] = new Array(w * h).fill(-1)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = c.get(x, y)
      if (!v) continue
      let k = colors.indexOf(v)
      if (k < 0) k = colors.push(v) - 1
      idx[y * w + x] = k
    }
  }
  const n = colors.length
  // runs of color k when it may bridge over the colors in mask `under` (painted later)
  const runs = (k: number, under: number) => {
    const out: [number, number, number][] = []
    for (let y = 0; y < h; y++) {
      let x = 0
      while (x < w) {
        const i = idx[y * w + x]!
        if (i < 0 || (i !== k && !(under & (1 << i)))) { x++; continue }
        let first = -1
        let last = -1
        while (x < w) {
          const j = idx[y * w + x]!
          if (j < 0 || (j !== k && !(under & (1 << j)))) break
          if (j === k) { if (first < 0) first = x; last = x }
          x++
        }
        if (first >= 0) out.push([first, y, last - first + 1])
      }
    }
    return out
  }
  const cost = (k: number, under: number) => runs(k, under).reduce((s, [x, y, l]) => s + runLen(x, y, l), 0)
  const full = (1 << n) - 1
  const order: number[] = []
  if (n <= 10) {
    const best = new Array<number>(1 << n).fill(Infinity)
    const pick = new Array<number>(1 << n).fill(-1)
    best[0] = 0
    for (let m = 1; m <= full; m++) {
      for (let k = 0; k < n; k++) {
        if (!(m & (1 << k))) continue
        const rest = m & ~(1 << k)
        const v = cost(k, rest) + best[rest]!
        if (v < best[m]!) { best[m] = v; pick[m] = k }
      }
    }
    for (let m = full; m; m &= ~(1 << pick[m]!)) order.push(pick[m]!)
  } else {
    // too many colors for the exact search: greedily put the color that saves the most at the bottom
    let m = full
    while (m) {
      let bk = -1
      let bs = -Infinity
      for (let k = 0; k < n; k++) {
        if (!(m & (1 << k))) continue
        const s = cost(k, 0) - cost(k, m & ~(1 << k))
        if (s > bs) { bs = s; bk = k }
      }
      order.push(bk)
      m &= ~(1 << bk)
    }
  }
  const layers: Layer[] = []
  let m = full
  for (const k of order) {
    const rest = m & ~(1 << k)
    const one = new Canvas(w, h)
    for (const [x, y, l] of runs(k, rest)) for (let i = 0; i < l; i++) one.put(x + i, y, colors[k]!)
    layers.push(...one.layers())
    m = rest
  }
  return { w, layers, ...(extra ? { extra } : {}) }
}

// A wrap-aware piecewise linear profile: points [x, y] (any x, sorted or not) -> y for every column.
export const profile = (w: number, pts: [number, number][]): number[] => {
  const p = pts.map(([x, y]) => [((x % w) + w) % w, y] as [number, number]).sort((a, b) => a[0] - b[0])
  const out: number[] = []
  for (let x = 0; x < w; x++) {
    let i = p.findIndex(q => q[0] > x)
    if (i < 0) i = p.length
    const a = i === 0 ? [p[p.length - 1]![0] - w, p[p.length - 1]![1]] : p[i - 1]!
    const b = i === p.length ? [p[0]![0] + w, p[0]![1]] : p[i]!
    const t = b[0] === a[0] ? 0 : (x - a[0]!) / (b[0]! - a[0]!)
    out.push(Math.round(a[1]! + (b[1]! - a[1]!) * t))
  }
  return out
}

// Fill each column x from top[x] down to `bottom` (inclusive).
export const fillDown = (c: Canvas, top: number[], bottom: number, color: string) => {
  top.forEach((t, x) => { for (let y = t; y <= bottom; y++) c.putWrap(x, y, color) })
}

// The sky band of row y (five bands over rows 0..16), and a color seen through `a` of `col` over it.
export const bandOf = (y: number) => Math.max(0, Math.min(4, Math.floor((y / 17) * 5)))
export const over = (sky: BiomeArt['sky'], y: number, col: string, a: number) => mix(sky[bandOf(y)]!, col, a)

// A SMIL begin that starts `s` seconds into the loop.
export const ahead = (s: number) => (s ? `-${s}s` : '0s')

// Paint rows of characters (top-left at x, y, wrapping), '.' leaves the canvas untouched, a key mapped
// to null erases.
export const stamp = (c: Canvas, x: number, y: number, rows: string[], pal: Record<string, string | null>) => {
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i]!
      if (ch === '.') continue
      if (!(ch in pal)) throw new Error(`stamp: '${ch}' is not in the palette`)
      c.putWrap(x + i, y + j, pal[ch]!)
    }
  })
}
