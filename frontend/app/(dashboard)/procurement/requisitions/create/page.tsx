"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { RequisitionCreateWorkspace } from "@/components/procurement/requisition-create-workspace";
import { Button } from "@/components/ui/button";

export default function CreateRequisitionPage() {
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
        <RequisitionCreateWorkspace />
      </div>
    </div>
  );
}
