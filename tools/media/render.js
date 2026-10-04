// node tools/media/render.js jobs.json
// Draws pictures the way the desktop app does (scrubbed, in an iframe) and saves frames as PNG. jobs.json is a list of
//   { "svg": "x.svg", "w": 760, "h": 124, "dpr": 2, "stills": { "dir/name-{t}.png": [t, t, ...] } }          one PNG per time
//   { "svg": "x.svg", "w": 1140, "h": 186, "dpr": 1, "frames": { "dir": "...", "from": 0, "to": 8, "fps": 30 } }   a numbered run 00001.png ...
// Times are seconds into the picture's own timeline (a lap starts at 0). w x h are CSS pixels of the frame; the PNG is w*dpr x h*dpr.
const fs = require('fs')
const path = require('path')
const { launch, withPage } = require('../host/lib')

const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const pad = n => String(n).padStart(5, '0')
const tag = t => String(Math.round(t * 100) / 100).replace('.', '_')

;(async () => {
  const browser = await launch()
  for (const job of jobs) {
    const { svg, w = 760, h = 124, dpr = 2 } = job
    const page = await withPage(browser, `<!doctype html><body style="margin:0;background:#000"><iframe id=f style="display:block;border:0;width:${w}px;height:${h}px"></iframe></body>`, w, h, dpr)
    const ok = await page.evaluate(async src => {
      const doc = window.hostDoc(src)
      if (doc === null) return false
      const f = document.getElementById('f')
      f.setAttribute('srcdoc', doc) // no sandbox attribute, so that the time can be set; the scrub and the sizes are the app's
      await new Promise(r => f.addEventListener('load', r, { once: true }))
      f.contentDocument.querySelector('svg').pauseAnimations()
      return true
    }, fs.readFileSync(svg, 'utf8'))
    if (!ok) throw new Error(`the app's scrub refuses ${svg}`)
    const shoot = async (t, file) => {
      await page.evaluate(t => document.getElementById('f').contentDocument.querySelector('svg').setCurrentTime(t), t)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: w, height: h } })
    }
    for (const [pattern, times] of Object.entries(job.stills || {})) for (const t of times) await shoot(t, pattern.replace('{t}', tag(t)))
    if (job.frames) {
      const { dir, from, to, fps } = job.frames
      const n = Math.round((to - from) * fps)
      for (let i = 0; i < n; i++) await shoot(from + i / fps, path.join(dir, pad(i + 1) + '.png'))
      console.log(`${path.basename(svg)}: ${n} frames -> ${dir}`)
    }
    await page.close()
  }
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
