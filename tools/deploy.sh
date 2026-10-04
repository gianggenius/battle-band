#!/bin/bash
# Maintainer deploy: validate and test a clean copy of the plugin, build every picture through the app's own scrub, back up the live
# copy, then copy the plugin over it. (End users do not need this: they run ./install.sh.)
# New desktop sessions load the live copy (CLAUDE_CODE_PLUGIN_DIRS in ~/.claude/settings.json, see the README, "Develop");
# sessions already open keep what they loaded, and /reload-plugins picks the new copy up.
#
#   LIVE=<folder>     where the live copy is loaded from (default ~/.claude/user-mods/battle-band)
#   ENGINE=<binary>   the Claude engine to validate and test with (default: the newest one the desktop app has downloaded)
set -euo pipefail
DEV=$(cd "$(dirname "$0")/.." && pwd)
LIVE=${LIVE:-$HOME/.claude/user-mods/battle-band}
ENGINE=${ENGINE:-$(ls -d "$HOME"/Library/Application\ Support/Claude/claude-code/*/*/claude.app/Contents/MacOS/claude | sort -V | tail -1)}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
CHECK=$WORK/check
OUT=$WORK/pictures
mkdir -p "$CHECK" "$OUT"
rsync -a --exclude '.claude-plugin/types' "$DEV/plugin/" "$CHECK/"
( cd "$CHECK" && "$ENGINE" plugin validate . && "$ENGINE" plugin test . )
# the pictures themselves, through the app's own scrub (a dropped attribute is a dead animation): built from the real art
( cd "$DEV" && USAGE=mid TREE="$DEV" bun tools/build.ts "$OUT" all && USAGE=mid TREE="$DEV" bun tools/build-camp.ts "$OUT" \
  && bun tools/check-svg.ts "$OUT"/*.svg && node tools/host/sanitize-check.js "$OUT"/*.svg && bun tools/check-monsters.ts >/dev/null )
mkdir -p "$LIVE"
if [ -n "$(ls -A "$LIVE")" ]; then
  BK="$DEV/backups/live-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BK"
  rsync -a "$LIVE/" "$BK/"
  echo "the previous live copy is saved in $BK"
fi
rsync -a --delete --exclude '.claude-plugin/types' "$CHECK/" "$LIVE/"
echo "deployed to $LIVE"
