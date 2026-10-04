// The parts of a scene that the adventure and the camp draw the same way: the sky, the ground, the repeating strips.
import { EXT, GY, H, MARGIN, SCALE, W } from './consts'
import type { BiomeArt, Tile } from './types'

export const tileSvg = (id: string, tile: Tile): string =>
  `<g id="${id}">${tile.layers.map(l => `<path fill="${l.fill}"${l.opacity ? ` opacity="${l.opacity}"` : ''} d="${l.d}"/>`).join('')}${tile.extra ?? ''}</g>`

export const tileDefs = (art: BiomeArt): string => tileSvg('far', art.far) + tileSvg('mid', art.mid) + tileSvg('gnd', art.ground.tile)

// five horizontal bands from the top to the horizon, the first one running up past the view box
export const skyRects = (art: BiomeArt): string => {
  const bandOf = (y: number) => Math.min(4, Math.floor((y / GY) * 5))
  let sky = ''
  let y0 = 0
  for (let y = 1; y <= GY; y++) {
    if (y === GY || bandOf(y) !== bandOf(y0)) {
      const top = y0 === 0 ? -EXT : y0
      sky += `<rect x="${-EXT}" y="${top}" width="${W + EXT * 2}" height="${y - top}" fill="${art.sky[bandOf(y0)]}"/>`
      y0 = y
    }
  }
  return sky
}

export const groundRects = (art: BiomeArt): string =>
  `<rect x="${-EXT}" y="${GY}" width="${W + EXT * 2}" height="${EXT}" fill="${art.ground.base}"/>` +
  `<rect x="${-EXT}" y="${GY}" width="${W + EXT * 2}" height="1" fill="${art.ground.line}"/>`

// a rectangle over everything, far past the view box
export const veil = (fill: string, opacity: string, inner = ''): string =>
  `<rect x="${-EXT}" y="${-EXT}" width="${W + EXT * 2}" height="${W + EXT * 2}" fill="${fill}" opacity="${opacity}">${inner}</rect>`

// the tiles that cover the view box and MARGIN past it on each side, side by side, no motion; `x0` is where one of them starts
export const staticStrip = (id: string, tileW: number, x0 = 0): string => {
  let uses = ''
  for (let i = Math.floor((-MARGIN - x0) / tileW); i <= Math.ceil((W + MARGIN - x0) / tileW); i++) uses += `<use href="#${id}" x="${x0 + i * tileW}"/>`
  return uses
}

// the root paints its own dark ground, so a frame that has just loaded is never seen light
export const svgOpen = (w: number, h: number, ground = '#0b0a14'): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w * SCALE}" height="${h * SCALE}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMin meet" shape-rendering="crispEdges" style="background:${ground}">`

export { H }
