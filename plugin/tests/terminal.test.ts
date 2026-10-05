import { describe, expect, mock, test, tier } from 'claude-code/testing'

tier('user')

const T0 = Date.parse('2026-10-04T14:00:00Z')

const band = (columns: number, over: object = {}) =>
  ({ hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: columns, scroll: { offset: 0, bodyRows: 20 }, view: {}, ...over }) as never

type Node = { type?: string; props?: { columns?: number; rows?: number; cells?: string; key?: string }; children?: unknown[] }

// every node of a drawing, children that are arrays flattened
const walk = (t: unknown, out: Node[] = []): Node[] => {
  if (Array.isArray(t)) t.forEach(c => walk(c, out))
  else if (t && typeof t === 'object') {
    out.push(t as Node)
    for (const c of (t as Node).children ?? []) walk(c, out)
  }
  return out
}

// the text a node shows, nested Text included
const textOf = (t: unknown): string => {
  if (typeof t === 'string') return t
  if (Array.isArray(t)) return t.map(textOf).join('')
  if (t && typeof t === 'object') return textOf((t as Node).children ?? [])
  return ''
}

const raster = (tree: unknown) => walk(tree).find(n => n.type === 'Raster')
// the two lines of the roads (not the spans inside them)
const roads = (tree: unknown) => walk(tree).filter(n => n.type === 'Text' && /^(5H|1W) /.test(textOf(n)) && textOf(n).length > 10)

type Body = Extract<Parameters<typeof test>[1], (...args: never[]) => unknown>
type Test$ = Parameters<Body>[0]
type On = Parameters<Body>[1]
type Blit = { requestId: string; key: string; cells: string; columns?: number; rows?: number }

const windows = (five: number, week: number) => [
  { kind: 'five_hour', percentUsed: five, resetsAt: new Date(T0 + 2.2 * 3600_000).toISOString() },
  { kind: 'seven_day', percentUsed: week, resetsAt: new Date(T0 + 5.1 * 86400_000).toISOString() },
]

// the plugin on a terminal, with a clock the test moves; every repaint it sends is kept (and taken, or refused with `deny`)
const setup = async ($: Test$, on: On, columns: number, props: object = {}, deny?: string) => {
  const clock = mock.clock(on, { now: T0 + 12_345 })
  const blits: Blit[] = []
  // beneath the plugin: what the engine draws when the plugin leaves the band alone
  if ((props as { hasSurvey?: boolean }).hasSurvey) on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: 'engine' }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: 'ok' }) as never)
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('session.usage', () => ({ value: { startedAt: T0, context: { window: 200000 }, rateLimits: [] } }) as never)
  on('ui.blit', ($, e) => {
    blits.push(e as Blit)
    return { value: deny ? { deny } : {} } as never
  })
  const ui = await $.ui.mount({ plugin: 'battle-band', surface: 'terminal', component: 'AbovePrompt', props: band(columns, props), viewport: { columns, rows: 40 } })
  return { clock, ui, blits }
}

const words = (cells: string) => {
  const bin = atob(cells)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Uint32Array(bytes.buffer)
}

describe('the terminal band', () => {
  test('is two roads as text above one Raster of cells, and nothing of the desktop kind', async ($, on) => {
    const t = await setup($, on, 200)
    const tree = await t.ui.drawn()
    const nodes = walk(tree)
    expect(nodes.some(n => n.type === 'Svg')).toBe(false)
    const r = raster(tree)!
    expect(r.props?.columns).toBe(190)
    expect(r.props?.rows).toBe(10)
    expect(r.props?.key).toBe('scene')
    // 190 x 10 cells of three u32 words, base64
    expect(r.props?.cells?.length).toBe(Math.ceil((190 * 10 * 12) / 3) * 4)
    const lines = roads(tree)
    expect(lines).toHaveLength(2)
    expect(textOf(lines[0])).toContain('5H')
    expect(textOf(lines[0])).toContain('no data yet')
    expect(textOf(lines[1])).toContain('1W')
    await t.ui.unmount()
  })

  test('every cell is a half block of two colours or a plain space', async ($, on) => {
    const t = await setup($, on, 120)
    const w = words(raster(await t.ui.drawn())!.props!.cells!)
    expect(w.length).toBe(120 * 10 * 3)
    for (let i = 0; i < w.length; i += 3) {
      expect([0x20, 0x2580]).toContain(w[i])
      expect(w[i + 1]).toBeLessThan(0x1000000)
      expect(w[i + 2]).toBeLessThan(0x1000000)
      if (w[i] === 0x20) expect(w[i + 1]).toBe(w[i + 2])
    }
    await t.ui.unmount()
  })

  test('the roads say what the engine knows, and take a new reading at once', async ($, on) => {
    const t = await setup($, on, 120)
    await $.session.measure({ context: { window: 200000 }, rateLimits: windows(37, 12.5), changed: ['rateLimits'] } as never)
    await t.clock.settle()
    const lines = roads(await t.ui.drawn())
    expect(textOf(lines[0])).toContain('37%')
    expect(textOf(lines[0])).toContain('2h12m')
    expect(textOf(lines[1])).toContain('12.5%')
    expect(textOf(lines[1])).toContain('5d2h')
    // a road is as wide as its line: the label, the road, an end and the numbers
    expect(textOf(lines[0]).length).toBe(120)
    await t.ui.unmount()
  })

  test('a narrower terminal is cropped around the action, a narrow one shrinks the picture', async ($, on) => {
    const t = await setup($, on, 150)
    for (const [columns, cols, rows] of [
      [150, 150, 10],
      [126, 126, 10],
      [100, 100, 9],
      [80, 80, 7],
    ] as const) {
      await t.ui.redraw(band(columns))
      const r = raster(await t.ui.drawn())!
      expect([columns, r.props?.columns, r.props?.rows]).toEqual([columns, cols, rows])
      expect(r.props?.cells?.length).toBe(Math.ceil((cols * rows * 12) / 3) * 4)
    }
    await t.ui.unmount()
  })

  test('a short room drops the roads and shrinks the picture to the rows it has', async ($, on) => {
    const t = await setup($, on, 200, { maxRows: 7 })
    const tree = await t.ui.drawn()
    expect(roads(tree)).toHaveLength(0)
    const r = raster(tree)!
    expect(r.props?.rows).toBeLessThanOrEqual(7)
    expect(r.props?.columns).toBeLessThan(190)
    await t.ui.unmount()
  })

  test('the knight at his fight and at his camp are different pictures', async ($, on) => {
    const t = await setup($, on, 160)
    const resting = raster(await t.ui.drawn())!.props!.cells
    await t.ui.redraw(band(160, { isWorking: true }))
    await t.clock.advance(5000)
    // five seconds into the first lap
    const fighting = t.blits[t.blits.length - 1]!.cells
    expect(fighting).not.toBe(resting)
    expect(fighting.length).toBe(resting!.length)
    await t.ui.unmount()
  })

  test('a repaint is sent in place, of the size drawn, and the picture moves between repaints', async ($, on) => {
    const t = await setup($, on, 160, { isWorking: true })
    const r = raster(await t.ui.drawn())!
    // the first second of a lap is dark and fading in; a frame the same as the last is not sent again
    await t.clock.advance(3000)
    expect(t.blits.length).toBeGreaterThan(10)
    for (const b of t.blits) {
      expect(b.key).toBe('scene')
      expect(b.columns).toBe(r.props?.columns)
      expect(b.rows).toBe(r.props?.rows)
      expect(b.cells.length).toBe(r.props?.cells?.length)
    }
    expect(new Set(t.blits.map(b => b.cells)).size).toBeGreaterThan(5)
    await t.ui.unmount()
  })

  test('the fight is repainted faster than the camp', async ($, on) => {
    const t = await setup($, on, 160)
    await t.clock.advance(3000)
    const resting = t.blits.length
    await t.ui.redraw(band(160, { isWorking: true }))
    await t.clock.advance(3000)
    const fighting = t.blits.length - resting
    expect(resting).toBeGreaterThan(5)
    expect(fighting).toBeGreaterThan(resting + 8)
    await t.ui.unmount()
  })

  test('the picture goes on into the next place, and stops for a band the terminal no longer shows', async ($, on) => {
    const t = await setup($, on, 160, { isWorking: true })
    await t.clock.advance(49_000)
    expect(t.blits.length).toBeGreaterThan(500)
    await t.ui.unmount()
  })

  test('a band the terminal refuses over and over is given up on', async ($, on) => {
    const t = await setup($, on, 160, { isWorking: true }, 'not mounted')
    await t.clock.advance(5000)
    expect(t.blits.length).toBeLessThan(40)
    await t.ui.unmount()
  })

  test('a survey holds the band: nothing is drawn and nothing repainted', async ($, on) => {
    const t = await setup($, on, 160, { hasSurvey: true })
    expect(raster(await t.ui.drawn())).toBeUndefined()
    await t.clock.advance(1000)
    expect(t.blits).toHaveLength(0)
    await t.ui.unmount()
  })
})
