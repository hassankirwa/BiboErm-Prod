"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  fetchHrSuggestions,
  updateHrSuggestion,
  type HrSuggestion,
} from "@/lib/api/hr";

function HrSuggestionsContent() {
  const [items, setItems] = useState<HrSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHrSuggestions();
      setItems(result.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load suggestions."
          : "Unable to load suggestions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: number, status: string) => {
    setError(null);
    try {
      await updateHrSuggestion(id, { status });
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to update suggestion."
          : "Unable to update suggestion."
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Suggestion box</h1>
        <p className="text-sm text-muted-foreground">
          Review employee suggestions. Anonymous entries hide identity.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Staff no.</TableHead>
              <TableHead>Suggestion</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.is_anonymous ? (
                    <span className="text-muted-foreground">Anonymous</span>
                  ) : (
                    <>
                      <div className="font-medium">{item.user_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.user_email}
                      </div>
                    </>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {item.is_anonymous ? "—" : item.employee_number || "—"}
                </TableCell>
                <TableCell className="max-w-lg whitespace-pre-wrap text-sm">
                  {item.body}
                </TableCell>
                <TableCell className="capitalize">{item.status}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={item.status}
                    onValueChange={(status) => void setStatus(item.id, status)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function HrSuggestionsPage() {
  return (
    <PermissionGuard permissions={["suggestions.review"]}>
      <HrSuggestionsContent />
    </PermissionGuard>
  );
}
