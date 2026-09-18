"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { RequisitionCreateWorkspace } from "@/components/procurement/requisition-create-workspace";
import { Button } from "@/components/ui/button";

function CreateRequisitionContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "project-materials" || tabParam === "low-stock"
      ? tabParam
      : "low-stock";

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Create Requisition"
        subtitle="Select a supplier, pick materials, and adjust order quantities with overage"
        actions={
          <Button variant="outline" asChild>
            <Link href="/procurement/requisitions">Back to queue</Link>
          </Button>
        }
      />
      <div className="p-6">
        <RequisitionCreateWorkspace initialTab={initialTab} />
      </div>
    </div>
  );
}

export default function CreateRequisitionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <CreateRequisitionContent />
    </Suspense>
  );
}
