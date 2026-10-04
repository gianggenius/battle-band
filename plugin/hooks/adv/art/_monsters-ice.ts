// Ice: crystal slime, snow wolf, snowflake spirit, and the Yeti King. All face LEFT.
import { sprite } from '../pixel'
import type { BossDef, MonsterDef } from '../types'

const SLIME = sprite(
  [
    '......o........',
    '...o.oho...o...',
    '..oloohlo.olo..',
    '..ohmohloolmo..',
    '...ohlhlmmlmo..',
    '..olhllmmmmmdo.',
    '.olhlmmmmmmmmdo',
    '.omomlmmmommmdo',
    'ommoommoommmddo',
    'ommhommhommmldo',
    'olmmmohommmlddo',
    '.odddddddddddo.',
  ],
  { o: '#0b2a3d', d: '#0e7490', m: '#5fd4ee', l: '#bdf4ff', h: '#ffffff' },
)

const WOLF = sprite(
  [
    '.....o.o........',
    '....ododo....oo.',
    '...odmmmdo..oldo',
    '..odmmmmmdoolmdo',
    '.olmemmmddddddo.',
    'olmmmmmllmmmmmdo',
    '.orwrolllmmmmdo.',
    '.owwoolllmmmddo.',
    '..oo.olmdoommdo.',
    '.....omdo.omdo..',
    '....olmdoolmdo..',
  ],
  { o: '#0f1e2e', d: '#8fa7bf', m: '#cfdbe8', l: '#f6f9fc', e: '#7dd3fc', r: '#6b1d2a', w: '#f8fafc' },
)

const FLAKE_PAL = { o: '#0c1e3a', d: '#2563eb', m: '#93c5fd', l: '#e0f2fe', w: '#ffffff' }
const FLAKE_A = sprite(
  [
    '....ooloo....',
    '...olololo...',
    '....olmlo....',
    '.o.omdddmo.o.',
    'olomwdwddmolo',
    'ollmdddddmllo',
    'olomdddddmolo',
    '.o.omdddmo.o.',
    '....olmlo....',
    '...olololo...',
    '....ooloo....',
  ],
  FLAKE_PAL,
)

const FLAKE_B = sprite(
  [
    'olo.......olo',
    '.olo.....olo.',
    '..olooooolo..',
    '...omdddmo...',
    '..omwdwddmo..',
    '..omdddddmo..',
    '..omdddddmo..',
    '...omdddmo...',
    '..olooooolo..',
    '.olo.....olo.',
    'olo.......olo',
  ],
  FLAKE_PAL,
)

export const ICE: MonsterDef[] = [
  { id: 'ice-slime', name: 'Slime băng', sprite: SLIME, hits: 2, attack: 'hop', dust: '#5fd4ee' },
  { id: 'ice-wolf', name: 'Sói tuyết', sprite: WOLF, hits: 3, attack: 'charge', dust: '#cfdbe8' },
  { id: 'ice-spirit', name: 'Tinh linh tuyết', sprite: FLAKE_A, sprite2: FLAKE_B, hover: 5, hits: 2, attack: 'swoop', dust: '#93c5fd' },
]

const YETI = sprite(
  [
    '....ooCo.o...ooo........',
    '...oCocCoCo.olllooo.....',
    '..okckcCkckolllmlllo....',
    '.olkccccccklllllllmmoo..',
    'olllllllllmmllllmmmmmdo.',
    'obbbmbbbmmmmmmmmdmmmmmdo',
    'osesssesmmmmmmmdmmmmdddo',
    'ossbbssmmmmmmmmmmmmdmddo',
    'orrrrsmmmmmmmmmmmmdmdddo',
    'olrlrrsmmmmmdmmmmmmddddo',
    'orrrrrmmmmmdbmmmmmdddddo',
    'olrlrmmmmmdbddmmddddbdo.',
    '.ommmmmmmdbddddddddbdo..',
    '..ommmmmmdbdddddddbddo..',
    '..olmmmmmmdooodmmmbmmdo.',
    '.olmmmmmmmdo.odmmmmmmdo.',
    '.oddddddddo..oddddddddo.',
  ],
  { o: '#0c1a2e', b: '#4f6f94', d: '#8aabcc', m: '#cfe0f0', l: '#ffffff', s: '#62809f', r: '#3b0f2a', e: '#38bdf8', k: '#0e7490', c: '#22d3ee', C: '#cffafe' },
)

export const ICE_BOSS: BossDef = {
  id: 'ice-boss', name: 'Vua Yeti', sprite: YETI, hits: 10, attack: 'charge', dust: '#cfe0f0', special: 'iceBreath', mouth: { x: 0, y: 10 },
}
