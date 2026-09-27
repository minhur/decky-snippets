# Snippets (fork)

A Decky Loader plugin for Steam Deck game mode: a list of stored text. Tap an entry and it is pasted into whatever text field has focus.

Fork of [xXJSONDeruloXx/snippets](https://github.com/xXJSONDeruloXx/snippets), which was built for Steam launch options. This fork is a plain stored-text tool.

## How it works

- **Tap an entry**: the Quick Access Menu closes and the text is typed into the focused field, one character at a time, through Steam's own keyboard input API (`SteamClient.Input.ControllerKeyboardSendText`). This is the mechanism [DeckPass](https://github.com/Teppichseite/DeckPass) uses to enter passwords into games, so it works in games and non-Steam apps, not only in Steam UI.
- **Pencil** (or the X button on a focused entry): edit or delete.
- **Add**: new entry. Name is optional; it defaults to the text.

## Install

1. Download `Snippets.zip` from the [latest release](https://github.com/minhur/decky-snippets/releases/latest).
2. In game mode: Quick Access Menu (the `...` button), Decky tab, gear icon, enable Developer mode, then in the Developer section use **Install Plugin from URL** with the release asset URL, or **Install Plugin from ZIP File** after copying the zip to the Deck. See the [Decky wiki](https://wiki.deckbrew.xyz/en/user-guide/settings) for the settings page.
3. Open Snippets from the Decky tab and add your text.

Snippets are stored as plain JSON in Decky's settings directory for this plugin (`~/homebrew/settings/Snippets/clipboard_entries.json`). They are not encrypted; do not store anything you would not keep in a plain text file.

## Changes from upstream

- Tapping an entry pastes (types) it into the focused field. Upstream only copied to the clipboard.
- The launch-option features (the `%command%` toggle, default entries, reset) are removed.
- Existing upstream data files load unchanged.

## Status

Built from source and released; not yet verified on a Steam Deck. If a tap does nothing in a particular game, open an issue naming the game.

## Build

Requires Node.js 16.14+ and pnpm 9.

```
pnpm install --frozen-lockfile
pnpm run build
```

Package the zip as `Snippets/` containing `dist/index.js`, `package.json`, `plugin.json`, `main.py`, `README.md`, `LICENSE`.

## License

BSD-3-Clause, see [LICENSE](LICENSE). Original work by xXJSONDeruloXx.
