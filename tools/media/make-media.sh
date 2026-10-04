#!/bin/bash
# Rebuilds the pictures and the tour video in docs/media from the plugin's own code and art:
#   worlds.png elite-pair.png usage.png camp.png        the README front page
#   biome-*.png camps.png usage-states.png elite.png   the same, in full, for the README's 'More pictures'
#   tour.mp4 tour-poster.png                           the captioned tour, about 90 s
# hero.gif, in-app.png and in-app-recording.mp4 are screen captures of the real app and are not made here.
#
# Needs: bun, node (run `npm install` in tools/host once), Google Chrome (or CHROME=<binary>), ffmpeg, ImageMagick (`magick`).
#   ./tools/media/make-media.sh [outdir]      default: docs/media
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
out=${1:-$repo/docs/media}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$out"

bun "$here/build-media.ts" "$work/svg" >/dev/null
node "$here/stills.js" "$work/svg" "$work/stills"
python3 "$here/compose.py" "$work/stills" "$out"
node "$here/tour.js" "$work/svg" "$work/tour" "$out/tour.mp4"

# the poster: a frame from inside a clip, with a play button on it
ffmpeg -v error -y -ss 19 -i "$out/tour.mp4" -frames:v 1 "$work/poster.png"
magick "$work/poster.png" -fill 'rgba(10,9,16,0.62)' -draw 'circle 640,330 640,404' -fill 'rgba(255,255,255,0.95)' -draw 'polygon 616,292 616,368 684,330' "$out/tour-poster.png"
echo "media written to $out"
