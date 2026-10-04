import { sprite } from '../pixel'

// The knight faces RIGHT (toward the monsters). 12 wide, 13 high; the last row stands on the ground.
const PAL = {
  P: '#e11d48', H: '#cbd5e1', V: '#0f172a', o: '#0b1220', h: '#94a3b8',
  B: '#3b82f6', b: '#1d4ed8', G: '#e7b83a', L: '#475569', F: '#1e293b',
}

const UPPER = [
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
]

export const HERO_IDLE = sprite([...UPPER, '..oLLoLLo...', '..oLLoLLo...', '.oFFFoFFFo..'], PAL)
// two strides of a run: legs apart, then legs passing
export const HERO_RUN_A = sprite([...UPPER, '..oLLoLLo...', '.oLLo..oLLo.', 'oFFFo..oFFFo'], PAL)
export const HERO_RUN_B = sprite([...UPPER, '..oLLoLLo...', '...oLLLo....', '..oFFFFFo...'], PAL)
// sitting by the fire: legs out in front, 12 rows
export const HERO_SIT = sprite([...UPPER.slice(0, 9), '..oBBBBo....', '.oLLLLLLLo..', '.oFFFooFFFo.'], PAL)
