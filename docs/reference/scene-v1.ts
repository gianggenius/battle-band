// A pixel-art battle exported as layered SMIL SVG. One 3s loop (60 frames at 20
// fps): sprites move by discrete transforms, effects are one path per colour
// whose `d` changes frame by frame. No script, no external file.
//
// Rhythm (frames at 20 fps): three hits on the boss (6, 12, 20) with a short
// freeze on each, a telegraph (27-45) with a floor decal and a rising tremble,
// five flame bursts (46-55), then a breath before the loop.

export const W = 190
export const H = 20
export const GY = 17
export const LOOP = 60
export const SCALE = 6

type Sprite = { rows: string[]; pal: Record<string, string>; w: number; h: number }
export type Phase = 'idle' | 'fighting' | 'won'

const sprite = (rows: string[], pal: Record<string, string>): Sprite => ({ rows, pal, w: rows[0]!.length, h: rows.length })

const KNIGHT = sprite(
  [
    '....PP......',
    '...PPHH.....',
    '..oHHHHo....',
    '..oHVVVo....',
    '..oHHHHo....',
    '...ohho.....',
    '..oBBBBo....',
    '.obBBBBBo...',
    '.obBGGBBo...',
    '..oBBBBo....',
    '..oLLoLLo...',
    '..oLLoLLo...',
    '.oFFFoFFFo..',
  ],
  {
    P: '#e11d48', H: '#cbd5e1', V: '#0f172a', o: '#0b1220', h: '#94a3b8',
    B: '#3b82f6', b: '#1d4ed8', G: '#e7b83a', L: '#475569', F: '#1e293b',
  },
)

const BOSS_ROWS = [
  '......HH................',
  '.....HHH....SS.....SS...',
  '....HHoo...SrrS...SrrS..',
  '..ooooooooSrrrrSSSrrrrS.',
  '.oRRRRRRRRoSrrrroSrrrrS.',
  'oRRELRRRRRRRRRRRRRRRRrrS',
  'oRKEERRRRRRRRRRRRRRRRRo.',
  'ooMMMMooRRRRRRRRRRRRRro.',
  '.oWTWTMMoRRRRRRRRRRRRo..',
  '..oMTTWMMooRRRYYRRRRo...',
  '...ooMMMMooRRYYYYRRo....',
  '.....oooRRRRRYYYYRRo....',
  '......oRRRRRRYYRRRo.....',
  '.....oRRoRRRRRRRRoRRo...',
  '....oRRRoo.oRRRoo.oRRo..',
  '...oWWWo....oWWo..oWWo..',
]
const BOSS = sprite(BOSS_ROWS, {
  H: '#f3d9a0', o: '#2a0a0a', R: '#d9322b', r: '#7a1818', L: '#ffb4a8',
  Y: '#f5b83d', W: '#ffffff', E: '#ffe14a', K: '#111111', M: '#4a0d0d', T: '#ff8a1f', S: '#4a1010',
})
const BOSS_DEAD = sprite(BOSS_ROWS, {
  H: '#a8a29e', o: '#1c1917', R: '#57534e', r: '#44403c', L: '#a8a29e',
  Y: '#78716c', W: '#d6d3ce', E: '#78716c', K: '#1c1917', M: '#292524', T: '#57534e', S: '#292524',
})
const MOUTH_Y = 8

const K0 = 34
const BX = 124
const K1 = BX - 23
const K2 = BX - 21
const K3 = BX - 19
const HITS = [6, 12, 20]

const rnd = (seed: number) => {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Linear keyframes [frame, value]; clamped outside.
const seg = (f: number, k: [number, number][]) => {
  if (f <= k[0]![0]) return k[0]![1]
  for (let i = 1; i < k.length; i++) {
    const [f1, v1] = k[i]!
    const [f0, v0] = k[i - 1]!
    if (f <= f1) return v0 + ((v1 - v0) * (f - f0)) / (f1 - f0 || 1)
  }
  return k[k.length - 1]![1]
}

const swordAt = (g: number) =>
  seg(g, [
    [0, 60], [3, 60], [4, 170], [5, 170], [6, -15], [7, -15], [8, -25], [9, -25], [10, -40], [11, -40],
    [12, 50], [13, 50], [14, 120], [15, 165], [19, 165], [20, -35], [23, -35], [24, -40], [26, -40],
    [27, 20], [32, 40], [33, 160], [36, 160], [37, 100], [55, 100], [56, 90], [58, 60], [59, 60],
  ])

// ---- effect layers: a set of pixels per named layer, per frame ----
const LAYERS: [string, string, number][] = [
  ['danger', '#ff5a36', 1],
  ['flameO', '#ef4a1c', 1],
  ['flameM', '#ffb02e', 1],
  ['flameC', '#fff3b0', 1],
  ['glow', '#ffb02e', 1],
  ['ember', '#ff8a3d', 1],
  ['ghost3', '#44b7ff', 0.14],
  ['ghost2', '#44b7ff', 0.3],
  ['ghost1', '#44b7ff', 0.55],
  ['dust', '#a8a29e', 0.7],
  // the knight group is placed here
  ['trail3', '#bae6fd', 0.22],
  ['trail2', '#bae6fd', 0.36],
  ['trail1', '#bae6fd', 0.52],
  ['blade', '#f8fafc', 1],
  ['hilt', '#e7b83a', 1],
  ['shield', '#7dd3fc', 1],
  ['shieldHi', '#e0f2fe', 1],
  ['slashB', '#38bdf8', 1],
  ['slashC', '#7dd3fc', 1],
  ['slashL', '#e0f2fe', 1],
  ['slashW', '#ffffff', 1],
  ['ringC', '#ffffff', 0.2],
  ['ringB', '#ffffff', 0.38],
  ['ringA', '#ffffff', 0.62],
  ['sparkO', '#fb923c', 1],
  ['sparkY', '#fde047', 1],
  ['sparkW', '#ffffff', 1],
  ['dmgO', '#2a0a0a', 1],
  ['dmgW', '#ffffff', 1],
  ['dmgY', '#fde047', 1],
  ['bang', '#ffe14a', 1],
]
const KNIGHT_AT = LAYERS.findIndex(l => l[0] === 'trail3')

class Fx {
  m = new Map<string, Set<number>>()
  add(layer: string, x: number, y: number) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= W || y >= H) return
    let s = this.m.get(layer)
    if (!s) this.m.set(layer, (s = new Set()))
    s.add(y * W + x)
  }
  has(layer: string, x: number, y: number) {
    return this.m.get(layer)?.has(y * W + x) ?? false
  }
}

const fline = (fx: Fx, layer: string, x0: number, y0: number, x1: number, y1: number, thick = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5))
  for (let i = 0; i < n + 1; i++) {
    const t = i / n
    for (let k = 0; k < thick; k++) fx.add(layer, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + k - (thick - 1) / 2)
  }
}

const fcrescent = (
  fx: Fx, layer: string, cx: number, cy: number, r: number, a0: number, a1: number,
  tmax: number, grow: number, fade: number, rev: boolean,
) => {
  const R = Math.ceil(r + tmax + 2)
  const span = a1 - a0
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
    for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const dx = x - cx
      const dy = y - cy
      const d = Math.hypot(dx, dy)
      let th = Math.atan2(dy, dx)
      while (th < a0) th += Math.PI * 2
      while (th > a0 + Math.PI * 2) th -= Math.PI * 2
      const u = (th - a0) / span
      if (u < 0 || u > 1 || (rev ? 1 - u : u) > grow) continue
      const thick = tmax * Math.sin(Math.PI * u) * (1 - fade)
      if (Math.abs(d - r) <= thick / 2 + 0.2) fx.add(layer, x, y)
    }
  }
}

const fring = (fx: Fx, layer: string, cx: number, cy: number, r: number) => {
  const n = Math.ceil(r * 7)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    fx.add(layer, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9)
  }
}

const fburst = (
  fx: Fx, x: number, y: number, age: number, seed: number, n: number,
  layers: string[], speed: number, life: number, gravity = 0,
) => {
  if (age < 0 || age > life) return
  for (let i = 0; i < n; i++) {
    const ang = rnd(seed * 31 + i) * Math.PI * 2
    const sp = speed * (0.45 + rnd(seed * 17 + i * 3) * 0.75)
    // a particle thins out near the end of its life instead of fading
    if (age > life * 0.6 && rnd(seed * 7 + i * 13 + age) < (age - life * 0.6) / (life * 0.4)) continue
    fx.add(layers[i % layers.length]!, x + Math.cos(ang) * sp * age, y + Math.sin(ang) * sp * age * 0.8 + gravity * age * age)
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

// A damage number: a dark outline under white (or yellow) 3x5 digits.
const fnumber = (fx: Fx, text: string, x: number, y: number, layer: string, age: number, seed: number) => {
  const ink: [number, number][] = []
  ;[...text].forEach((ch, i) => {
    DIGITS[ch]!.forEach((row, ry) => {
      ;[...row].forEach((c, rx) => {
        if (c !== '1') return
        const px = x + i * 4 + rx
        const py = y + ry
        // a number thins out at the end of its life
        if (age >= 4 && rnd(seed + px * 7 + py * 13 + age) < (age - 3) * 0.28) return
        ink.push([px, py])
      })
    })
  })
  const set = new Set(ink.map(([px, py]) => py * 1000 + px))
  for (const [px, py] of ink) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!set.has((py + dy) * 1000 + px + dx)) fx.add('dmgO', px + dx, py + dy)
      }
    }
  }
  for (const [px, py] of ink) fx.add(layer, px, py)
}

const spritePixels = (s: Sprite, x: number, y: number, sx: number, sy: number, shear: number): [number, number][] => {
  const out: [number, number][] = []
  const ow = Math.max(1, Math.round(s.w * sx))
  const oh = Math.max(1, Math.round(s.h * sy))
  for (let oy = 0; oy < oh; oy++) {
    const row = s.rows[Math.min(s.h - 1, Math.floor(oy / sy))]!
    const dx = shear ? Math.round((shear * (oh - 1 - oy)) / oh) : 0
    for (let ox = 0; ox < ow; ox++) {
      if (row[Math.min(s.w - 1, Math.floor(ox / sx))] !== '.') out.push([x + ox + dx, y + oy])
    }
  }
  return out
}

// ---- poses ----
type Pose = {
  kx: number; ky: number; ksx: number; ksy: number; lean: number; sword: number; guard: boolean
  bdx: number; bsx: number; bsy: number; hitFlash: number; whiten: number; shakeX: number; shakeY: number
}

const POSE_IDLE_BOSS = { bdx: 0, bsx: 1, bsy: 1, hitFlash: 0, whiten: 0, shakeX: 0, shakeY: 0 }

const poseAt = (f: number, phase: Phase): Pose => {
  if (phase === 'won') {
    return { kx: BX - 38, ky: 0, ksx: 1, ksy: 1, lean: 0, sword: -80, guard: false, ...POSE_IDLE_BOSS }
  }
  if (phase === 'idle') {
    const breath = Math.sin((f / LOOP) * Math.PI * 4)
    return {
      kx: K0, ky: Math.round(breath * 0.6), ksx: 1, ksy: 1, lean: 0, sword: 60, guard: false,
      ...POSE_IDLE_BOSS, bsx: breath > 0.5 ? 1.03 : 1, bsy: breath > 0.5 ? 1.04 : 1,
    }
  }

  const guard = f >= 37 && f <= 55
  let kx = seg(f, [
    [0, K0], [3, K0], [4, K0 + 33], [5, K0 + 59], [6, K1], [11, K1], [12, K2], [13, K2], [14, K2 - 11], [15, K2 - 15],
    [18, K2 - 15], [19, K3], [26, K3], [32, K3], [33, K3], [34, K0 + 36], [35, K0 + 11], [36, K0], [59, K0],
  ])
  if (f >= 46 && f <= 55) kx -= seg(f, [[46, 0], [48, 3], [55, 1]])

  const ksx = seg(f, [
    [0, 1], [2, 1], [3, 0.92], [4, 1.35], [5, 1.3], [6, 1], [9, 1], [10, 0.95], [11, 1.2], [12, 1], [13, 1],
    [14, 1.3], [15, 0.93], [18, 0.93], [19, 1.4], [20, 1], [32, 1], [33, 1], [34, 1.35], [35, 1.3], [36, 1], [59, 1],
  ])
  const ksy = seg(f, [
    [0, 1], [2, 1], [3, 1.08], [4, 0.9], [5, 0.92], [6, 1], [9, 1], [10, 1.05], [11, 0.92], [12, 1], [13, 1],
    [14, 0.9], [15, 0.88], [18, 0.88], [19, 0.88], [20, 1], [33, 1], [34, 0.9], [35, 0.92], [36, 1], [59, 1],
  ])
  const lean = seg(f, [
    [3, 0], [4, 3], [5, 3], [6, 0], [10, 0], [11, 2], [12, 0], [13, 0], [14, -3], [15, 0], [18, 0], [19, 4], [20, 0], [33, 0], [34, -3], [35, -3], [36, 0],
  ])

  // the boss: a recoil on each hit, a rise through the telegraph, a kick at the breath
  let bdx = seg(f, [
    [0, 0], [5, 0], [6, 3], [7, 3], [10, 1], [11, 1], [12, 4], [13, 4], [16, 2], [19, 2], [20, 9], [23, 9], [27, 3], [30, 2], [35, 2], [36, 0], [45, 0],
    [46, -2], [48, -1], [52, 0], [59, 0],
  ])
  if (f >= 36 && f <= 45) bdx += f % 2 === 0 ? 1 : -1
  const bsx = seg(f, [
    [0, 1], [5, 1], [6, 1.12], [7, 1.12], [8, 0.97], [9, 1], [11, 1], [12, 1.12], [13, 1.12], [14, 0.97], [15, 1], [19, 1],
    [20, 1.2], [23, 1.2], [24, 0.95], [25, 1.04], [26, 1], [27, 1.03], [35, 1.05], [45, 1.06], [46, 0.95], [48, 1.02], [50, 1], [59, 1],
  ])
  const bsy = seg(f, [
    [0, 1], [5, 1], [6, 0.9], [7, 0.9], [8, 1.05], [9, 1], [11, 1], [12, 0.9], [13, 0.9], [14, 1.05], [15, 1], [19, 1],
    [20, 0.84], [23, 0.84], [24, 1.1], [25, 0.97], [26, 1], [27, 1.04], [35, 1.08], [45, 1.1], [46, 1.05], [48, 0.98], [50, 1], [59, 1],
  ])
  const hitFlash = seg(f, [
    [0, 0], [5, 0], [6, 0.5], [7, 0.15], [8, 0], [11, 0], [12, 0.5], [13, 0.15], [14, 0], [19, 0], [20, 0.65], [21, 0.4], [22, 0.2], [23, 0.1], [24, 0], [59, 0],
  ])
  const whiten = seg(f, [[0, 0], [35, 0], [36, 0.05], [45, 0.5], [46, 0.25], [47, 0], [59, 0]])

  const shakeAmp = seg(f, [
    [0, 0], [5, 0], [6, 1], [7, 1], [8, 0], [11, 0], [12, 1], [13, 1], [14, 0], [19, 0], [20, 2], [22, 2], [23, 1], [25, 1], [26, 0], [59, 0],
  ])
  const sx = shakeAmp > 0 ? (f % 2 === 0 ? 1 : -1) * Math.round(shakeAmp) : 0
  // the heavy third hit chops down, so it shakes up and down too
  const sy = f >= 20 && f <= 23 ? (f % 2 === 0 ? 1 : -1) : 0

  return {
    kx, ky: 0, ksx, ksy, lean,
    sword: guard ? 100 : swordAt(f),
    guard, bdx, bsx, bsy, hitFlash, whiten, shakeX: sx, shakeY: sy,
  }
}

// ---- effects of one frame ----
const FLAME_LEN = [0.55, 1, 0.8, 1, 0.85, 1, 0.85, 1, 0.7, 0.4]
const FLAME_AT = (f: number) => (f >= 46 && f <= 55 ? FLAME_LEN[f - 46]! : f === 56 ? 0.15 : 0)

const effectsAt = (f: number, phase: Phase, p: Pose): Fx => {
  const fx = new Fx()
  const bx = BX + p.bdx
  const ktop = GY - KNIGHT.h * p.ksy + p.ky
  const handX = p.kx + 6 + 3 * p.ksx + (p.lean * 7) / 13
  const handY = GY + p.ky - 7 * p.ksy
  const mouthY = GY - BOSS.h + MOUTH_Y

  const blade = (deg: number, layer: string, thick: number, len = 16) => {
    const a = (deg * Math.PI) / 180
    fline(fx, layer, handX, handY, handX + Math.cos(a) * len, handY - Math.sin(a) * len, thick)
  }

  if (phase === 'fighting') {
    // telegraph: a floor decal from the start, off at the first burst; a mark and a glow in the mouth
    if (f >= 27 && f <= 45 && (f % 2 === 0 || f >= 42)) {
      for (let x = K0 + KNIGHT.w + 4; x < bx - 2; x += 2) fx.add('danger', x, GY - 1)
    }
    if (f >= 28 && f <= 45) {
      for (let y = 3; y <= 7; y++) fx.add('bang', bx - 4, y)
      fx.add('bang', bx - 4, 9)
    }
    if (f >= 38 && f <= 45) {
      const pulse = f % 2 === 0 ? 1 : 0
      for (let y = -1; y <= 1 + pulse; y++) for (let x = 1; x <= 3 + pulse; x++) fx.add('glow', bx + x, mouthY + y)
    }

    // flame: bursts every other frame
    const k = FLAME_AT(f)
    if (k > 0) {
      const knightEdge = K0 + KNIGHT.w + 1
      const len = (bx - knightEdge) * k
      const hmax = 4.5 * (0.6 + 0.4 * k)
      const x0 = bx - 1
      for (let d = 0; d < len; d++) {
        const t = d / Math.max(1, len)
        const hh = 1 + (hmax - 1) * Math.pow(t, 0.7)
        for (let yy = -Math.ceil(hh); yy <= Math.ceil(hh); yy++) {
          const jitter = (rnd(f * 131 + d * 7 + yy) - 0.5) * 1.4
          const r = Math.abs(yy + jitter * 0.4) / hh
          if (r > 1) continue
          if (rnd(f * 17 + d + yy * 5) < 0.18 + t * 0.25) continue
          fx.add(r < 0.35 ? 'flameC' : r < 0.7 ? 'flameM' : 'flameO', x0 - d, mouthY + yy + Math.sin((d + f * 2) / 3) * 0.6)
        }
      }
      if (k > 0.7) {
        fburst(fx, bx - len + 2, GY - 3, (f - 46) % 4, f, 8, ['flameM', 'flameO', 'flameC'], 3.2, 4, 0.5)
        fburst(fx, bx - len + 2, GY - 6, (f - 45) % 4, f + 9, 5, ['ember', 'sparkY'], 2.2, 4, 0.3)
      }
    }

    const dashing = (f >= 4 && f <= 5) || f === 11 || f === 14 || f === 19 || (f >= 34 && f <= 35)
    if (dashing) {
      const backwards = f === 14 || f >= 34
      const step = backwards ? 12 : -12
      ;(['ghost1', 'ghost2', 'ghost3'] as const).forEach((layer, i) => {
        for (const [x, y] of spritePixels(KNIGHT, p.kx + step * (i + 1), ktop, p.ksx, p.ksy, p.lean)) fx.add(layer, x, y)
      })
      for (let i = 0; i < 5; i++) fx.add('dust', p.kx + (backwards ? 8 : 2) - (backwards ? -1 : 1) * i * 3, GY - 1 - (i % 2))
    }

    if (!p.guard) {
      const prev = swordAt(f - 1)
      if (Math.abs(prev - p.sword) > 25) {
        for (let k2 = 1; k2 <= 4; k2++) {
          blade(p.sword + ((prev - p.sword) * k2) / 5, k2 <= 1 ? 'trail1' : k2 <= 2 ? 'trail2' : 'trail3', 2)
        }
      }
      blade(p.sword, 'blade', 2)
      blade(p.sword, 'hilt', 2, 3)
    } else {
      for (let i = 0; i < 7; i++) fx.add('shield', handX + 1, handY - 3 + i)
      fx.add('shieldHi', handX + 2, handY - 2)
      fx.add('shieldHi', handX + 2, handY + 2)
      // the flame breaks on the shield
      if (k > 0.5) {
        fx.add('sparkW', handX + 3, handY - 1 + (f % 3))
        fx.add('sparkY', handX + 4, handY + 1 - (f % 2))
      }
    }

    // [hit frame, from deg, to deg, radius, thickness, reverse]
    const slashes: [number, number, number, number, number, boolean][] = [
      [HITS[0]!, 110, -35, 18, 4, false],
      [HITS[1]!, -60, 80, 18, 4.5, true],
      [HITS[2]!, 160, -55, 20, 8, false],
    ]
    const D2R = Math.PI / 180
    slashes.forEach((s, idx) => {
      const age = f - s[0]
      if (age < 0 || age > 6) return
      const grow = Math.min(1, (age + 1) / 2)
      const fade = Math.max(0, (age - 2) / 4)
      const layer = age < 2 ? 'slashW' : age < 3 ? 'slashL' : age < 5 ? 'slashC' : 'slashB'
      const lo = Math.min(-s[1], -s[2]) * D2R
      const hi = Math.max(-s[1], -s[2]) * D2R
      const rev = (-s[1] > -s[2]) !== s[5]
      fcrescent(fx, layer, handX, handY, s[3], lo, hi, s[4], grow, fade, rev)
      if (idx === 2 && age < 4) fcrescent(fx, 'slashC', handX - 2, handY, s[3] + 4, lo + 0.15, hi - 0.15, 3, grow, fade + 0.2, rev)
      fburst(fx, bx + 2, handY + 1, age, s[0], idx === 2 ? 16 : 9, ['sparkW', 'sparkY', 'sparkO'], idx === 2 ? 5.5 : 3.4, 6, 0.4)
      // a shock ring grows from the point of impact
      if (idx >= 1 && age <= (idx === 2 ? 5 : 3)) {
        fring(fx, age < 2 ? 'ringA' : age < 4 ? 'ringB' : 'ringC', bx + 3, GY - 8, 2 + age * (idx === 2 ? 3.4 : 2.1))
      }
      // the damage numbers rise from the boss's back
      const text = idx === 0 ? '12' : idx === 1 ? '15' : '38'
      if (age <= 7) fnumber(fx, text, bx + 9, 5 - Math.floor(age * 0.5), idx === 2 ? 'dmgY' : 'dmgW', age, s[0] * 11)
    })
  } else {
    blade(p.sword, 'blade', 2)
    blade(p.sword, 'hilt', 2, 3)
  }
  return fx
}

// ---- svg text ----
const n = (v: number) => String(Math.round(v * 1000) / 1000)

const runsPath = (set: Set<number> | undefined) => {
  if (!set || set.size === 0) return 'M0 0'
  const parts: string[] = []
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W) {
      if (set.has(y * W + x)) {
        let len = 1
        while (x + len < W && set.has(y * W + x + len)) len++
        parts.push(`M${x} ${y}h${len}v1h-${len}z`)
        x += len
      } else x++
    }
  }
  return parts.join('')
}

const spritePath = (s: Sprite, color: string | null) => {
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
  return byColor
}

const spriteGroup = (s: Sprite, color: string | null = null) =>
  [...spritePath(s, color)].map(([c, d]) => `<path fill="${c}" d="${d.join('')}"/>`).join('')

const dur = `${LOOP / 20}s`

// Frames that repeat are stored once: runs of equal values share a key time.
const stepAnim = (attr: string, values: string[], kind?: string) => {
  const uniq: string[] = []
  const times: number[] = []
  values.forEach((v, i) => {
    if (i === 0 || v !== values[i - 1]) {
      uniq.push(v)
      times.push(i / values.length)
    }
  })
  const head = kind ? `<animateTransform type="${kind}" ` : '<animate '
  const tag = kind ? 'animateTransform' : 'animate'
  void tag
  if (uniq.length === 1) return ''
  return `${head}attributeName="${attr}" calcMode="discrete" dur="${dur}" repeatCount="indefinite" keyTimes="${times.map(t => n(t)).join(';')}" values="${uniq.join(';')}"/>`
}

const SKY = ['#12112a', '#1a1230', '#2a1530', '#3a1a2c', '#4a1f28']

const EXT = 3000

const background = (phase: Phase) => {
  const rects: string[] = []
  const bandOf = (y: number) => Math.min(SKY.length - 1, Math.floor((y / GY) * SKY.length))
  let y0 = 0
  for (let y = 1; y <= GY; y++) {
    if (y === GY || bandOf(y) !== bandOf(y0)) {
      const top = y0 === 0 ? -EXT : y0
      rects.push(`<rect x="${-EXT}" y="${top}" width="${W + EXT * 2}" height="${y - top}" fill="${SKY[bandOf(y0)]}"/>`)
      y0 = y
    }
  }
  const stars = Array.from({ length: 28 }, (_, i) => {
    const x = Math.floor(rnd(i * 7 + 1) * W)
    const y = Math.floor(rnd(i * 13 + 5) * (GY - 6))
    return `<rect x="${x}" y="${y}" width="1" height="1" fill="#d6d3ce" opacity="0.3"><animate attributeName="opacity" values="0.15;0.9;0.15" dur="${2 + (i % 4)}s" begin="-${(i * 0.7).toFixed(1)}s" repeatCount="indefinite"/></rect>`
  }).join('')
  const moon: string[] = []
  for (let y = -6; y <= 6; y++) {
    const half = Math.floor(Math.sqrt(36 - y * y))
    moon.push(`M${170 - half} ${6 + y}h${half * 2}v1h-${half * 2}z`)
  }
  const ridge: string[] = []
  for (let x = 0; x < W; x++) {
    const h = 5 + Math.round(2.5 * Math.sin(x / 7) + 2 * Math.sin(x / 3.1 + 1) + 1.5 * Math.sin(x / 13))
    ridge.push(`M${x} ${GY - h}h1v${h}h-1z`)
  }
  const ticks = Array.from({ length: Math.ceil((W + 72) / 9) + 1 }, (_, i) => `M${i * 9} ${GY + 1}h3v1h-3z`).join('')
  const scroll =
    phase === 'fighting'
      ? `<animateTransform attributeName="transform" type="translate" from="0 0" to="-72 0" dur="${dur}" repeatCount="indefinite"/>`
      : ''
  const embers = Array.from({ length: 10 }, (_, i) => {
    const x = 6 + Math.floor(rnd(i * 5 + 3) * (W - 12))
    const d = 3 + (i % 4)
    return `<rect x="${x}" y="${GY}" width="1" height="1" fill="#ff8a3d" opacity="0"><animate attributeName="y" values="${GY};2" dur="${d}s" begin="-${(i * 0.9).toFixed(1)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.8;0.8;0" keyTimes="0;0.15;0.7;1" dur="${d}s" begin="-${(i * 0.9).toFixed(1)}s" repeatCount="indefinite"/></rect>`
  }).join('')
  return (
    rects.join('') + stars +
    `<path fill="#5a1f2c" d="${moon.join('')}"/>` +
    `<path fill="#1a1432" d="${ridge.join('')}"/>` +
    `<rect x="${-EXT}" y="${GY}" width="${W + EXT * 2}" height="${EXT}" fill="#2b211e"/>` +
    `<rect x="${-EXT}" y="${GY}" width="${W + EXT * 2}" height="1" fill="#4a3b34"/>` +
    `<g fill="#3a2e29">${scroll}<path d="${ticks}"/></g>` +
    embers
  )
}

export const buildSvg = (phase: Phase): string => {
  const poses: Pose[] = []
  const fxs: Fx[] = []
  for (let f = 0; f < LOOP; f++) {
    const p = poseAt(f, phase)
    poses.push(p)
    fxs.push(effectsAt(f, phase, p))
  }

  const worldTr = poses.map(p => `${p.shakeX} ${p.shakeY}`)
  const kTr = poses.map(p => `${n(p.kx + 6)} ${n(GY + p.ky)}`)
  const kSc = poses.map(p => `${n(p.ksx)} ${n(p.ksy)}`)
  const kSk = poses.map(p => n((Math.atan(-p.lean / (KNIGHT.h * p.ksx)) * 180) / Math.PI))
  const bTr = poses.map(p => `${n(BX + p.bdx - (p.bsx - 1) * 12)} ${GY}`)
  const bSc = poses.map(p => `${n(p.bsx)} ${n(p.bsy)}`)
  const hitFlash = poses.map(p => n(p.hitFlash))
  const whiten = poses.map(p => n(p.whiten))

  const boss = phase === 'won' ? BOSS_DEAD : BOSS
  // the static attribute is the first frame, so a group whose frames never differ (no animation is written) still sits right
  const bossGroup =
    phase === 'won'
      ? `<g transform="translate(${BX} ${GY}) scale(1.25 0.3)">${spriteGroup(boss)}</g>`
      : `<g transform="translate(${bTr[0]})">${stepAnim('transform', bTr, 'translate')}<g transform="scale(${bSc[0]})">${stepAnim('transform', bSc, 'scale')}` +
        `${spriteGroup(boss)}<g opacity="${hitFlash[0]}">${stepAnim('opacity', hitFlash)}${spriteGroup(boss, '#ff8f7d')}</g>` +
        `<g opacity="${whiten[0]}">${stepAnim('opacity', whiten)}${spriteGroup(boss, '#ffffff')}</g></g></g>`

  const knightGroup =
    `<g transform="translate(${kTr[0]})">${stepAnim('transform', kTr, 'translate')}<g transform="scale(${kSc[0]})">${stepAnim('transform', kSc, 'scale')}` +
    `<g transform="skewX(${kSk[0]})">${stepAnim('transform', kSk, 'skewX')}<g transform="translate(-6 0)">${spriteGroup(KNIGHT)}</g></g></g></g>`

  const layerPaths = (names: [string, string, number][]) =>
    names
      .map(([name, fill, op]) => {
        const sets = fxs.map(fx => fx.m.get(name))
        if (sets.every(s => !s || s.size === 0)) return ''
        const vals = sets.map(runsPath)
        return `<path fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''} d="${vals[0]!}">${stepAnim('d', vals)}</path>`
      })
      .join('')

  let confetti = ''
  if (phase === 'won') {
    const cols = ['#e7b83a', '#e11d48', '#3b82f6', '#4ade80']
    confetti = Array.from({ length: 30 }, (_, i) => {
      const x = 20 + Math.floor(rnd(i * 3 + 1) * (W - 40))
      const d = 1.6 + (i % 5) * 0.35
      return `<rect x="${x}" y="-3" width="1" height="1" fill="${cols[i % 4]}"><animate attributeName="y" values="-3;${H}" dur="${d}s" begin="-${(i * 0.37).toFixed(2)}s" repeatCount="indefinite"/></rect>`
    }).join('')
  }
  let zzz = ''
  if (phase === 'idle') {
    zzz = [0, 1].map(i =>
      `<g fill="#a8a29e" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="3s" begin="-${i * 1.5}s" repeatCount="indefinite"/>` +
      `<animateTransform attributeName="transform" type="translate" values="0 6;0 -6" dur="3s" begin="-${i * 1.5}s" repeatCount="indefinite"/>` +
      `<path d="M${BX + 22} 8h3v1h-2v1h2v1h-3v-1h2v-1h-2z"/></g>`).join('')
  }

  const worldAnim = phase === 'fighting' ? stepAnim('transform', worldTr, 'translate') : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" shape-rendering="crispEdges">` +
    `<g>${worldAnim}${background(phase)}${bossGroup}` +
    layerPaths(LAYERS.slice(0, KNIGHT_AT)) + knightGroup + layerPaths(LAYERS.slice(KNIGHT_AT)) +
    `${confetti}${zzz}</g></svg>`
  )
}
