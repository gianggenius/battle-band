// Dungeon: green slime, skeleton warrior, cave bat, and the Skeleton King. All face LEFT.
import { sprite } from '../pixel'
import type { BossDef, MonsterDef } from '../types'

const SLIME = sprite(
  [
    '.....ooooo.....',
    '...oollmmmoo...',
    '..olhhlmmmmdo..',
    '.olhlmmmmmmmdo.',
    '.omommmmommmdo.',
    'ommoommoommmddo',
    'ommhommhommmldo',
    'ommmmoommmmlddo',
    'ommdddddddddddo',
    '.ooooooooooooo.',
  ],
  { o: '#0b2414', d: '#16a34a', m: '#4ade80', l: '#a7f3c0', h: '#f0fff4' },
)

const SKELETON = sprite(
  [
    '........oooo...',
    '......olllllmo.',
    '.....oooloolmdo',
    '.....oeomeommdo',
    '......olololdo.',
    '.......ooooooo.',
    '....o..olllmddo',
    '.ooorooloomoodo',
    'osRRrlmolllmddo',
    '.ooorooodmlmdmo',
    '....o...olomoo.',
    '......ooloomo..',
    '.....olllommo..',
  ],
  { o: '#16121f', d: '#8c8270', m: '#d8d0bc', l: '#f6f1e3', e: '#5eead4', r: '#6b3417', R: '#b4612c', s: '#e2a36b' },
)

const BAT_PAL = { o: '#140b24', d: '#4c1d95', m: '#7c3aed', l: '#a78bfa', e: '#fde047', f: '#f5f3ff' }
const BAT_UP = sprite(
  [
    '.o....o..o....o.',
    'odo..omoomo..odo',
    'odmo.ommmmo.omdo',
    'odmmooemedoommdo',
    'odmlmmmmmddmlmdo',
    '.odllmfofomlldo.',
    '..odomoooomodo..',
    '...o.o....o.o...',
  ],
  BAT_PAL,
)
const BAT_DOWN = sprite(
  [
    '......o..o......',
    '.....omoomo.....',
    '..oooommmmoooo..',
    '.odmmoemedommdo.',
    'odmlmmmmmddmlmdo',
    'odllmmfofommlmdo',
    'oddodoooooododdo',
    '.oo.o......o.oo.',
  ],
  BAT_PAL,
)

export const DUNGEON: MonsterDef[] = [
  { id: 'dungeon-slime', name: 'Slime lục', sprite: SLIME, hits: 2, attack: 'hop', dust: '#4ade80' },
  { id: 'dungeon-skeleton', name: 'Chiến binh xương', sprite: SKELETON, hits: 3, attack: 'lunge', dust: '#d8d0bc' },
  { id: 'dungeon-bat', name: 'Dơi hang', sprite: BAT_UP, sprite2: BAT_DOWN, hover: 5, hits: 2, attack: 'swoop', dust: '#7c3aed' },
]

const KING = sprite(
  [
    '........oGooGooGo.........',
    '........oGooGooGo.........',
    '.......oGGGGeGGGgo..o.....',
    '.......olllllllmdo.oqo....',
    '.......oooloolmmdooqPo....',
    '.......oeoleommddoqPpo....',
    '.......ollollmmdooqPpo....',
    '........olololodoqPPpo....',
    '.........ooooooooqPPpo....',
    '........oPPPPPPppqPPppo...',
    '.oooooooGmlllmdopPPPPppo..',
    'oSSSSSSSGloomodopPPPPpppo.',
    'osssssssGllllmdopPPPPpppo.',
    '.oooooooGoGGeGgopPPPPPpppo',
    '........ooqPPPppPPPPPpppo.',
    '........ooqPpPppPPpPPPppPo',
    '.......ollmolmoopopopopopo',
  ],
  {
    o: '#120a1a', l: '#f2ecdc', m: '#cfc6b0', d: '#8a816c', e: '#ff3b6b',
    G: '#e7b83a', g: '#9a6b12', S: '#e2e8f0', s: '#94a3b8', P: '#5b2a86', p: '#3b1856', q: '#8b4fc0',
  },
)

export const DUNGEON_BOSS: BossDef = {
  id: 'dungeon-boss', name: 'Vua Xương', sprite: KING, hits: 9, attack: 'lunge', dust: '#cfc6b0', special: 'wave',
}
