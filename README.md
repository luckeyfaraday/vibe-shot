# VibeShot

[![Check](https://github.com/luckeyfaraday/vibe-shot/actions/workflows/check.yml/badge.svg)](https://github.com/luckeyfaraday/vibe-shot/actions/workflows/check.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-b9f45a.svg)](LICENSE)

A tiny screenshot shelf designed for coding-agent workflows on Linux. It turns screenshots into something you can immediately paste or drag into Codex, Claude Code, OpenCode, a terminal, or any file-aware app.

Press **Ctrl+Shift+4**, select a region, then either paste the image from your clipboard or drag its thumbnail directly into your terminal. Captures are saved to `~/Pictures/VibeShot`.

## Why VibeShot?

- One shortcut from capture to clipboard
- Native PNG drag-and-drop into coding-agent CLIs
- Compact always-on-top shelf with eight recent captures
- Region, window, and full-screen modes
- System tray access and optional login startup
- Local files only—no account, sync service, or telemetry

## Run it

```bash
npm install
npm run dev
```

Requirements: Linux with X11, Node.js 20 or newer, and `gnome-screenshot`. The current release is developed and tested on Ubuntu 24.04 with Cinnamon.

## Install on this machine

```bash
npm run install:local
```

This adds VibeShot to the Cinnamon app menu, links a `vibeshot` command into `~/.local/bin`, and starts it quietly in the tray on future logins. VibeShot stays available from the system tray when its shelf is hidden.

## Shortcuts and controls

- `Ctrl+Shift+4`: capture a region from anywhere
- **Capture region**: select a rectangle
- **Window**: capture the active window
- **Full screen**: capture the current desktop
- **Copy**: copy an older capture back to the clipboard
- Drag a thumbnail: drop the PNG file into a coding-agent CLI or any file-aware app

VibeShot currently targets Cinnamon/X11 and uses the machine's existing `gnome-screenshot` capture UI.

## Uninstall

```bash
npm run uninstall:local
```

This removes the launcher, command link, and login entry. Captured images are intentionally kept in `~/Pictures/VibeShot`.

## Contributing

Issues and focused pull requests are welcome. Run `npm run check` before opening a PR. The codebase intentionally stays small and uses Electron only for the native tray, clipboard, shortcut, and file-drag APIs.

## License

[MIT](LICENSE)
