"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Ruler,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { FieldOpenVisitCard } from "@/components/crm/field-open-visit-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchOpenAssignedSiteVisits,
  startSiteVisit,
  type ApiSiteVisit,
} from "@/lib/api/crm/site-visits";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FieldLink = {
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardList;
  anyPermissions?: string[];
  permission?: string;
};

const FIELD_LINKS: FieldLink[] = [
  {
    title: "Open Deal Visits",
    description: "Deal-linked measurements assigned to you — scheduled or in progress.",
    href: "/field/open-visits",
    icon: ClipboardList,
    anyPermissions: [
      "site_visits.execute",
      "field_installation.log",
      "field_installation.view",
    ],
  },
  {
    title: "Today's Visits",
    description: "Start visits, capture measurements, and submit for approval.",
    href: "/field/site-visits/today",
    icon: Ruler,
    anyPermissions: [
      "site_visits.execute",
      "field_installation.log",
      "field_installation.view",
    ],
  },
  {
    title: "Site Visits",
    description: "Browse scheduled and completed measurement visits.",
    href: "/crm/site-visits",
    icon: ClipboardList,
    anyPermissions: [
      "site_visits.view",
      "site_visits.execute",
      "field_installation.view",
      "field_installation.log",
    ],
  },
  {
    title: "Installation Jobs",
    description: "On-site installation progress, deliveries, and daily logs.",
    href: "/field-installation/jobs",
    icon: Wrench,
    permission: "field_installation.view",
  },
];

function canSeeLink(
  link: FieldLink,
  permissions: string[],
  roles: string[],
): boolean {
  if (roles.includes("super_admin") || permissions.includes("*")) {
    return true;
  }
  if (link.anyPermissions?.length) {
    return link.anyPermissions.some((p) => permissions.includes(p));
  }
  if (!link.permission) return true;
  return permissions.includes(link.permission);
}

function canLoadOpenVisits(permissions: string[], roles: string[]): boolean {
  if (roles.includes("super_admin") || permissions.includes("*")) {
    return true;
  }
  return (
    permissions.includes("site_visits.execute") ||
    permissions.includes("field_installation.log") ||
    permissions.includes("field_installation.view")
  );
}

export default function FieldHomePage() {
  const { permissions, roles } = useAuth();
  const links = FIELD_LINKS.filter((link) =>
    canSeeLink(link, permissions, roles),
  );
  const showOpenWork = canLoadOpenVisits(permissions, roles);

  const [visits, setVisits] = useState<ApiSiteVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(showOpenWork);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadOpenVisits = useCallback(async () => {
    if (!showOpenWork) return;
    setVisitsLoading(true);
    setVisitsError(null);
    try {
      const res = await fetchOpenAssignedSiteVisits();
      setVisits(res.data);
    } catch (err) {
      setVisitsError(
        err instanceof ApiError
          ? err.message
          : "Failed to load your open deal visits.",
      );
    } finally {
      setVisitsLoading(false);
    }
  }, [showOpenWork]);

  useEffect(() => {
    void loadOpenVisits();
  }, [loadOpenVisits]);

  async function handleStartVisit(visitId: number) {
    setActionLoading(visitId);
    try {
      await ensureCsrfCookie();
      const position = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          () => resolve(null),
          { timeout: 8000 },
        );
      });

      const updated = await startSiteVisit(visitId, {
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
      });
      setVisits((prev) => prev.map((v) => (v.id === visitId ? updated : v)));
      toast.success("Visit started. You can now log measurements.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start visit.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1e3a5f]">
          Field
        </h1>
        <p className="text-sm text-muted-foreground">
          Site measurements and on-site installation work.
        </p>
      </div>

      {showOpenWork && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-[#1e3a5f]">
              Your open deal visits
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/field/open-visits">View all</Link>
            </Button>
          </div>

          {visitsLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : visitsError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
              {visitsError}
            </div>
          ) : visits.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No open deal visits assigned to you right now.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {visits.slice(0, 5).map((visit) => (
                <FieldOpenVisitCard
                  key={visit.id}
                  visit={visit}
                  actionLoading={actionLoading}
                  onStartVisit={(id) => void handleStartVisit(id)}
                />
              ))}
              {visits.length > 5 && (
                <p className="text-center text-sm text-muted-foreground">
                  Showing 5 of {visits.length} visits.{" "}
                  <Link
                    href="/field/open-visits"
                    className="font-medium text-primary hover:underline"
                  >
                    See all open visits
                  </Link>
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {links.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You do not have access to field workflows. Contact your administrator
            for field officer or installation permissions.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-[#1e3a5f]">Quick links</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className="group block">
                  <Card className="h-full border-border/80 transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          "bg-green-100 text-green-700",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="text-base group-hover:text-primary">
                          {link.title}
                        </CardTitle>
                        <p className="text-sm font-normal text-muted-foreground">
                          {link.description}
                        </p>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
