"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createQcTemplate,
  updateQcTemplate,
  QC_CONTEXT_LABELS,
  QC_INSPECTION_CONTEXTS,
  type QcChecklistTemplate,
  type QcChecklistTemplateItem,
  type QcInspectionContext,
} from "@/lib/api/qc";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const ITEM_TYPES = ["pass_fail", "yes_no", "numeric", "text"] as const;

type QcTemplateEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: QcChecklistTemplate | null;
  onSaved: () => void;
};

function emptyItem(sortOrder: number): QcChecklistTemplateItem {
  return {
    key: `item_${sortOrder}`,
    label: "",
    type: "pass_fail",
    required: true,
    sort_order: sortOrder,
  };
}

export function QcTemplateEditorDialog({
  open,
  onOpenChange,
  template,
  onSaved,
}: QcTemplateEditorDialogProps) {
  const isEdit = Boolean(template?.id);
  const [name, setName] = useState("");
  const [context, setContext] = useState<QcInspectionContext>("warehouse_receiving");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<QcChecklistTemplateItem[]>([emptyItem(10)]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name);
      setContext(template.context);
      setDescription(template.description ?? "");
      setItems(template.items?.length ? [...template.items] : [emptyItem(10)]);
    } else {
      setName("");
      setContext("warehouse_receiving");
      setDescription("");
      setItems([emptyItem(10)]);
    }
  }, [open, template]);

  const updateItem = (index: number, patch: Partial<QcChecklistTemplateItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem((prev.length + 1) * 10)]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    const validItems = items.filter((item) => item.label.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one checklist item.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && template) {
        await updateQcTemplate(template.id, {
          name: name.trim(),
          description: description || null,
          items: validItems,
        });
        toast.success("Template updated.");
      } else {
        await createQcTemplate({
          name: name.trim(),
          context,
          description: description || null,
          items: validItems,
        });
        toast.success("Template created.");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save template.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit template" : "New template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Context</Label>
              <Select
                value={context}
                disabled={isEdit}
                onValueChange={(v) => setContext(v as QcInspectionContext)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QC_INSPECTION_CONTEXTS.map((ctx) => (
                    <SelectItem key={ctx} value={ctx}>
                      {QC_CONTEXT_LABELS[ctx]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Checklist items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-4 w-4" />
                Add item
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap gap-2 rounded-md border p-3">
                <Input
                  className="min-w-[120px] flex-1"
                  placeholder="Key"
                  value={item.key}
                  onChange={(e) => updateItem(index, { key: e.target.value })}
                />
                <Input
                  className="min-w-[200px] flex-[2]"
                  placeholder="Label"
                  value={item.label}
                  onChange={(e) => updateItem(index, { label: e.target.value })}
                />
                <Select
                  value={item.type}
                  onValueChange={(v) =>
                    updateItem(index, { type: v as QcChecklistTemplateItem["type"] })
                  }
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
