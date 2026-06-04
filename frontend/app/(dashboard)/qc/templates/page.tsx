"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { QcTemplatesList } from "@/components/qc/qc-templates-list";
import { QcTemplateEditorDialog } from "@/components/qc/qc-template-editor-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listQcTemplates,
  QC_CONTEXT_LABELS,
  QC_INSPECTION_CONTEXTS,
  type QcChecklistTemplate,
  type QcInspectionContext,
} from "@/lib/api/qc";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

function QcTemplatesPageContent() {
  const { hasPermission } = useAuth();
  const canManage =
    hasPermission("qc.templates.manage") || hasPermission("qc.manage");
  const [templates, setTemplates] = useState<QcChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextFilter, setContextFilter] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<QcChecklistTemplate | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params =
      contextFilter !== "all"
        ? { context: contextFilter as QcInspectionContext, per_page: 100 }
        : { per_page: 100 };

    listQcTemplates(params)
      .then((res) => setTemplates(res.data))
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load templates.");
        setTemplates([]);
      })
      .finally(() => setLoading(false));
  }, [contextFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="QC Templates"
        subtitle="Default and custom checklist templates"
        actions={
          canManage ? (
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New template
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-6 p-6">
        <Select value={contextFilter} onValueChange={setContextFilter}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Context" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contexts</SelectItem>
            {QC_INSPECTION_CONTEXTS.map((ctx) => (
              <SelectItem key={ctx} value={ctx}>
                {QC_CONTEXT_LABELS[ctx]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <QcTemplatesList
          templates={templates}
          loading={loading}
          onEdit={
            canManage
              ? (t) => {
                  setEditing(t);
                  setEditorOpen(true);
                }
              : undefined
          }
        />
      </div>

      <QcTemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editing}
        onSaved={load}
      />
    </div>
  );
}

export default function QcTemplatesPage() {
  return (
    <PermissionGuard
      permissions={["qc.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to manage QC templates.
          </p>
        </div>
      }
    >
      <QcTemplatesPageContent />
    </PermissionGuard>
  );
}
