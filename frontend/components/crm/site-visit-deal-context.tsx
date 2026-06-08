"use client";

import { Briefcase, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dealDisplayName } from "@/lib/api/crm/deals";
import type { ApiSiteVisit } from "@/lib/api/crm/site-visits";

type SiteVisitDealContextProps = {
  visit: ApiSiteVisit;
};

export function SiteVisitDealContext({ visit }: SiteVisitDealContextProps) {
  const deal = visit.deal;
  if (!deal) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4 text-primary" />
          Deal context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium">{dealDisplayName(deal)}</p>
          {deal.deal_number && (
            <p className="text-xs text-muted-foreground">{deal.deal_number}</p>
          )}
        </div>

        {deal.account?.name && (
          <p className="text-muted-foreground">Account: {deal.account.name}</p>
        )}

        {deal.contact?.name && (
          <p className="text-muted-foreground">Contact: {deal.contact.name}</p>
        )}

        {(deal.site_address || visit.site_address) && (
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            {visit.site_address ?? deal.site_address}
          </p>
        )}

        {deal.requirement_summary && (
          <p className="rounded-md bg-muted/40 p-3 text-muted-foreground">
            {deal.requirement_summary}
          </p>
        )}

        {deal.product_interests && deal.product_interests.length > 0 && (
          <p className="text-muted-foreground">
            Products: {deal.product_interests.join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
