// Shared types of the endless adventure. Pure data, no imports.

export type BiomeId = 'dungeon' | 'plateau' | 'ice' | 'volcano'
export const BIOMES: BiomeId[] = ['dungeon', 'plateau', 'ice', 'volcano']

// A pixel sprite. `rows` are equal-length strings, '.' is transparent, every other
// character is a key of `pal`. The sprite faces LEFT (toward the knight) and its last
// row stands on the ground. Build one with `sprite()` from pixel.ts, which validates it.
export type Sprite = { rows: string[]; pal: Record<string, string>; w: number; h: number }

export type AttackStyle = 'lunge' | 'hop' | 'swoop' | 'charge'
export type BossSpecial = 'wave' | 'slam' | 'iceBreath' | 'fireBreath'

export type MonsterDef = {
  id: string                     // 'dungeon-slime'
  name: string                   // Vietnamese name (never drawn, only for people)
  sprite: Sprite                 // idle pose
  sprite2?: Sprite               // optional second pose of identical size (wing flap, bob), toggled 4 times a second
  hits: number                   // hits needed at tier 0: 2 to 4 for a normal monster, 8 to 10 for a boss
  attack: AttackStyle            // how it strikes back: lunge (short thrust), hop (jump arc), swoop (flyer dive), charge (long rush)
  hover?: number                 // pixels above the ground for a flyer
  mouth?: { x: number; y: number } // breath attacks: sprite-local cell (x from the left, y from the top row 0)
  dust: string                   // '#rrggbb' of the dust it bursts into when it dies
}
export type BossDef = MonsterDef & { special: BossSpecial }

// A horizontally repeating strip of pixels. `d` is path data in tile-local pixels (x 0..w, y 0..20, ground face at y 17..20).
// The tile must repeat seamlessly: nothing may be cut at x = 0 or x = w.
export type Layer = { fill: string; d: string; opacity?: number }
export type Tile = { w: number; layers: Layer[]; extra?: string } // `extra`: raw SVG for a small looping animation (max 600 chars)

export type WeaponPalette = {
  blade: string
  hilt: string
  slash: [string, string, string, string] // arc colors from the instant of impact to the last frame, light to deep
  spark: [string, string, string]
  ring: string
  ghost: string                          // dash afterimage color
}

export type BiomeArt = {
  id: BiomeId
  sky: [string, string, string, string, string] // five horizontal bands from the top to the horizon
  far: Tile                                      // w = 108, scrolls at 0.25x
  mid: Tile                                      // w = 54, scrolls at 0.5x
  ground: { base: string; line: string; tile: Tile } // base: ground face color, line: the top edge row, tile: w = 18, scrolls at 1x, covers y 17..20
  ambient: string                                // looping SMIL fragment, 190x20 space, at most 3000 chars, ids must start with the biome id
  weapon: WeaponPalette
}

export type Episode = { biome: BiomeId; tier: number }
