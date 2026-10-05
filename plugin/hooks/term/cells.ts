// From the picture's pixels to the terminal's cells. A cell shows two pixels, one above the other: the upper half block in the top pixel's
// colour over the bottom pixel's (a cell of one colour is a plain space, so no seam of the glyph shows).
import { H, STRIP_H, W } from '../adv/consts'

// the action runs from the knight's rest (x 34) to the back of a boss (x 150): this much of the scene must always show
const ACTION_W = 124
const ACTION_MID = 90

export type Fit = {
  columns: number // cells across
  rows: number // cells down
  x0: number // the picture's column the window starts at, in units
  scale: number // cells per unit: 1 shows every pixel, less shrinks the picture
}

// How the scene (W units across, H down, below the usage strip) sits in `columns` by `rows` cells: as it is when there is room, cropped
// around the action when it is narrower than the picture, and shrunk when there is not even room for the action.
export const fitScene = (columns: number, rows: number): Fit => {
  const scale = Math.min(1, columns / ACTION_W, (rows * 2) / H)
  const across = Math.min(W, columns / scale)
  return {
    columns: Math.max(1, Math.min(columns, Math.round(across * scale))),
    rows: Math.max(1, Math.min(rows, Math.ceil((H * scale) / 2))),
    x0: Math.max(0, Math.min(W - across, ACTION_MID - across / 2)),
    scale,
  }
}

// for each output index, the source pixels it covers and how much of each: a box filter of 1 / scale source pixels
const spans = (count: number, from: number, scale: number, last: number): { i: number; w: number }[][] =>
  Array.from({ length: count }, (_, n) => {
    const a = from + n / scale
    const b = from + (n + 1) / scale
    const out: { i: number; w: number }[] = []
    for (let i = Math.floor(a); i < Math.ceil(b); i++) {
      const w = Math.min(b, i + 1) - Math.max(a, i)
      if (w > 1e-9) out.push({ i: Math.min(last, i), w })
    }
    return out
  })

// the colour of each pixel of the fitted scene, as 0x00RRGGBB, `fit.columns` by `2 * fit.rows`
export const fitted = (rgb: Uint8ClampedArray, width: number, height: number, fit: Fit): Uint32Array => {
  const xs = spans(fit.columns, fit.x0, fit.scale, width - 1)
  const ys = spans(fit.rows * 2, STRIP_H, fit.scale, height - 1)
  const out = new Uint32Array(fit.columns * fit.rows * 2)
  for (let y = 0; y < ys.length; y++) {
    for (let x = 0; x < xs.length; x++) {
      let r = 0
      let g = 0
      let b = 0
      let sum = 0
      for (const sy of ys[y]!) {
        for (const sx of xs[x]!) {
          const k = (sy.i * width + sx.i) * 3
          const w = sy.w * sx.w
          r += rgb[k]! * w
          g += rgb[k + 1]! * w
          b += rgb[k + 2]! * w
          sum += w
        }
      }
      out[y * fit.columns + x] = ((Math.round(r / sum) << 16) | (Math.round(g / sum) << 8) | Math.round(b / sum)) >>> 0
    }
  }
  return out
}

const HALF = 0x2580
const SPACE = 0x20

// the cells of a fitted scene: row-major `[code point, foreground, background]` words
export const toCells = (pixels: Uint32Array, fit: Fit): Uint32Array => {
  const words = new Uint32Array(fit.columns * fit.rows * 3)
  for (let row = 0; row < fit.rows; row++) {
    for (let c = 0; c < fit.columns; c++) {
      const top = pixels[2 * row * fit.columns + c]!
      const bottom = pixels[(2 * row + 1) * fit.columns + c]!
      const i = (row * fit.columns + c) * 3
      words[i] = top === bottom ? SPACE : HALF
      words[i + 1] = top
      words[i + 2] = bottom
    }
  }
  return words
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

// standard padded base64 of the words' bytes (little-endian, as the Raster takes them)
export const base64 = (words: Uint32Array): string => {
  const bytes = new Uint8Array(words.buffer, words.byteOffset, words.byteLength)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    out += B64[a >> 2]! + B64[((a & 3) << 4) | (b >> 4)]!
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)]! : '='
    out += i + 2 < bytes.length ? B64[c & 63]! : '='
  }
  return out
}

// how many different (foreground, background) pairs the cells use: the terminal paints 1024 at once and the rest as their nearest
export const pairCount = (words: Uint32Array): number => {
  const seen = new Set<number>()
  for (let i = 0; i < words.length; i += 3) seen.add(words[i + 1]! * 16777216 + words[i + 2]!)
  return seen.size
}
