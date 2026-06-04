"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { QcSchedulesList } from "@/components/qc/qc-schedules-list";
import { QcScheduleFormDialog } from "@/components/qc/qc-schedule-form-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { listQcSchedules, type QcInspectionSchedule } from "@/lib/api/qc";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

function QcSchedulesPageContent() {
  const { hasPermission } = useAuth();
  const canManage =
    hasPermission("qc.schedules.manage") || hasPermission("qc.manage");
  const [schedules, setSchedules] = useState<QcInspectionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QcInspectionSchedule | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listQcSchedules({ per_page: 100 })
      .then((res) => setSchedules(res.data))
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load schedules.");
        setSchedules([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="QC Schedules"
        subtitle="Periodic warehouse and tools inspection frequency"
        actions={
          canManage ? (
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New schedule
            </Button>
          ) : undefined
        }
      />
      <div className="p-6">
        <QcSchedulesList
          schedules={schedules}
          loading={loading}
          onEdit={
            canManage
              ? (s) => {
                  setEditing(s);
                  setFormOpen(true);
                }
              : undefined
          }
        />
      </div>

      <QcScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        schedule={editing}
        onSaved={load}
      />
    </div>
  );
}

export default function QcSchedulesPage() {
  return (
    <PermissionGuard
      permissions={["qc.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to manage QC schedules.
          </p>
        </div>
      }
    >
      <QcSchedulesPageContent />
    </PermissionGuard>
  );
}
