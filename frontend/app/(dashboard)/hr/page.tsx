"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { HrHomePendingActions } from "@/components/hr/hr-home-pending-actions";
import { HrHomeStats } from "@/components/hr/hr-home-stats";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

function HrHomeContent() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "HR";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {firstName}</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your workforce, onboarding queue, and profile change requests.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/hr/employees">
            View all employees
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <HrHomeStats />
      <HrHomePendingActions />
    </div>
  );
}

export default function HrHomePage() {
  return (
    <PermissionGuard
      permissions={["employees.view"]}
      fallback={
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            You do not have permission to view the HR dashboard.
          </p>
        </div>
      }
    >
      <HrHomeContent />
    </PermissionGuard>
  );
}
