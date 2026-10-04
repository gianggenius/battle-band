// Stamp lanes: one lane is reused for every appearance of its kind. A lane holds events that do not overlap in time.
// A lane shows and hides itself with `opacity` (1 or the frame's own, 0 when hidden): the track is short, and unlike
// `visibility` it cannot be overridden by a child.
import { Timeline, choose } from './timeline'
import type { Key } from './timeline'

export type Frame = { t: number; href: string; fill?: string; opacity?: string; sx?: number }
export type Ev = {
  t0: number // appears
  t1: number // disappears
  x: number
  y: number
  x1?: number // when set the stamp glides to (x1, y1) between t0 and t1
  y1?: number
  frames: Frame[]
}

type Lane = { end: number; evs: Ev[] }

const r1 = (v: number) => String(Math.round(v * 10) / 10)

export class FxBoard {
  private kinds = new Map<string, Lane[]>()
  private style = new Map<string, { fill?: string; opacity?: string }>()

  // `style` is the static fill and opacity of a kind that never changes them per frame
  kind(name: string, style: { fill?: string; opacity?: string } = {}) {
    this.style.set(name, style)
  }

  place(kind: string, ev: Ev) {
    let lanes = this.kinds.get(kind)
    if (!lanes) this.kinds.set(kind, (lanes = []))
    let lane = lanes.find(l => l.end <= ev.t0 - 1e-6)
    if (!lane) lanes.push((lane = { end: 0, evs: [] }))
    lane.evs.push(ev)
    lane.end = ev.t1
  }

  count(): number {
    let n = 0
    for (const l of this.kinds.values()) n += l.length
    return n
  }

  // `only` renders just those kinds, in that order (the caller decides what sits in front of what)
  render(tl: Timeline, only?: string[]): string {
    const out: string[] = []
    const names = only ?? [...this.kinds.keys()]
    for (const kind of names) {
      const lanes = this.kinds.get(kind)
      if (!lanes) continue
      const st = this.style.get(kind) ?? {}
      const onOpacity = st.opacity ?? '1'
      for (const lane of lanes) {
        const evs = lane.evs.slice().sort((a, b) => a.t0 - b.t0)
        const href: Key[] = []
        const opacity: Key[] = []
        const pos: Key[] = []
        const scale: Key[] = []
        const moving = evs.some(e => e.x1 !== undefined)
        for (const e of evs) {
          const hasSx = e.frames.some(f => f.sx !== undefined)
          opacity.push([e.t0, e.frames[0]!.opacity ?? onOpacity])
          opacity.push([e.t1, '0'])
          for (const f of e.frames) {
            href.push([f.t, `#${f.href}`])
            if (f.opacity) opacity.push([f.t, f.opacity])
            if (hasSx) scale.push([f.t, `${f.sx ?? 1} 1`])
          }
          if (moving) pos.push([e.t0, `${r1(e.x)} ${r1(e.y)}`], [e.t1, `${r1(e.x1 ?? e.x)} ${r1(e.y1 ?? e.y)}`])
          else pos.push([e.t0, `${r1(e.x)} ${r1(e.y)}`])
        }
        const cp = tl.compile({ attr: 'transform', type: 'translate', calc: moving ? 'linear' : 'discrete', keys: pos, init: pos[0]![1] })
        const co = tl.compile({ attr: 'opacity', calc: 'discrete', keys: opacity, init: '0' })
        const cs = scale.length ? tl.compile({ attr: 'transform', type: 'scale', calc: 'discrete', keys: scale, init: '1 1' }) : null
        const opAttr = co.first === '1' ? '' : ` opacity="${co.first}"`
        // one <use> per stamp the lane shows, each switched on by its own opacity track (the host drops an animated href)
        const uses = choose(tl, href, (v, vis, anim) => {
          const mine: Key[] = evs.flatMap(e => e.frames.filter(f => `#${f.href}` === v && f.fill).map(f => [f.t, f.fill!] as Key))
          const cf = mine.length ? tl.compile({ attr: 'fill', calc: 'discrete', keys: mine, init: mine[0]![1] }) : null
          const fillAttr = cf ? ` fill="${cf.first}"` : st.fill ? ` fill="${st.fill}"` : ''
          return `<use href="${v}"${fillAttr}${vis}>${anim}${cf?.el ?? ''}</use>`
        })
        const inner = cs ? `<g transform="scale(${cs.first})">${cs.el}${uses}</g>` : uses
        out.push(`<g transform="translate(${cp.first})"${opAttr}>${cp.el}${co.el}${inner}</g>`)
      }
    }
    return out.join('')
  }
}
