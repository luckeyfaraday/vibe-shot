# VibeShot

[![Check](https://github.com/luckeyfaraday/vibe-shot/actions/workflows/check.yml/badge.svg)](https://github.com/luckeyfaraday/vibe-shot/actions/workflows/check.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-b9f45a.svg)](LICENSE)

A tiny screenshot shelf designed for coding-agent workflows on Windows and Linux. It turns screenshots into something you can immediately paste or drag into Codex, Claude Code, OpenCode, a terminal, or any file-aware app.

Press **Ctrl+Shift+4**, select a region, then either paste the image from your clipboard or drag its thumbnail directly into your terminal. Captures are saved to `~/Pictures/VibeShot`.

## Download

### Windows

Download and run `VibeShot-*-x64.exe` from [GitHub Releases](https://github.com/luckeyfaraday/vibe-shot/releases/latest). The installer adds Start menu and desktop shortcuts. Launch VibeShot once after installing it; it then starts quietly in the tray at login so the global shortcut is always ready.

Windows capture support uses built-in operating-system APIs and does not require a separate screenshot utility.

### Linux AppImage

Download the latest AppImage from [GitHub Releases](https://github.com/luckeyfaraday/vibe-shot/releases/latest), then:

```bash
chmod +x VibeShot-*.AppImage
./VibeShot-*.AppImage
```

You can also double-click it after enabling **Allow executing file as program** in its file properties. Keep the AppImage somewhere permanent, such as `~/Applications`; VibeShot continues running from the tray after its shelf is hidden.

Launch the AppImage once after downloading it. It registers itself to start quietly in the tray at login, so `Ctrl+Shift+4` works globally after future boots without opening the shelf first.

The AppImage bundles VibeShot itself. Your system still needs X11 and `gnome-screenshot` for screen selection.

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

Requirements: Windows 10/11, or Linux with X11 and `gnome-screenshot`; plus Node.js 20 or newer when running from source. Linux development currently targets Ubuntu 24.04 with Cinnamon.

To build the AppImage yourself:

```bash
npm run dist:appimage
```

To build the Windows installer on Windows:

```powershell
npm run dist:windows
```

## Install locally on Linux

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

On Windows, VibeShot provides its own region and window selectors. On Linux, it targets Cinnamon/X11 and uses the machine's existing `gnome-screenshot` capture UI.

The AppImage can also be invoked directly with `--capture`, which captures immediately whether or not VibeShot is already running.

## Uninstall the local Linux launcher

```bash
npm run uninstall:local
```

This removes the launcher, command link, and login entry. Captured images are intentionally kept in `~/Pictures/VibeShot`.

## Contributing

Issues and focused pull requests are welcome. Run `npm run check` before opening a PR. The codebase intentionally stays small and uses Electron only for the native tray, clipboard, shortcut, and file-drag APIs.

## License

[MIT](LICENSE)
