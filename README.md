<h1 align="center">battle-band</h1>

<p align="center">
  An endless pixel-art adventure in the band above the prompt of the Claude desktop app.<br>
  While Claude works, a knight fights on. When Claude is idle, he rests by a campfire.
</p>

<p align="center">
  <img src="docs/media/hero.gif" width="753" alt="A knight slashes an ice boss in the band above the prompt; the 5H and 1W usage roads run along the top">
</p>

<p align="center"><sub>Recorded from the real app (the ice boss). <a href="README.vi.md">Tiếng Việt</a></sub></p>

---

## What it does

- **An adventure that follows Claude's work.** While Claude works, a knight fights through four places in turn: a **dungeon**, a **plateau**, the **frozen lands** and a **volcano**. Each place has three monsters and then a boss. He strikes in dashes, the monsters hit back, he dodges or blocks, and a warning mark shows a boss's big attack before it lands.
- **It never ends.** After the volcano the knight walks back into the dungeon, and the monsters return in new colors and tougher ("elite" laps).
- **A camp when Claude is idle.** Between your messages the knight sits by a campfire, in the place he last reached.
- **Your usage limits as two roads.** The top of the band draws the 5-hour limit (**5H**, ends at a tower) and the weekly limit (**1W**, ends at a castle). A little knight walks each road as the limit fills: green, then amber from 60%, then red from 85%. Reaching the end means out of tokens.
- **Nothing else.** No text, no buttons, no commands, no notifications. It draws one picture above the prompt and does nothing in the terminal or in VS Code.

Progress belongs to the session: each new session starts in the dungeon, and the knight only advances while Claude works. The next stretch of work picks up where the last one stopped.

## See it

<p align="center">
  <img src="docs/media/in-app.png" width="786" alt="The band above the prompt box in the Claude desktop app, during a volcano fight">
</p>

<p align="center"><sub>The band above the prompt, screenshot of the real app. A screen recording of 100 s (mp4, 5 MB, it downloads when you click): <a href="docs/media/in-app-recording.mp4?raw=true">in-app-recording.mp4</a> (plateau, ice and volcano, with two changes of place).</sub></p>

<p align="center">
  <a href="docs/media/tour.mp4?raw=true"><img src="docs/media/tour-poster.png" width="640" alt="Download the tour video"></a>
</p>

<p align="center"><sub>A captioned tour of 93 s (mp4, 5 MB, click the picture to download): <a href="docs/media/tour.mp4?raw=true">tour.mp4</a>. It is drawn by the mod's own code, the way the app draws it (see <a href="#develop">Develop</a>).</sub></p>

### The four places

Each picture is one place: a fight, the boss's warning, and the boss's end.

<img src="docs/media/biome-dungeon.png" width="772" alt="Dungeon: a slime fight, the skeleton king's warning mark, the finishing blow">

<img src="docs/media/biome-plateau.png" width="772" alt="Plateau: a goblin fight, the rock tortoise's warning mark, the finishing blow">

<img src="docs/media/biome-ice.png" width="772" alt="Frozen lands: an ice slime fight, the yeti's warning mark, the boss dissolving in light">

<img src="docs/media/biome-volcano.png" width="772" alt="Volcano: a lava slime fight, the drake's warning mark, the boss dissolving in light">

### Camp

<img src="docs/media/camps.png" width="772" alt="The camp in each of the four places: the knight sleeps by a fire">

### Elite laps

The same boss in lap 1 and in lap 2 (and every lap after): new colors, one more round.

<img src="docs/media/elite.png" width="880" alt="The yeti, the drake and the skeleton king in lap 1 and in their elite colors in lap 2">

### Usage strip

<img src="docs/media/usage-states.png" width="880" alt="The usage strip in six states: no data, just reset, calm, getting close, nearly out, out of tokens">

The steel bar under each road is the time that has passed in that window, so you can see whether you are going faster or slower than the clock. Hover a road for the exact numbers (the hover text is in Vietnamese, see [Known limits](#known-limits)).

## Requirements

- The **Claude desktop app** (Code tab). The mod draws on the desktop surface only.
- Tested on: macOS 26.6, Claude desktop app 2.19675.0 with its bundled engine 2.1.286.
- Windows: the same folder layout should work, but it is **not tested**. Linux has no desktop app; the Claude Code terminal UI ignores this mod.

The mod uses the engine's plugin hooks (`ui.render` for the band above the prompt), which are new. A future engine version may change them: run `claude plugin validate` (see [Develop](#develop)) if the band stops appearing after an update.

## Install

macOS or Linux shell:

```bash
git clone https://github.com/gianggenius/battle-band.git
cd battle-band
./install.sh
```

Then **start a new session** in the Code tab. Sessions that are already open keep what they loaded.

`install.sh` only copies the `plugin/` folder to `~/.claude/skills/battle-band`, which the engine loads on its own as `battle-band@skills-dir`. It edits no setting. It also validates the copy when it can find a Claude engine, and it warns if `settings.json` already loads battle-band some other way (two copies would draw two bands).

**Without the script:** copy the `plugin` folder to `~/.claude/skills/battle-band` (on Windows: `%USERPROFILE%\.claude\skills\battle-band`, untested) and start a new session.

**Update:** `git pull && ./install.sh`, then start a new session.

**Uninstall:** `./install.sh --uninstall` (or delete the folder `~/.claude/skills/battle-band`).

<details>
<summary>Other ways to load it</summary>

- **Plugin marketplace (Claude Code CLI users):**
  ```bash
  claude plugin marketplace add gianggenius/battle-band
  claude plugin install battle-band@battle-band
  ```
  The repository is a one-plugin marketplace. Update with `claude plugin update battle-band@battle-band`.
- **Any folder, for development:** set `CLAUDE_CODE_PLUGIN_DIRS` to the `plugin` folder in the `env` block of `~/.claude/settings.json`. This is how the author runs the mod, and it is the only way that was also checked inside the real desktop app. Use only one way at a time.

The engine loads all three at the same trust level (`tier user`). Each was checked headless with the desktop app's engine in a clean home folder (`hooks module battle-band@... loaded`).

</details>

## How it works

The mod registers four hooks (`turn.start`, `turn.complete`, `session.measure`, `ui.render` for the `AbovePrompt` component) and answers each draw with a single `Svg` element.

- **One picture, animated by SMIL, no scripts.** The band is one 190 x 31 unit picture: the usage strip on the top 11 rows, the scene on the 20 below. Everything moves with SVG animation. Frames of a sprite are switched by opacity, because the app removes an animated `href`.
- **The picture is a function of the clock.** The app rebuilds the picture's frame from scratch each time the mod answers a draw. So every answer says where in the 48 s lap the knight is right now (a negative `begin`), and the animation carries on from there instead of restarting. Draws are rare: when Claude starts or stops working, at the end of each 48 s place, and when the window is resized.
- **Working or resting** comes from the app's own `isWorking` flag, with the `turn.start` and `turn.complete` hooks as a backup (a subagent finishing does not send the knight to camp).
- **The usage strip** reads the 5-hour and weekly windows the engine already knows (`$.session.usage()` and the `session.measure` push). Later readings wait for the next draw, so the frame is not rebuilt for a few pixels.
- **Size.** The frame height is computed from the band's width. A picture is about 90 KB of source, under the engine's 131072 character limit.

The design notes (in Vietnamese, with the app's drawing path, the limits found, and the tools used to check them) are in [docs/design.md](docs/design.md).

## Privacy and safety

- It reads two things from the engine: when a main turn starts and ends, and the usage windows (percent used and reset time). The hooks receive the turn events, but the code never reads the text of your prompts or the answers.
- It makes no network request, writes no file, runs no command and adds no tool, skill, agent or MCP server. `claude plugin validate plugin` lists the engine calls the code makes: `$.clock.after`, `$.clock.now`, `$.session.usage`, `$.ui.invalidate`, `$.ui.resolve`.
- The picture is cleaned by the app (DOMPurify) and shown in a sandboxed frame without scripts or network access.
- Read the code before you install it: the whole mod is the `plugin` folder, and `plugin/hooks/register.tsx` is the entry point.

## Known limits

- **Desktop app only.** In the terminal UI and in VS Code the mod draws nothing.
- **The band goes dark for about a second at the end of each 48 s place**, while the picture changes place. That is by design (the app rebuilds the frame there). In a 100 s screen recording of the real app, the two changes of place were the only dark moments, apart from one short restart of the picture right as the recording began (a tool call was running; the cause was not investigated).
- **The hover text of the usage roads is in Vietnamese** ("Giới hạn 5 giờ: đã dùng 37%, làm mới sau 2 giờ 12 phút"). The numbers are readable anyway; the strings are in `plugin/hooks/adv/usage.ts` if you want to translate them.
- **The usage roads need the engine's rate-limit data.** They stay grey until the first reading arrives (after the first answer of a session). If the engine reports no 5-hour or weekly window for your account, they stay grey.
- **CPU.** In headless Chrome with software rendering the animation used about 8 to 11% of one core. Its cost inside the app was not measured.
- **New session needed** after an install or an update; `/reload-plugins` reloads a mod that was already loaded when the session started.
- Only macOS was tested.

## Develop

```
plugin/               the mod, the only folder that gets installed
  .claude-plugin/       plugin.json
  hooks/                hooks.json and register.tsx (the hooks and the draw)
  hooks/adv/            the art (sprites, places), the choreography, the usage strip, the camp
  tests/                12 tests, run by `claude plugin test`
tools/                build, check and deploy scripts
tools/host/           replays the app's drawing of an Svg (its scrub and sandboxed frame) in headless Chrome
tools/media/          rebuilds the pictures and the tour video in docs/media
docs/design.md        design notes (Vietnamese)
install.sh            the installer
.claude-plugin/       marketplace.json
```

`claude` below is the engine. If you have only the desktop app, use the engine it downloaded: `~/Library/Application Support/Claude/claude-code/<version>/<id>/claude.app/Contents/MacOS/claude`.

```bash
claude plugin validate plugin --strict     # manifest, hooks, and the engine calls the code makes
claude plugin test plugin                  # the 12 tests (a fake clock drives them)
bun tools/build.ts out all                 # one SVG per place, into ./out
(cd tools/host && npm install)             # once: puppeteer-core and DOMPurify
node tools/host/sanitize-check.js out/*.svg   # what the app's scrub would drop (it must drop nothing)
```

To work on the mod, point `CLAUDE_CODE_PLUGIN_DIRS` at your working copy's `plugin` folder (instead of running `install.sh`), start a session, and run `/reload-plugins` after each change. `tools/deploy.sh` is the author's way to ship to such a folder: it validates and tests a clean copy, builds every picture through the scrub, backs up the old copy and copies the new one.

The pictures and the video in `docs/media` come from `tools/media/make-media.sh` (needs bun, Chrome, ffmpeg and ImageMagick), except `hero.gif`, `in-app.png` and `in-app-recording.mp4`, which are captures of the real app.

## License

[MIT](LICENSE). Built by GiGi together with Claude Code. This is an unofficial community mod: it is not made, endorsed or supported by Anthropic. Claude is a trademark of Anthropic.
