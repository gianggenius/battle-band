// Effect stamps: small pixel shapes defined once in <defs> and placed by <use>. Coordinates are stamp-local
// (the anchor is 0,0; x and y may be negative). A stamp is built the first time it is asked for.
import { rnd } from './pixel'
import type { WeaponPalette } from './types'

type Pts = Set<string>
const k = (x: number, y: number) => `${x},${y}`
const add = (s: Pts, x: number, y: number) => s.add(k(Math.round(x), Math.round(y)))

// path data for a set of points: horizontal runs, one `M x y h len v1 h-len z` each
const runs = (s: Pts): string => {
  const rows = new Map<number, number[]>()
  for (const p of s) {
    const [x, y] = p.split(',').map(Number) as [number, number]
    let r = rows.get(y)
    if (!r) rows.set(y, (r = []))
    r.push(x)
  }
  const out: string[] = []
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const xs = rows.get(y)!.sort((a, b) => a - b)
    let i = 0
    while (i < xs.length) {
      let len = 1
      while (i + len < xs.length && xs[i + len] === xs[i]! + len) len++
      out.push(`M${xs[i]} ${y}h${len}v1h-${len}z`)
      i += len
    }
  }
  return out.join('')
}

const line = (s: Pts, x0: number, y0: number, x1: number, y1: number, thick = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    for (let j = 0; j < thick; j++) add(s, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + j - (thick - 1) / 2)
  }
}

// a crescent swept around (0,0) from a0 to a1 (radians, screen angles: y down)
const crescent = (r: number, a0: number, a1: number, tmax: number, grow: number, fade: number, rev: boolean, ox = 0): Pts => {
  const s: Pts = new Set()
  const R = Math.ceil(r + tmax + 2)
  const span = a1 - a0
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x - ox, y)
      let th = Math.atan2(y, x - ox)
      while (th < a0) th += Math.PI * 2
      while (th > a0 + Math.PI * 2) th -= Math.PI * 2
      const u = (th - a0) / span
      if (u < 0 || u > 1 || (rev ? 1 - u : u) > grow) continue
      const thick = tmax * Math.sin(Math.PI * u) * (1 - fade)
      if (Math.abs(d - r) <= thick / 2 + 0.2) add(s, x, y)
    }
  }
  return s
}

export const ARC_AGES = [0, 1, 3, 6] // pixel-time (50 ms units) of the four frames of a slash arc, spark burst and dust
export type ArcKind = 'A' | 'B' | 'C'
const ARCS: Record<ArcKind, { from: number; to: number; r: number; t: number; rev: boolean }> = {
  A: { from: 110, to: -35, r: 18, t: 4, rev: false }, // a downward chop
  B: { from: -60, to: 80, r: 18, t: 4.5, rev: true }, // an upward cut
  C: { from: 160, to: -55, r: 20, t: 8, rev: false }, // the heavy blow
}

export const SWORD_ANGLES = [-60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]
export const nearestAngle = (deg: number) => SWORD_ANGLES.reduce((a, b) => (Math.abs(b - deg) < Math.abs(a - deg) ? b : a))

export class Stamps {
  readonly defs = new Map<string, string>()
  readonly pal: WeaponPalette
  constructor(pal: WeaponPalette) {
    this.pal = pal
  }
  private reg(id: string, build: () => string): string {
    if (!this.defs.has(id)) this.defs.set(id, `<g id="${id}">${build()}</g>`)
    return id
  }
  svg(): string {
    return [...this.defs.values()].join('')
  }

  // the blade with its guard, anchored at the hand
  sword(angle: number): string {
    const a = nearestAngle(angle)
    return this.reg(`sw${a < 0 ? 'm' + -a : a}`, () => {
      const rad = (a * Math.PI) / 180
      const blade: Pts = new Set()
      const hilt: Pts = new Set()
      line(blade, 0, 0, Math.cos(rad) * 16, -Math.sin(rad) * 16, 2)
      line(hilt, 0, 0, Math.cos(rad) * 3, -Math.sin(rad) * 3, 2)
      return `<path fill="${this.pal.blade}" d="${runs(blade)}"/><path fill="${this.pal.hilt}" d="${runs(hilt)}"/>`
    })
  }

  // monochrome: the lane's fill colors it
  arc(kind: ArcKind, frame: number): string {
    return this.reg(`ar${kind}${frame}`, () => {
      const d = ARCS[kind]
      const age = ARC_AGES[frame]!
      const grow = Math.min(1, (age + 1) / 2)
      const fade = Math.max(0, (age - 2) / 4)
      const D2R = Math.PI / 180
      const lo = Math.min(-d.from, -d.to) * D2R
      const hi = Math.max(-d.from, -d.to) * D2R
      const rev = -d.from > -d.to !== d.rev
      let out = `<path d="${runs(crescent(d.r, lo, hi, d.t, grow, fade, rev))}"/>`
      if (kind === 'C' && age < 2) {
        out += `<path fill="${this.pal.slash[2]}" opacity="0.8" d="${runs(crescent(d.r + 4, lo + 0.15, hi - 0.15, 3, grow, Math.min(1, fade + 0.2), rev, -2))}"/>`
      }
      return out
    })
  }

  // monochrome ring of radius r
  ring(r: number): string {
    const rr = Math.max(4, Math.round(r / 4) * 4)
    return this.reg(`rg${rr}`, () => {
      const s: Pts = new Set()
      const n = Math.ceil(rr * 7)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        add(s, Math.cos(a) * rr, Math.sin(a) * rr * 0.9)
      }
      return `<path d="${runs(s)}"/>`
    })
  }

  // a flat ring along the ground for a shock wave, anchored on the ground line
  groundWave(w: number): string {
    const ww = Math.max(3, Math.round(w / 3) * 3)
    return this.reg(`gw${ww}`, () => {
      const s: Pts = new Set()
      const n = Math.ceil(ww * 5)
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (i / n) * Math.PI
        add(s, Math.cos(a) * ww, Math.sin(a) * Math.max(2, ww * 0.28))
      }
      return `<path d="${runs(s)}"/>`
    })
  }

  // a burst of sparks in the palette's three colors; frame 0..4 is the age
  spark(variant: number, frame: number, big = false): string {
    return this.reg(`sp${big ? 'b' : ''}${variant}_${frame}`, () => {
      const n = big ? 16 : 9
      const speed = big ? 5.5 : 3.4
      const life = 6
      const age = ARC_AGES[frame]!
      const layers: Pts[] = [new Set(), new Set(), new Set()]
      for (let i = 0; i < n; i++) {
        if (age > life * 0.6 && rnd(variant * 7 + i * 13 + age) < (age - life * 0.6) / (life * 0.4)) continue
        const ang = rnd(variant * 31 + i) * Math.PI * 2
        const sp = speed * (0.45 + rnd(variant * 17 + i * 3) * 0.75)
        add(layers[i % 3]!, Math.cos(ang) * sp * age, Math.sin(ang) * sp * age * 0.8 + 0.4 * age * age)
      }
      return layers
        .map((l, i) => (l.size ? `<path fill="${this.pal.spark[i]}" d="${runs(l)}"/>` : ''))
        .join('')
    })
  }

  // a damage digit with a dark outline; crit digits are yellow
  digit(ch: string, crit: boolean): string {
    return this.reg(`dg${ch}${crit ? 'y' : 'w'}`, () => {
      const rows = DIGITS[ch]!
      const ink: Pts = new Set()
      rows.forEach((row, y) => [...row].forEach((c, x) => c === '1' && add(ink, x, y)))
      const outline: Pts = new Set()
      for (const p of ink) {
        const [x, y] = p.split(',').map(Number) as [number, number]
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!ink.has(k(x + dx, y + dy))) add(outline, x + dx, y + dy)
      }
      return `<path fill="#2a0a0a" d="${runs(outline)}"/><path fill="${crit ? '#fde047' : '#ffffff'}" d="${runs(ink)}"/>`
    })
  }

  // monochrome dust burst; frame 0..4
  dust(frame: number, big = false): string {
    return this.reg(`du${big ? 'b' : ''}${frame}`, () => {
      const n = big ? 46 : 26
      const reach = big ? 15 : 9
      const s: Pts = new Set()
      const t = (frame + 1) / 5
      for (let i = 0; i < n; i++) {
        if (frame >= 3 && rnd(i * 11 + frame) < (frame - 2) * 0.3) continue
        const ang = rnd(i * 5 + 1) * Math.PI * 2
        const sp = reach * (0.35 + rnd(i * 9 + 2) * 0.65)
        add(s, Math.cos(ang) * sp * t, Math.sin(ang) * sp * t * 0.85 - 2 * t + 1.6 * t * t)
      }
      return `<path d="${runs(s)}"/>`
    })
  }

  // a breath of fire or ice from the mouth at (0,0) to the left, `len` long; two flicker variants, the lane scales the length
  flame(kind: 'fire' | 'ice', variant: number, len: number): string {
    return this.reg(`fl${kind[0]}${variant}`, () => {
      const cols = kind === 'fire' ? ['#ef4a1c', '#ffb02e', '#fff3b0'] : ['#0284c7', '#38bdf8', '#e6f9ff']
      const hmax = 4.5
      const layers: Pts[] = [new Set(), new Set(), new Set()]
      for (let d = 0; d < len; d++) {
        const t = d / Math.max(1, len)
        const hh = 1 + (hmax - 1) * Math.pow(t, 0.7)
        for (let yy = -Math.ceil(hh); yy <= Math.ceil(hh); yy++) {
          const jitter = (rnd(variant * 131 + d * 7 + yy) - 0.5) * 1.4
          const r = Math.abs(yy + jitter * 0.4) / hh
          if (r > 1) continue
          if (rnd(variant * 17 + d + yy * 5) < 0.18 + t * 0.25) continue
          add(layers[r < 0.35 ? 2 : r < 0.7 ? 1 : 0]!, -d, yy + Math.sin((d + variant * 4) / 3) * 0.6)
        }
      }
      return layers.map((l, j) => (l.size ? `<path fill="${cols[j]}" d="${runs(l)}"/>` : '')).join('')
    })
  }

  // an exclamation mark, 2 wide and 6 tall, anchored at its top left
  bang(): string {
    return this.reg('bang', () => {
      const s: Pts = new Set()
      for (let y = 0; y < 5; y++) add(s, 0, y)
      add(s, 0, 6)
      return `<path fill="#ffe14a" d="${runs(s)}"/>`
    })
  }

  // a dashed line along the ground, `len` long, anchored at its left end
  decal(len: number): string {
    const ll = Math.round(len / 4) * 4
    return this.reg(`dc${ll}`, () => {
      const s: Pts = new Set()
      for (let x = 0; x < ll; x += 4) {
        add(s, x, 0)
        add(s, x + 1, 0)
      }
      return `<path fill="#ff5a36" d="${runs(s)}"/>`
    })
  }

  // the guard held in front of the knight's hand
  shield(): string {
    return this.reg('shield', () => {
      const a: Pts = new Set()
      const b: Pts = new Set()
      for (let y = -3; y <= 3; y++) add(a, 1, y)
      add(b, 2, -2)
      add(b, 2, 2)
      return `<path fill="${this.pal.ghost}" d="${runs(a)}"/><path fill="#e0f2fe" d="${runs(b)}"/>`
    })
  }

  // a small flat glow at a monster's mouth before it breathes
  glow(color: string): string {
    return this.reg(`gl${color.slice(1)}`, () => {
      const s: Pts = new Set()
      for (let y = -1; y <= 1; y++) for (let x = 0; x <= 3; x++) add(s, x, y)
      return `<path fill="${color}" d="${runs(s)}"/>`
    })
  }

  // a dark crescent wave sliding along the ground (the Skeleton King's blow)
  wave(frame: number): string {
    return this.reg(`wv${frame}`, () => {
      const t = [3, 4, 5][frame % 3]!
      const d = runs(crescent(6, (100 * Math.PI) / 180, (260 * Math.PI) / 180, t, 1, 0, false, 5))
      return `<path fill="#7c3aed" d="${d}"/><path fill="#c4b5fd" d="${runs(crescent(6, (120 * Math.PI) / 180, (240 * Math.PI) / 180, 1.5, 1, 0, false, 5))}"/>`
    })
  }

  // a falling rock of the Troll's slam
  rock(): string {
    return this.reg('rock', () => {
      const s: Pts = new Set()
      add(s, 0, 0)
      add(s, 1, 0)
      add(s, 0, 1)
      add(s, 1, 1)
      add(s, 2, 1)
      return `<path fill="#a8a29e" d="${runs(s)}"/>`
    })
  }
}

const DIGITS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
}
