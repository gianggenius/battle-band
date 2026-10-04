import type { BiomeArt, BiomeId } from '../types'
import { ART as dungeon } from './dungeon'
import { ART as plateau } from './plateau'
import { ART as ice } from './ice'
import { ART as volcano } from './volcano'

export const BIOME_ART: Record<BiomeId, BiomeArt> = { dungeon, plateau, ice, volcano }
