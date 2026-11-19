# Pixel Pomodoro

A cozy, offline Pomodoro timer for macOS, set inside tiny animated pixel-art worlds.
Built with **Tauri 2**, **React**, **TypeScript**, **Vite**, **Tailwind CSS** and **Zustand**.

- **Four worlds**: a rainy bedroom, a forest cabin with a crackling fire, a sakura café and a
  night-city apartment. Each one has its own palette, ambient animation and day / dusk / night
  lighting that follows your clock. New worlds unlock as you complete pomodoros. You can turn this
  off in Settings.
- **The character reacts to the timer**: it types or writes during focus, sips tea and stretches on
  breaks, and sits idle while the timer is paused.
- **Accurate timer**: remaining time is always computed from wall-clock timestamps
  (`endsAt - now`), never by counting ticks. It stays correct while the window is hidden, minimized
  or the Mac is asleep, and it catches up on any sessions that finished in the meantime.
- **Pomodoro flow**: 25 / 5 / 15 minute defaults, a long break after every 4 focus sessions, and
  automatic or manual transitions. Start, pause, resume, reset and skip.
- **Quest log (tasks)**: add tasks with a pomodoro estimate and pick the current one. Each
  completed focus session is credited to the current task.
- **Stats**: today's pomodoros and focus time, a day streak, all-time total and a 7-day chart.
- **Sound**: chiptune cues and optional ambient sound (rain, wind and fire, café murmur), all
  synthesized with Web Audio, so the app ships no audio files.
- **Native macOS integration**: notifications when a session ends, an overlay title bar with the
  standard window buttons, and light and dark appearance (follows the system or can be set
  manually). Closing the window keeps the timer running; click the Dock icon to bring it back.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Space | Start / pause / resume |
| R | Reset current session |
| S | Skip to next session |
| T | New task |
| 1 – 4 | Switch world |
| ⌘ , | Settings |

## Development

Requirements: Node 20+, Rust (stable) and Xcode Command Line Tools on macOS.

```bash
npm install
npm run app:dev      # native window with hot reload
npm test             # timer engine unit tests
npm run typecheck
```

`npm run dev` serves the UI in a normal browser, which is handy for quick UI work. In that mode
data is stored in `localStorage` instead of files.

## Building the macOS app

```bash
rustup target add aarch64-apple-darwin
npm run app:build:mac
```

Outputs (no dev server needed; all assets are embedded):

- `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Pixel Pomodoro.app`
- `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Pixel Pomodoro_1.0.0_aarch64.dmg`

The GitHub Actions workflow (`.github/workflows/build.yml`) builds both on an Apple Silicon
runner, launches the app as a smoke test and uploads the DMG and a zipped `.app` as artifacts.

The bundle is ad-hoc signed, not notarized. The first time you open a downloaded copy, right-click
the app and choose **Open**, or run `xattr -cr "/Applications/Pixel Pomodoro.app"`. To distribute
it more widely, set `bundle.macOS.signingIdentity` to your Developer ID and notarize it.

## Where data lives

Settings, tasks, session history and the running timer are saved as JSON files in
`~/Library/Application Support/app.pixelpomodoro.desktop/`. Writes are atomic: each file is
written to a temp file, then renamed.

## Project layout

```
src/
  lib/timerEngine.ts     pure, timestamp-based timer state machine (+ tests)
  lib/audio.ts           Web Audio chiptune cues and ambient sound
  lib/notify.ts          native notifications (Tauri plugin, web fallback)
  lib/storage.ts         Zustand storage adapter → Rust file commands
  store/                 settings, tasks, history, timer (Zustand + persist)
  scenes/                320×180 canvas renderer, characters and the four worlds
  components/            PomodoroTimer, PixelEnvironment, SceneSelector, TaskManager,
                         SessionTracker, SettingsPanel, AudioManager, …
src-tauri/               Tauri 2 shell: window config, load/save commands, notifications
scripts/make-icon.mjs    generates the pixel-art app icon (npm run icons)
```

All artwork (scenes, sprites, icon) is original and drawn in code. The fonts are
[Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) and
[VT323](https://fonts.google.com/specimen/VT323) (SIL Open Font License), bundled locally via
Fontsource.
