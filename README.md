# ClipMyBoard

Cross-platform clipboard manager for Windows, macOS, and Linux with a slim top drawer opened by a separate paste shortcut.

## MVP features

- Global shortcut drawer: `Shift+Ctrl+V`
- Clipboard history for text, links, rich HTML, images, and file path lists
- Local JSON persistence with simple full-text search
- Deduplication by content hash
- Pinned entries
- Tray menu with pause/clear/quit
- Platform warnings for Linux Wayland, Windows `Win+V`, and macOS permissions

## Development

```sh
npm install
npm run dev
```

The dev command starts Vite, builds the Electron main/preload bundle once, then launches Electron against the local Vite server. If main-process code changes, restart `npm run dev`.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## Packaging

```sh
npm run package
```

Build targets are configured for Windows NSIS, macOS DMG, Linux AppImage, and Debian packages.

## Install on the current system

```sh
npm run install
```

This builds an unpacked app, replaces the current user install, configures autostart, and launches the app.

Install locations:

- Linux: `~/.local/opt/ClipMyBoard`, launcher at `~/.local/bin/clipmyboard`, autostart at `~/.config/autostart/dev.clipmyboard.app.desktop`
- macOS: `~/Applications/ClipMyBoard.app`, autostart via `~/Library/LaunchAgents/dev.clipmyboard.app.plist`
- Windows: `%LOCALAPPDATA%\\Programs\\ClipMyBoard`, autostart shortcut in the Startup folder

Useful options:

```sh
npm run install -- --no-launch
npm run install -- --dry-run
```

## Platform caveats

See [`docs/platform-notes.md`](docs/platform-notes.md).

## Ubuntu recommendation

For the most reliable full feature set, use an **X11 session with `xdotool`**:

```sh
sudo apt install xdotool
```

On Ubuntu Wayland, automatic paste is best-effort. Install `ydotool` if you want to try Wayland-compatible input simulation:

```sh
sudo apt install ydotool
sudo systemctl enable --now ydotool
```

The app shows a first-run startup wizard with detected capabilities and missing helper tools.
