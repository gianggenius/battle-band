// Compiles keyframe tracks into SMIL. Every animation in one image shares one period T and runs forever,
// so the loop is seamless and a resume offset is just a negative `begin`.

export type Ease = 'out' | 'in' | 'inout'
// [time in seconds, value, ease of the segment that STARTS at this key]
export type Key = [number, string, Ease?]
export type Track = {
  attr: string
  type?: 'translate' | 'scale' | 'skewX' | 'rotate' // animateTransform when set
  calc: 'discrete' | 'linear'
  keys: Key[]
  init: string // the value before the first key
}

const SPLINE: Record<Ease, string> = { out: '0.16 1 0.3 1', in: '0.7 0 0.84 0', inout: '0.65 0 0.35 1' }
const LINEAR = '0 0 1 1'

const q = (v: number) => String(Math.round(v * 10000) / 10000)
// key times are fractions of the period: no leading zero ('.1234'), 4 decimals
const kt = (v: number) => {
  const r = String(Math.round(v * 10000) / 10000)
  return r.startsWith('0.') ? r.slice(1) : r
}

export type Compiled = { el: string; first: string }

export class Timeline {
  readonly T: number
  readonly offset: number
  constructor(T: number, offset = 0) {
    this.T = T
    this.offset = ((offset % T) + T) % T
  }

  // The animation element for a track, or '' when the value never changes. `first` is the value at time 0,
  // for the static attribute the element falls back to.
  compile(tr: Track): Compiled {
    const T = this.T
    const sorted = tr.keys
      .map(k => [Math.min(Math.max(k[0], 0), T - 0.0005), k[1], k[2]] as Key)
      .sort((a, b) => a[0] - b[0])
    // equal times: the last one wins
    const keys: Key[] = []
    for (const k of sorted) {
      if (keys.length && Math.abs(keys[keys.length - 1]![0] - k[0]) < 1e-6) keys[keys.length - 1] = k
      else keys.push(k)
    }
    if (keys.length === 0 || keys[0]![0] > 1e-6) keys.unshift([0, tr.init])
    const first = keys[0]![1]
    // collapse repeats (discrete) so a long hold costs nothing; a discrete key in the last instant is never seen
    // (the loop wraps to the first key) and would round to a keyTime of 1, which discrete animations must not end on
    const run: Key[] = []
    for (const k of keys) {
      if (tr.calc === 'discrete' && (k[0] >= T - 0.003 || (run.length && run[run.length - 1]![1] === k[1]))) continue
      run.push(k)
    }
    if (run.length === 1 || run.every(k => k[1] === run[0]![1])) return { el: '', first }

    const tag = tr.type ? 'animateTransform' : 'animate'
    const head = tr.type ? `<animateTransform attributeName="transform" type="${tr.type}"` : `<animate attributeName="${tr.attr}"`
    const begin = this.offset > 0 ? ` begin="-${q(this.offset)}s"` : ''
    const common = `${begin} dur="${q(T)}s" repeatCount="indefinite"`
    void tag

    if (tr.calc === 'discrete') {
      const times = run.map(k => kt(k[0] / T))
      return { el: `${head} calcMode="discrete"${common} keyTimes="${times.join(';')}" values="${run.map(k => k[1]).join(';')}"/>`, first }
    }
    // linear or spline: close the loop with a key at T holding the last value
    const lin: Key[] = run.slice()
    const last = lin[lin.length - 1]!
    if (last[0] < T - 0.0006) lin.push([T, last[1]])
    else lin[lin.length - 1] = [T, last[1]]
    const times = lin.map((k, i) => (i === lin.length - 1 ? '1' : kt(k[0] / T)))
    const eased = lin.slice(0, -1).some(k => k[2])
    if (!eased) {
      return { el: `${head} calcMode="linear"${common} keyTimes="${times.join(';')}" values="${lin.map(k => k[1]).join(';')}"/>`, first }
    }
    const splines = lin.slice(0, -1).map(k => (k[2] ? SPLINE[k[2]] : LINEAR))
    return {
      el: `${head} calcMode="spline"${common} keyTimes="${times.join(';')}" keySplines="${splines.join(';')}" values="${lin.map(k => k[1]).join(';')}"/>`,
      first,
    }
  }
}

// Nested groups, one transform each: translate, then scale, then skew, around `content`.
export type ActorSpec = {
  translate?: Key[]
  scale?: Key[]
  skew?: Key[]
  rotate?: Key[]
  opacity?: Key[]
  opacityInit?: string // value before the first opacity key (default '1')
  visibility?: Key[] // 'visible' | 'hidden', drawn as opacity 1 | 0 (opacity is never overridden by a child, visibility is)
  at?: string // initial translate "x y"
}

export const actor = (tl: Timeline, content: string, s: ActorSpec): string => {
  let out = content
  const wrap = (open: string, close = '</g>') => (out = open + out + close)
  if (s.skew) {
    const c = tl.compile({ attr: 'transform', type: 'skewX', calc: 'linear', keys: s.skew, init: '0' })
    wrap(`<g transform="skewX(${c.first})">${c.el}`)
  }
  if (s.rotate) {
    const c = tl.compile({ attr: 'transform', type: 'rotate', calc: 'linear', keys: s.rotate, init: '0' })
    wrap(`<g transform="rotate(${c.first})">${c.el}`)
  }
  if (s.scale) {
    const c = tl.compile({ attr: 'transform', type: 'scale', calc: 'linear', keys: s.scale, init: '1 1' })
    wrap(`<g transform="scale(${c.first})">${c.el}`)
  }
  if (s.translate) {
    const c = tl.compile({ attr: 'transform', type: 'translate', calc: 'linear', keys: s.translate, init: s.at ?? '0 0' })
    wrap(`<g transform="translate(${c.first})">${c.el}`)
  }
  if (s.opacity || s.visibility) {
    const keys: Key[] = s.visibility ? s.visibility.map(k => [k[0], k[1] === 'visible' ? '1' : '0', k[2]] as Key) : s.opacity!
    const init = s.visibility ? '0' : (s.opacityInit ?? '1')
    const o = tl.compile({ attr: 'opacity', calc: 'discrete', keys, init })
    wrap(`<g${o.first === '1' ? '' : ` opacity="${o.first}"`}>${o.el}`)
  }
  return out
}

// The host scrubs every SVG before it draws it and drops `attributeName="href"`, so a frame can never be picked by animating a
// `<use>`'s href. Instead each distinct value of a discrete track gets an element of its own, shown by opacity while the track holds
// that value. `make(value, opacityAttr, animation)` draws one such element.
export const choose = (tl: Timeline, keys: Key[], make: (value: string, opacityAttr: string, animation: string) => string): string => {
  const values = [...new Set(keys.map(k => k[1]))]
  return values
    .map(v => {
      const c = tl.compile({ attr: 'opacity', calc: 'discrete', keys: keys.map(k => [k[0], k[1] === v ? '1' : '0'] as Key), init: '0' })
      return make(v, c.first === '1' ? '' : ` opacity="${c.first}"`, c.el)
    })
    .join('')
}
