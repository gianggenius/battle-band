// node band-sim.js file.svg out_prefix cssWidth cell_px_true cell_px_assumed t1 t2 ...  : the whole band as the app lays it out (real time, sandboxed iframe)
// cell_px_true: the real width of one character cell in the app; cell_px_assumed: what the plugin assumes (8) -> the frame height it asks for
const fs = require('fs')
const { launch, withPage } = require('./lib')
const [file, prefix, widthArg, trueCell, assumedCell, ...times] = process.argv.slice(2)
const LH = 19.8
const width = Number(widthArg)
const bodyColumns = Math.floor((width - 16 - 30) / Number(trueCell))   // what the app reports (padding and the close mark taken off)
const BAND_H = Number(process.env.BAND_H || 31)   // the band's height in units (the strip + the scene), see consts.ts
const frameH = Math.max(90, Math.min(250, Math.round((bodyColumns * Number(assumedCell) * BAND_H) / 190)))
;(async () => {
  const browser = await launch()
  const page = await withPage(browser, `<!doctype html><body style="margin:0;background:#262624;font:13px/${LH}px ui-monospace,Menlo,monospace;color:#bbb">
    <div style="width:${width}px;margin:10px;box-sizing:border-box">
      <div style="height:60px;border:1px solid #333;margin-bottom:8px;padding:6px">the conversation above</div>
      <div id=wrap style="border:1px solid #3a3a38;border-radius:12px;padding:0 8px;overflow:hidden;background:#161616">
        <div id=band style="display:block;max-height:calc(11 * ${LH}px + 40px);overflow-y:auto"><div id=box style="display:flex;flex-direction:column"></div></div>
      </div>
      <div style="height:44px;border:1px solid #444;border-radius:10px;margin-top:8px;padding:8px">Reply to Claude...</div>
    </div></body>`, width + 20, 330, Number(process.env.DPR || 2))
  const svg = fs.readFileSync(file, 'utf8')
  const rect = await page.evaluate((svg, H) => {
    const doc = window.hostDoc(svg)
    const f = document.createElement('iframe')
    f.setAttribute('sandbox', ''); f.setAttribute('loading', 'lazy'); f.setAttribute('srcdoc', doc)
    f.setAttribute('style', `display:block;max-width:100%;border:0;height:${H}px`)
    document.getElementById('box').appendChild(f)
    const r = f.getBoundingClientRect(); const b = document.getElementById('band').getBoundingClientRect()
    return { frame: [Math.round(r.width), Math.round(r.height)], band: [Math.round(b.width), Math.round(b.height)] }
  }, svg, frameH)
  const t0 = Date.now()
  let n = 0
  for (const t of times) {
    const wait = Number(t) - (Date.now() - t0)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    await page.screenshot({ path: `${prefix}-${String(n++).padStart(2, '0')}.png`, clip: { x: 0, y: 0, width: width + 20, height: 330 } })
  }
  console.log(JSON.stringify({ width, bodyColumns, frameH, ...rect }))
  await browser.close()
})()
