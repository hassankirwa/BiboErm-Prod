export type LeadNotesSource = {
  notes?: string | null;
  internal_notes?: string | null;
};

export function hasLeadNotes(lead: LeadNotesSource): boolean {
  return !!(lead.notes?.trim() || lead.internal_notes?.trim());
}

export function getCombinedLeadNotes(lead: LeadNotesSource): string {
  const parts = [lead.notes?.trim(), lead.internal_notes?.trim()].filter(
    Boolean,
  ) as string[];
  return parts.join("\n\n");
}

export function appendLeadNote(
  existing: string | null | undefined,
  entry: string,
  meta?: { label?: string },
): string {
  const trimmed = entry.trim();
  if (!trimmed) return existing?.trim() ?? "";

  const timestamp = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const header = meta?.label
    ? `--- ${meta.label} · ${timestamp} ---`
    : `--- ${timestamp} ---`;
  const block = `${header}\n${trimmed}`;

  const base = existing?.trim() ?? "";
  return base ? `${base}\n\n${block}` : block;
}

type MarkdownLiteBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullet"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "divider"; text: string };

export function parseInlineBold(
  text: string,
): Array<{ bold: boolean; text: string }> {
  const parts: Array<{ bold: boolean; text: string }> = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ bold: false, text: text.slice(lastIndex, match.index) });
    }
    parts.push({ bold: true, text: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ bold: false, text: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ bold: false, text }];
}

export function parseMarkdownLite(text: string): MarkdownLiteBlock[] {
  const lines = text.split("\n");
  const blocks: MarkdownLiteBlock[] = [];
  let bulletItems: string[] = [];
  let numberedItems: string[] = [];

  const flushBullets = () => {
    if (bulletItems.length > 0) {
      blocks.push({ type: "bullet", items: [...bulletItems] });
      bulletItems = [];
    }
  };

  const flushNumbered = () => {
    if (numberedItems.length > 0) {
      blocks.push({ type: "numbered", items: [...numberedItems] });
      numberedItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("---") && trimmed.endsWith("---")) {
      flushBullets();
      flushNumbered();
      blocks.push({ type: "divider", text: trimmed.replace(/^---\s*|\s*---$/g, "") });
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      flushNumbered();
      bulletItems.push(bulletMatch[1]);
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      flushBullets();
      numberedItems.push(numberedMatch[1]);
      continue;
    }

    flushBullets();
    flushNumbered();

    if (trimmed) {
      blocks.push({ type: "paragraph", text: trimmed });
    }
  }

  flushBullets();
  flushNumbered();

  return blocks;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdownToHtml(text: string): string {
  return parseInlineBold(text)
    .map((part) =>
      part.bold
        ? `<strong>${escapeHtml(part.text)}</strong>`
        : escapeHtml(part.text),
    )
    .join("");
}

/** Convert stored markdown-lite notes to HTML for the WYSIWYG editor surface. */
export function markdownLiteToHtml(text: string): string {
  if (!text.trim()) return "";

  return parseMarkdownLite(text)
    .map((block) => {
      if (block.type === "divider") {
        return `<p><em>${escapeHtml(block.text)}</em></p>`;
      }
      if (block.type === "bullet") {
        return `<ul>${block.items.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join("")}</ul>`;
      }
      if (block.type === "numbered") {
        return `<ol>${block.items.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join("")}</ol>`;
      }
      return `<p>${inlineMarkdownToHtml(block.text)}</p>`;
    })
    .join("");
}

function serializeInlineNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = serializeInlineContent(el);

  if (tag === "strong" || tag === "b") {
    return inner ? `**${inner}**` : "";
  }

  if (tag === "br") {
    return "\n";
  }

  if (tag === "ul" || tag === "ol") {
    return serializeBlock(el) ?? "";
  }

  return inner;
}

function serializeInlineContent(el: HTMLElement): string {
  return Array.from(el.childNodes).map(serializeInlineNode).join("");
}

function serializeBlock(node: Node): string | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? "").trim();
    return text || null;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "ul") {
    return Array.from(el.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((li) => `- ${serializeInlineContent(li as HTMLElement)}`)
      .join("\n");
  }

  if (tag === "ol") {
    return Array.from(el.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map(
        (li, index) =>
          `${index + 1}. ${serializeInlineContent(li as HTMLElement)}`,
      )
      .join("\n");
  }

  if (tag === "p" || tag === "div") {
    const content = serializeInlineContent(el).trim();
    return content || null;
  }

  if (tag === "br") {
    return "";
  }

  const fallback = serializeInlineContent(el).trim();
  return fallback || null;
}

function isEmptyEditorHtml(html: string): boolean {
  return html.replace(/<br\s*\/?>/gi, "").trim() === "";
}

/** Convert WYSIWYG editor HTML back to markdown-lite for storage. */
export function htmlToMarkdownLite(html: string): string {
  if (isEmptyEditorHtml(html)) {
    return "";
  }

  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, "").trim();
  }

  const container = document.createElement("div");
  container.innerHTML = html;

  const blocks = Array.from(container.childNodes)
    .map(serializeBlock)
    .filter((block): block is string => Boolean(block?.trim()));

  return blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
