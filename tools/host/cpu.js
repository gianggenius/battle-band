// node cpu.js file.svg [seconds] : rough CPU cost of the picture in a headless Chrome (software raster, so an upper bound)
const fs = require('fs'), { execSync } = require('child_process')
const { launch, withPage } = require('./lib')
;(async () => {
  const svg = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : null
  const secs = Number(process.argv[3] || 8)
  const browser = await launch()
  const page = await withPage(browser, '<!doctype html><body style="margin:0;background:#161616"><div id=box style="width:752px;display:flex;flex-direction:column"></div></body>', 800, 200, 2)
  if (svg) await page.evaluate(svg => {
    const f = document.createElement('iframe'); f.setAttribute('sandbox', ''); f.setAttribute('srcdoc', window.hostDoc(svg)); f.setAttribute('style', 'display:block;border:0;height:114px'); document.getElementById('box').appendChild(f)
  }, svg)
  await new Promise(r => setTimeout(r, 1500))
  const pid = browser.process().pid
  const sample = () => Number(execSync(`ps -o time= -g ${pid} | awk '{split($1,a,":"); s+=a[1]*60+a[2]} END {print s}'`).toString().trim() || 0)
  const c0 = sample(), t0 = Date.now()
  await new Promise(r => setTimeout(r, secs * 1000))
  const c1 = sample()
  console.log(process.argv[2] ? process.argv[2].split('/').slice(-1)[0] : 'empty', 'cpu seconds used', (c1 - c0).toFixed(2), 'in', ((Date.now() - t0) / 1000).toFixed(1), 's =>', (((c1 - c0) / ((Date.now() - t0) / 1000)) * 100).toFixed(0), '% of one core')
  await browser.close()
})()
