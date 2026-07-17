# VibeShot — Screenshot Tool for AI Coding Agents

[![Check](https://github.com/luckeyfaraday/vibe-shot/actions/workflows/check.yml/badge.svg)](https://github.com/luckeyfaraday/vibe-shot/actions/workflows/check.yml)
[![Latest release](https://img.shields.io/github/v/release/luckeyfaraday/vibe-shot?display_name=tag&sort=semver&color=b9f45a)](https://github.com/luckeyfaraday/vibe-shot/releases/latest)
[![MIT License](https://img.shields.io/badge/license-MIT-b9f45a.svg)](LICENSE)

VibeShot is a free, open-source screenshot tool and always-on-top screenshot shelf built for AI coding-agent workflows on Windows and Linux. Capture a region, window, or full screen; VibeShot saves the PNG locally, copies it to your clipboard, and keeps a draggable thumbnail ready for Codex, Claude Code, OpenCode, terminals, and other file-aware apps.

Press **Ctrl+Shift+4**, select an area, then paste the screenshot into your prompt or drag it from the VibeShot shelf into your coding agent. No account, cloud upload, browser extension, or agent-specific plugin is required.

## VibeShot at a glance

| | Details |
| --- | --- |
| Best for | Sharing screenshots, UI bugs, mockups, and visual context with AI coding agents |
| Supported systems | Windows 10/11 and Linux with X11 |
| Capture modes | Region, window, and full screen |
| Output | Local PNG files plus automatic clipboard copy |
| Recent history | Eight draggable screenshot thumbnails |
| Data handling | Local only; no account, telemetry, sync, or automatic upload |
| License | MIT |

## Why use VibeShot?

- **Fast visual prompting:** go from screen selection to a pasted or dragged PNG with one global shortcut.
- **Built for coding agents:** drag a screenshot file directly into Codex, Claude Code, OpenCode, a terminal, or any app that accepts files.
- **Reusable capture shelf:** copy, reveal, remove, or drag any of your eight most recent captures.
- **Windows and Linux support:** use native Windows capture APIs or the Linux `gnome-screenshot` interface.
- **Region, window, and screen capture:** choose the right amount of visual context for each prompt.
- **Private by default:** screenshots stay on your computer in `Pictures/VibeShot` until you decide to share or delete them.
- **Always ready:** keep VibeShot in the system tray and start it quietly at login.

## How VibeShot works

1. Launch VibeShot and leave it running in the system tray.
2. Press **Ctrl+Shift+4** anywhere to start a region capture.
3. Select the part of the screen you want to share.
4. VibeShot saves the PNG to `Pictures/VibeShot` and copies it to the clipboard.
5. Paste the image into your prompt, or drag its thumbnail from the shelf into a file-aware coding agent.

VibeShot uses normal clipboard and file drag-and-drop behavior, so it does not need a direct API integration with any AI tool.

## Download and install

### Windows 10 and 11

If the [latest GitHub release](https://github.com/luckeyfaraday/vibe-shot/releases/latest) includes a `VibeShot-*-x64.exe` asset, download and run it. The NSIS installer adds Start menu and desktop shortcuts. Launch VibeShot once after installation; it then starts quietly in the tray at login so the global shortcut remains available.

Windows support is available in the current source. If the latest release does not yet include an `.exe` installer, [build VibeShot from source](#build-from-source) on Windows.

Windows capture support uses built-in operating-system APIs and does not require a separate screenshot utility.

### Linux AppImage

Download the latest AppImage from [GitHub Releases](https://github.com/luckeyfaraday/vibe-shot/releases/latest), then run:

```bash
chmod +x VibeShot-*.AppImage
./VibeShot-*.AppImage
```

You can also double-click the AppImage after enabling **Allow executing file as program** in its file properties. Keep the file somewhere permanent, such as `~/Applications`.

Launch VibeShot once after downloading it. It registers itself to start quietly in the tray at login, so **Ctrl+Shift+4** works globally after future boots.

The AppImage bundles VibeShot itself. Linux screen selection still requires X11 and `gnome-screenshot`.

## Platform compatibility

| Platform | Status | Capture backend | Notes |
| --- | --- | --- | --- |
| Windows 10/11 x64 | Supported | Built-in Windows and PowerShell APIs | Region, window, and full-screen capture; NSIS build target included |
| Linux with X11 | Supported | `gnome-screenshot` | AppImage and local launcher; tested on Ubuntu 24.04 with Cinnamon |
| Linux with Wayland | Not currently targeted | — | X11 is required by the current capture workflow |
| macOS | Not supported | — | No macOS capture backend or package is included |

## Shortcuts and controls

| Action | Control |
| --- | --- |
| Capture a region from anywhere | **Ctrl+Shift+4** |
| Select a rectangle | **Capture region** |
| Capture a window | **Window** |
| Capture the current desktop | **Full screen** |
| Reuse an older screenshot | **Copy** on a capture card |
| Locate a saved PNG | Folder button on a capture card |
| Add a PNG to a prompt or app | Drag its thumbnail into the destination |
| Open all saved captures | Folder button in the VibeShot title bar or tray menu |

On Windows, VibeShot provides its own region and window selectors. On Linux, it uses the machine's existing `gnome-screenshot` capture UI.

## Command-line options

Invoke the VibeShot executable with one of these optional flags:

- `--capture`: immediately start a region capture, including when VibeShot is already running.
- `--hidden`: start VibeShot in the tray without showing the shelf.

For example, with the Linux AppImage:

```bash
./VibeShot-*.AppImage --capture
```

## Build from source

You need Node.js 20 or newer. Clone the repository and install its locked dependencies:

```bash
git clone https://github.com/luckeyfaraday/vibe-shot.git
cd vibe-shot
npm ci
npm run dev
```

To build a Linux AppImage on Linux:

```bash
npm run dist:appimage
```

To build the x64 Windows installer on Windows:

```powershell
npm run dist:windows
```

### Install the local Linux launcher

```bash
npm run install:local
```

This adds VibeShot to the Cinnamon app menu, links a `vibeshot` command into `~/.local/bin`, and starts it quietly in the tray on future logins.

To remove the launcher, command link, and login entry:

```bash
npm run uninstall:local
```

Uninstalling the launcher does not delete screenshots from `~/Pictures/VibeShot`.

## Privacy and screenshot storage

VibeShot does not create an account, upload captures, synchronize files, or collect telemetry. It writes PNG files to the current user's `Pictures/VibeShot` directory. Clearing the shelf removes entries from VibeShot's recent history but intentionally leaves the image files on disk.

When you paste or drag a screenshot into another application, that application's own privacy and data-handling rules apply.

## Frequently asked questions

### What is a screenshot shelf for AI coding agents?

A screenshot shelf keeps recent captures visible and reusable. With VibeShot, you can drag a PNG into a coding-agent prompt to show a UI bug, design reference, error dialog, terminal state, or other visual context without browsing for the file each time.

### Does VibeShot work with Codex, Claude Code, or OpenCode?

Yes, when the destination accepts pasted images or local file drag-and-drop. VibeShot produces standard PNG files and clipboard images rather than depending on an agent-specific integration.

### Does VibeShot upload screenshots or use AI models?

No. VibeShot is a local capture utility. It does not upload images, call an AI API, or run an AI model.

### Where does VibeShot save screenshots?

VibeShot saves each PNG in the current user's `Pictures/VibeShot` directory. The shelf shows the eight most recent captures that still exist on disk.

### Can VibeShot capture a region, window, and full screen?

Yes. All three capture modes are supported on Windows 10/11 and supported Linux/X11 environments.

### Does VibeShot support Wayland or macOS?

Not currently. The Linux workflow targets X11 and requires `gnome-screenshot`; no macOS capture backend is included.

## Development and contributing

Issues and focused pull requests are welcome. Before opening a PR, run:

```bash
npm run check
```

The check suite validates JavaScript syntax and runs the platform and capture tests on both Ubuntu and Windows in GitHub Actions. The codebase intentionally stays small and uses Electron for the tray, clipboard, global shortcut, always-on-top shelf, and native file drag APIs.

## License

VibeShot is open-source software available under the [MIT License](LICENSE).
