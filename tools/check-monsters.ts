// bun tools/check-monsters.ts : contract checks of the monster roster (sizes, poses, palettes, breath mouths)
import { BOSSES, MONSTERS } from '../plugin/hooks/adv/art/monsters'
import { BIOMES } from '../plugin/hooks/adv/types'
import type { MonsterDef } from '../plugin/hooks/adv/types'

let bad = 0
const fail = (id: string, msg: string) => {
  console.log('FAIL', id, msg)
  bad++
}
const check = (m: MonsterDef, boss: boolean) => {
  const { w, h } = m.sprite
  if (w > (boss ? 26 : 16) || h > (boss ? 17 : 13)) fail(m.id, `${w}x${h} is over the ${boss ? 'boss 26x17' : 'normal 16x13'} limit`)
  if (h + (m.hover ?? 0) > 17) fail(m.id, `height ${h} + hover ${m.hover ?? 0} is over 17 (the top would be cut)`)
  if (m.sprite2 && (m.sprite2.w !== w || m.sprite2.h !== h)) fail(m.id, 'second pose is not the same size')
  const used = new Set(m.sprite.rows.join('').replace(/\./g, ''))
  for (const k of Object.keys(m.sprite.pal)) if (!used.has(k)) fail(m.id, `palette key '${k}' is unused`)
  if (m.sprite.rows[m.sprite.rows.length - 1]!.replace(/\./g, '') === '') fail(m.id, 'the last row is empty, so it would float')
  const hits = m.hits
  if (boss ? hits < 8 || hits > 10 : hits < 2 || hits > 4) fail(m.id, `hits ${hits} out of range`)
  if (boss) {
    const special = (m as { special?: string }).special
    if (!special) fail(m.id, 'boss without a special')
    if (special === 'fireBreath' || special === 'iceBreath') {
      if (!m.mouth) fail(m.id, 'a breath boss needs a mouth')
      else if (m.mouth.x < 0 || m.mouth.x >= w || m.mouth.y < 0 || m.mouth.y >= h) fail(m.id, `mouth ${m.mouth.x},${m.mouth.y} is outside the sprite`)
    }
  }
  console.log('ok  ', m.id.padEnd(18), `${w}x${h}`, `hits ${hits}`, m.attack, m.hover ? `hover ${m.hover}` : '', boss ? `special ${(m as { special?: string }).special}` : '')
}
for (const b of BIOMES) {
  if (MONSTERS[b].length !== 3) fail(b, `${MONSTERS[b].length} normal monsters, wanted 3`)
  MONSTERS[b].forEach(m => check(m, false))
  check(BOSSES[b], true)
}
process.exit(bad ? 1 : 0)
