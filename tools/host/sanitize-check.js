// node sanitize-check.js a.svg b.svg ... : does the app's scrub keep everything the picture needs? Exit 1 when it drops or changes anything.
const fs = require('fs')
const { launch, withPage } = require('./lib')
;(async () => {
  const browser = await launch()
  const page = await withPage(browser)
  let bad = 0
  for (const file of process.argv.slice(2)) {
    const src = fs.readFileSync(file, 'utf8')
    const r = await page.evaluate(src => {
      const count = root => {
        const c = {}
        for (const el of root.querySelectorAll('*')) {
          const t = el.localName.toLowerCase()
          c['<' + t + '>'] = (c['<' + t + '>'] || 0) + 1
          for (const a of el.attributes) { const k = t + '@' + a.name.toLowerCase(); c[k] = (c[k] || 0) + 1 }
        }
        const t = root.localName.toLowerCase()
        c['<' + t + '>'] = (c['<' + t + '>'] || 0) + 1
        for (const a of root.attributes) { const k = t + '@' + a.name.toLowerCase(); c[k] = (c[k] || 0) + 1 }
        return c
      }
      const out = window.hostScrub(src)
      if (out === null) return { refused: true }
      const a = count(new DOMParser().parseFromString(src, 'image/svg+xml').documentElement)
      const b = count(new DOMParser().parseFromString(out, 'text/html').querySelector('svg'))
      const diff = []
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) diff.push(`${k}: ${a[k] || 0} -> ${b[k] || 0}`)
      return { diff, inLen: src.length, outLen: out.length }
    }, src)
    const name = file.split('/').slice(-2).join('/')
    if (r.refused) { console.log('FAIL', name, 'the scrub refused the document'); bad++ } else if (r.diff.length) { console.log('FAIL', name); r.diff.slice(0, 12).forEach(d => console.log('     ', d)); bad++ } else console.log('ok  ', name, `${r.inLen} -> ${r.outLen} chars, nothing dropped`)
  }
  await browser.close()
  process.exit(bad ? 1 : 0)
})()
