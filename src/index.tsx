import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
  ToggleField,
  TextField,
  DialogButton,
  Focusable,
  showContextMenu,
  Menu,
  MenuItem,
  ConfirmModal,
  showModal,
  Router,
  sleep
} from "@decky/ui";
import {
  callable,
  definePlugin,
  toaster
} from "@decky/api";
import { useState, useEffect } from "react";
import { FaKeyboard, FaClipboard, FaCheck, FaPlus, FaPencilAlt } from "react-icons/fa";

// Steam's client API is a global inside the Steam UI. Typed loosely so the
// build does not depend on a specific @decky/ui typing of it.
declare const SteamClient: any;

// Backend API calls
const getEntries = callable<[], Snippet[]>("get_entries");
const addEntry = callable<[name: string, text: string], Snippet>("add_entry");
const updateEntry = callable<[entryId: string, name: string, text: string], Snippet | null>("update_entry");
const deleteEntry = callable<[entryId: string], boolean>("delete_entry");
const getSettings = callable<[], Settings>("get_settings");
const setSetting = callable<[key: string, value: unknown], Settings>("set_setting");

// Delays copied from DeckPass, which types credentials into games the same way.
const CLOSE_MENU_DELAY_MS = 500;
const PER_CHAR_DELAY_MS = 5;

interface Snippet {
  id: string;
  name: string;
  text: string;
}

interface Settings {
  append_command: boolean;
}

// Helper to truncate long names
const truncateName = (name: string, maxLength: number = 16): string => {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + "…";
};

const resolveText = (entry: Snippet, appendCommand: boolean): string =>
  appendCommand ? `${entry.text} %command%` : entry.text;

// Close the Quick Access Menu and type the text into whatever has focus.
// Same mechanism as DeckPass: SteamClient.Input.ControllerKeyboardSendText,
// one character at a time, so it works inside games and not only in Steam UI.
const typeText = async (text: string): Promise<void> => {
  const sendText = SteamClient?.Input?.ControllerKeyboardSendText;
  if (typeof sendText !== "function") {
    throw new Error("SteamClient.Input.ControllerKeyboardSendText is not available");
  }
  Router.CloseSideMenus();
  await sleep(CLOSE_MENU_DELAY_MS);
  for (const char of text) {
    SteamClient.Input.ControllerKeyboardSendText(char);
    await sleep(PER_CHAR_DELAY_MS);
  }
};

// Put the text on the Steam client clipboard, for the on-screen keyboard's
// paste key (Steam UI fields such as launch options).
const copyText = async (text: string): Promise<boolean> => {
  const tempInput = document.createElement("input");
  tempInput.value = text;
  tempInput.style.position = "absolute";
  tempInput.style.left = "-9999px";
  document.body.appendChild(tempInput);
  tempInput.focus();
  tempInput.select();

  let copySuccess = false;
  try {
    if (document.execCommand("copy")) {
      copySuccess = true;
    }
  } catch (e) {
    try {
      await navigator.clipboard.writeText(text);
      copySuccess = true;
    } catch (clipboardError) {
      console.error("Both copy methods failed:", e, clipboardError);
    }
  }
  document.body.removeChild(tempInput);
  return copySuccess;
};

interface SnippetRowProps {
  entry: Snippet;
  appendCommand: boolean;
  onEdit: (entry: Snippet) => void;
  onDelete: (entry: Snippet) => void;
}

function SnippetRow({ entry, appendCommand, onEdit, onDelete }: SnippetRowProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  // Reset the "Copied" state after 2 seconds
  useEffect(() => {
    if (showCopied) {
      const timer = setTimeout(() => setShowCopied(false), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showCopied]);

  const handleType = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await typeText(resolveText(entry, appendCommand));
    } catch (error) {
      toaster.toast({
        title: "Type failed",
        body: `Error: ${String(error)}`
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopy = async () => {
    if (isBusy || showCopied) return;
    setIsBusy(true);
    try {
      const ok = await copyText(resolveText(entry, appendCommand));
      if (ok) {
        setShowCopied(true);
      } else {
        toaster.toast({
          title: "Copy failed",
          body: "Unable to copy to clipboard"
        });
      }
    } catch (error) {
      toaster.toast({
        title: "Copy failed",
        body: `Error: ${String(error)}`
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(
      <Menu label={entry.name}>
        <MenuItem onSelected={() => onEdit(entry)}>Edit</MenuItem>
        <MenuItem tone="destructive" onSelected={() => onDelete(entry)}>Delete</MenuItem>
      </Menu>,
      e.target as HTMLElement
    );
  };

  const iconButtonStyle = {
    height: "40px",
    width: "40px",
    minWidth: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
  };

  return (
    <PanelSectionRow>
      <div style={{ marginTop: "10px" }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: "bold",
            opacity: 0.9,
            marginBottom: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={entry.name}
        >
          {truncateName(entry.name, 28)}
        </div>
        <Focusable
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            padding: "0",
          }}
          flow-children="horizontal"
          onSecondaryActionDescription="Options"
          onSecondaryButton={(evt) => handleContextMenu(evt as unknown as MouseEvent)}
        >
        <DialogButton
          style={{
            height: "40px",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "10px",
            minWidth: "0",
          }}
          onClick={handleType}
          disabled={isBusy}
        >
          <FaKeyboard size={14} />
          <span>{isBusy ? "Pasting..." : "Paste"}</span>
        </DialogButton>
        <DialogButton
          style={iconButtonStyle}
          onClick={handleCopy}
          disabled={isBusy || showCopied}
        >
          {showCopied ? <FaCheck size={16} style={{ color: "#4CAF50" }} /> : <FaClipboard size={16} />}
        </DialogButton>
        <DialogButton
          style={iconButtonStyle}
          onClick={(e) => handleContextMenu(e as unknown as MouseEvent)}
        >
          <FaPencilAlt size={16} />
        </DialogButton>
        </Focusable>
      </div>
    </PanelSectionRow>
  );
}

// Modal component for adding/editing snippets
interface EntryModalProps {
  closeModal?: () => void;
  entry?: Snippet | null;
  onSave: (name: string, text: string) => void;
}

function EntryModal({ closeModal, entry, onSave }: EntryModalProps) {
  const [text, setText] = useState(entry?.text || "");
  const [name, setName] = useState(entry?.name || "");

  const handleSave = () => {
    if (text.trim()) {
      // If name is empty, use the text as the name
      const finalName = name.trim() || text.trim();
      onSave(finalName, text.trim());
      closeModal?.();
    } else {
      toaster.toast({
        title: "Nothing to save",
        body: "Text is required"
      });
    }
  };

  return (
    <ConfirmModal
      strTitle={entry ? "Edit Snippet" : "Add Snippet"}
      onOK={handleSave}
      onCancel={closeModal}
      strOKButtonText="Save"
      strCancelButtonText="Cancel"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <TextField
          label="Text"
          description="What gets typed or copied"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <TextField
          label="Name (optional)"
          description="Button label; defaults to the text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </ConfirmModal>
  );
}

function Content() {
  const [appendCommand, setAppendCommand] = useState(false);
  const [entries, setEntries] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load entries and settings on mount
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [loadedEntries, settings] = await Promise.all([getEntries(), getSettings()]);
      setEntries(loadedEntries);
      setAppendCommand(Boolean(settings.append_command));
    } catch (error) {
      console.error("Failed to load snippets:", error);
      toaster.toast({
        title: "Error",
        body: "Failed to load snippets"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAppend = async (checked: boolean) => {
    setAppendCommand(checked);
    try {
      await setSetting("append_command", checked);
    } catch (error) {
      toaster.toast({
        title: "Error",
        body: "Failed to save setting"
      });
    }
  };

  const handleAddEntry = () => {
    showModal(
      <EntryModal
        onSave={async (name, text) => {
          try {
            await addEntry(name, text);
            await loadAll();
          } catch (error) {
            toaster.toast({
              title: "Error",
              body: "Failed to add snippet"
            });
          }
        }}
      />
    );
  };

  const handleEditEntry = (entry: Snippet) => {
    showModal(
      <EntryModal
        entry={entry}
        onSave={async (name, text) => {
          try {
            await updateEntry(entry.id, name, text);
            await loadAll();
          } catch (error) {
            toaster.toast({
              title: "Error",
              body: "Failed to update snippet"
            });
          }
        }}
      />
    );
  };

  const handleDeleteEntry = (entry: Snippet) => {
    showModal(
      <ConfirmModal
        strTitle="Delete Snippet"
        strDescription={`Delete "${entry.name}"?`}
        strOKButtonText="Delete"
        strCancelButtonText="Cancel"
        bDestructiveWarning={true}
        onOK={async () => {
          try {
            await deleteEntry(entry.id);
            await loadAll();
          } catch (error) {
            toaster.toast({
              title: "Error",
              body: "Failed to delete snippet"
            });
          }
        }}
      />
    );
  };

  return (
    <PanelSection title="Snippets">
      {isLoading ? (
        <PanelSectionRow>
          <div style={{ textAlign: "center", padding: "16px" }}>Loading...</div>
        </PanelSectionRow>
      ) : entries.length === 0 ? (
        <PanelSectionRow>
          <div style={{ textAlign: "center", padding: "16px", opacity: 0.7 }}>
            No snippets yet. Add one below.
          </div>
        </PanelSectionRow>
      ) : (
        <>
          {entries.map((entry) => (
            <SnippetRow
              key={entry.id}
              entry={entry}
              appendCommand={appendCommand}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
            />
          ))}
        </>
      )}

      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={handleAddEntry}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
            <FaPlus />
            <span>Add Snippet</span>
          </div>
        </ButtonItem>
      </PanelSectionRow>

      <PanelSectionRow>
        <ToggleField
          label="Append %command%"
          description="For Steam launch options only. Adds ' %command%' to the text. Saved."
          checked={appendCommand}
          onChange={handleToggleAppend}
        />
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  console.log("Snippets plugin initializing");

  return {
    name: "Snippets",
    titleView: <div className={staticClasses.Title}>Snippets</div>,
    alwaysRender: true,
    content: <Content />,
    icon: <FaKeyboard />,
    onDismount() {
      console.log("Snippets plugin unloading");
    },
  };
});
