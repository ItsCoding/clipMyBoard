# Platform notes

ClipMyBoard is designed for Windows, macOS, and Linux, but desktop clipboard and global shortcut APIs are not equally available everywhere.

## Shortcuts

The default shortcut is `Shift+Ctrl+V`.

`Win+V`/`Super+V` is optional because:

- Windows reserves `Win+V` for built-in clipboard history.
- GNOME Wayland can block app-level global shortcuts.
- Some Linux compositors require shortcuts to be configured in desktop settings.

## Clipboard support

The MVP uses Electron's cross-platform clipboard API and supports:

- Plain text
- URLs
- Rich HTML where available
- Images via PNG persistence
- File lists when the clipboard exposes copied files as paths/text

Native clipboard modules may be added later for richer Windows/macOS/X11 support.

## Linux

X11 generally works better for background clipboard monitoring and global shortcuts.

For Ubuntu, the best current setup is:

```sh
sudo apt install xdotool
```

Then log into an Ubuntu on Xorg/X11 session. This gives the most reliable automatic paste behavior.

For Wayland sessions, `ydotool` is the best available helper, but it can require daemon setup and still depends on compositor/security policy:

```sh
sudo apt install ydotool
sudo systemctl enable --now ydotool
```

Wayland security policies can restrict:

- Reading clipboard contents in the background
- Registering global shortcuts from regular apps
- Simulating paste into another app

When running GNOME/KDE Wayland, the app shows an in-app warning and degrades gracefully.

## macOS

Writing into the clipboard works normally. Automated paste into other apps may require Accessibility permission.

## Windows

The app should avoid `Win+V` by default because it conflicts with Windows Clipboard History.
