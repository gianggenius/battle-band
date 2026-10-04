import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { hex } from '../plugin/hooks/adv/pixel'
import type { Layer, Sprite } from '../plugin/hooks/adv/types'

export type Img = { w: number; h: number; px: Uint8Array }
export const img = (w: number, h: number, bg = '#202024'): Img => {
  const px = new Uint8Array(w * h * 3)
  const c = hex(bg)
  for (let i = 0; i < w * h; i++) px.set(c, i * 3)
  return { w, h, px }
}
export const put = (im: Img, x: number, y: number, color: string, alpha = 1) => {
  x = Math.round(x)
  y = Math.round(y)
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return
  const c = hex(color)
  const i = (y * im.w + x) * 3
  for (let k = 0; k < 3; k++) im.px[i + k] = Math.round(im.px[i + k]! * (1 - alpha) + c[k]! * alpha)
}
export const blit = (im: Img, s: Sprite, x: number, y: number, flip = false) => {
  s.rows.forEach((row, j) => {
    for (let i = 0; i < s.w; i++) {
      const ch = row[flip ? s.w - 1 - i : i]!
      if (ch !== '.') put(im, x + i, y + j, s.pal[ch]!)
    }
  })
}
// paint the run-form path data of a layer at an offset (the only form tiles may use)
export const paintLayer = (im: Img, l: Layer, ox: number, oy: number) => {
  const re = /M(-?\d+) (-?\d+)h(\d+)v1h-\d+z/g
  let m: RegExpExecArray | null
  while ((m = re.exec(l.d))) {
    const x = Number(m[1])
    const y = Number(m[2])
    const len = Number(m[3])
    for (let i = 0; i < len; i++) put(im, ox + x + i, oy + y, l.fill, l.opacity ?? 1)
  }
}
export const savePng = (im: Img, path: string, scale: number) => {
  mkdirSync(dirname(path), { recursive: true })
  const ppm = path + '.ppm'
  writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${im.w} ${im.h}\n255\n`), Buffer.from(im.px)]))
  execFileSync('magick', [ppm, '-filter', 'point', '-scale', `${scale * 100}%`, path])
  execFileSync('rm', ['-f', ppm])
}
