# Snippets (fork)

A Decky Loader plugin for Steam Deck game mode that keeps a list of stored text and puts it into a text field with one tap.

Fork of [xXJSONDeruloXx/snippets](https://github.com/xXJSONDeruloXx/snippets), which was built for Steam launch options. This fork turns it into a plain stored-text tool.

## What each button does

- **Paste**: closes the Quick Access Menu and types the snippet into whatever field has focus, one character at a time, through Steam's own keyboard input API (`SteamClient.Input.ControllerKeyboardSendText`). This is the same mechanism [DeckPass](https://github.com/Teppichseite/DeckPass) uses to enter passwords into games, so it works in games and non-Steam apps, not only in Steam UI. Nothing touches the clipboard.
- **Copy** (clipboard icon): puts the snippet on the Steam client clipboard. Use it for Steam UI fields such as launch options, then press the paste key on the Steam on-screen keyboard.
- **Pencil**: edit or delete the snippet.

The "Append %command%" switch at the bottom is for launch options only. It is off by default and the setting is saved.

## Install

1. Download `Snippets.zip` from the [latest release](https://github.com/minhur/decky-snippets/releases/latest).
2. In game mode: Quick Access Menu (the `...` button), Decky tab, gear icon, enable Developer mode, then in the Developer section use **Install Plugin from ZIP File** (copy the zip to the Deck first) or **Install Plugin from URL** and enter the release asset URL. See the [Decky wiki](https://wiki.deckbrew.xyz/en/user-guide/settings) for the settings page.
3. Open Snippets from the Decky tab and add your text.

Snippets are stored as plain JSON in Decky's settings directory for this plugin (`~/homebrew/settings/Snippets/clipboard_entries.json`). They are not encrypted; do not store anything you would not keep in a plain text file.

## Changes from upstream

- New Paste button that types the text into the focused field (upstream only copied to the clipboard).
- "Append %command%" switch defaults to off and is persisted (upstream defaulted to on and forgot the choice every time the panel opened, [upstream issue #2](https://github.com/xXJSONDeruloXx/snippets/issues/2)).
- Wording changed from launch commands to plain text; no default entries are shipped.
- Existing upstream data files load unchanged.

## Status

Built from source and released; not yet verified on a Steam Deck. If Paste does nothing in a particular game, try Copy plus the on-screen keyboard's paste key, and open an issue naming the game.

## Build

Requires Node.js 16.14+ and pnpm 9.

```
pnpm install --frozen-lockfile
pnpm run build
```

Package the zip as `Snippets/` containing `dist/index.js`, `package.json`, `plugin.json`, `main.py`, `README.md`, `LICENSE`.

## License

BSD-3-Clause, see [LICENSE](LICENSE). Original work by xXJSONDeruloXx.
