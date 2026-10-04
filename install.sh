#!/usr/bin/env bash
# Installs battle-band for the Claude desktop app (macOS or Linux shell).
#
# It copies plugin/ into the folder Claude loads user plugins from, ~/.claude/skills/battle-band, where the next session
# picks it up as battle-band@skills-dir. No setting is edited and nothing else is touched, so running it again simply
# replaces the copy (that is also how you update). `./install.sh --uninstall` removes it.
#
#   ./install.sh               install or update
#   ./install.sh --uninstall   remove
#
# CLAUDE_CONFIG_DIR is honored when set (default ~/.claude).
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
src="$here/plugin"
config="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
dest="$config/skills/battle-band"

say() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

# a copy of this mod, recognised by its manifest, so that nothing else can be removed by mistake
is_ours() { [ -f "$1/.claude-plugin/plugin.json" ] && grep -q '"name"[[:space:]]*:[[:space:]]*"battle-band"' "$1/.claude-plugin/plugin.json"; }

# the engine the desktop app bundles (or a `claude` on the PATH), to validate the copy; optional
find_engine() {
  if command -v claude >/dev/null 2>&1; then command -v claude; return; fi
  local app="$HOME/Library/Application Support/Claude/claude-code"
  [ -d "$app" ] && ls -d "$app"/*/*/claude.app/Contents/MacOS/claude 2>/dev/null | sort -V | tail -1 || true
}

case "${1:-}" in
  --uninstall|uninstall)
    [ -e "$dest" ] || { say "battle-band is not installed at $dest"; exit 0; }
    is_ours "$dest" || die "$dest does not look like a battle-band copy; not removing it"
    rm -rf "$dest"
    say "removed $dest"
    say "Start a new session in the Code tab; sessions that are already open keep the band until they end."
    exit 0
    ;;
  ""|install) ;;
  -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) die "unknown option: $1 (try --help)" ;;
esac

is_ours "$src" || die "$src is not the battle-band plugin folder; run this script from a full checkout of the repository"

# a second copy loaded some other way would draw a second band
if [ -f "$config/settings.json" ] && grep -q 'battle-band' "$config/settings.json"; then
  say "note: $config/settings.json already mentions battle-band (a plugin folder or a marketplace install)."
  say "      Keep only one way of loading it, or the band is drawn twice."
fi

[ ! -e "$dest" ] || is_ours "$dest" || die "$dest exists and is not a battle-band copy; not replacing it"
mkdir -p "$config/skills"
if command -v rsync >/dev/null 2>&1; then
  # .claude-plugin/types is written by the engine at run time; leave it alone
  rsync -a --delete --exclude '.DS_Store' --exclude '.claude-plugin/types' "$src/" "$dest/"
else
  rm -rf "$dest"
  cp -R "$src" "$dest"
fi
version=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$dest/.claude-plugin/plugin.json" | head -1)
say "installed battle-band ${version:-?} to $dest"

engine=$(find_engine)
if [ -n "$engine" ]; then
  if "$engine" plugin validate "$dest" >/dev/null 2>&1; then
    say "validated with $engine"
  else
    say "warning: the Claude engine reports problems with the copy; run: \"$engine\" plugin validate \"$dest\""
  fi
else
  say "(no Claude engine found on this machine to validate the copy; that is fine)"
fi

say
say "Next: start a NEW session in the Code tab. The band appears above the prompt; sessions that are already open keep what they loaded."
