// bun tools/check-svg.ts <file.svg> ... : structural checks of a built scene (the things the host cannot tell us until it draws)
import { readFileSync } from 'fs'

const LIMIT = 131072
let bad = 0
for (const file of process.argv.slice(2)) {
  const svg = readFileSync(file, 'utf8')
  const errs: string[] = []
  if (svg.length >= LIMIT) errs.push(`size ${svg.length} >= ${LIMIT}`)
  if (!/^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(svg)) errs.push('root is not a namespaced <svg>')
  // ids unique, references resolve
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]!)
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) errs.push(`duplicate id ${id}`)
    seen.add(id)
  }
  for (const m of svg.matchAll(/href="#([^"]+)"/g)) if (!seen.has(m[1]!)) errs.push(`href to missing id ${m[1]}`)
  for (const m of svg.matchAll(/attributeName="href"[^>]*values="([^"]+)"/g)) for (const v of m[1]!.split(';')) if (!seen.has(v.replace('#', ''))) errs.push(`animated href to missing id ${v}`)
  // animations
  let n = 0
  for (const m of svg.matchAll(/<(animate|animateTransform)\b([^>]*?)\/?>/g)) {
    n++
    const a: Record<string, string> = {}
    for (const kv of m[2]!.matchAll(/([a-zA-Z:]+)="([^"]*)"/g)) a[kv[1]!] = kv[2]!
    const tag = `<${m[1]} ${a.attributeName ?? ''} ${a.type ?? ''} dur=${a.dur}>`
    if (a.from !== undefined && a.to !== undefined) continue // the one-shot entry fade
    if (!a.dur || !/^[0-9.]+s$/.test(a.dur)) errs.push(`${tag} bad dur`)
    if (a.repeatCount !== 'indefinite') errs.push(`${tag} not repeating`)
    if (!a.values) errs.push(`${tag} no values`)
    const vals = (a.values ?? '').split(';')
    const kts = (a.keyTimes ?? '').split(';').filter(x => x !== '').map(Number)
    if (a.keyTimes !== undefined) {
      if (kts.length !== vals.length) errs.push(`${tag} ${kts.length} keyTimes for ${vals.length} values`)
      if (kts[0] !== 0) errs.push(`${tag} keyTimes start at ${kts[0]}`)
      for (let i = 1; i < kts.length; i++) if (!(kts[i]! >= kts[i - 1]!)) errs.push(`${tag} keyTimes go back at ${i}`)
      if (a.calcMode === 'discrete' && !(kts[kts.length - 1]! < 1)) errs.push(`${tag} discrete ends at ${kts[kts.length - 1]}`)
      if (a.calcMode !== 'discrete' && kts[kts.length - 1] !== 1) errs.push(`${tag} ${a.calcMode ?? 'linear'} ends at ${kts[kts.length - 1]}`)
      if (a.calcMode === 'spline' && (a.keySplines ?? '').split(';').length !== kts.length - 1) errs.push(`${tag} keySplines count`)
    }
    if (m[1] === 'animateTransform' && !['translate', 'scale', 'rotate', 'skewX', 'skewY'].includes(a.type ?? '')) errs.push(`${tag} transform type`)
  }
  if (/\bvisibility=/.test(svg) || /<animate attributeName="visibility"/.test(svg)) errs.push('uses visibility (opacity is the rule)')
  if (/attributeName="(xlink:)?href"/.test(svg)) errs.push('animates href: the host scrubs that attribute away, so the animation is dead (pick frames by opacity)')
  if (/<script|onload=|onclick=|<foreignObject|<image /.test(svg)) errs.push('forbidden element or attribute')
  console.log(errs.length ? 'FAIL' : 'ok  ', file.split('/').slice(-2).join('/'), `${svg.length} chars, ${n} animations`)
  for (const e of errs.slice(0, 12)) console.log('     ', e)
  if (errs.length > 12) console.log(`      ... ${errs.length - 12} more`)
  bad += errs.length ? 1 : 0
}
process.exit(bad ? 1 : 0)
