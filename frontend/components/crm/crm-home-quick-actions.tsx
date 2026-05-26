"use client";

import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/auth/permission-gate";

export function CrmHomeQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <PermissionGate permission="leads.create">
        <Button size="sm" className="h-8 gap-1.5" asChild>
          <Link href="/crm/leads/new">
            <Plus className="h-4 w-4" />
            New lead
          </Link>
        </Button>
      </PermissionGate>
      <PermissionGate permission="field_day.view">
        <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
          <Link href="/crm/field-day">
            <MapPin className="h-4 w-4" />
            Field day
          </Link>
        </Button>
      </PermissionGate>
    </div>
  );
}
