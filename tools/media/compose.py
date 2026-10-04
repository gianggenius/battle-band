#!/usr/bin/env python3
"""python3 tools/media/compose.py <stills-dir> <out-dir>

Stacks the stills made by render.js (see make-media.sh) into the pictures the README shows:
  biome-<place>.png   a fight, the boss's warning and the boss's end, one under the other
  camps.png           the four camps
  usage-states.png    the usage strip in six states, each with a note
  elite.png           lap 1 and lap 2 (elite monsters) of the same moment
Needs ImageMagick (`magick`). FONT=<ttf> picks the font of the notes."""
import os
import subprocess
import sys

stills, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
BG = '#16151d'
INK = '#d9d6ee'
DIM = '#9b97b8'
FONT = os.environ.get('FONT') or next(
    (p for p in ['/System/Library/Fonts/Supplemental/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] if os.path.exists(p)), None)
BAND = 8 * 31  # one picture is 248 px tall at two device pixels per CSS pixel


def run(*args):
    subprocess.run(['magick', *args], check=True)


def p(name):
    return os.path.join(stills, name)


def stack(files, dest, gap=8, pad=12):
    args = []
    for i, f in enumerate(files):
        args += [f] + (['-size', f'1x{gap}', f'xc:{BG}'] if i < len(files) - 1 else [])
    run(*args, '-background', BG, '-append', '-bordercolor', BG, '-border', str(pad), dest)


def note(width, height, lines):
    """a gutter image holding one or two lines of text, vertically centred"""
    args = ['-size', f'{width}x{height}', f'xc:{BG}']
    if FONT:
        args += ['-font', FONT]
    first, *rest = lines
    args += ['-gravity', 'West', '-fill', INK, '-pointsize', '28', '-annotate', f'+16{"-14" if rest else "+0"}', first]
    if rest:
        args += ['-fill', DIM, '-pointsize', '22', '-annotate', '+16+18', rest[0]]
    return args


def with_notes(rows, dest, gutter=330, gap=8, pad=12):
    """rows: (image file, crop-height or None, note lines) top to bottom"""
    parts = []
    for i, (f, crop, lines) in enumerate(rows):
        h = crop or BAND
        # +gravity: the note leaves its gravity set, which would centre the crop window instead of starting it at the top
        parts += ['(', *note(gutter, h, lines), '(', f, '+gravity', *(['-crop', f'1520x{crop}+0+0', '+repage'] if crop else []), ')', '+append', ')']
        if i < len(rows) - 1:
            parts += ['-size', f'1x{gap}', f'xc:{BG}']
    run(*parts, '-background', BG, '-append', '-bordercolor', BG, '-border', str(pad), dest)


FIGHT = {'dungeon': '3', 'plateau': '7', 'ice': '3', 'volcano': '3'}
for place, t in FIGHT.items():
    stack([p(f'{place}-{t}.png'), p(f'{place}-35.png'), p(f'{place}-43.png')], os.path.join(out, f'biome-{place}.png'))

stack([p(f'camp-{b}-2_5.png') for b in FIGHT], os.path.join(out, 'camps.png'))

STATES = [
    ('none', ['no data yet', 'grey roads, nothing known']),
    ('fresh', ['just reset', '5H 4%, 1W 1%']),
    ('mid', ['calm', '5H 37%, 1W 12.5%']),
    ('amber', ['getting close', '5H 72%, 1W 64%']),
    ('danger', ['nearly out', '5H 91%, 1W 88%']),
    ('full', ['out of tokens', '5H 100%, 1W 97.5%']),
]
with_notes([(p(f'usage-{s}-14.png'), 8 * 11, n) for s, n in STATES], os.path.join(out, 'usage-states.png'))

PAIRS = [('ice', '35'), ('volcano', '35'), ('dungeon', '35')]
rows = []
for place, t in PAIRS:
    rows += [(p(f'elite-{place}-t0-{t}.png'), None, ['lap 1', place]), (p(f'elite-{place}-t1-{t}.png'), None, ['lap 2: elite', place])]
with_notes(rows, os.path.join(out, 'elite.png'), gutter=240)
print('composed into', out)
