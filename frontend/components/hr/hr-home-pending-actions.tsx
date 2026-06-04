"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import * as hrApi from "@/lib/api/hr";
import type { HrPendingProfileChange } from "@/lib/api/hr";
import { PROFILE_FIELD_LABELS } from "@/lib/profile-fields";

function formatFields(fields: string[]): string {
  if (!fields.length) return "Profile update";
  return fields
    .slice(0, 3)
    .map((field) => PROFILE_FIELD_LABELS[field] ?? field)
    .join(", ");
}

export function HrHomePendingActions() {
  const [items, setItems] = useState<HrPendingProfileChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi
      .fetchPendingProfileChanges()
      .then((result) => setItems(result.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending HR approvals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Employees who completed onboarding and are waiting for HR to activate their
            account.
          </p>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/hr/employees?status=pending_hr_review">
              Review pending HR queue
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Profile change requests</CardTitle>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hr/employees?filter=profile_change_requests">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending profile change requests.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/hr/employees/${item.user_id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{item.user_name ?? "Employee"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatFields(item.fields)}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
