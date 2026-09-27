# Snippets backend: stores snippets and settings as JSON in the plugin's
# Decky settings directory. No binaries, no network.
import decky
import os
import json

ENTRIES_FILE = "clipboard_entries.json"  # kept from upstream so existing data loads
SETTINGS_FILE = "settings.json"

DEFAULT_SETTINGS = {
    "append_command": False,
}


class Plugin:
    entries = []
    settings = dict(DEFAULT_SETTINGS)

    # ---- paths -----------------------------------------------------------

    def _entries_path(self):
        return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, ENTRIES_FILE)

    def _settings_path(self):
        return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, SETTINGS_FILE)

    # ---- entries ---------------------------------------------------------

    def _load_entries(self):
        path = self._entries_path()
        if not os.path.exists(path):
            self.entries = []
            return
        try:
            with open(path, "r") as f:
                raw = json.load(f)
        except Exception as e:
            decky.logger.error(f"Failed to load entries: {e}")
            self.entries = []
            return
        # Upstream stored the text under "command"; accept both.
        migrated = []
        for entry in raw if isinstance(raw, list) else []:
            text = entry.get("text", entry.get("command", ""))
            migrated.append({
                "id": str(entry.get("id", "")),
                "name": entry.get("name") or text,
                "text": text,
            })
        self.entries = migrated

    def _save_entries(self):
        try:
            with open(self._entries_path(), "w") as f:
                json.dump(self.entries, f, indent=2)
        except Exception as e:
            decky.logger.error(f"Failed to save entries: {e}")

    async def get_entries(self):
        return self.entries

    async def add_entry(self, name: str, text: str):
        max_id = 0
        for entry in self.entries:
            try:
                max_id = max(max_id, int(entry.get("id", 0)))
            except ValueError:
                pass
        new_entry = {"id": str(max_id + 1), "name": name, "text": text}
        self.entries.append(new_entry)
        self._save_entries()
        return new_entry

    async def update_entry(self, entry_id: str, name: str, text: str):
        for entry in self.entries:
            if entry.get("id") == entry_id:
                entry["name"] = name
                entry["text"] = text
                self._save_entries()
                return entry
        return None

    async def delete_entry(self, entry_id: str):
        self.entries = [e for e in self.entries if e.get("id") != entry_id]
        self._save_entries()
        return True

    # ---- settings --------------------------------------------------------

    def _load_settings(self):
        self.settings = dict(DEFAULT_SETTINGS)
        path = self._settings_path()
        if not os.path.exists(path):
            return
        try:
            with open(path, "r") as f:
                stored = json.load(f)
            if isinstance(stored, dict):
                self.settings.update({k: v for k, v in stored.items() if k in DEFAULT_SETTINGS})
        except Exception as e:
            decky.logger.error(f"Failed to load settings: {e}")

    def _save_settings(self):
        try:
            with open(self._settings_path(), "w") as f:
                json.dump(self.settings, f, indent=2)
        except Exception as e:
            decky.logger.error(f"Failed to save settings: {e}")

    async def get_settings(self):
        return self.settings

    async def set_setting(self, key: str, value):
        if key not in DEFAULT_SETTINGS:
            decky.logger.warning(f"Ignoring unknown setting: {key}")
            return self.settings
        self.settings[key] = value
        self._save_settings()
        return self.settings

    # ---- lifecycle -------------------------------------------------------

    async def _main(self):
        decky.logger.info("Snippets plugin loaded")
        self._load_entries()
        self._load_settings()

    async def _unload(self):
        decky.logger.info("Snippets plugin unloaded")

    async def _uninstall(self):
        decky.logger.info("Snippets plugin uninstalled")
