"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { QCInspectionDetail } from "@/components/qc/qc-inspection-detail";
import { Button } from "@/components/ui/button";
import { getQcInspection, type QcInspection } from "@/lib/api/qc";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

function QCInspectionDetailPageContent() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { hasPermission } = useAuth();
  const canInspect = hasPermission("qc.inspect");
  const canResolveDefects =
    hasPermission("qc.defects.resolve") || hasPermission("qc.manage");

  const [inspection, setInspection] = useState<QcInspection | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!Number.isFinite(id)) return;
    setLoading(true);
    getQcInspection(id)
      .then((res) => setInspection(res.data))
      .catch((error: Error) => {
        toast.error(error.message || "Failed to load inspection.");
        setInspection(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading inspection...</div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">Inspection not found.</p>
        <Button variant="outline" asChild>
          <Link href="/qc/inspections">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to inspections
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title={inspection.reference}
        subtitle="Run checklist, photos, notes, and submit"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/qc/inspections">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />
      <div className="p-6">
        <QCInspectionDetail
          inspection={inspection}
          onUpdated={load}
          canInspect={canInspect}
          canResolveDefects={canResolveDefects}
        />
      </div>
    </div>
  );
}

export default function QCInspectionDetailPage() {
  return (
    <PermissionGuard
      permissions={["qc.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view this inspection.
          </p>
        </div>
      }
    >
      <QCInspectionDetailPageContent />
    </PermissionGuard>
  );
}
