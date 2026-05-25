"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import {
  BIBO_DEAL_STAGES,
  dealValue,
  fetchDeals,
  updateDealStage,
  type ApiDeal,
  type BiboDealStage,
} from "@/lib/api/crm/deals";
import { contactDisplayName } from "@/lib/api/crm/contacts";
import { getUserInitials } from "@/lib/api/auth";
import { ensureCsrfCookie } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";

const STAGE_COLORS: Record<string, string> = {
  new_deal: "bg-muted",
  site_visit_pending: "bg-info/20",
  measurements_completed: "bg-info/20",
  quotation_preparation: "bg-warning/20",
  quotation_sent: "bg-warning/20",
  negotiation_revision: "bg-chart-5/20",
  accepted: "bg-primary/20",
  deposit_pending: "bg-chart-4/20",
  deposit_recorded: "bg-success/20",
  won: "bg-success/20",
  project_created: "bg-success/20",
  lost: "bg-destructive/20",
};

const KANBAN_STAGES = BIBO_DEAL_STAGES.filter((s) => s.id !== "lost");

function dealTitle(deal: ApiDeal): string {
  return deal.name ?? deal.title ?? deal.reference;
}

export function DealsKanban() {
  const [deals, setDeals] = useState<ApiDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [stageUpdating, setStageUpdating] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchDeals({ per_page: 500 })
      .then((response) => {
        if (!cancelled) setDeals(response.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load deals.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const dealsByStage = useMemo(() => {
    const map = new Map<string, ApiDeal[]>();
    for (const stage of BIBO_DEAL_STAGES) {
      map.set(stage.id, []);
    }
    for (const deal of deals) {
      const stage = String(deal.stage);
      if (map.has(stage)) {
        map.get(stage)!.push(deal);
      } else {
        map.get("new_deal")!.push(deal);
      }
    }
    return map;
  }, [deals]);

  async function handleStageDrop(dealId: number, newStage: BiboDealStage) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || String(deal.stage) === newStage) return;

    setStageUpdating(dealId);
    try {
      await ensureCsrfCookie();
      const updated = await updateDealStage(dealId, newStage);
      setDeals((prev) => prev.map((d) => (d.id === dealId ? updated : d)));
      toast.success("Deal stage updated.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not update stage.",
      );
    } finally {
      setStageUpdating(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_STAGES.map((stage) => {
        const stageDeals = dealsByStage.get(stage.id) ?? [];
        const stageValue = stageDeals.reduce((acc, d) => acc + dealValue(d), 0);

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-72"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dealId = Number(e.dataTransfer.getData("dealId"));
              if (dealId) void handleStageDrop(dealId, stage.id);
              setDraggingId(null);
            }}
          >
            <Card
              className={`border-border ${STAGE_COLORS[stage.id] ?? "bg-muted"}`}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {stage.label}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {stageDeals.length}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  KES {(stageValue / 1000).toFixed(0)}K
                </p>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {stageDeals.map((deal) => {
                  const contact = deal.contact;
                  const contactName = contact
                    ? contactDisplayName(contact)
                    : null;
                  const value = dealValue(deal);
                  const probability = deal.probability ?? 0;

                  return (
                    <Card
                      key={deal.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("dealId", String(deal.id));
                        setDraggingId(deal.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={`border-border bg-card cursor-pointer hover:shadow-md transition-shadow ${
                        draggingId === deal.id ? "opacity-50" : ""
                      } ${stageUpdating === deal.id ? "pointer-events-none" : ""}`}
                    >
                      <CardContent className="p-3">
                        <Link
                          href={`/crm/deals/${deal.id}`}
                          className="block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h4 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary">
                            {dealTitle(deal)}
                          </h4>
                        </Link>
                        {contactName && (
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
                                {getUserInitials(contactName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              {contactName}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            KES {(value / 1000).toFixed(0)}K
                          </div>
                          {deal.expected_close_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                deal.expected_close_date,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </div>
                          )}
                        </div>
                        {probability > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Probability</span>
                              <span>{probability}%</span>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${probability}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {stageDeals.length === 0 && (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    No deals
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
