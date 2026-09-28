"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  fetchDepartmentSettings,
  updateDepartmentSettings,
  type DepartmentSharedEmail,
} from "@/lib/api/hr";

export function DepartmentSharedEmailsPanel() {
  const [departments, setDepartments] = useState<DepartmentSharedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDepartmentSettings();
      setDepartments(result.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to load department emails."
          : "Unable to load department emails."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setEmail = (id: number, shared_email: string) => {
    setDepartments((prev) =>
      prev.map((row) => (row.id === id ? { ...row, shared_email } : row))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateDepartmentSettings({
        departments: departments.map((row) => ({
          id: row.id,
          shared_email: row.shared_email?.trim() || null,
        })),
      });
      setDepartments(result.data);
      setSuccess("Department shared emails saved.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to save department emails."
          : "Unable to save department emails."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Department shared emails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Shared mailboxes (for example <span className="font-mono">warehouse@bibo.com</span>) used by
          multiple staff. These are not login emails — each employee still needs their own invite
          address.
        </p>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading departments…
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-3">
              {departments.map((department) => (
                <div
                  key={department.id}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center"
                >
                  <Label htmlFor={`dept-email-${department.id}`}>{department.name}</Label>
                  <Input
                    id={`dept-email-${department.id}`}
                    type="email"
                    value={department.shared_email ?? ""}
                    onChange={(e) => setEmail(department.id, e.target.value)}
                    placeholder="shared@company.com"
                  />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save department emails
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
