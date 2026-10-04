// node host-frames.js file.svg out_prefix width height t1 t2 ... : the picture as the app draws it (scrubbed, in an iframe of width x height CSS px) at those times
const fs = require('fs')
const { launch, withPage } = require('./lib')
const [file, prefix, width, height, ...times] = process.argv.slice(2)
const W = Number(width), H = Number(height)
;(async () => {
  const browser = await launch()
  const dpr = Number(process.env.DPR || 2)
  const page = await withPage(browser, '<!doctype html><body style="margin:0;background:#262624"><div id=col style="display:flex;flex-direction:column;gap:6px;padding:6px"></div></body>', W + 12, (H + 6) * times.length + 12, dpr)
  const svg = fs.readFileSync(file, 'utf8')
  const ok = await page.evaluate(async (svg, W, H, times) => {
    const doc = window.hostDoc(svg)
    if (doc === null) return false
    const col = document.getElementById('col')
    const frames = []
    for (const t of times) {
      const f = document.createElement('iframe')       // no sandbox here, so the test can set the time; the scrub and the sizes are the app's
      f.setAttribute('srcdoc', doc)
      f.setAttribute('style', `display:block;border:0;width:${W}px;height:${H}px`)
      col.appendChild(f)
      frames.push(f)
    }
    await Promise.all(frames.map(f => new Promise(r => f.addEventListener('load', r, { once: true }))))
    frames.forEach((f, i) => { const svg = f.contentDocument.querySelector('svg'); svg.pauseAnimations(); svg.setCurrentTime(Number(times[i])) })
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    return true
  }, svg, W, H, times.map(Number))
  if (!ok) { console.error('the scrub refused the picture'); process.exit(1) }
  await page.screenshot({ path: `${prefix}-sheet.png`, fullPage: true })
  console.log(`${prefix}-sheet.png`, times.length, 'frames at', W, 'x', H)
  await browser.close()
})()
