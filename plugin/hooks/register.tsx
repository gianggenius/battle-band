import type { EngineInterface, Register, Timer } from 'claude-code'

import { buildAdventure } from './adv/adventure'
import { buildCamp, CAMP_ALT } from './adv/camp'
import { BAND_H, W } from './adv/consts'
import { advance, begin, initial, stop, untilBoundary } from './adv/progress'
import type { Progress } from './adv/progress'
import { stripParts } from './adv/usage'
import type { Limit } from '../types'

// The app rebuilds the picture's frame from scratch every time the engine answers a draw, so the picture starts over at that moment.
// That settles the design: the picture is a function of the clock (each answer says where in the lap he is right now), draws are rare
// (the app's own working flag, the end of a lap, a window resize), and nothing is kept in $.state, whose writes would draw again.

// the swap to the next place lands inside the dark moment at the end of a lap (it lasts from 0.1 s before the lap's end to 0.6 s after)
const SWAP_LAG_MS = 300
// the app's working flag normally draws the change; if it has not within this, the turn hooks do
const WAIT_MS = 250
// the first reading of the rate-limit windows is put on the picture at once if he is resting (the engine sends it after the turn)
const FIRST_READING_MS = 1500
// one character cell of the app's code font, in CSS pixels, to size the frame; a little off only leaves a margin of scenery
const CELL_PX = 8
// one row of the band's window, a little under the app's line height
const ROW_PX = 19

const PLACE = { dungeon: 'the dungeon', plateau: 'the plateau', ice: 'the frozen lands', volcano: 'the volcano' } as const

// state of this session's plugin; module scope, because `$` may only be passed to functions declared at the top of the file
let walk: Progress = initial // where he is: `pos` seconds into `biome` at `since`, and whether the clock is running
let turnOn = false // a main turn is between turn.start and turn.complete
let propsOn = false // the app said, at the last draw, that the session is working
let drawnOn = false // whether the last picture drawn was the adventure
let latest: Limit[] = [] // the rate-limit windows as the engine last reported them
let drawnLimits = '[]' // the windows on the picture last drawn, as text
let askedAt = -Infinity // when the engine was last asked for the windows
let boundary: Timer | undefined // the end of the lap he is walking
let waiting: Timer | undefined // the wait for the app's own draw after a turn starts or ends

const working = () => propsOn || turnOn

const pick = (all: readonly { kind: string; percentUsed: number; resetsAt?: string }[]): Limit[] =>
  all
    .filter(l => l.kind === 'five_hour' || l.kind === 'seven_day')
    .map(l => ({ kind: l.kind, percentUsed: l.percentUsed, ...(l.resetsAt ? { resetsAt: l.resetsAt } : {}) }))

// a timer's work runs on its own: a failure there must not surface anywhere
const quiet = (work: Promise<unknown>): void => void work.catch(() => undefined)

// the frame is as tall as the band is wide times the band's own ratio, so the picture fills it; but never taller than the band's
// window is (a short window would scroll the picture), and at least 60 px
const frameHeight = (columns: number, rows: number): number =>
  Math.max(60, Math.min(250, rows * ROW_PX, Math.max(90, Math.round((columns * CELL_PX * BAND_H) / W))))

// the end of the lap: the walk moves on to the next place, and the picture is drawn again
const tick = async ($: EngineInterface): Promise<void> => {
  const now = await $.clock.now()
  walk = advance(walk, now)
  $.ui.invalidate('ui.render')
}

const arm = ($: EngineInterface, cur: Progress, now: number): void => {
  boundary?.cancel()
  boundary = undefined
  if (!cur.running) return
  boundary = $.clock.after(untilBoundary(cur, now) + SWAP_LAG_MS, () => {
    boundary = undefined
    quiet(tick($))
  })
}

// give the app a moment to draw the change itself, then draw it if it has not
const settleSoon = ($: EngineInterface): void => {
  waiting?.cancel()
  waiting = $.clock.after(WAIT_MS, () => {
    waiting = undefined
    if (drawnOn !== working()) $.ui.invalidate('ui.render')
  })
}

// the first draw of a session: what does the engine already know of the windows?
const readWindows = async ($: EngineInterface, now: number): Promise<void> => {
  if (latest.length > 0 || now - askedAt < 60_000) return
  askedAt = now
  try {
    latest = pick((await $.session.usage()).rateLimits)
  } catch {
    // nothing to read yet: the first measure of the session fills it in
  }
}

export const register: Register = on => {
  on('turn.start', async ($, e, next) => {
    // the app's working flag usually draws this by itself; this is the backup for when it does not
    turnOn = true
    settleSoon($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // a subagent's turn is not the end of the session's work
    if (e.agentId === undefined) {
      turnOn = false
      settleSoon($)
    }
    return next(e)
  })

  // pushed by the engine after each turn and whenever a rate-limit window moves a whole point; the picture takes the windows the
  // next time it is drawn (every lap, every turn), except the very first reading, which goes up at once when he is resting
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      const first = latest.length === 0
      latest = pick(e.rateLimits)
      if (first && latest.length > 0 && drawnLimits === '[]' && !working()) {
        waiting?.cancel()
        waiting = $.clock.after(FIRST_READING_MS, () => {
          waiting = undefined
          $.ui.invalidate('ui.render')
        })
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.surface !== 'desktop') {
      return next(e)
    }
    try {
      const now = await $.clock.now()
      propsOn = e.props.isWorking === true
      if (working() && !walk.running) walk = begin(walk, now)
      else if (!working() && walk.running) walk = stop(walk, now)
      const cur = advance(walk, now)
      arm($, cur, now)
      await readWindows($, now)
      const usage = stripParts(latest, now)
      drawnLimits = JSON.stringify(latest)
      drawnOn = cur.running
      const alt = cur.running
        ? `A knight fights through ${PLACE[cur.biome]}: three monsters, then the boss${cur.tier > 0 ? `, lap ${cur.tier + 1}, the monsters are elite` : ''}`
        : `${CAMP_ALT} in ${PLACE[cur.biome]}`
      const source = cur.running ? buildAdventure(cur.biome, cur.tier, cur.pos, usage) : buildCamp(cur.biome, usage)
      const { Box, Svg } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Svg source={source} alt={`${alt}. ${usage.alt}`} isInteractive height={frameHeight(e.props.bodyColumns || 100, e.props.scroll?.bodyRows || 11)} />
        </Box>
      )
    } catch {
      return next(e)
    }
  })
}
