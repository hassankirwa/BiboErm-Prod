"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PurchaseOrderCreateWorkspace } from "@/components/procurement/purchase-order-create-workspace";
import { Button } from "@/components/ui/button";

export default function CreatePurchaseOrderPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Create Purchase Order"
        subtitle="Review supplier-grouped lines, confirm pricing, and assign transport"
        actions={
          <Button variant="outline" asChild>
            <Link href="/procurement/requisitions">Back to requisitions</Link>
          </Button>
        }
      />
      <div className="p-6">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <PurchaseOrderCreateWorkspace />
        </Suspense>
      </div>
    </div>
  );
}
