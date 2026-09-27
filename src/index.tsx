import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
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
import { FaKeyboard, FaPlus, FaPencilAlt } from "react-icons/fa";

// Steam's client API is a global inside the Steam UI. Typed loosely so the
// build does not depend on a specific @decky/ui typing of it.
declare const SteamClient: any;

// Backend API calls
const getEntries = callable<[], Snippet[]>("get_entries");
const addEntry = callable<[name: string, text: string], Snippet>("add_entry");
const updateEntry = callable<[entryId: string, name: string, text: string], Snippet | null>("update_entry");
const deleteEntry = callable<[entryId: string], boolean>("delete_entry");

// Delays copied from DeckPass, which types credentials into games the same way.
const CLOSE_MENU_DELAY_MS = 500;
const PER_CHAR_DELAY_MS = 5;

interface Snippet {
  id: string;
  name: string;
  text: string;
}

const truncateName = (name: string, maxLength: number = 22): string => {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + "…";
};

// Close the Quick Access Menu and type the text into whatever has focus.
// Same mechanism as DeckPass: SteamClient.Input.ControllerKeyboardSendText,
// one character at a time, so it works inside games and not only in Steam UI.
const pasteText = async (text: string): Promise<void> => {
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

interface SnippetRowProps {
  entry: Snippet;
  onEdit: (entry: Snippet) => void;
  onDelete: (entry: Snippet) => void;
}

function SnippetRow({ entry, onEdit, onDelete }: SnippetRowProps) {
  const [isBusy, setIsBusy] = useState(false);

  const handlePaste = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await pasteText(entry.text);
    } catch (error) {
      toaster.toast({
        title: "Paste failed",
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

  return (
    <PanelSectionRow>
      <Focusable
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "0",
          marginTop: "8px"
        }}
        flow-children="horizontal"
        onSecondaryActionDescription="Edit"
        onSecondaryButton={(evt) => handleContextMenu(evt as unknown as MouseEvent)}
      >
        <DialogButton
          style={{
            height: "40px",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "10px 12px",
            minWidth: "0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          onClick={handlePaste}
          disabled={isBusy}
        >
          {isBusy ? "Pasting..." : truncateName(entry.name)}
        </DialogButton>
        <DialogButton
          style={{
            height: "40px",
            width: "40px",
            minWidth: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
          }}
          onClick={(e) => handleContextMenu(e as unknown as MouseEvent)}
        >
          <FaPencilAlt size={16} />
        </DialogButton>
      </Focusable>
    </PanelSectionRow>
  );
}

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
          description="What gets pasted"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <TextField
          label="Name (optional)"
          description="Label shown in the list; defaults to the text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </ConfirmModal>
  );
}

function Content() {
  const [entries, setEntries] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      setEntries(await getEntries());
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

  const handleAddEntry = () => {
    showModal(
      <EntryModal
        onSave={async (name, text) => {
          try {
            await addEntry(name, text);
            await loadEntries();
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
            await loadEntries();
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
            await loadEntries();
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
    <PanelSection title="Tap to paste">
      {isLoading ? (
        <PanelSectionRow>
          <div style={{ textAlign: "center", padding: "16px" }}>Loading...</div>
        </PanelSectionRow>
      ) : entries.length === 0 ? (
        <PanelSectionRow>
          <div style={{ textAlign: "center", padding: "16px", opacity: 0.7 }}>
            No snippets yet.
          </div>
        </PanelSectionRow>
      ) : (
        <>
          {entries.map((entry) => (
            <SnippetRow
              key={entry.id}
              entry={entry}
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
            <span>Add</span>
          </div>
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  return {
    name: "Snippets",
    titleView: <div className={staticClasses.Title}>Snippets</div>,
    alwaysRender: true,
    content: <Content />,
    icon: <FaKeyboard />,
  };
});
