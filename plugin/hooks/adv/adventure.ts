// One biome's adventure as a single looping SVG: three monsters, then the boss, then the walk to the next place.
import { HERO_IDLE, HERO_RUN_A, HERO_RUN_B } from './art/hero'
import { BOSSES, MONSTERS } from './art/monsters'
import { BIOME_ART } from './biomes'
import { FxBoard } from './lanes'
import { BAND_H, CYCLE, GY, H, MARGIN, SCALE, STRIP_H, W } from './consts'
import { rnd, spriteMono, spriteSvg } from './pixel'
import { groundRects, skyRects, svgOpen, tileDefs, veil } from './scenery'
import { ARC_AGES, nearestAngle, Stamps } from './stamps'
import type { ArcKind } from './stamps'
import { Timeline, actor, choose } from './timeline'
import type { Key } from './timeline'
import { stripParts } from './usage'
import type { StripParts } from './usage'
import type { BiomeArt, BiomeId, BossDef, MonsterDef, Sprite } from './types'

export { CYCLE, GY, H, SCALE, W }
const K0 = 34 // where the knight stands while he walks
const WALK_D = 432 // total scroll per cycle: far 108, mid 216, ground 432, each a whole number of tiles
const ENTER_X = 192
const FIGHT_N = 5.0
const DEATH_N = 1.0
const FIGHT_B = 12.0
const DEATH_B = 3.3
const VICTORY = 0.8
const PREBOSS = 3.4
const ARC_COLOR_AT = [0, 1, 2, 3]

// ---------- tier tint ----------
const rgb2hsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255
  g /= 255
  b /= 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
const hsl2hex = (h: number, s: number, l: number): string => {
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')
}
export const tint = (s: Sprite, tier: number): Sprite => {
  if (tier <= 0) return s
  const pal: Record<string, string> = {}
  for (const [k, c] of Object.entries(s.pal)) {
    const [h, sat, l] = rgb2hsl(parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16))
    pal[k] = sat < 0.12 ? c : hsl2hex((h + tier * 55) % 360, Math.min(1, sat * 1.1), l)
  }
  return { ...s, pal }
}

// ---------- actors ----------
class Mon {
  def: MonsterDef
  id: string
  left: number
  w: number
  h: number
  hover: number
  boss: boolean
  walk: Key[] = []
  off: Key[] = []
  scale: Key[] = []
  red: Key[] = []
  white: Key[] = []
  vis: Key[] = []
  cur = { x: 0, y: 0 } // offset from the base position, for the attack lane
  constructor(def: MonsterDef, id: string, boss: boolean) {
    this.def = def
    this.id = id
    this.boss = boss
    this.w = def.sprite.w
    this.h = def.sprite.h
    this.hover = def.hover ?? 0
    this.left = boss ? 124 : Math.round(128 - this.w / 2)
  }
  get cx() {
    return this.left + this.w / 2
  }
  get top() {
    return GY - this.hover - this.h
  }
}

class Hero {
  keys: Key[] = []
  scale: Key[] = []
  skew: Key[] = []
  sword: Key[] = []
  swordVis: Key[] = []
  hurt: Key[] = []
  walkVis: Key[] = []
  fightVis: Key[] = []
  x = K0
  y = 0
  put(t: number, x: number, y: number, ease?: 'out' | 'in' | 'inout') {
    this.keys.push([t, `${p(x + 6)} ${p(GY + y)}`, ease])
    this.x = x
    this.y = y
  }
  hold(t: number) {
    this.keys.push([t, `${p(this.x + 6)} ${p(GY + this.y)}`])
  }
  // glide from where he is to x over dur
  moveTo(t: number, x: number, dur: number, ease: 'out' | 'in' | 'inout' = 'out') {
    const x0 = this.x
    const y = this.y
    this.keys.push([t, `${p(x0 + 6)} ${p(GY + y)}`, ease])
    this.put(t + dur, x, y)
  }
  hop(t: number, dur: number, height: number) {
    const x = this.x
    this.keys.push([t, `${p(x + 6)} ${p(GY)}`, 'out'])
    this.keys.push([t + dur * 0.45, `${p(x + 6)} ${p(GY - height)}`, 'in'])
    this.keys.push([t + dur, `${p(x + 6)} ${p(GY)}`])
    this.y = 0
  }
  stretch(t: number, sx: number, sy: number, lean: number, dur: number) {
    this.scale.push([t, `${n(sx)} ${n(sy)}`], [t + dur, '1 1'])
    this.skew.push([t, n((Math.atan(-lean / (13 * sx)) * 180) / Math.PI)], [t + dur, '0'])
  }
}

const n = (v: number) => String(Math.round(v * 100) / 100)
const p = (v: number) => String(Math.round(v * 10) / 10)

type Ctx = {
  tl: Timeline
  art: BiomeArt
  st: Stamps
  board: FxBoard
  hero: Hero
  shake: Key[]
  mons: Mon[]
  decalLen: Map<string, number>
  seed: number
}

const shake = (c: Ctx, t: number, amp: number, dur: number, vertical = false) => {
  const steps = Math.max(2, Math.round(dur / 0.05))
  for (let i = 0; i < steps; i++) {
    const a = amp * (1 - i / steps) * (i % 2 === 0 ? 1 : -1)
    c.shake.push([t + i * 0.05, vertical ? `0 ${p(a)}` : `${p(a)} 0`])
  }
  c.shake.push([t + steps * 0.05, '0 0'])
}

const ghostTrail = (c: Ctx, t: number, x0: number, x1: number, dur: number) => {
  const ease = (u: number) => 1 - Math.pow(1 - Math.min(1, u), 3)
  const kinds = ['ghost3', 'ghost2', 'ghost1']
  kinds.forEach((kind, i) => {
    const ti = t + i * dur * 0.34
    const x = x0 + (x1 - x0) * ease((ti - t) / dur)
    c.board.place(kind, { t0: ti, t1: t + dur + 0.14, x, y: GY, frames: [{ t: ti, href: 'heroGhost' }] })
  })
}

const swing = (c: Ctx, t: number, deg: number) => {
  c.hero.sword.push([t, `#${c.st.sword(deg)}`])
}

// a number that rises from a monster's head
const number = (c: Ctx, t: number, m: Mon, value: number, crit: boolean) => {
  const text = String(value)
  const x0 = Math.round(m.cx - (text.length * 4 - 1) / 2)
  const y0 = Math.max(2, m.top - 6)
  ;[...text].forEach((ch, i) => {
    const id = c.st.digit(ch, crit)
    c.board.place(crit ? 'dgy' : 'dgw', { t0: t, t1: t + 0.55, x: x0 + i * 4, y: y0, x1: x0 + i * 4, y1: y0 - 2, frames: [{ t, href: id }] })
  })
}

const impact = (c: Ctx, t: number, m: Mon, kind: ArcKind, handX: number, handY: number, variant: number, big: boolean, dmg: number, crit: boolean) => {
  const f = ARC_AGES.map((age, i) => ({ t: t + age * 0.05, href: c.st.arc(kind, i), fill: c.art.weapon.slash[ARC_COLOR_AT[i]!]! }))
  c.board.place('arc', { t0: t, t1: t + 0.4, x: handX, y: handY, frames: f })
  const sp = ARC_AGES.map((age, i) => ({ t: t + age * 0.05, href: c.st.spark(big ? 0 : variant, i, big) }))
  c.board.place('spark', { t0: t, t1: t + 0.4, x: m.left + 2, y: GY - 8, frames: sp })
  number(c, t + 0.04, m, dmg, crit)
  if (kind !== 'A') {
    const rings = big ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3]
    const rf = rings.map(a => ({
      t: t + a * 0.05,
      href: c.st.ring(2 + a * (big ? 3.4 : 2.1)),
      opacity: a < 2 ? '0.62' : a < 4 ? '0.38' : '0.2',
    }))
    c.board.place('ring', { t0: t, t1: t + rings.length * 0.05, x: m.left + 3, y: GY - 8, frames: rf })
  }
}

// a monster is struck: a red flash, a squash, a recoil
const hit = (c: Ctx, t: number, m: Mon, strong: number, recoil: number) => {
  m.red.push([t, String(0.5 * strong)], [t + 0.05, String(0.15 * strong)], [t + 0.1, '0'])
  m.scale.push([t, '1.12 0.9'], [t + 0.1, '0.97 1.05'], [t + 0.17, '1 1'])
  m.off.push([t, `${p(m.cur.x)} ${p(m.cur.y)}`, 'out'], [t + 0.08, `${p(m.cur.x + recoil)} ${p(m.cur.y)}`], [t + 0.2, `${p(m.cur.x + recoil)} ${p(m.cur.y)}`, 'inout'], [t + 0.45, `${p(m.cur.x)} ${p(m.cur.y)}`])
}

// ---------- one strike of the knight ----------
// returns the time the strike is over; `f` stretches the beat (1 is 0.7 s)
const strike = (c: Ctx, t: number, m: Mon, kind: ArcKind, last: boolean, f: number, seedAt: number): number => {
  const hero = c.hero
  const near = m.left - 23
  const heavy = kind === 'C'
  const wind = (heavy ? 0.2 : 0.08) * f
  const dash = 0.12 * f
  const tD = t + wind
  const tI = tD + dash
  // windup
  hero.stretch(t, 0.92, 1.08, 0, wind)
  swing(c, t, heavy ? 165 : kind === 'B' ? -40 : 165)
  // dash
  const x0 = hero.x
  if (Math.abs(near - x0) > 1) {
    hero.moveTo(tD, near, dash, 'out')
    hero.stretch(tD, 1.35, 0.9, 3, dash * 1.3)
    ghostTrail(c, tD, x0, near, dash)
  } else hero.hold(tD)
  // impact
  swing(c, tI, kind === 'A' ? -15 : kind === 'B' ? 50 : -35)
  const handX = near + 9
  const handY = GY - 7
  const dmg = (heavy ? [38, 46] : [12, 15, 21, 24])[Math.floor(rnd(seedAt) * (heavy ? 2 : 4))]!
  impact(c, tI, m, kind, handX, handY, seedAt % 2, heavy, dmg, heavy && last)
  hit(c, tI, m, heavy ? 1.3 : 1, heavy ? 9 : 3)
  shake(c, tI, heavy ? 2 : 1, heavy ? 0.25 : 0.15, heavy)
  // follow through, then a small step back so the next dash has room
  swing(c, tI + 0.1 * f, kind === 'A' ? -25 : kind === 'B' ? 55 : -40)
  swing(c, tI + 0.3 * f, 40)
  if (!last) hero.moveTo(tI + 0.3 * f, near - 8, 0.12 * f, 'out')
  return t + 0.7 * f + (heavy ? 0.1 : 0)
}

// ---------- a monster strikes back ----------
type Reaction = 'dodge' | 'block' | 'hurt'
const REACH: Record<string, number> = { lunge: 9, hop: 10, swoop: 14, charge: 30 }

const counter = (c: Ctx, t: number, m: Mon, reaction: Reaction, f: number): number => {
  const hero = c.hero
  const near = m.left - 23
  const far = near - 28
  const style = m.def.attack
  const tele = 0.45 * f
  const ta = t + tele
  // telegraph: a crouch, a rising glow, a mark
  m.scale.push([t, '1 1'], [t + tele * 0.8, '1.08 0.88'], [ta, '1 1'])
  m.white.push([t, '0.1'], [t + tele * 0.5, '0.3'], [ta - 0.05, '0.45'], [ta, '0'])
  c.board.place('bang', { t0: t + 0.05 * f, t1: ta, x: Math.round(m.cx) - 1, y: m.top - 9, frames: [{ t: t + 0.05 * f, href: c.st.bang() }] })
  swing(c, t, 60)
  // the monster's lunge
  const reach = reaction === 'dodge' ? REACH[style]! : Math.min(REACH[style]!, 9)
  const hv = m.hover
  const keys: Key[] = []
  const o = m.cur
  keys.push([ta, `${p(o.x)} ${p(o.y)}`, style === 'swoop' || style === 'charge' ? 'in' : 'out'])
  if (style === 'hop') {
    keys.push([ta + 0.12 * f, `${p(o.x - reach / 2)} ${p(o.y - 9)}`, 'in'], [ta + 0.24 * f, `${p(o.x - reach)} ${p(o.y)}`], [ta + 0.34 * f, `${p(o.x - reach)} ${p(o.y)}`, 'inout'])
  } else if (style === 'swoop') {
    keys.push([ta + 0.17 * f, `${p(o.x - reach * 0.7)} ${p(o.y + hv - 4)}`, 'out'], [ta + 0.3 * f, `${p(o.x - reach)} ${p(o.y + hv - 2)}`, 'inout'])
  } else {
    keys.push([ta + 0.12 * f, `${p(o.x - reach)} ${p(o.y)}`], [ta + 0.25 * f, `${p(o.x - reach)} ${p(o.y)}`, 'inout'])
  }
  const back = keys[keys.length - 1]![0] + 0.4 * f
  keys.push([back, `${p(o.x)} ${p(o.y)}`])
  m.off.push(...keys)
  // the knight answers
  const tc = ta + 0.1 * f
  if (reaction === 'dodge') {
    hero.moveTo(ta + 0.02, far, 0.1 * f, 'out')
    hero.stretch(ta + 0.02, 1.3, 0.9, -3, 0.14 * f)
    ghostTrail(c, ta + 0.02, near, far, 0.1 * f)
    hero.moveTo(back - 0.15 * f, near, 0.2 * f, 'inout')
  } else if (reaction === 'block') {
    c.hero.swordVis.push([ta - 0.02, 'hidden'], [back, 'visible'])
    c.board.place('shield', { t0: ta - 0.02, t1: back, x: near + 9, y: GY - 7, frames: [{ t: ta - 0.02, href: c.st.shield() }] })
    const sp = ARC_AGES.map((age, i) => ({ t: tc + age * 0.05, href: c.st.spark(1, i) }))
    c.board.place('spark', { t0: tc, t1: tc + 0.4, x: near + 13, y: GY - 7, frames: sp })
    hero.moveTo(tc, near - 3, 0.08 * f, 'out')
    hero.moveTo(tc + 0.25 * f, near, 0.2 * f, 'inout')
    shake(c, tc, 1, 0.15)
  } else {
    hero.hurt.push([tc, '0.7'], [tc + 0.1, '0.3'], [tc + 0.2, '0'])
    hero.moveTo(tc, near - 6, 0.1 * f, 'out')
    hero.stretch(tc, 0.95, 1.04, -6, 0.3 * f)
    const sp = ARC_AGES.map((age, i) => ({ t: tc + age * 0.05, href: c.st.spark(0, i) }))
    c.board.place('spark', { t0: tc, t1: tc + 0.4, x: near + 12, y: GY - 8, frames: sp })
    hero.moveTo(back - 0.1 * f, near, 0.25 * f, 'inout')
    shake(c, tc, 1, 0.2)
  }
  swing(c, back, 40)
  return back + 0.15 * f
}

// ---------- death ----------
const kill = (c: Ctx, t: number, m: Mon, big: boolean) => {
  const d = big ? 1.5 : 0.12
  m.white.push([t, '1'], [t + d, '1'])
  m.scale.push([t, '1.25 0.75'], [t + d, '1.25 0.75'])
  m.vis.push([t + d, 'hidden'])
  const dust = (tt: number, dx: number, dy: number, bigDust: boolean) => {
    const frames = ARC_AGES.map((age, i) => ({ t: tt + age * 0.05, href: c.st.dust(i, bigDust), fill: m.def.dust }))
    c.board.place('dust', { t0: tt, t1: tt + 0.4, x: m.cx + dx, y: GY - m.h / 2 - m.hover + dy, frames })
  }
  if (big) {
    for (let i = 0; i < 5; i++) dust(t + i * 0.22, Math.round((rnd(c.seed + i * 3) - 0.5) * m.w * 0.8), Math.round((rnd(c.seed + i * 7) - 0.5) * m.h * 0.6), i > 2)
    for (let i = 0; i < 3; i++) {
      const rf = [0, 1, 2, 3, 4, 5].map(a => ({ t: t + 0.3 + i * 0.35 + a * 0.05, href: c.st.ring(2 + a * 3.6), opacity: a < 2 ? '0.62' : a < 4 ? '0.38' : '0.2' }))
      c.board.place('ring', { t0: t + 0.3 + i * 0.35, t1: t + 0.6 + i * 0.35, x: Math.round(m.cx), y: GY - 8, frames: rf })
    }
    shake(c, t, 2, 0.9)
    // the boss shudders before it goes
    for (let i = 0; i < 24; i++) m.off.push([t + i * 0.05, `${i % 2 === 0 ? 2 : -2} ${n(m.cur.y)}`])
    m.off.push([t + 1.5, `${p(m.cur.x)} ${p(m.cur.y)}`])
  } else {
    dust(t + d, 0, 0, false)
    const rf = [0, 1, 2, 3].map(a => ({ t: t + d + a * 0.05, href: c.st.ring(2 + a * 2.1), opacity: a < 2 ? '0.62' : '0.38' }))
    c.board.place('ring', { t0: t + d, t1: t + d + 0.2, x: Math.round(m.cx), y: GY - 8, frames: rf })
    shake(c, t, 1, 0.2)
  }
}

// ---------- fights ----------
const split = (hits: number, rounds: number): number[] => {
  const out = new Array<number>(rounds).fill(Math.floor(hits / rounds))
  for (let i = 0; i < hits % rounds; i++) out[rounds - 1 - i]!++
  return out
}

const fightNormal = (c: Ctx, t0: number, m: Mon, hits: number, fightEnd: number, idx: number) => {
  const rounds = split(Math.max(2, hits), 3).map((h, i) => (i === 0 && hits === 2 ? 1 : h))
  if (hits === 2) {
    rounds[0] = 1
    rounds[1] = 0
    rounds[2] = 1
  }
  const totalHits = rounds.reduce((a, b) => a + b, 0)
  const counters = 2
  const settle = 0.3
  const natural = settle + totalHits * 0.7 + counters * 1.25
  const f = Math.min(1.25, Math.max(0.8, (fightEnd - t0) / natural))
  let t = t0 + settle
  let hitNo = 0
  const reacts: Reaction[] = (['dodge', 'block', 'hurt'] as Reaction[]).sort((a, b) => rnd(c.seed + idx * 5 + a.length) - rnd(c.seed + idx * 11 + b.length))
  rounds.forEach((r, ri) => {
    for (let j = 0; j < r; j++) {
      hitNo++
      const last = ri === 2 && j === r - 1
      const kind: ArcKind = last ? 'C' : hitNo % 2 === 1 ? 'A' : 'B'
      t = strike(c, t, m, kind, last, f, c.seed + idx * 17 + hitNo)
    }
    if (ri < 2) t = counter(c, t, m, ri === 0 ? 'dodge' : reacts[ri % 3]!, f)
  })
  return t
}

const fightBoss = (c: Ctx, t0: number, m: BossMon, fightEnd: number) => {
  const hits = Math.max(8, m.def.hits)
  const rounds = split(hits, 4)
  const settle = 0.35
  const natural = settle + hits * 0.62 + 1.25 + 2 * 2.6
  const f = Math.min(1.1, Math.max(0.75, (fightEnd - t0) / natural))
  let t = t0 + settle
  let hitNo = 0
  rounds.forEach((r, ri) => {
    for (let j = 0; j < r; j++) {
      hitNo++
      const last = ri === 3 && j === r - 1
      const kind: ArcKind = last ? 'C' : hitNo % 2 === 1 ? 'A' : 'B'
      t = strike(c, t, m, kind, last, (0.62 * f) / 0.7, c.seed + 400 + hitNo)
    }
    if (ri === 0) t = counter(c, t, m, 'block', f)
    else if (ri === 1 || ri === 2) t = special(c, t, m, f)
  })
  return t
}

type BossMon = Mon & { def: BossDef }

// ---------- boss specials ----------
const special = (c: Ctx, t: number, m: BossMon, f: number): number => {
  const hero = c.hero
  const kind = m.def.special
  const near = m.left - 23
  const tele = 1.0 * f
  const te = t + tele
  // telegraph
  m.scale.push([t, '1 1'], [t + 0.3 * f, '1.06 1.1'], [te, '1.06 1.1'])
  m.white.push([t + 0.3 * f, '0.05'], [te - 0.05, '0.5'], [te, '0'])
  const decalFrom = kind === 'wave' || kind === 'slam' ? K0 + 14 : K0 + 14
  const decalLen = Math.round(m.left - decalFrom - 4)
  c.board.place('decal', { t0: t + 0.1 * f, t1: te, x: decalFrom, y: GY - 1, frames: [{ t: t + 0.1 * f, href: c.st.decal(decalLen) }] })
  c.board.place('bang', { t0: t + 0.1 * f, t1: te, x: Math.round(m.left - 4), y: 3, frames: [{ t: t + 0.1 * f, href: c.st.bang() }] })
  swing(c, t, 60)
  // the knight pulls back to a guard
  hero.moveTo(t + 0.15 * f, K0, 0.35 * f, 'inout')
  ghostTrail(c, t + 0.15 * f, near, K0, 0.35 * f)
  let end = te
  if (kind === 'fireBreath' || kind === 'iceBreath') {
    const mouth = m.def.mouth ?? { x: 0, y: 8 }
    const mx = m.left + mouth.x - 1
    const my = GY - m.h + mouth.y
    c.board.place('glow', { t0: t + 0.55 * f, t1: te, x: mx + 1, y: my, frames: [{ t: t + 0.55 * f, href: c.st.glow(kind === 'fireBreath' ? '#ffb02e' : '#38bdf8') }] })
    const len = mx - (K0 + 12 + 1)
    const ks = [0.55, 1, 0.8, 1, 0.85, 1, 0.5]
    const fl = ks.map((k, i) => ({ t: te + i * 0.1, href: c.st.flame(kind === 'fireBreath' ? 'fire' : 'ice', i % 2, len), sx: k }))
    c.board.place('flame', { t0: te, t1: te + 0.7, x: mx, y: my, frames: fl })
    hero.swordVis.push([te - 0.2, 'hidden'], [te + 1.0, 'visible'])
    c.board.place('shield', { t0: te - 0.2, t1: te + 1.0, x: K0 + 9, y: GY - 7, frames: [{ t: te - 0.2, href: c.st.shield() }] })
    ;[0, 1, 2, 3].forEach(i => {
      const tt = te + 0.15 + i * 0.17
      const sp = ARC_AGES.map((age, a) => ({ t: tt + age * 0.05, href: c.st.spark(i % 2, a) }))
      c.board.place('spark', { t0: tt, t1: tt + 0.4, x: K0 + 14, y: GY - 7, frames: sp })
    })
    m.scale.push([te, '0.95 1.05'], [te + 0.2, '1.02 0.98'], [te + 0.4, '1 1'])
    m.off.push([te, `${n(m.cur.x)} 0`, 'out'], [te + 0.08, `${n(m.cur.x + 3)} 0`], [te + 0.5, `${n(m.cur.x)} 0`])
    hero.moveTo(te + 0.05, K0 - 3, 0.1, 'out')
    hero.moveTo(te + 0.75, K0, 0.2, 'inout')
    shake(c, te, 1, 0.7)
    end = te + 1.05
  } else if (kind === 'wave') {
    // two dark crescents slide along the ground; the knight hops over each
    ;[0, 1].forEach(i => {
      const ts = te + i * 0.5
      const frames = [0, 1, 2, 0, 1, 2].map((fr, j) => ({ t: ts + j * 0.1, href: c.st.wave(fr) }))
      c.board.place('wave', { t0: ts, t1: ts + 0.6, x: m.left - 6, y: GY - 6, x1: K0 + 8, y1: GY - 6, frames })
      hero.hop(ts + 0.42, 0.45, 9)
    })
    m.scale.push([te - 0.1, '1.06 1.1'], [te, '0.94 1.08'], [te + 0.15, '1 1'], [te + 0.5, '0.94 1.08'], [te + 0.65, '1 1'])
    shake(c, te, 1, 0.2)
    shake(c, te + 0.5, 1, 0.2)
    end = te + 1.45
  } else {
    // slam: the troll leaps, lands, and a shock runs along the ground
    m.off.push([te - 0.05, `${n(m.cur.x)} 0`, 'out'], [te + 0.2, `${n(m.cur.x)} -7`, 'in'], [te + 0.34, `${n(m.cur.x)} 0`], [te + 0.9, `${n(m.cur.x)} 0`])
    const tl2 = te + 0.34
    const frames = ARC_AGES.map((age, i) => ({ t: tl2 + age * 0.05, href: c.st.dust(i, true), fill: '#a8a29e' }))
    c.board.place('dust', { t0: tl2, t1: tl2 + 0.4, x: m.cx, y: GY - 2, frames })
    shake(c, tl2, 2, 0.3, true)
    ;[0, 1].forEach(i => {
      const ts = tl2 + i * 0.28
      const gw = [0, 1, 2].map(j => ({ t: ts + j * 0.16, href: c.st.groundWave(5 + j * 4), opacity: j === 2 ? '0.4' : '0.7' }))
      c.board.place('gwave', { t0: ts, t1: ts + 0.5, x: m.left - 2, y: GY, x1: K0 + 14, y1: GY, frames: gw })
      hero.hop(ts + 0.36, 0.4, 8)
    })
    ;[0, 1, 2].forEach(i => {
      const x = 62 + i * 21
      const ts = tl2 + 0.1 + i * 0.14
      c.board.place('rock', { t0: ts, t1: ts + 0.45, x, y: -2, x1: x, y1: GY - 2, frames: [{ t: ts, href: c.st.rock() }] })
    })
    end = tl2 + 1.1
  }
  // the boss settles, the knight steps back in
  m.scale.push([end - 0.1, '1.06 1.1'], [end + 0.2, '1 1'])
  m.white.push([end, '0'])
  hero.moveTo(end - 0.05, near, 0.3 * f, 'out')
  ghostTrail(c, end - 0.05, K0, near, 0.3 * f)
  swing(c, end + 0.3 * f, 40)
  return end + 0.35 * f
}

// ---------- assembly ----------
const q = (v: number) => String(Math.round(v * 1000) / 1000)

// the schedule of the last build, for the tools
export const marks: Record<string, unknown> = {}

export const buildAdventure = (biome: BiomeId, tier = 0, offset = 0, usage: StripParts = stripParts([], 0)): string => {
  const art = BIOME_ART[biome]
  const tl = new Timeline(CYCLE, offset)
  const st = new Stamps(art.weapon)
  const board = new FxBoard()
  const biomeNo = ['dungeon', 'plateau', 'ice', 'volcano'].indexOf(biome)
  const seed = biomeNo * 1000 + tier * 100
  const hero = new Hero()
  const ctx: Ctx = { tl, art, st, board, hero, shake: [], mons: [], decalLen: new Map(), seed }

  board.kind('ghost1', { opacity: '0.55', fill: art.weapon.ghost })
  board.kind('ghost2', { opacity: '0.3', fill: art.weapon.ghost })
  board.kind('ghost3', { opacity: '0.14', fill: art.weapon.ghost })
  board.kind('ring', { fill: art.weapon.ring })
  board.kind('gwave', { fill: '#d6d3ce' })

  // schedule ------------------------------------------------------------
  const normals = MONSTERS[biome].map((d, i) => new Mon({ ...d, sprite: tint(d.sprite, tier), sprite2: d.sprite2 ? tint(d.sprite2, tier) : undefined }, `m${i}`, false))
  const bossDef = BOSSES[biome]
  const boss = new Mon({ ...bossDef, sprite: tint(bossDef.sprite, tier), sprite2: bossDef.sprite2 ? tint(bossDef.sprite2, tier) : undefined } as BossDef, 'mb', true) as BossMon
  ctx.mons = [...normals, boss]

  const fights = 3 * (FIGHT_N + DEATH_N) + FIGHT_B + DEATH_B + VICTORY
  const walkTotal = CYCLE - fights
  const v = WALK_D / walkTotal
  const approach = (m: Mon) => (ENTER_X - m.left) / v
  const walks: [number, number][] = []
  let t = 0

  normals.forEach((m, i) => {
    const arrive = t + approach(m)
    walks.push([t, arrive])
    m.vis.push([t, 'visible'])
    m.walk.push([t, `${ENTER_X} ${GY - m.hover}`], [arrive, `${m.left} ${GY - m.hover}`])
    const tF = arrive
    const end = fightNormal(ctx, tF, m, m.def.hits + Math.min(tier, 3), tF + FIGHT_N, i)
    const td = Math.max(end, tF + FIGHT_N - 0.1)
    kill(ctx, td, m, false)
    // the knight returns to where he walks
    hero.moveTo(td + 0.1, K0, 0.35, 'inout')
    ghostTrail(ctx, td + 0.1, hero.x, K0, 0.35)
    swing(ctx, td + 0.2, 60)
    t = tF + FIGHT_N + DEATH_N
  })

  // boss: a long dark walk, then it steps in
  const bossArrive = t + PREBOSS + approach(boss)
  walks.push([t, bossArrive])
  boss.vis.push([t + PREBOSS, 'visible'])
  boss.walk.push([t + PREBOSS, `${ENTER_X} ${GY}`], [bossArrive, `${boss.left} ${GY}`])
  // the roar when it lands
  boss.scale.push([bossArrive, '1 1'], [bossArrive + 0.1, '1.12 1.12'], [bossArrive + 0.45, '1 1'])
  shake(ctx, bossArrive, 1, 0.6)
  const bf = bossArrive + 0.2
  const bEnd = fightBoss(ctx, bf, boss, bf + FIGHT_B - 0.2)
  const bd = Math.max(bEnd, bf + FIGHT_B - 0.4)
  kill(ctx, bd, boss, true)
  // victory
  const vt = bd + 1.6
  hero.moveTo(bd + 0.3, K0, 0.4, 'inout')
  swing(ctx, vt, 80)
  hero.stretch(vt, 1.05, 1.08, 2, 0.3)
  swing(ctx, vt + 0.9, 60)
  t = bd + DEATH_B + VICTORY
  // walk out
  const endWalk = CYCLE
  walks.push([t, endWalk])

  Object.assign(marks, { walks, v, bossArrive, bossFightEnd: bEnd, bossDeath: bd, victory: vt, cycleWalkOut: t })
  // hero visibility: walking in the walk intervals, fighting otherwise
  const edges: number[] = [0]
  hero.walkVis.push([0, 'visible'])
  hero.fightVis.push([0, 'hidden'])
  for (const [a, b] of walks) {
    if (a > 0.01) {
      hero.walkVis.push([a, 'visible'])
      hero.fightVis.push([a, 'hidden'])
    }
    // the fight stance starts a hair before he stops so the hand-over has no gap
    hero.walkVis.push([b, 'hidden'])
    hero.fightVis.push([b, 'visible'])
    edges.push(a, b)
  }
  hero.walkVis.sort((p, q2) => p[0] - q2[0])

  // scroll: walked distance at each edge
  let walked = 0
  const scrollKeys: Key[] = [[0, '0 0']]
  let last = 0
  for (const [a, b] of walks) {
    scrollKeys.push([a, `${q(-walked)} 0`])
    walked += (b - a) * v
    scrollKeys.push([b, `${q(-walked)} 0`])
    last = b
  }
  void last
  // a strip of scenery scrolling at `factor`: tiles from MARGIN to the left of the view to MARGIN to the right of where it ends up
  const strip = (id: string, tileW: number, factor: number): string => {
    const x0 = -Math.ceil(MARGIN / tileW) * tileW
    const need = Math.ceil((W + MARGIN + factor * walked - x0) / tileW) + 1
    const keys: Key[] = scrollKeys.map(kk => [kk[0], `${q(Number(kk[1].split(' ')[0]) * factor)} 0`])
    const c = tl.compile({ attr: 'transform', type: 'translate', calc: 'linear', keys, init: '0 0' })
    let uses = ''
    for (let i = 0; i < need; i++) uses += `<use href="#${id}" x="${x0 + i * tileW}"/>`
    return `<g transform="translate(${c.first})">${c.el}${uses}</g>`
  }

  // defs -----------------------------------------------------------------
  let defs = tileDefs(art)
  defs += `<g id="heroIdle">${spriteSvg(HERO_IDLE)}</g><g id="heroA">${spriteSvg(HERO_RUN_A)}</g><g id="heroB">${spriteSvg(HERO_RUN_B)}</g>`
  defs += `<g id="heroGhost">${spriteMono(HERO_IDLE)}</g><g id="heroS">${spriteMono(HERO_IDLE)}</g>`
  for (const m of ctx.mons) {
    defs += `<g id="${m.id}a">${spriteSvg(m.def.sprite)}</g>`
    if (m.def.sprite2) defs += `<g id="${m.id}b">${spriteSvg(m.def.sprite2)}</g>`
    defs += `<g id="${m.id}s">${spriteMono(m.def.sprite)}</g>`
  }

  // two poses of one sprite, shown by opacity in turn four times a second (the host would drop an animated href)
  const poses = (a: string, b: string): string => {
    const cycle = (values: string) => `<animate attributeName="opacity" calcMode="discrete" dur="0.5s" repeatCount="indefinite" keyTimes="0;.5" values="${values}"/>`
    return `<use href="#${a}">${cycle('1;0')}</use><use href="#${b}" opacity="0">${cycle('0;1')}</use>`
  }

  // monsters ---------------------------------------------------------------
  const monSvg = (m: Mon): string => {
    const pose = m.def.sprite2 ? poses(`${m.id}a`, `${m.id}b`) : `<use href="#${m.id}a"/>`
    const flash = (keys: Key[], color: string) => (keys.length ? actor(tl, `<use href="#${m.id}s" fill="${color}"/>`, { opacity: keys, opacityInit: '0' }) : '')
    const flashes = flash(m.red, '#ff8f7d') + flash(m.white, '#ffffff')
    const cx = m.w / 2
    const body = actor(tl, `<g transform="translate(${-cx} 0)">${pose}${flashes}</g>`, { scale: m.scale.length ? m.scale : undefined })
    const withCx = `<g transform="translate(${cx} 0)">${body}</g>`
    const offs = actor(tl, withCx, { translate: m.off.length ? m.off : undefined })
    const walked2 = actor(tl, offs, { translate: m.walk, at: `${ENTER_X} ${GY}`, visibility: m.vis })
    return walked2
  }

  // the knight --------------------------------------------------------------
  const swordKeys = hero.sword.length ? hero.sword : [[0, `#${st.sword(60)}`] as Key]
  const swordLane = (() => {
    const angles = choose(tl, swordKeys, (v, vis, anim) => `<use href="${v}" x="9" y="-7"${vis}>${anim}</use>`)
    return actor(tl, angles, { visibility: hero.swordVis.length ? hero.swordVis.map(k => [k[0], k[1]] as Key).concat([[0, 'visible']]) : undefined })
  })()
  const heroFight = actor(
    tl,
    `<g transform="translate(-6 0)"><use href="#heroIdle"/>${hero.hurt.length ? actor(tl, '<use href="#heroS" fill="#ff6b6b"/>', { opacity: hero.hurt, opacityInit: '0' }) : ''}${swordLane}</g>`,
    { translate: hero.keys, at: `${K0 + 6} ${GY}`, scale: hero.scale.length ? hero.scale : undefined, skew: hero.skew.length ? hero.skew : undefined, visibility: hero.fightVis },
  )
  const heroWalk = actor(
    tl,
    `<g transform="translate(-6 0)">${poses('heroA', 'heroB')}</g>`,
    { visibility: hero.walkVis, translate: [[0, `${K0 + 6} ${GY}`]], at: `${K0 + 6} ${GY}` },
  )

  // sky, ground, overlays ------------------------------------------------------
  const sky = skyRects(art)
  const ground = groundRects(art)
  const dark = tl.compile({ attr: 'opacity', calc: 'linear', keys: [[0, '0'], [t - 4.0, '0'], [bossArrive - 0.2, '0.3'], [bossArrive + 1.5, '0'], [CYCLE, '0']], init: '0' })
  const dim = veil('#000', dark.first, dark.el)
  const fade = tl.compile({ attr: 'opacity', calc: 'linear', keys: [[0, '1'], [0.6, '1'], [1.4, '0'], [CYCLE - 0.6, '0'], [CYCLE - 0.1, '1']], init: '1' })
  const fadeRect = veil('#0b0a14', fade.first, fade.el)
  const entry = veil('#0b0a14', '1', '<animate attributeName="opacity" from="1" to="0" begin="0s" dur="0.3s" fill="freeze"/>')
  const worldShake = tl.compile({ attr: 'transform', type: 'translate', calc: 'discrete', keys: ctx.shake, init: '0 0' })

  const before = ['decal', 'bang', 'glow', 'flame', 'gwave', 'rock']
  const after = ['ghost3', 'ghost2', 'ghost1']
  const front = ['shield', 'trail', 'arc', 'ring', 'spark', 'dust', 'wave', 'dgw', 'dgy']
  board.kind('decal', {})

  const body =
    sky +
    strip('far', art.far.w, 0.25) +
    strip('mid', art.mid.w, 0.5) +
    ground +
    strip('gnd', art.ground.tile.w, 1) +
    art.ambient +
    board.render(tl, ['decal']) +
    ctx.mons.map(monSvg).join('') +
    board.render(tl, before.filter(k => k !== 'decal')) +
    board.render(tl, after) +
    heroWalk +
    heroFight +
    board.render(tl, front) +
    dim

  // the scene sits under the usage strip; the veils at the end darken both together
  const out =
    svgOpen(W, BAND_H) +
    `<defs>${defs}${st.svg()}${usage.defs}</defs>` +
    `<g transform="translate(0 ${STRIP_H})"><g transform="translate(${worldShake.first})">${worldShake.el}${body}</g></g>` +
    usage.body +
    fadeRect +
    entry +
    '</svg>'
  return out
}
