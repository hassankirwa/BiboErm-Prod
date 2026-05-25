"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Plus, Users } from "lucide-react";
import {
  createFieldDay,
  fetchFieldDays,
  type ApiFieldDay,
} from "@/lib/api/crm/field-day";
import { fetchCrmAssignableUsers } from "@/lib/api/crm/lookups";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toast } from "sonner";

export default function FieldDayPage() {
  const [fieldDays, setFieldDays] = useState<ApiFieldDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [officers, setOfficers] = useState<{ id: number; name: string }[]>([]);

  const [form, setForm] = useState({
    field_date: new Date().toISOString().slice(0, 10),
    field_officer_id: "",
    notes: "",
  });

  const loadFieldDays = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchFieldDays({
        field_date: dateFilter || undefined,
        per_page: 50,
      });
      setFieldDays(res.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load field days.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadFieldDays();
  }, [loadFieldDays]);

  useEffect(() => {
    fetchCrmAssignableUsers({ role: "field_officer" })
      .then((res) =>
        setOfficers(res.data.map((u) => ({ id: u.id, name: u.name }))),
      )
      .catch(() => {});
  }, []);

  async function handleCreate() {
    setSaving(true);
    try {
      await ensureCsrfCookie();
      await createFieldDay({
        field_date: form.field_date,
        field_officer_id: Number(form.field_officer_id),
        notes: form.notes || undefined,
      });
      setDialogOpen(false);
      setForm({
        field_date: new Date().toISOString().slice(0, 10),
        field_officer_id: "",
        notes: "",
      });
      toast.success("Field day created.");
      loadFieldDays();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create field day.",
      );
    } finally {
      setSaving(false);
    }
  }

  const uniqueOfficers = new Set(fieldDays.map((fd) => fd.field_officer_id)).size;
  const totalPins = fieldDays.reduce(
    (n, fd) => n + (fd.pins?.length ?? 0),
    0,
  );

  return (
    <div className="flex h-full flex-col">
      <AppHeader
        title="Field Day"
        subtitle="Manage field officer routes and visit pins"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/crm/site-visits/today">Today&apos;s Visits</Link>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Field Day
            </Button>
          </div>
        }
      />

      <div className="flex-1 space-y-6 overflow-auto p-6">
        <Input
          type="date"
          className="h-9 w-44"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Field days</p>
                <p className="text-2xl font-semibold">{fieldDays.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Officers</p>
                <p className="text-2xl font-semibold">{uniqueOfficers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">Total pins</p>
                <p className="text-2xl font-semibold">{totalPins}</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground/50" />
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
            {error}
          </div>
        ) : fieldDays.length === 0 ? (
          <div className="rounded-md border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No field days for this date.
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Field Days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fieldDays.map((fd) => (
                <div
                  key={fd.id}
                  className="rounded-[5px] border border-border p-4 hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {fd.field_officer?.name ??
                          `Officer #${fd.field_officer_id}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(fd.field_date).toLocaleDateString()}
                      </p>
                      {fd.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {fd.notes}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {(fd.pins?.length ?? 0) + " pins"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Field Day</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fd-date">Date</Label>
              <Input
                id="fd-date"
                type="date"
                value={form.field_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, field_date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Field officer</Label>
              <Select
                value={form.field_officer_id}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, field_officer_id: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent>
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fd-notes">Notes</Label>
              <Textarea
                id="fd-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.field_date || !form.field_officer_id}
            >
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

