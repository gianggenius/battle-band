import { describe, expect, mock, test, tier } from 'claude-code/testing'

tier('user')

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 12,
  bodyColumns: 96,
  scroll: { offset: 0, bodyRows: 11 },
  view: {},
} as never
const WORKING = { ...(BAND as object), isWorking: true } as never

const T0 = Date.parse('2026-10-04T14:00:00Z')
const LIMIT = 131072

type Node = { type?: string; props?: { source?: string; alt?: string; height?: number; isInteractive?: boolean }; children?: unknown[] }

const walk = (t: unknown, out: Node[] = []): Node[] => {
  const n = t as Node
  if (n && typeof n === 'object') {
    out.push(n)
    for (const c of n.children ?? []) walk(c, out)
  }
  return out
}

type Test$ = Parameters<Parameters<typeof test>[1]>[0]
type On = Parameters<Parameters<typeof test>[1]>[1]

// the plugin on the desktop, with a clock the test moves and the engine's own answers beneath it
const setup = async ($: Test$, on: On, known: { kind: string; percentUsed: number; resetsAt?: string }[] = []) => {
  const clock = mock.clock(on, { now: T0 })
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: 'ok' }) as never)
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('session.usage', () => ({ value: { startedAt: T0, context: { window: 200000 }, rateLimits: known } }) as never)
  const ui = await $.ui.mount({ plugin: 'battle-band', surface: 'desktop', component: 'AbovePrompt', props: BAND, viewport: { columns: 120, rows: 40 } })
  const picture = async () => {
    const svgs = walk(await ui.drawn()).filter(n => n.type === 'Svg')
    expect(svgs).toHaveLength(1)
    return svgs[0]!.props!
  }
  return { clock, ui, picture }
}

const start = ($: Test$, id: string) => $.turn.start({ text: 'hello', turnId: id })
const finish = ($: Test$, id: string, extra: object = {}) =>
  $.turn.complete({ turnId: id, answer: 'ok', durationMs: 1000, isAborted: false, reason: 'answer', ...extra } as never)
const measure = ($: Test$, rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]) =>
  $.session.measure({ context: { window: 200000 }, rateLimits, changed: ['rateLimits'] } as never)

describe('the band', () => {
  test('is one picture, sized to the band, and nothing else', async ($, on) => {
    const t = await setup($, on)
    const nodes = walk(await t.ui.drawn())
    expect(nodes.some(n => n.type === 'Text' || n.type === 'Button')).toBe(false)
    const p = await t.picture()
    expect((p.source ?? '').length).toBeLessThan(LIMIT)
    expect(p.isInteractive).toBe(true)
    // 96 columns of about 8 px, in the band's own 190 : 31 ratio
    expect(p.height).toBe(125)
    // a short window (6 rows) takes a shorter picture
    await t.ui.redraw({ ...(BAND as object), scroll: { offset: 0, bodyRows: 6 } } as never)
    expect((await t.picture()).height).toBe(114)
    expect(p.alt).toContain('rests by a campfire')
    expect(p.alt).toContain('chưa có số liệu')
    expect(p.source).not.toMatch(/attributeName="(xlink:)?href"/)
    await t.ui.unmount()
  })

  test('draws nothing on the terminal', async ($, on) => {
    on('ui.render', ($, e) => $.ui.resolve(e).Text({ children: 'engine' }))
    const ui = await $.ui.mount({ plugin: 'battle-band', surface: 'terminal', component: 'AbovePrompt', props: BAND, viewport: { columns: 120, rows: 40 } })
    expect(walk(await ui.drawn()).some(n => n.type === 'Svg')).toBe(false)
    await ui.unmount()
  })
})

describe('the walk', () => {
  test('the app saying the session works takes the knight out of camp, and its stopping brings him back', async ($, on) => {
    const t = await setup($, on)
    await t.ui.redraw(WORKING)
    const walking = await t.picture()
    expect(walking.alt).toContain('fights through the dungeon')
    expect((walking.source ?? '').length).toBeLessThan(LIMIT)
    await t.ui.redraw(BAND)
    expect((await t.picture()).alt).toContain('rests by a campfire in the dungeon')
    await t.ui.unmount()
  })

  test('crosses the places in order, and the dungeon comes round again, harder', async ($, on) => {
    const t = await setup($, on)
    await t.ui.redraw(WORKING)
    const seen: string[] = []
    const sources = new Set<string>()
    for (let lap = 0; lap < 5; lap++) {
      const p = await t.picture()
      seen.push(p.alt ?? '')
      sources.add(p.source ?? '')
      expect((p.source ?? '').length).toBeLessThan(LIMIT)
      // the lap ends, the plugin draws again by itself
      await t.clock.advance(lap === 0 ? 48_300 : 48_000)
    }
    expect(seen[0]).toContain('the dungeon')
    expect(seen[1]).toContain('the plateau')
    expect(seen[2]).toContain('the frozen lands')
    expect(seen[3]).toContain('the volcano')
    expect(seen[4]).toContain('the dungeon')
    expect(seen[4]).toContain('lap 2')
    expect(sources.size).toBe(5)
    await t.ui.unmount()
  })

  test('a drawing made in the middle of a lap starts the picture at that moment of the lap', async ($, on) => {
    const t = await setup($, on)
    await t.ui.redraw(WORKING)
    expect((await t.picture()).source).not.toContain('begin="-20s"')
    // something draws again twenty seconds in (a window resize, say): the new picture joins the lap where it is
    await t.clock.advance(20_000)
    await t.ui.redraw({ ...(WORKING as object), bodyColumns: 100 } as never)
    expect((await t.picture()).source).toContain('begin="-20s"')
    await t.ui.unmount()
  })

  test('the next stretch of work picks the walk up where the last one stopped, not where the rest ended', async ($, on) => {
    const t = await setup($, on)
    await t.ui.redraw(WORKING)
    await t.clock.advance(20_000)
    await t.ui.redraw(BAND)
    expect((await t.picture()).alt).toContain('rests by a campfire')
    // an hour of rest does not count as walking
    await t.clock.advance(3_600_000)
    await t.ui.redraw(WORKING)
    const resumed = await t.picture()
    expect(resumed.alt).toContain('fights through the dungeon')
    expect(resumed.source).toContain('begin="-20s"')
    await t.ui.unmount()
  })

  test('the turn hooks draw the change when the app does not', async ($, on) => {
    const t = await setup($, on)
    await start($, 't1')
    await t.clock.advance(300)
    expect((await t.picture()).alt).toContain('fights through')
    await finish($, 't1')
    await t.clock.advance(300)
    expect((await t.picture()).alt).toContain('rests by a campfire')
    await t.ui.unmount()
  })

  test('a subagent finishing does not send the knight to camp', async ($, on) => {
    const t = await setup($, on)
    await start($, 't1')
    await t.clock.advance(300)
    await finish($, 't1', { agentId: 'sub' })
    await t.clock.advance(1000)
    expect((await t.picture()).alt).toContain('fights through')
    await t.ui.unmount()
  })
})

describe('the usage strip', () => {
  const windows = (five: number, week: number) => [
    { kind: 'five_hour', percentUsed: five, resetsAt: new Date(T0 + 2.2 * 3600_000).toISOString() },
    { kind: 'seven_day', percentUsed: week, resetsAt: new Date(T0 + 5.1 * 86400_000).toISOString() },
  ]

  test('the first reading goes on the picture soon after it arrives, while the knight rests', async ($, on) => {
    const t = await setup($, on)
    await measure($, windows(37, 12.5))
    await t.clock.advance(2000)
    const p = await t.picture()
    expect(p.alt).toContain('đã dùng 37%')
    expect(p.alt).toContain('đã dùng 12.5%')
    expect(p.alt).toContain('2 giờ 12 phút')
    expect((p.source ?? '').length).toBeLessThan(LIMIT)
    await t.ui.unmount()
  })

  test('later readings wait for the next picture, so the frame is not rebuilt for a few pixels', async ($, on) => {
    const t = await setup($, on)
    await measure($, windows(37, 12.5))
    await t.clock.advance(2000)
    const before = (await t.picture()).source
    await measure($, windows(41, 13))
    await t.clock.advance(5000)
    expect((await t.picture()).source).toBe(before)
    // the next drawing carries them
    await t.ui.redraw(WORKING)
    expect((await t.picture()).alt).toContain('đã dùng 41%')
    await t.ui.unmount()
  })

  test('the engine is asked what it knows when the picture is first drawn', async ($, on) => {
    const t = await setup($, on, windows(55, 20))
    expect((await t.picture()).alt).toContain('đã dùng 55%')
    await t.ui.unmount()
  })

  test('a window that has already reset starts over', async ($, on) => {
    const t = await setup($, on)
    await measure($, [{ kind: 'five_hour', percentUsed: 80, resetsAt: new Date(T0 - 60_000).toISOString() }])
    await t.clock.advance(2000)
    expect((await t.picture()).alt).toContain('đã làm mới')
    await t.ui.unmount()
  })
})
