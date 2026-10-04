// node tools/media/stills.js <svgdir> <outdir>
// The single frames the README images are stacked from: a fight, the boss's warning and the boss's end in each place, a camp in
// each place, the six usage states, and the same boss in lap 1 and lap 2. Each is 1520 x 248 px (760 x 124 CSS px at 2x).
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const [svgDir, outDir] = process.argv.slice(2)
if (!svgDir || !outDir) throw new Error('usage: node tools/media/stills.js <svgdir> <outdir>')
const svg = name => path.join(svgDir, name + '.svg')
const still = (name, pattern, times) => ({ svg: svg(name), w: 760, h: 124, dpr: 2, stills: { [path.join(outDir, pattern)]: times } })

const FIGHT = { dungeon: 3, plateau: 7, ice: 3, volcano: 3 } // a second into a fight with a big hit on screen
const jobs = []
for (const [place, t] of Object.entries(FIGHT)) {
  jobs.push(still(`adv-${place}-t0`, `${place}-{t}.png`, [t, 35, 43])) // 35 s: the boss warns, 43 s: the finishing blow
  jobs.push(still(`camp-${place}`, `camp-${place}-{t}.png`, [2.5]))
}
for (const s of ['none', 'fresh', 'mid', 'amber', 'danger', 'full']) jobs.push(still(`usage-${s}`, `usage-${s}-{t}.png`, [14]))
for (const place of ['ice', 'volcano', 'dungeon']) for (const tier of [0, 1]) jobs.push(still(`adv-${place}-t${tier}`, `elite-${place}-t${tier}-{t}.png`, [35]))

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bb-stills-')), 'jobs.json')
fs.writeFileSync(file, JSON.stringify(jobs))
execFileSync('node', [path.join(__dirname, 'render.js'), file], { stdio: 'inherit' })
