// The monster roster: three normal monsters and one boss per biome, in the order they appear.
// The sprites live in one file per biome (_monsters-<biome>.ts); every sprite faces LEFT and stands on its last row.
import type { BiomeId, BossDef, MonsterDef } from '../types'
import { DUNGEON, DUNGEON_BOSS } from './_monsters-dungeon'
import { ICE, ICE_BOSS } from './_monsters-ice'
import { PLATEAU, PLATEAU_BOSS } from './_monsters-plateau'
import { VOLCANO, VOLCANO_BOSS } from './_monsters-volcano'

export const MONSTERS: Record<BiomeId, MonsterDef[]> = {
  dungeon: DUNGEON,
  plateau: PLATEAU,
  ice: ICE,
  volcano: VOLCANO,
}

export const BOSSES: Record<BiomeId, BossDef> = {
  dungeon: DUNGEON_BOSS,
  plateau: PLATEAU_BOSS,
  ice: ICE_BOSS,
  volcano: VOLCANO_BOSS,
}
