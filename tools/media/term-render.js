// node tools/media/term-render.js <frames.json> <outdir>
// Draws the frames of term-frames.ts the way a terminal paints them: the roads as text, the scene as cells of half blocks (the top half in
// the foreground colour over the bottom half's), 6 x 12 px a cell. Writes still-fight.png, still-camp.png and clip/00001.png, ...
// The engine paints a Raster's colours at 4 bits a channel (every value on a real screen is a multiple of 17), so the cells are drawn so.
const fs = require('fs')
const path = require('path')
const { launch, withPage } = require('../host/lib')

const [file, out] = process.argv.slice(2)
if (!file || !out) throw new Error('usage: node tools/media/term-render.js <frames.json> <outdir>')
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
const CW = 6, CH = 12
const BG = '#16161a'
const PAD = 14
const width = data.columns * CW + 2 * PAD

const page = (f, caption) => `<!doctype html><body style="margin:0;background:${BG}">
<div id=t style="width:${width}px;padding:${PAD}px 0 ${PAD}px;background:${BG};color:#d9d9d9;font:9.967px/${CH}px Menlo,ui-monospace,Consolas,monospace">
  <div style="margin:0 ${PAD}px;white-space:pre">${f.roads.map(line => `<div style="height:${CH}px;overflow:hidden;white-space:pre">${line.map(s => `<span style="color:${s.color || '#d9d9d9'};background:#0d0b16;${s.bold ? 'font-weight:700' : ''}">${s.text}</span>`).join('')}</div>`).join('')}</div>
  <canvas id=c width="${f.columns * CW}" height="${f.rows * CH}" style="display:block;margin:0 ${PAD}px"></canvas>
  <div style="margin:${PAD}px ${PAD}px 0;border:1px solid #3a3a42;border-radius:6px;padding:4px 8px;height:${CH}px;color:#8b8b95;white-space:pre">❯ ${caption}</div>
</div></body>`

const draw = (f, CW, CH) => { // runs in the page
  const bin = atob(f.cells), bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const w = new Uint32Array(bytes.buffer)
  const ctx = document.getElementById('c').getContext('2d')
  const q = v => Math.round(v / 17) * 17
  const hex = v => '#' + [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(x => q(x).toString(16).padStart(2, '0')).join('')
  for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.columns; c++) {
    const i = (r * f.columns + c) * 3
    ctx.fillStyle = hex(w[i + 2]); ctx.fillRect(c * CW, r * CH, CW, CH)
    if (w[i] === 0x2580) { ctx.fillStyle = hex(w[i + 1]); ctx.fillRect(c * CW, r * CH, CW, CH / 2) }
  }
}

;(async () => {
  fs.mkdirSync(path.join(out, 'clip'), { recursive: true })
  const browser = await launch()
  const p = await withPage(browser, '', width, 400, 1)
  const shoot = async (f, file, caption) => {
    await p.setContent(page(f, caption))
    await p.evaluate(draw, f, CW, CH)
    const el = await p.$('#t')
    await el.screenshot({ path: file })
  }
  await shoot(data.stills.fight, path.join(out, 'still-fight.png'), 'Try "fix the failing test"')
  await shoot(data.stills.camp, path.join(out, 'still-camp.png'), 'Try "fix the failing test"')
  for (let i = 0; i < data.clip.length; i++) await shoot(data.clip[i], path.join(out, 'clip', String(i + 1).padStart(5, '0') + '.png'), 'Try "fix the failing test"')
  console.log('rendered', data.clip.length, 'frames and 2 stills')
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
