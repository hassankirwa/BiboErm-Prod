"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewInspectionDialog } from "@/components/qc/new-inspection-dialog";
import { useAuth } from "@/contexts/auth-context";
import type { QcInspectionContext } from "@/lib/api/qc";
import { ClipboardCheck, Plus } from "lucide-react";

type WarehouseAuditLauncherProps = {
  context: QcInspectionContext;
  title?: string;
  description?: string;
};

export function WarehouseAuditLauncher({
  context,
  title = "Warehouse QC audit",
  description = "Run a scheduled-style quality audit for this warehouse area.",
}: WarehouseAuditLauncherProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canInspect = hasPermission("qc.inspect");
  const [open, setOpen] = useState(false);

  if (!hasPermission("qc.view")) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {canInspect ? (
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Run audit
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">QC inspect permission required to start audits.</p>
        )}
      </CardContent>

      {canInspect && (
        <NewInspectionDialog
          open={open}
          onOpenChange={setOpen}
          defaultContext={context}
          onCreated={(id) => router.push(`/qc/inspections/${id}`)}
        />
      )}
    </Card>
  );
}
