"use client";

import { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import {
  HR_DOCUMENT_CATEGORY_OPTIONS,
  deleteHrDocument,
  downloadHrDocument,
  downloadMyHrDocument,
  type HrDocument,
} from "@/lib/api/hr-documents";

function categoryLabel(value: string): string {
  return HR_DOCUMENT_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type HrDocumentTableProps = {
  documents: HrDocument[];
  mode: "admin" | "self";
  onChanged?: () => void;
};

export function HrDocumentTable({
  documents,
  mode,
  onChanged,
}: HrDocumentTableProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(doc: HrDocument) {
    setBusyId(doc.id);
    setError(null);
    try {
      const result =
        mode === "admin"
          ? await downloadHrDocument(doc.id)
          : await downloadMyHrDocument(doc.id);
      if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Download failed."
          : "Download failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await deleteHrDocument(id);
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Delete failed."
          : "Delete failed."
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!documents.length) {
    return <p className="text-sm text-muted-foreground">No documents found.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            {mode === "admin" && <TableHead>Assigned to</TableHead>}
            <TableHead>Size</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">{doc.title}</TableCell>
              <TableCell>{categoryLabel(doc.category)}</TableCell>
              {mode === "admin" && (
                <TableCell>{doc.user_name ?? "Company-wide"}</TableCell>
              )}
              <TableCell>{formatSize(doc.file_size)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === doc.id}
                    onClick={() => handleDownload(doc)}
                  >
                    {busyId === doc.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </Button>
                  {mode === "admin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === doc.id}
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
