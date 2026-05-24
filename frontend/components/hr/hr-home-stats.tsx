"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  FileStack,
  Mail,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import * as hrApi from "@/lib/api/hr";
import type { HrDashboardStats } from "@/lib/api/hr";
import { cn } from "@/lib/utils";

type StatCard = {
  key: keyof HrDashboardStats;
  label: string;
  href: string;
  icon: typeof Users;
  iconClassName: string;
  highlight?: boolean;
};

const statCards: StatCard[] = [
  {
    key: "total_employees",
    label: "Total employees",
    href: "/hr/employees",
    icon: Users,
    iconClassName: "bg-slate-100 text-slate-700",
  },
  {
    key: "active",
    label: "Active",
    href: "/hr/employees?status=active",
    icon: UserCheck,
    iconClassName: "bg-green-100 text-green-700",
  },
  {
    key: "pending_hr_review",
    label: "Pending HR approval",
    href: "/hr/employees?status=pending_hr_review",
    icon: Clock,
    iconClassName: "bg-amber-100 text-amber-800",
    highlight: true,
  },
  {
    key: "profile_change_requests_pending",
    label: "Profile change requests",
    href: "/hr/employees",
    icon: ClipboardList,
    iconClassName: "bg-violet-100 text-violet-700",
    highlight: true,
  },
  {
    key: "pending_profile_completion",
    label: "Profile incomplete",
    href: "/hr/employees?status=pending_profile_completion",
    icon: UserCog,
    iconClassName: "bg-orange-100 text-orange-700",
  },
  {
    key: "invited",
    label: "Invited",
    href: "/hr/employees?status=invited",
    icon: Mail,
    iconClassName: "bg-blue-100 text-blue-700",
  },
  {
    key: "leave_requests_pending",
    label: "Leave requests",
    href: "/hr/leave",
    icon: CalendarDays,
    iconClassName: "bg-teal-100 text-teal-700",
    highlight: true,
  },
  {
    key: "total_documents",
    label: "Total documents",
    href: "/hr/documents",
    icon: FileStack,
    iconClassName: "bg-indigo-100 text-indigo-700",
  },
];

export function HrHomeStats() {
  const [stats, setStats] = useState<HrDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hrApi
      .fetchHrDashboardStats()
      .then(setStats)
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.firstError() ?? "Failed to load HR stats."
            : "Failed to load HR stats."
        );
      });
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="min-w-0 animate-pulse border-border/70 bg-card">
            <CardContent className="h-24 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const value = stats[stat.key];
        const needsAttention = stat.highlight && value > 0;

        return (
          <Link key={stat.key} href={stat.href} className="min-w-0">
            <Card
              className={cn(
                "min-w-0 rounded-[10px] border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md",
                needsAttention && "border-amber-300/80"
              )}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]",
                    stat.iconClassName
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{stat.label}</p>
                  {needsAttention && (
                    <p className="mt-1 text-xs font-medium text-amber-700">Needs review</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
