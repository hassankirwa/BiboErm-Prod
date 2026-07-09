"use client";

import { useCallback, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceCalendarView } from "@/components/workspace/workspace-calendar-view";
import {
  WorkspaceResourceFilters,
  WorkspaceWorkloadStrip,
  type WorkspaceResourceFilters as Filters,
} from "@/components/workspace/workspace-resource-filters";
import { fetchWorkspaceCalendarEvents, createWorkspaceCalendarEvent } from "@/lib/api/workspace/calendar";
import { workspaceCalendarApiToEvents } from "@/lib/workspace-calendar-mapper";
import { ensureCsrfCookie } from "@/lib/api/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { WorkspaceWorkloadItem } from "@/lib/api/workspace/calendar";

export function WorkspaceCalendarPageClient() {
  const [filters, setFilters] = useState<Filters>({});
  const [workload, setWorkload] = useState<WorkspaceWorkloadItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    location: "",
  });

  const fetchEvents = useCallback(
    async (range: { from: string; to: string }) => {
      const res = await fetchWorkspaceCalendarEvents({
        ...range,
        assigned_to: filters.assigned_to,
        role: filters.role,
        source: filters.source,
      });
      setWorkload(res.workload ?? []);
      return workspaceCalendarApiToEvents(res.data ?? []);
    },
    [filters, refreshKey],
  );

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.starts_at) return;
    setSaving(true);
    try {
      await ensureCsrfCookie();
      await createWorkspaceCalendarEvent({
        title: form.title.trim(),
        description: form.description || undefined,
        starts_at: form.starts_at,
        ends_at: form.ends_at || undefined,
        location: form.location || undefined,
        event_type: "custom",
      });
      toast.success("Event created");
      setCreateOpen(false);
      setForm({ title: "", description: "", starts_at: "", ends_at: "", location: "" });
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to create event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Calendar"
        subtitle="Meetings, site visits, installations, and deadlines across modules."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add event
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <WorkspaceResourceFilters value={filters} onChange={setFilters} />
        <WorkspaceCalendarView
          fetchEvents={fetchEvents}
          filters={filters}
          emptyMessage="No events scheduled for this period."
          workloadStrip={<WorkspaceWorkloadStrip workload={workload} />}
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateEvent}>
            <DialogHeader>
              <DialogTitle>Add calendar event</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Start</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>End (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
