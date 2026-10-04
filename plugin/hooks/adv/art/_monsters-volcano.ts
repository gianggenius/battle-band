// Volcano: lava slime, imp, ember bat, and the Fire Demon (the boss of scene-v1). All face LEFT.
import { sprite } from '../pixel'
import type { BossDef, MonsterDef } from '../types'

const LAVA = sprite(
  [
    '....ooo.ooo....',
    '...okKkokKko...',
    '..okKKkykKKko..',
    '.oyKkymmykKkko.',
    'oymomyymmommkro',
    'ommoommmoommkro',
    'ommhommmhommrro',
    'oymmmmoommmmrro',
    'ommyymmmmyymrro',
    '.orrrrrrrrrrro.',
  ],
  { o: '#1a0806', k: '#2e211d', K: '#5a4740', r: '#b4320c', m: '#f97316', y: '#fde047', h: '#fff7cc' },
)

const IMP = sprite(
  [
    '..oHo...oHo...',
    '..oHoooooHo...',
    '...oHlmmmHooo.',
    '..ommddmmdowwo',
    '..omoememdodwo',
    '.oomotoomddwwo',
    'otTodmmdodwwo.',
    '.oToodmmddwo..',
    'otTTTlmmdoo.o.',
    '.oToodmmddoolo',
    'otToomdomdddo.',
    '.ooolmdolmdo..',
  ],
  { o: '#1a0606', d: '#7f1d1d', m: '#dc2626', l: '#f87171', H: '#f3d9a0', e: '#fde047', T: '#78716c', t: '#e7e5e4', w: '#4a0d0d' },
)

const EMBER_PAL = { o: '#140605', k: '#2a1a18', K: '#4a2e28', r: '#c2410c', m: '#f97316', y: '#fde047', w: '#fff7cc' }
const EMBER_UP = sprite(
  [
    '.o..o.o.o.o..o.',
    'oyooyokokoyooyo',
    'oymoymkKkmyomyo',
    'ormymmkkkmmymro',
    '.ormmkwkwkmmro.',
    '.ororkkkkkroro.',
    '..o.okKyKko.o..',
    '.....okoko.....',
  ],
  EMBER_PAL,
)

const EMBER_DOWN = sprite(
  [
    '......o.o......',
    '...oookokooo...',
    '..orrmkKkmrro..',
    '.ormmmkkkmmmro.',
    'ormyymwkwmyymro',
    'omyoymkkkmyoymo',
    'oyooyoKyKoyooyo',
    '.o..ookokoo..o.',
  ],
  EMBER_PAL,
)

export const VOLCANO: MonsterDef[] = [
  { id: 'volcano-slime', name: 'Slime dung nham', sprite: LAVA, hits: 2, attack: 'hop', dust: '#f97316' },
  { id: 'volcano-imp', name: 'Tiểu quỷ', sprite: IMP, hits: 3, attack: 'lunge', dust: '#dc2626' },
  { id: 'volcano-bat', name: 'Dơi than hồng', sprite: EMBER_UP, sprite2: EMBER_DOWN, hover: 5, hits: 2, attack: 'swoop', dust: '#f97316' },
]

// The fire demon of scene-v1 (BOSS_ROWS and its palette), 24 x 16, with a dark rim added along the back and the far legs.
const DEMON = sprite(
  [
    '......HH................',
    '.....HHH....SS.....SS...',
    '....HHoo...SrrS...SrrS..',
    '..ooooooooSrrrrSSSrrrrS.',
    '.oRRRRRRRRoSrrrroSrrrrS.',
    'oRRELRRRRRRRRRRRRRRRRrrS',
    'oRKEERRRRRRRRRRRRRRRRro.',
    'ooMMMMooRRRRRRRRRRRRRro.',
    '.oWTWTMMoRRRRRRRRRRRro..',
    '..oMTTWMMooRRRYYRRRro...',
    '...ooMMMMooRRYYYYRro....',
    '.....oooRRRRRYYYYRro....',
    '......oRRRRRRYYRRroo....',
    '.....oRroRRRRRRRroRro...',
    '....oRRrooooRRroo.oRro..',
    '...oWWWo....oWWo..oWWo..',
  ],
  {
    H: '#f3d9a0', o: '#2a0a0a', R: '#d9322b', r: '#7a1818', L: '#ffb4a8',
    Y: '#f5b83d', W: '#ffffff', E: '#ffe14a', K: '#111111', M: '#4a0d0d', T: '#ff8a1f', S: '#4a1010',
  },
)

export const VOLCANO_BOSS: BossDef = {
  id: 'volcano-boss', name: 'Quỷ lửa', sprite: DEMON, hits: 10, attack: 'lunge', dust: '#d9322b', special: 'fireBreath', mouth: { x: 0, y: 8 },
}
