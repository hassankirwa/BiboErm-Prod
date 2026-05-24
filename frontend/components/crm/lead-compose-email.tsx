"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  Clock,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minus,
  Paperclip,
  Send,
  Underline,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createActivity } from "@/lib/api/crm/activities";
import { ensureCsrfCookie } from "@/lib/api/client";
import type { LeadKanbanCard } from "@/lib/leads-kanban-data";

const EMAIL_TEMPLATES = [
  { id: "intro", label: "Introduction", subject: "Following up on your inquiry", body: "Hi,\n\nThank you for your interest. I wanted to reach out regarding your inquiry.\n\nBest regards," },
  { id: "quote", label: "Quotation follow-up", subject: "Quotation for your project", body: "Hi,\n\nPlease find attached our quotation as discussed. Let me know if you have any questions.\n\nBest regards," },
  { id: "visit", label: "Site visit confirmation", subject: "Site visit scheduled", body: "Hi,\n\nThis confirms our upcoming site visit. Please reply if you need to reschedule.\n\nBest regards," },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function recipientLabel(lead: LeadKanbanCard) {
  const name = lead.company || lead.title;
  return lead.email ? `${name} <${lead.email}>` : name;
}

export function LeadComposeEmail({
  lead,
  leadId,
  returnView,
  variant = "modal",
  onClose,
}: {
  lead: LeadKanbanCard;
  leadId: string;
  returnView?: string | null;
  variant?: "modal" | "page";
  onClose?: () => void;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(`Re: ${lead.title}`);
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const senderName = lead.owner;
  const senderEmail = `${lead.owner.toLowerCase().replace(/\s+/g, ".")}@bibo.co.ke`;
  const leadBackHref = `/crm/leads/${leadId}${returnView ? `?view=${returnView}` : ""}`;
  const expandHref = `/crm/leads/${leadId}/email${returnView ? `?view=${returnView}` : ""}`;

  const canSend = !!lead.email?.trim() && subject.trim().length > 0;

  const applyTemplate = (templateId: string) => {
    const t = EMAIL_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setSendError(null);
    try {
      await ensureCsrfCookie();
      const emailBody = [
        body.trim(),
        cc.trim() ? `Cc: ${cc.trim()}` : "",
        bcc.trim() ? `Bcc: ${bcc.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      await createActivity({
        lead_id: Number(leadId),
        activity_type: "email",
        type: "email",
        subject: subject.trim(),
        description: emailBody || undefined,
        body: emailBody || undefined,
      });

      if (variant === "page") {
        router.push(leadBackHref);
      } else {
        onClose?.();
      }
    } catch {
      setSendError("Could not log email activity. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleExpand = () => {
    onClose?.();
    router.push(expandHref);
  };

  const toolbarBtn =
    "inline-flex h-8 w-8 items-center justify-center rounded text-[#1e3a5f]/80 hover:bg-[#ebf2ff]/60";

  const shellClass =
    variant === "page"
      ? "flex min-h-[calc(100dvh-4rem)] flex-col bg-background"
      : "flex max-h-[min(90vh,820px)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl";

  return (
    <div className={shellClass}>
      {/* Title bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1e3a5f]/15 bg-[#1e3a5f] px-3 py-2 text-primary-foreground">
        <div className="flex items-center gap-2">
          {variant === "page" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary-foreground hover:bg-white/15"
              asChild
            >
              <Link href={leadBackHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <span className="text-sm font-medium">New Message</span>
        </div>
        <div className="flex items-center gap-0.5">
          {variant === "modal" && (
            <>
              <button
                type="button"
                title="Minimize"
                onClick={onClose}
                className="rounded p-1.5 hover:bg-white/15"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Expand to full page"
                onClick={handleExpand}
                className="rounded p-1.5 hover:bg-white/15"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            type="button"
            title="Close"
            onClick={() => (variant === "page" ? router.push(leadBackHref) : onClose?.())}
            className="rounded p-1.5 hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sender row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-[#ebf2ff] text-xs font-medium text-[#1e3a5f]">
              {getInitials(senderName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-sm">
            <p className="font-medium text-foreground">{senderName}</p>
            <p className="truncate text-xs text-muted-foreground">{senderEmail}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#ebf2ff]/50"
            >
              Insert template
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {EMAIL_TEMPLATES.map((t) => (
              <DropdownMenuItem key={t.id} onClick={() => applyTemplate(t.id)}>
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!lead.email && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          This lead has no email address.{" "}
          <Link
            href={`/crm/leads/${leadId}/edit${returnView ? `?view=${returnView}` : ""}`}
            className="font-medium underline"
          >
            Add email on the lead
          </Link>{" "}
          before sending.
        </div>
      )}

      {sendError && (
        <p className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {sendError}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start gap-2">
            <Label className="w-10 shrink-0 pt-2 text-xs text-muted-foreground">
              To
            </Label>
            <div className="min-w-0 flex-1">
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#ebf2ff] px-2.5 py-1 text-xs font-medium text-[#1e3a5f]">
                {recipientLabel(lead)}
              </span>
            </div>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                className={cn(
                  "font-medium text-[#1e3a5f] hover:underline",
                  showBcc && "underline"
                )}
                onClick={() => setShowBcc((v) => !v)}
              >
                Bcc
              </button>
              <button
                type="button"
                className={cn(
                  "font-medium text-[#1e3a5f] hover:underline",
                  showCc && "underline"
                )}
                onClick={() => setShowCc((v) => !v)}
              >
                Cc
              </button>
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-2">
              <Label className="w-10 shrink-0 text-xs text-muted-foreground">
                Cc
              </Label>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Cc recipients"
                className="h-8 flex-1"
              />
            </div>
          )}
          {showBcc && (
            <div className="flex items-center gap-2">
              <Label className="w-10 shrink-0 text-xs text-muted-foreground">
                Bcc
              </Label>
              <Input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Bcc recipients"
                className="h-8 flex-1"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Label className="w-10 shrink-0 text-xs text-muted-foreground">
              Subject
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9 flex-1"
            />
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1">
              <button type="button" className={toolbarBtn} title="Bold">
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button type="button" className={toolbarBtn} title="Italic">
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button type="button" className={toolbarBtn} title="Underline">
                <Underline className="h-3.5 w-3.5" />
              </button>
              <span className="mx-1 h-5 w-px bg-border" />
              <button type="button" className={toolbarBtn} title="Bullet list">
                <List className="h-3.5 w-3.5" />
              </button>
              <button type="button" className={toolbarBtn} title="Numbered list">
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button type="button" className={toolbarBtn} title="Insert link">
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              className={cn(
                "min-h-[220px] resize-none rounded-none border-0 shadow-none focus-visible:ring-0",
                variant === "page" && "min-h-[min(40vh,420px)]"
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-border"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4 text-[#1e3a5f]" />
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-border text-[#1e3a5f]"
          >
            <Clock className="h-3.5 w-3.5" />
            Schedule
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 px-5"
            disabled={!canSend || sending}
            onClick={handleSend}
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
