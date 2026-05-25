"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { fetchLeads } from "@/lib/api/leads";
import { ApiError } from "@/lib/api/errors";
import type { LeadsFilterState } from "@/components/crm/leads-filters";
import { Users, UserCheck, Phone, FileText, HandshakeIcon } from "lucide-react";

type LeadsStatsProps = {
  filters: LeadsFilterState;
  refreshKey?: number;
};

export function LeadsStats({ filters, refreshKey = 0 }: LeadsStatsProps) {
  const [counts, setCounts] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    quotationSent: 0,
    negotiation: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchLeads({
      search: filters.search || undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      owner_id: filters.owner_id ? Number(filters.owner_id) : undefined,
      date_from: filters.date_from,
      date_to: filters.date_to,
      per_page: 500,
    })
      .then((response) => {
        if (cancelled) return;
        const leads = response.data;
        setCounts({
          total: response.meta?.total ?? leads.length,
          new: leads.filter((l) => l.status === "new").length,
          contacted: leads.filter(
            (l) =>
              l.status === "contacted" ||
              l.status === "interested" ||
              l.status === "qualified",
          ).length,
          quotationSent: leads.filter((l) => l.status === "quotation_sent")
            .length,
          negotiation: leads.filter(
            (l) =>
              l.status === "negotiation" ||
              l.status === "measurements_captured",
          ).length,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load stats.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.status, filters.owner_id, filters.date_from, filters.date_to, refreshKey]);

  const stats = [
    {
      label: "Total Leads",
      value: counts.total,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "New",
      value: counts.new,
      icon: UserCheck,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Contacted",
      value: counts.contacted,
      icon: Phone,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Quotation Sent",
      value: counts.quotationSent,
      icon: FileText,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "In Pipeline",
      value: counts.negotiation,
      icon: HandshakeIcon,
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
