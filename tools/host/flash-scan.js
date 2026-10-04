// node flash-scan.js out.json step_s seconds width height file1.svg file2.svg ...
// Steps through each picture as the app draws it (scrubbed, in an iframe of width x height) and measures, per step: the mean brightness,
// the share of near-white pixels, and how much the frame changed from the one before. Prints the biggest jumps with their times.
const fs = require('fs')
const { PNG } = require('pngjs')
const { launch, withPage } = require('./lib')
const [out, stepArg, secsArg, wArg, hArg, ...files] = process.argv.slice(2)
const step = Number(stepArg), secs = Number(secsArg), W = Number(wArg), H = Number(hArg)
;(async () => {
  const browser = await launch()
  const report = {}
  for (const file of files) {
    const svg = fs.readFileSync(file, 'utf8')
    const page = await withPage(browser, `<!doctype html><body style="margin:0;background:#000"><iframe id=f style="display:block;border:0;width:${W}px;height:${H}px"></iframe></body>`, W, H, 1)
    await page.evaluate(async svg => {
      const f = document.getElementById('f')
      f.setAttribute('srcdoc', window.hostDoc(svg))
      await new Promise(r => f.addEventListener('load', r, { once: true }))
      f.contentDocument.querySelector('svg').pauseAnimations()
    }, svg)
    const rows = []
    let prev = null
    const t0 = Date.now()
    for (let t = 0; t < secs - 1e-9; t += step) {
      await page.evaluate(t => { const s = document.getElementById('f').contentDocument.querySelector('svg'); s.setCurrentTime(t) }, t)
      const png = PNG.sync.read(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } }))
      const d = png.data
      let sum = 0, bright = 0, diff = 0
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
        sum += l
        if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) bright++
        if (prev) diff += Math.abs(d[i] - prev[i]) + Math.abs(d[i + 1] - prev[i + 1]) + Math.abs(d[i + 2] - prev[i + 2])
      }
      const n = d.length / 4
      rows.push({ t: Math.round(t * 100) / 100, L: sum / n, white: bright / n, change: prev ? diff / (n * 3) : 0 })
      prev = Buffer.from(d)
    }
    await page.close()
    const name = file.split('/').slice(-1)[0]
    // jumps in brightness between neighbouring steps, and in the amount of the picture that changed
    const jumps = rows.slice(1).map((r, i) => ({ t: r.t, dL: r.L - rows[i].L, from: rows[i].L, to: r.L, change: r.change, white: r.white })).sort((a, b) => Math.abs(b.dL) - Math.abs(a.dL))
    report[name] = { rows, top: jumps.slice(0, 8) }
    console.log(`\n${name}: ${rows.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s; brightness ${Math.min(...rows.map(r => r.L)).toFixed(0)}..${Math.max(...rows.map(r => r.L)).toFixed(0)}; most white ${(Math.max(...rows.map(r => r.white)) * 100).toFixed(1)}% of the picture`)
    for (const j of report[name].top.slice(0, 6)) console.log(`   t=${j.t.toFixed(1)}s  dL=${j.dL.toFixed(1)}  (${j.from.toFixed(0)} -> ${j.to.toFixed(0)})  changed ${j.change.toFixed(1)}  white ${(j.white * 100).toFixed(1)}%`)
  }
  fs.writeFileSync(out, JSON.stringify(report))
  await browser.close()
})()
