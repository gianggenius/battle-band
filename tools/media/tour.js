// node tools/media/tour.js <svgdir> <workdir> <out.mp4>
// A captioned tour of the band, about 90 s: the camp, the four places with their bosses, the elite lap and the usage strip.
// <svgdir> holds what build-media.ts made. The band is drawn the way the app draws it (render.js), 6 px to the unit, onto a
// 1280x720 stage whose caption cards are made here; ffmpeg and Chrome are needed.
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { launch, withPage } = require('../host/lib')

const [svgDir, work, outFile] = process.argv.slice(2)
if (!svgDir || !work || !outFile) throw new Error('usage: node tools/media/tour.js <svgdir> <workdir> <out.mp4>')
const FPS = 30
const FADE = 0.2
const BAND = { w: 1140, h: 186, x: 70, y: 222 } // 190 x 31 units at 6 px
const PLACES = [['dungeon', 'dungeon'], ['plateau', 'plateau'], ['ice', 'frozen lands'], ['volcano', 'volcano']]
const ACCENT = { dungeon: '#8b7bff', plateau: '#4aa3ff', ice: '#7fdcff', volcano: '#ff7a3d' }
const svg = name => path.join(svgDir, name + '.svg')

// one caption per segment; a segment is one or more clips of the band played one after the other. A segment marked `link`
// carries on from the one before it (the same scene, another caption), so nothing fades between them.
const SEGMENTS = [
  { place: 'dungeon', working: false, title: 'Idle: the knight rests', sub: 'While Claude waits for you, he sleeps by a campfire in the place he last reached.', clips: [['camp-dungeon', 1, 6]] },
  { place: 'dungeon', working: true, title: 'Working: the adventure starts', sub: 'Claude starts a task and the knight sets out: three monsters, then a boss. He strikes in dashes, they hit back, he dodges or blocks.', clips: [['adv-dungeon-t0', 0, 7], ['adv-dungeon-t0', 33, 43.5]] },
  { place: 'plateau', working: true, title: 'Next place: the plateau', sub: 'Every place has its own sky, monsters and boss. Warning marks show the big attacks before they land.', clips: [['adv-plateau-t0', 5, 10], ['adv-plateau-t0', 34, 43]] },
  { place: 'ice', working: true, title: 'The frozen lands', sub: 'Snow falls, the colors cool down, and the boss ends in a burst of light.', clips: [['adv-ice-t0', 1, 6], ['adv-ice-t0', 34, 44]] },
  { place: 'volcano', working: true, title: 'The volcano', sub: 'The last place of a lap. After it the knight walks back into the dungeon.', clips: [['adv-volcano-t0', 1, 6], ['adv-volcano-t0', 34, 44]] },
  { place: 'dungeon', working: true, title: 'Lap 2: elite monsters', sub: 'The adventure never ends. Each new lap brings the same places back with the monsters in new colors, and tougher.', clips: [['adv-dungeon-t1', 33, 42]] },
  { place: 'plateau', working: true, title: 'Usage strip: no reading yet', sub: 'The top of the band draws your 5-hour (5H) and weekly (1W) limits as two roads. Grey until the first reading arrives.', clips: [['usage-none', 12, 15.5]] },
  { place: 'plateau', working: true, link: true, title: 'Usage strip: green', sub: 'The little knight walks to the tower (5H) and the castle (1W) as you use your limits. Here 5H is at 37% and 1W at 12.5%.', clips: [['usage-mid', 15.5, 19]] },
  { place: 'plateau', working: true, link: true, title: 'Usage strip: amber', sub: 'From 60% the road turns amber. Here 5H is at 72% and 1W at 64%. The steel bar under each road is the time passed in the window.', clips: [['usage-amber', 19, 22.5]] },
  { place: 'plateau', working: true, link: true, title: 'Usage strip: red', sub: 'From 85% it turns red and the finish burns. Reaching the end means out of tokens. Hover a road for the exact numbers.', clips: [['usage-danger', 22.5, 26]] },
  { place: 'volcano', working: false, title: 'battle-band', sub: 'A pixel-art battle band for the Claude desktop app. Free and open source (MIT).', clips: [['camp-volcano', 1, 5]] },
]

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const card = seg => `<!doctype html><html><body style="margin:0;width:1280px;height:720px;position:relative;overflow:hidden;background:radial-gradient(1200px 620px at 50% 28%,#1d1b2d 0%,#0f0e15 72%);color:#d9d6ee;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace">
  <div style="position:absolute;left:58px;top:44px;font-size:26px;font-weight:700;letter-spacing:.04em;color:#f0eefc">battle-band</div>
  <div style="position:absolute;right:58px;top:44px;display:flex;align-items:center;gap:10px;padding:7px 16px;border-radius:999px;border:1px solid #2b2940;font-size:16px;color:${seg.working ? '#b9f3cf' : '#a9a5c9'}">
    <span style="width:10px;height:10px;border-radius:50%;background:${seg.working ? '#4ade80' : '#6b7280'}"></span>${seg.working ? 'Claude is working' : 'Claude is idle'}</div>
  <div style="position:absolute;left:${BAND.x - 12}px;top:${BAND.y - 12}px;width:${BAND.w + 24}px;height:${BAND.h + 24}px;border-radius:14px;background:#181722;border:1px solid #2b2940;box-shadow:0 18px 50px rgba(0,0,0,.45)"></div>
  <div style="position:absolute;left:58px;top:468px;width:1164px;font-size:40px;font-weight:700;color:#f0eefc">${esc(seg.title)}</div>
  <div style="position:absolute;left:58px;top:530px;width:1100px;font-size:22px;line-height:1.5;color:#a9a5c9">${esc(seg.sub)}</div>
  <div style="position:absolute;left:58px;bottom:44px;display:flex;gap:12px;font-size:17px">${PLACES.map(([id, name]) => `<span style="padding:6px 16px;border-radius:999px;${id === seg.place ? `background:${ACCENT[id]};color:#0f0e15;font-weight:700` : 'border:1px solid #2b2940;color:#6d6a8c'}">${name}</span>`).join('')}</div>
</body></html>`

;(async () => {
  fs.rmSync(work, { recursive: true, force: true })
  for (const d of ['cards', 'frames', 'clips']) fs.mkdirSync(path.join(work, d), { recursive: true })
  // 1. the caption cards
  const browser = await launch()
  const page = await withPage(browser, '', 1280, 720, 1)
  for (let i = 0; i < SEGMENTS.length; i++) {
    await page.setContent(card(SEGMENTS[i]))
    await page.screenshot({ path: path.join(work, 'cards', `${i}.png`), type: 'png' })
  }
  await browser.close()
  // 2. the band, frame by frame
  const clips = []
  SEGMENTS.forEach((seg, i) => seg.clips.forEach(([name, from, to], k) => clips.push({
    seg: i, name, from, to, dir: path.join(work, 'frames', `${i}-${k}`),
    fadeIn: !(k === 0 && seg.link), fadeOut: !(k === seg.clips.length - 1 && SEGMENTS[i + 1] && SEGMENTS[i + 1].link),
  })))
  const jobs = clips.map(c => ({ svg: svg(c.name), w: BAND.w, h: BAND.h, dpr: 1, frames: { dir: c.dir, from: c.from, to: c.to, fps: FPS } }))
  fs.writeFileSync(path.join(work, 'jobs.json'), JSON.stringify(jobs))
  execFileSync('node', [path.join(__dirname, 'render.js'), path.join(work, 'jobs.json')], { stdio: 'inherit' })
  // 3. each clip on its card, with a short fade at both ends
  const files = []
  clips.forEach((c, n) => {
    const dur = c.to - c.from
    const out = path.join(work, 'clips', `${String(n).padStart(2, '0')}.mp4`)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-framerate', String(FPS), '-t', String(dur), '-i', path.join(work, 'cards', `${c.seg}.png`),
      '-framerate', String(FPS), '-i', path.join(c.dir, '%05d.png'),
      '-filter_complex', `[0:v][1:v]overlay=${BAND.x}:${BAND.y}:shortest=1${c.fadeIn ? `,fade=t=in:st=0:d=${FADE}` : ''}${c.fadeOut ? `,fade=t=out:st=${dur - FADE}:d=${FADE}` : ''},format=yuv420p[v]`,
      '-map', '[v]', '-t', String(dur), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', out], { stdio: 'inherit' })
    files.push(out)
  })
  // 4. one file
  fs.writeFileSync(path.join(work, 'list.txt'), files.map(f => `file '${f}'`).join('\n'))
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', outFile], { stdio: 'inherit' })
  console.log('wrote', outFile, `${clips.reduce((s, c) => s + c.to - c.from, 0).toFixed(1)} s`)
})().catch(e => { console.error(e); process.exit(1) })
