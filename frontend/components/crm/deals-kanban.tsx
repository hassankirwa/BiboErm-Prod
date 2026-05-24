"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockDeals, mockContacts } from "@/lib/data/crm";
import { Calendar, DollarSign } from "lucide-react";
import type { DealStage } from "@/lib/types";

const stages: { id: DealStage; label: string; color: string }[] = [
  { id: "qualification", label: "Qualification", color: "bg-muted" },
  { id: "needs_analysis", label: "Needs Analysis", color: "bg-info/20" },
  { id: "proposal", label: "Proposal", color: "bg-warning/20" },
  { id: "negotiation", label: "Negotiation", color: "bg-chart-5/20" },
  { id: "closed_won", label: "Closed Won", color: "bg-success/20" },
  { id: "closed_lost", label: "Closed Lost", color: "bg-destructive/20" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getContact(contactId: string) {
  return mockContacts.find((c) => c.id === contactId);
}

export function DealsKanban() {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-4 sm:gap-4">
      {stages.map((stage) => {
        const stageDeals = mockDeals.filter((d) => d.stage === stage.id);
        const stageValue = stageDeals.reduce((acc, d) => acc + d.value, 0);

        return (
          <div
            key={stage.id}
            className="w-[min(85vw,280px)] shrink-0 sm:w-72"
          >
            <Card className={`border-border ${stage.color}`}>
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
                  const contact = getContact(deal.contactId);
                  return (
                    <Card
                      key={deal.id}
                      className="border-border bg-card cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-3">
                        <h4 className="text-sm font-medium text-foreground line-clamp-2">
                          {deal.name}
                        </h4>
                        {contact && (
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
                                {getInitials(contact.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              {contact.name}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            KES {(deal.value / 1000).toFixed(0)}K
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(deal.expectedCloseDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Probability</span>
                            <span>{deal.probability}%</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${deal.probability}%` }}
                            />
                          </div>
                        </div>
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
