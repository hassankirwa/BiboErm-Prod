"use client";

import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ScheduleSiteVisitFieldOfficerTagProps = {
  recordLabel: "Lead" | "Deal";
  officerName: string | null | undefined;
};

export function ScheduleSiteVisitFieldOfficerTag({
  recordLabel,
  officerName,
}: ScheduleSiteVisitFieldOfficerTagProps) {
  const name = officerName?.trim();
  if (!name) return null;

  return (
    <Badge variant="secondary" className="gap-1.5 font-normal">
      <UserRound className="h-3 w-3" />
      {recordLabel} assignee: {name}
    </Badge>
  );
}
