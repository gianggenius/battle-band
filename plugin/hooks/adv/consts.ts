// Numbers shared by the adventure, the camp and the usage strip. Pure data, no imports.

export const W = 190 // view box width in pixel-art units
export const H = 20 // height of the scene
export const STRIP_H = 11 // the usage strip sits on top of the scene: two roads of 5 rows with 1 row between
export const BAND_H = STRIP_H + H // view box height of the whole band
export const GY = 17 // the ground line
export const SCALE = 6 // markup pixels per unit (1140 x 186)
export const CYCLE = 48 // seconds of one biome
export const EXT = 3000 // backgrounds run this far past the view box so a taller or wider frame shows no gap
export const MARGIN = 60 // the strips of scenery run this far past the view box on each side, for a frame whose shape is not quite the band's
