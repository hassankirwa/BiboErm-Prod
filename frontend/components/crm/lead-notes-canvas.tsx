"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  BookOpen,
  Italic,
  List,
  ListOrdered,
  NotebookPen,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  appendLeadNote,
  getCombinedLeadNotes,
  hasLeadNotes,
  htmlToMarkdownLite,
  markdownLiteToHtml,
  parseInlineMarks,
  parseMarkdownLite,
  type InlineMark,
  type LeadNotesSource,
} from "@/lib/lead-notes-utils";

function renderInlineMarks(parts: InlineMark[]) {
  return parts.map((part, partIndex) => {
    let node: React.ReactNode = part.text;
    if (part.italic) node = <em>{node}</em>;
    if (part.bold) node = <strong>{node}</strong>;
    return <span key={partIndex}>{node}</span>;
  });
}

function LeadNotesRendered({ text }: { text: string }) {
  const blocks = parseMarkdownLite(text);

  if (!text.trim()) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No notes yet. Add your first note below.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-[#2c2416]">
      {blocks.map((block, index) => {
        if (block.type === "divider") {
          return (
            <p
              key={`divider-${index}`}
              className="border-b border-[#e8dcc8] pb-2 text-xs font-medium uppercase tracking-wide text-[#8b7355]"
            >
              {block.text}
            </p>
          );
        }

        if (block.type === "bullet") {
          return (
            <ul key={`bullet-${index}`} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarks(parseInlineMarks(item))}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "numbered") {
          return (
            <ol key={`numbered-${index}`} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarks(parseInlineMarks(item))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`paragraph-${index}`}>
            {renderInlineMarks(parseInlineMarks(block.text))}
          </p>
        );
      })}
    </div>
  );
}

function LeadNotesEditor({
  value,
  onChange,
  placeholder,
  minRows = 4,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  autoFocus?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const skipExternalSyncRef = useRef(false);
  const minHeight = Math.max(120, minRows * 24);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    unorderedList: false,
    orderedList: false,
  });

  const syncEditorFromValue = useCallback((markdown: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = markdown.trim() ? markdownLiteToHtml(markdown) : "";
  }, []);

  const refreshActiveFormats = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    const selection = document.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      !selection.anchorNode ||
      !el.contains(selection.anchorNode)
    ) {
      setActiveFormats({
        bold: false,
        italic: false,
        unorderedList: false,
        orderedList: false,
      });
      return;
    }

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
    });
  }, []);

  useEffect(() => {
    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }
    syncEditorFromValue(value);
  }, [syncEditorFromValue, value]);

  useEffect(() => {
    if (autoFocus) {
      editorRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const onSelectionChange = () => refreshActiveFormats();
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [refreshActiveFormats]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const markdown = htmlToMarkdownLite(el.innerHTML);
    skipExternalSyncRef.current = true;
    onChange(markdown);
    refreshActiveFormats();
  }, [onChange, refreshActiveFormats]);

  const applyFormat = useCallback(
    (
      command:
        | "bold"
        | "italic"
        | "insertUnorderedList"
        | "insertOrderedList",
    ) => {
      editorRef.current?.focus();
      document.execCommand(command, false);
      emitChange();
    },
    [emitChange],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      emitChange();
    },
    [emitChange],
  );

  const formatButtonClass = (active: boolean) =>
    cn(
      "h-8 w-8 border p-0",
      active
        ? "border-[#1e3a5f] bg-[#1e3a5f] text-white hover:bg-[#1e3a5f] hover:text-white"
        : "border-[#e8dcc8] bg-white text-[#1e3a5f]",
    );

  return (
    <div className="overflow-hidden rounded-lg border border-[#e8dcc8] bg-[#fffdf8] shadow-sm">
      <div className="flex items-center gap-0.5 border-b border-[#efe6d6] bg-[#faf6ee] px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Bold"
          aria-pressed={activeFormats.bold}
          className={formatButtonClass(activeFormats.bold)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat("bold")}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Italic"
          aria-pressed={activeFormats.italic}
          className={formatButtonClass(activeFormats.italic)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat("italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Bullet list"
          aria-pressed={activeFormats.unorderedList}
          className={formatButtonClass(activeFormats.unorderedList)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat("insertUnorderedList")}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Numbered list"
          aria-pressed={activeFormats.orderedList}
          className={formatButtonClass(activeFormats.orderedList)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat("insertOrderedList")}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <span className="ml-2 text-[11px] text-[#8b7355]">
          Select text, then use toolbar to format
        </span>
      </div>
      <div className="relative">
        {!value.trim() && placeholder ? (
          <p className="pointer-events-none absolute left-4 top-3 text-[15px] italic text-[#8b7355]/70">
            {placeholder}
          </p>
        ) : null}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder ?? "Lead note"}
          onInput={emitChange}
          onPaste={handlePaste}
          onKeyUp={refreshActiveFormats}
          onMouseUp={refreshActiveFormats}
          style={{ minHeight }}
          className={cn(
            "resize-y overflow-auto px-4 py-3 text-[15px] leading-relaxed text-[#2c2416] outline-none",
            "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
            "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
            "[&_strong]:font-semibold [&_em]:italic",
          )}
        />
      </div>
    </div>
  );
}

export function LeadNotesViewModal({
  open,
  onOpenChange,
  notesText,
  leadTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notesText: string;
  leadTitle?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden border-[#e8dcc8] bg-[#f7f1e6] p-0 shadow-xl">
        <div className="border-b border-[#e8dcc8] bg-[#faf6ee] px-6 py-4">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-[#8b7355]">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Lead notes
              </span>
            </div>
            <DialogTitle className="font-serif text-2xl text-[#2c2416]">
              {leadTitle ?? "Notes"}
            </DialogTitle>
            <DialogDescription className="text-[#8b7355]">
              All notes recorded for this lead.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-[#efe6d6] bg-[#fffdf8] px-5 py-5 shadow-inner">
            <LeadNotesRendered text={notesText} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LeadAddNoteDialog({
  open,
  onOpenChange,
  leadTitle,
  saving,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadTitle?: string;
  saving?: boolean;
  onConfirm: (noteText: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setDraft("");
    onOpenChange(next);
  };

  async function handleSave() {
    if (!draft.trim()) return;
    await onConfirm(draft);
    setDraft("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border-[#e8dcc8] bg-[#fffdf8]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <NotebookPen className="h-4 w-4" />
            Add note
          </DialogTitle>
          <DialogDescription>
            {leadTitle
              ? `Record a note for ${leadTitle}.`
              : "Record a note for this lead."}
          </DialogDescription>
        </DialogHeader>
        <LeadNotesEditor
          value={draft}
          onChange={setDraft}
          placeholder="Add a note — select text and use the toolbar to format."
          minRows={5}
          autoFocus
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !draft.trim()}
          >
            {saving ? "Saving..." : "Add note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeadStageNotesDialog({
  open,
  onOpenChange,
  actionLabel,
  hasExistingNotes,
  saving,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  hasExistingNotes: boolean;
  saving?: boolean;
  onConfirm: (noteText: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setDraft("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border-[#e8dcc8] bg-[#fffdf8]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <NotebookPen className="h-4 w-4" />
            Add a note before {actionLabel}
          </DialogTitle>
          <DialogDescription>
            {hasExistingNotes
              ? "Add a note about this stage change before continuing."
              : "Notes are required before changing lead stage. Add your first note below."}
          </DialogDescription>
        </DialogHeader>
        <LeadNotesEditor
          value={draft}
          onChange={setDraft}
          placeholder={`What happened when you ${actionLabel.toLowerCase()}?`}
          minRows={5}
          autoFocus
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void onConfirm(draft)}
            disabled={saving || !draft.trim()}
          >
            {saving ? "Saving..." : `Save note & ${actionLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeadNotesCanvas({
  lead,
  leadTitle,
  saving,
  onAddNote,
}: {
  lead: LeadNotesSource;
  leadTitle?: string;
  saving?: boolean;
  onAddNote: (noteText: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const combinedNotes = getCombinedLeadNotes(lead);
  const notesPresent = hasLeadNotes(lead);

  async function handleAddNote() {
    if (!draft.trim()) return;
    await onAddNote(draft);
    setDraft("");
  }

  return (
    <div className="mt-8 border-t border-border/80 pt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-[#1e3a5f]" />
          <h3 className="text-sm font-semibold text-[#1e3a5f]">Notes</h3>
          {!notesPresent && (
            <span className="text-xs text-amber-700">
              Required before stage changes
            </span>
          )}
        </div>
        {notesPresent && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-[#e8dcc8] text-[#1e3a5f]"
            onClick={() => setViewOpen(true)}
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            View all notes
          </Button>
        )}
      </div>

      {notesPresent && (
        <div
          className={cn(
            "mb-4 max-h-36 overflow-y-auto rounded-lg border border-[#efe6d6] bg-[#fffdf8] px-4 py-3",
            "text-sm leading-relaxed text-[#2c2416]",
          )}
        >
          <LeadNotesRendered text={combinedNotes} />
        </div>
      )}

      <LeadNotesEditor
        value={draft}
        onChange={setDraft}
        placeholder="Add a note — select text and use the toolbar to format."
        minRows={4}
      />

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={saving || !draft.trim()}
          onClick={() => void handleAddNote()}
        >
          {saving ? "Saving..." : "Add note"}
        </Button>
      </div>

      <LeadNotesViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        notesText={combinedNotes}
        leadTitle={leadTitle}
      />
    </div>
  );
}

export { appendLeadNote, getCombinedLeadNotes, hasLeadNotes };
