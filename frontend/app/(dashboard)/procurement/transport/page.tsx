"use client";

import { AppHeader } from "@/components/app-header";

export default function TransportPage() {
  return (
    <div className="flex min-w-0 w-full flex-col">
      <AppHeader
        title="Transport Orders"
        subtitle="Delivery coordination linked to purchase orders"
      />
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Transport orders are managed via the procurement API at{" "}
          <code className="text-xs">/api/v1/procurement/transport</code>.
        </p>
      </div>
    </div>
  );
}
