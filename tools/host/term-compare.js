// node tools/host/term-compare.js <picture.svg> <workdir> <t1> <t2> ...
// Draws the picture two ways at each second, as 1 pixel to the unit: by the terminal band's rasterizer (bun) and by Chrome through the app's
// own scrub; writes a side by side image per time to <workdir> and prints how many pixels differ by more than 24 in any channel.
// Chrome blends the edge of a shape that sits at a fraction of a pixel, the rasterizer snaps it to the pixel grid. So a difference is only
// "unexplained" when Chrome's colour is not within 24 of a blend of the rasterizer's pixel and one of its 8 neighbours; those are what to
// look at (red in the third panel). Set ROWS=<first>-<last> to compare only those rows (the scene starts at row 11).
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { PNG } = require('pngjs')
const { launch, withPage } = require('./lib')

const [file, work, ...times] = process.argv.slice(2)
if (!file || !work || times.length === 0) throw new Error('usage: node tools/host/term-compare.js <picture.svg> <workdir> <t1> <t2> ...')
fs.mkdirSync(work, { recursive: true })
const root = path.join(__dirname, '../..')
const [R0, R1] = (process.env.ROWS || '0-999').split('-').map(Number)
execFileSync('bun', [path.join(root, 'tools/term/rasterize.ts'), file, work, ...times], { stdio: 'inherit' })
const { width: W, height: H } = JSON.parse(fs.readFileSync(path.join(work, 'meta.json'), 'utf8'))

;(async () => {
  const browser = await launch()
  const page = await withPage(browser, `<!doctype html><body style="margin:0;background:#000"><iframe id=f style="display:block;border:0;width:${W}px;height:${H}px"></iframe></body>`, W, H, 1)
  await page.evaluate(async svg => {
    const f = document.getElementById('f')
    f.setAttribute('srcdoc', window.hostDoc(svg))
    await new Promise(r => f.addEventListener('load', r, { once: true }))
    f.contentDocument.querySelector('svg').pauseAnimations()
  }, process.env.FORCE_CRISP ? fs.readFileSync(file, 'utf8').replace(/<(path|rect|g|use)\b/g, '<$1 shape-rendering="crispEdges"') : fs.readFileSync(file, 'utf8'))
  let worst = 0
  for (const t of times) {
    await page.evaluate(t => document.getElementById('f').contentDocument.querySelector('svg').setCurrentTime(t), Number(t))
    const chrome = PNG.sync.read(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } })).data
    const mine = fs.readFileSync(path.join(work, `${t}.rgb`))
    let bad = 0, unexplained = 0
    const side = new PNG({ width: W * 3 + 8, height: H })
    side.data.fill(30)
    const mc = (x, y) => { const k = (y * W + x) * 3; return [mine[k], mine[k + 1], mine[k + 2]] }
    const near = (c, a, b) => { // distance from c to the segment a-b
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2
      let k = len2 ? ((c[0] - a[0]) * ab[0] + (c[1] - a[1]) * ab[1] + (c[2] - a[2]) * ab[2]) / len2 : 0
      k = Math.max(0, Math.min(1, k))
      return Math.max(...[0, 1, 2].map(i => Math.abs(c[i] - (a[i] + ab[i] * k))))
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4
        const c = [chrome[i], chrome[i + 1], chrome[i + 2]], m = mc(x, y)
        const d = Math.max(...[0, 1, 2].map(q => Math.abs(c[q] - m[q])))
        let mark = 0
        if (d > 24 && y >= R0 && y <= R1) {
          bad++
          let ok = false
          for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1 && !ok; dx++) {
            const nx = x + dx, ny = y + dy
            if ((dx || dy) && nx >= 0 && ny >= 0 && nx < W && ny < H && near(c, m, mc(nx, ny)) <= 24) ok = true
          }
          if (!ok) { unexplained++; mark = 2 } else mark = 1
        }
        const put = (ox, r, g, b) => { const o = (y * (W * 3 + 8) + ox + x) * 4; side.data[o] = r; side.data[o + 1] = g; side.data[o + 2] = b; side.data[o + 3] = 255 }
        put(0, c[0], c[1], c[2])
        put(W + 4, m[0], m[1], m[2])
        put(2 * W + 8, mark === 2 ? 255 : mark === 1 ? 90 : 0, mark === 2 ? 40 : mark === 1 ? 60 : 0, 0)
      }
    }
    fs.writeFileSync(path.join(work, `${t}-compare.png`), PNG.sync.write(side))
    worst = Math.max(worst, unexplained)
    console.log(`t=${String(t).padStart(5)}  ${bad} differ, ${unexplained} unexplained (of ${W * H})`)
  }
  console.log(`worst unexplained: ${worst}`)
  await browser.close()
})()
