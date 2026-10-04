// Plateau: goblin scout, wild boar, vulture, and the Stone Troll. All face LEFT.
import { sprite } from '../pixel'
import type { BossDef, MonsterDef } from '../types'

const GOBLIN = sprite(
  [
    '......oooo...o.',
    '.....ollmmo.olo',
    '....ollmmmdomlo',
    '...olmommmmmdo.',
    '..oomoemmmdoo..',
    '.omlmmmmmddo...',
    '..oomosomdo....',
    '.ooooddbcbBo...',
    'osssBmmbbbBdo..',
    '.oooooBbbBBdo..',
    '.....omdomdo...',
    '....olmdomdo...',
  ],
  { o: '#16210c', d: '#3f6212', m: '#65a30d', l: '#a3e635', e: '#fde047', s: '#e2e8f0', B: '#4a2a12', b: '#7c4a22', c: '#b07a45' },
)

const BOAR = sprite(
  [
    '.......o.o.o....',
    '.....ooKoKoKoo..',
    '....oDoKKKKKKKo.',
    '...oLDMKKKKKKKMo',
    '..oLLrMLLLLLLMDo',
    '.oLMMMMMMMMMMMDo',
    'onnwMMMMMMMMMDDo',
    '.onwDMMMMMMMDDDo',
    '..ooDDMMMMMDDDo.',
    '...oDMDoooDMDo..',
    '...oKKKo.oKKKo..',
  ],
  { o: '#1f1209', D: '#4a2c17', M: '#7a4a26', L: '#a8703f', w: '#f5f0e1', r: '#ef4444', n: '#c98f7a', K: '#2b190c' },
)

const VULTURE_PAL = { o: '#1f150a', D: '#5c3d1e', M: '#8a5a2b', L: '#c08a4a', H: '#e79a8a', h: '#b5584a', w: '#efe6d6', y: '#e7c25a' }
const VULTURE_UP = sprite(
  [
    '.........oLoLoLo',
    '........oLMLMLMo',
    '.......oDMMMMLLo',
    '..oo..oDMMMMLLo.',
    '.oHHooDDMMMLLo..',
    'oyHohwwDMMMMooo.',
    'oyohwwMMMMMMMDDo',
    '.o.oooMMMMMMDDDo',
    '......oDDDDDDoo.',
    '......oyooyoo...',
  ],
  VULTURE_PAL,
)

const VULTURE_DOWN = sprite(
  [
    '................',
    '................',
    '................',
    '..oo...ooo......',
    '.oHHoooDDDooo...',
    'oyHohwwDMMMMMoo.',
    'oyohwwMMMMMMMDDo',
    '.o.ooMMMMMMMDDDo',
    '.....oDMMLLLLoo.',
    '......ooLoLoLo..',
  ],
  VULTURE_PAL,
)

export const PLATEAU: MonsterDef[] = [
  { id: 'plateau-goblin', name: 'Goblin do thám', sprite: GOBLIN, hits: 3, attack: 'lunge', dust: '#65a30d' },
  { id: 'plateau-boar', name: 'Lợn rừng', sprite: BOAR, hits: 3, attack: 'charge', dust: '#7a4a26' },
  { id: 'plateau-vulture', name: 'Kền kền', sprite: VULTURE_UP, sprite2: VULTURE_DOWN, hover: 5, hits: 2, attack: 'swoop', dust: '#8a5a2b' },
]

const TROLL = sprite(
  [
    '.ocWWwo...................',
    'ocWWWWwo........oooo......',
    'oWcWWWWwo.....oogGGgoo....',
    'owWWWWWwo...oogGGGGGGgo...',
    '.owwWWwwo..ogGGlllmmGGgo..',
    '..ooooWwoooGGllllmmmmmGgo.',
    '......oWlloollmmmmmmmdmmdo',
    '......olmmdolmmmmmmmmmdmdo',
    '..oooooommdollmmmmdmmmmddo',
    '.olllmmoodmmmlmmmmmdmmmddo',
    'olmdddmdoodmlmmmmmmmdmmddo',
    'omoemmmmdolmmmdmmmmmmmdddo',
    'olmmmmmmmolmmmddmmmmmmdddo',
    '.otmmtmmdolmmmdddmmmmddddo',
    '..odddddoolmmmdodmmmdodmdo',
    '...oooooolmmmmdolmmdoolmdo',
    '.......oddddddodddddoddddo',
  ],
  { o: '#141a16', d: '#4a5a50', m: '#71847a', l: '#a3b3a0', G: '#6b9a34', g: '#3f6421', W: '#7a4e2a', w: '#4e3018', c: '#a8743f', e: '#f5c542', t: '#ece6d2' },
)

export const PLATEAU_BOSS: BossDef = {
  id: 'plateau-boss', name: 'Troll đá', sprite: TROLL, hits: 9, attack: 'lunge', dust: '#71847a', special: 'slam',
}
