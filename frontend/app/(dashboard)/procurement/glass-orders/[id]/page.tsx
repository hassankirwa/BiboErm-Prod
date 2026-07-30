"use client";

import Link from "next/link";
import { use } from "react";
import { AppHeader } from "@/components/app-header";
import { GlassOrderDetailWorkspace } from "@/components/procurement/glass-order-detail-workspace";
import { Button } from "@/components/ui/button";

export default function GlassOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = use(params);
  const { returnTo } = use(searchParams);
  const orderId = Number(id);
  const invalidId = !id || Number.isNaN(orderId) || orderId < 1;

  if (invalidId) {
    return (
      <div className="space-y-3 p-6 text-sm text-muted-foreground">
        <p>Invalid glass order link.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/procurement/dashboard">Back to procurement</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Glass order"
        subtitle="Complete dimensions, requirements, and supplier — then print a PO for the supplier and capture buying prices on delivery"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/procurement/dashboard">Back</Link>
          </Button>
        }
      />
      <div className="p-6">
        <GlassOrderDetailWorkspace orderId={orderId} returnTo={returnTo ?? null} />
      </div>
    </div>
  );
}
