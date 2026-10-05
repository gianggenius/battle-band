// A small rasterizer for the pictures the band draws: the SVG subset they use, with its SMIL animation, drawn into an RGB buffer at any
// moment of its timeline. The terminal band paints from it (the desktop draws the same picture with the app's own SVG engine and never
// loads this).
//
// Supported: svg, defs, g, use (href, x, y), path (runs of `M x y h w v h h -w z`), rect; transform translate, scale, skewX, rotate and
// matrix; opacity, fill-opacity and fill (inherited); animate on opacity, x, y and fill; animateTransform of translate, scale and
// skewX; calcMode discrete, linear and spline; keyTimes, keySplines, from and to; begin as an offset; repeatCount indefinite; fill freeze.
// Not supported: strokes, gradients, filters, text and clipping. A group's opacity is not a compositing group: each shape takes the
// product of the opacities above it, which is the same wherever the shapes of a group do not overlap.

export type Scene = {
  width: number
  height: number
  // the picture at `t` seconds, as width * height RGB bytes; the same array is reused by the next call
  frame: (t: number) => Uint8ClampedArray
}

type Rgb = [number, number, number]
type Mat = { a: number; b: number; c: number; d: number; e: number; f: number }

type Anim = {
  mode: 'discrete' | 'linear' | 'spline'
  dur: number
  begin: number
  repeat: boolean
  freeze: boolean
  times: number[]
  values: number[][]
  splines?: number[][]
  kind?: string // the transform type of an animateTransform
}

type El = {
  tag: string
  a: Record<string, string>
  kids: El[]
  anims: Record<string, Anim> // by the attribute they drive
  mat?: Mat // the static transform
  runs?: number[] // a path as [x, y, w, h, ...]
  rgb?: Rgb // the static fill
  op?: number
  fop?: number
}

const IDENTITY: Mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

const mul = (p: Mat, l: Mat): Mat => ({
  a: p.a * l.a + p.c * l.b,
  b: p.b * l.a + p.d * l.b,
  c: p.a * l.c + p.c * l.d,
  d: p.b * l.c + p.d * l.d,
  e: p.a * l.e + p.c * l.f + p.e,
  f: p.b * l.e + p.d * l.f + p.f,
})

const nums = (s: string): number[] => (s.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number)

const transformOf = (kind: string, v: number[]): Mat => {
  if (kind === 'translate') return { ...IDENTITY, e: v[0] ?? 0, f: v[1] ?? 0 }
  if (kind === 'scale') return { ...IDENTITY, a: v[0] ?? 1, d: v[1] ?? v[0] ?? 1 }
  if (kind === 'skewX') return { ...IDENTITY, c: Math.tan(((v[0] ?? 0) * Math.PI) / 180) }
  if (kind === 'skewY') return { ...IDENTITY, b: Math.tan(((v[0] ?? 0) * Math.PI) / 180) }
  if (kind === 'rotate') {
    const r = ((v[0] ?? 0) * Math.PI) / 180
    const rot = { a: Math.cos(r), b: Math.sin(r), c: -Math.sin(r), d: Math.cos(r), e: 0, f: 0 }
    return v.length >= 3 ? mul(mul({ ...IDENTITY, e: v[1]!, f: v[2]! }, rot), { ...IDENTITY, e: -v[1]!, f: -v[2]! }) : rot
  }
  if (kind === 'matrix') return { a: v[0] ?? 1, b: v[1] ?? 0, c: v[2] ?? 0, d: v[3] ?? 1, e: v[4] ?? 0, f: v[5] ?? 0 }
  return IDENTITY
}

// a transform attribute, its functions applied left to right
const parseTransform = (s: string): Mat => {
  let m = IDENTITY
  for (const f of s.matchAll(/([a-zA-Z]+)\(([^)]*)\)/g)) m = mul(m, transformOf(f[1]!, nums(f[2]!)))
  return m
}

const parseColor = (s: string): Rgb | undefined => {
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim())
  if (!h) return undefined
  const x = h[1]!.length === 3 ? [...h[1]!].map(c => c + c).join('') : h[1]!
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]
}

const clock = (s: string | undefined): number => (s === undefined ? 0 : s.trim().endsWith('ms') ? parseFloat(s) / 1000 : parseFloat(s))

const parseAnim = (tag: string, a: Record<string, string>): { attr: string; an: Anim } | undefined => {
  const attr = a.attributeName
  if (!attr) return undefined
  const kind = tag === 'animateTransform' ? (a.type ?? 'translate') : undefined
  const rawValues = a.values !== undefined ? a.values.split(';').map(s => s.trim()) : a.from !== undefined && a.to !== undefined ? [a.from, a.to] : []
  if (rawValues.length === 0) return undefined
  const values = rawValues.map(v => (attr === 'fill' ? (parseColor(v) ?? [0, 0, 0]) : nums(v)))
  const mode = a.calcMode === 'discrete' || a.calcMode === 'spline' ? a.calcMode : 'linear'
  const n = values.length
  const times = a.keyTimes ? a.keyTimes.split(';').map(Number) : values.map((_, i) => (mode === 'discrete' ? i / n : n === 1 ? 0 : i / (n - 1)))
  const splines = a.keySplines ? a.keySplines.split(';').map(s => nums(s)) : undefined
  const dur = clock(a.dur)
  if (!(dur > 0) || times.length !== n) return undefined
  return { attr: attr === 'transform' ? 'transform' : attr, an: { mode, dur, begin: clock(a.begin), repeat: a.repeatCount === 'indefinite', freeze: a.fill === 'freeze', times, values, splines, kind } }
}

// y of the cubic Bezier through (0,0), (x1,y1), (x2,y2), (1,1) at the x given: the easing of one keySplines segment
const bezier = (s: number[], x: number): number => {
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = s
  const at = (t: number, p1: number, p2: number) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (at(mid, x1, x2) < x) lo = mid
    else hi = mid
  }
  return at((lo + hi) / 2, y1, y2)
}

// the value an animation gives at `t`, or undefined while it is not in effect
const sample = (an: Anim, t: number): number[] | undefined => {
  const lt = t - an.begin
  if (lt < 0) return undefined
  let u: number
  if (an.repeat) u = (lt / an.dur) % 1
  else if (lt >= an.dur) {
    if (!an.freeze) return undefined
    u = 1
  } else u = lt / an.dur
  const T = an.times
  let lo = 0
  let hi = T.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (T[mid]! <= u) lo = mid
    else hi = mid - 1
  }
  const i = lo
  const v = an.values[i]!
  if (an.mode === 'discrete' || i >= T.length - 1) return v
  const span = T[i + 1]! - T[i]!
  let f = span > 0 ? (u - T[i]!) / span : 0
  if (an.mode === 'spline' && an.splines?.[i]) f = bezier(an.splines[i]!, f)
  const w = an.values[i + 1]!
  return v.map((x, k) => x + ((w[k] ?? x) - x) * f)
}

// a path made of rectangles, as [x, y, w, h, ...]: `M x y h w v h h -w z`, relative moves only
const parseRuns = (d: string): number[] => {
  const runs: number[] = []
  for (const m of d.matchAll(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*h\s*(-?[\d.]+)\s*v\s*(-?[\d.]+)\s*h\s*(-?[\d.]+)\s*z/g)) {
    const x = Number(m[1])
    const y = Number(m[2])
    const w = Number(m[3])
    const h = Number(m[4])
    runs.push(Math.min(x, x + w), Math.min(y, y + h), Math.abs(w), Math.abs(h))
  }
  return runs
}

const TAG = /<(\/?)([A-Za-z][A-Za-z0-9]*)((?:\s+[A-Za-z:-]+="[^"]*")*)\s*(\/?)>/g
const ATTR = /([A-Za-z:-]+)="([^"]*)"/g

const parseTree = (svg: string): El => {
  const root: El = { tag: '#root', a: {}, kids: [], anims: {} }
  const stack = [root]
  for (const m of svg.matchAll(TAG)) {
    const [, closing, tag, attrs, selfClosing] = m
    if (closing) {
      if (stack.length > 1) stack.pop()
      continue
    }
    const a: Record<string, string> = {}
    for (const p of attrs!.matchAll(ATTR)) a[p[1]!] = p[2]!
    const parent = stack[stack.length - 1]!
    if (tag === 'animate' || tag === 'animateTransform') {
      const an = parseAnim(tag, a)
      if (an) parent.anims[an.attr] = an.an
    } else {
      const el: El = { tag: tag!, a, kids: [], anims: {} }
      if (a.transform) el.mat = parseTransform(a.transform)
      if (a.fill) el.rgb = parseColor(a.fill)
      if (a.opacity !== undefined) el.op = Number(a.opacity)
      if (a['fill-opacity'] !== undefined) el.fop = Number(a['fill-opacity'])
      if (tag === 'path' && a.d) el.runs = parseRuns(a.d)
      parent.kids.push(el)
      if (!selfClosing) stack.push(el)
    }
  }
  return root
}

type Ctx = { m: Mat; op: number; fill: Rgb }

export const parseScene = (svg: string): Scene => {
  const tree = parseTree(svg)
  const svgEl = tree.kids.find(k => k.tag === 'svg')
  if (!svgEl) throw new Error('no svg element')
  const box = nums(svgEl.a.viewBox ?? '0 0 100 100')
  const width = Math.round(box[2] ?? 100)
  const height = Math.round(box[3] ?? 100)
  const bgText = /background\s*:\s*(#[0-9a-fA-F]{3,6})/.exec(svgEl.a.style ?? '')?.[1]
  const bg = (bgText ? parseColor(bgText) : undefined) ?? [0, 0, 0]
  const ids = new Map<string, El>()
  const index = (el: El) => {
    if (el.a.id) ids.set(el.a.id, el)
    el.kids.forEach(index)
  }
  index(svgEl)

  const buf = new Float32Array(width * height * 3)
  const out = new Uint8ClampedArray(width * height * 3)

  const blend = (i: number, j: number, c: Rgb, alpha: number) => {
    const o = (j * width + i) * 3
    if (alpha >= 1) {
      buf[o] = c[0]
      buf[o + 1] = c[1]
      buf[o + 2] = c[2]
    } else {
      buf[o] = buf[o]! + (c[0] - buf[o]!) * alpha
      buf[o + 1] = buf[o + 1]! + (c[1] - buf[o + 1]!) * alpha
      buf[o + 2] = buf[o + 2]! + (c[2] - buf[o + 2]!) * alpha
    }
  }

  // a unit rectangle through the matrix; a pixel is covered when its centre is inside
  const rect = (m: Mat, x: number, y: number, w: number, h: number, c: Rgb, alpha: number) => {
    if (m.b === 0 && m.c === 0) {
      let x0 = m.a * x + m.e
      let x1 = m.a * (x + w) + m.e
      let y0 = m.d * y + m.f
      let y1 = m.d * (y + h) + m.f
      if (x1 < x0) [x0, x1] = [x1, x0]
      if (y1 < y0) [y0, y1] = [y1, y0]
      const i1 = Math.min(width, Math.ceil(x1 - 0.5))
      const j1 = Math.min(height, Math.ceil(y1 - 0.5))
      for (let j = Math.max(0, Math.ceil(y0 - 0.5)); j < j1; j++) for (let i = Math.max(0, Math.ceil(x0 - 0.5)); i < i1; i++) blend(i, j, c, alpha)
      return
    }
    const det = m.a * m.d - m.b * m.c
    if (Math.abs(det) < 1e-9) return
    const xs = [m.a * x + m.c * y + m.e, m.a * (x + w) + m.c * y + m.e, m.a * x + m.c * (y + h) + m.e, m.a * (x + w) + m.c * (y + h) + m.e]
    const ys = [m.b * x + m.d * y + m.f, m.b * (x + w) + m.d * y + m.f, m.b * x + m.d * (y + h) + m.f, m.b * (x + w) + m.d * (y + h) + m.f]
    const j1 = Math.min(height, Math.ceil(Math.max(...ys) - 0.5))
    const i1 = Math.min(width, Math.ceil(Math.max(...xs) - 0.5))
    for (let j = Math.max(0, Math.ceil(Math.min(...ys) - 0.5)); j < j1; j++) {
      for (let i = Math.max(0, Math.ceil(Math.min(...xs) - 0.5)); i < i1; i++) {
        const px = i + 0.5 - m.e
        const py = j + 0.5 - m.f
        const lx = (m.d * px - m.c * py) / det
        const ly = (m.a * py - m.b * px) / det
        if (lx >= x && lx < x + w && ly >= y && ly < y + h) blend(i, j, c, alpha)
      }
    }
  }

  const num = (el: El, attr: string, t: number, fallback: number): number => {
    const an = el.anims[attr]
    const v = an ? sample(an, t) : undefined
    return v ? v[0]! : el.a[attr] !== undefined ? Number(el.a[attr]) : fallback
  }

  const draw = (el: El, ctx: Ctx, t: number) => {
    if (el.tag === 'defs' || el.tag === 'title') return
    const ao = el.anims.opacity
    const so = ao ? sample(ao, t) : undefined
    const op = ctx.op * (so ? so[0]! : (el.op ?? 1))
    if (!(op > 0)) return
    const af = el.anims.fill
    const sf = af ? sample(af, t) : undefined
    const fill: Rgb = sf ? [sf[0]!, sf[1]!, sf[2]!] : (el.rgb ?? ctx.fill)
    let m = ctx.m
    const at = el.anims.transform
    const st = at ? sample(at, t) : undefined
    const local = st ? transformOf(at!.kind ?? 'translate', st) : el.mat
    if (local) m = mul(m, local)

    if (el.tag === 'rect') {
      const alpha = op * (el.fop ?? 1)
      if (alpha > 0) rect(m, num(el, 'x', t, 0), num(el, 'y', t, 0), Number(el.a.width ?? 0), Number(el.a.height ?? 0), fill, alpha)
    } else if (el.tag === 'path') {
      const alpha = op * (el.fop ?? 1)
      if (alpha > 0 && el.runs) for (let k = 0; k < el.runs.length; k += 4) rect(m, el.runs[k]!, el.runs[k + 1]!, el.runs[k + 2]!, el.runs[k + 3]!, fill, alpha)
    } else if (el.tag === 'use') {
      const target = ids.get((el.a.href ?? el.a['xlink:href'] ?? '').replace(/^#/, ''))
      if (!target) return
      const x = num(el, 'x', t, 0)
      const y = num(el, 'y', t, 0)
      if (x !== 0 || y !== 0) m = mul(m, { ...IDENTITY, e: x, f: y })
      draw(target, { m, op, fill }, t)
    } else {
      for (const k of el.kids) draw(k, { m, op, fill }, t)
    }
  }

  return {
    width,
    height,
    frame: (t: number) => {
      for (let i = 0; i < buf.length; i += 3) {
        buf[i] = bg[0]
        buf[i + 1] = bg[1]
        buf[i + 2] = bg[2]
      }
      for (const k of svgEl.kids) draw(k, { m: IDENTITY, op: 1, fill: [0, 0, 0] }, t)
      for (let i = 0; i < buf.length; i++) out[i] = buf[i]!
      return out
    },
  }
}
