// The desktop app's own treatment of an interactive Svg, replayed in headless Chrome: the DOMPurify scrub (with its tag and attribute
// allow-lists and the hook that refuses an animated href), the srcdoc wrapper, and the iframe the result is drawn in.
// (Read from the app's renderer chunk, Oct 2026: functions Os, Ts, Cs, Ss, Ms, Vs.)
const fs = require('fs'), path = require('path')
const puppeteer = require('puppeteer-core')
const purifyJs = fs.readFileSync(path.join(__dirname, 'node_modules/dompurify/dist/purify.min.js'), 'utf8')
// a Chrome or Chromium to drive; set CHROME to use another
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p))
if (!CHROME) throw new Error('no Chrome found: install Google Chrome or set CHROME to a Chrome or Chromium binary')

// installed into the page: window.hostScrub(src) -> the scrubbed <svg> markup, or null
const pageSetup = `
const P = DOMPurify(window)
const Ss = e => { const t = e.trim().toLowerCase().split(':').pop() ?? ''; return t !== '' && t !== 'href' && !t.startsWith('on') }
const Cs = (e, t) => e.startsWith('on') ? false : (e === 'href' || e === 'xlink:href') ? t.trim().startsWith('#') : e !== 'attributename' || Ss(t)
P.addHook('uponSanitizeAttribute', (e, t) => { Cs(t.attrName, t.attrValue) || (t.keepAttr = false) })
window.hostScrub = src => {
  if (src.length > 131072) return null
  const n = P.sanitize(src, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['animate', 'set', 'use'], ADD_ATTR: ['from', 'to', 'calcMode'], FORBID_TAGS: ['script', 'foreignObject', 'image', 'a', 'iframe'], ALLOW_DATA_ATTR: false, ALLOW_UNKNOWN_PROTOCOLS: false, FORCE_BODY: true, RETURN_DOM_FRAGMENT: true })
  const r = Array.from(n.childNodes).filter(e => e.nodeType !== Node.TEXT_NODE || e.textContent?.trim())
  const [i] = r
  return r.length === 1 && i instanceof Element && i.namespaceURI === 'http://www.w3.org/2000/svg' && i.localName === 'svg' ? i.outerHTML : null
}
window.hostDoc = svg => {
  const doc = window.hostScrub(svg)
  if (doc === null) return null
  const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; script-src 'none'; form-action 'none'"
  const DS = 'html,body{margin:0;height:100%;background:transparent;overflow:hidden}body>svg{display:block;width:100%;height:100%}'
  return '<!doctype html><meta http-equiv="Content-Security-Policy" content="' + CSP + '"><style>' + DS + '</style>' + doc
}
`

const launch = () => puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] })
const withPage = async (browser, html, w = 800, h = 400, dpr = 1) => {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr })
  await page.setContent(html || '<!doctype html><body style="margin:0"></body>')
  await page.addScriptTag({ content: purifyJs })
  await page.addScriptTag({ content: pageSetup })
  return page
}
module.exports = { launch, withPage, purifyJs, pageSetup }
