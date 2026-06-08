"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchCrmAssignableUsers,
  type CrmAssignableUser,
} from "@/lib/api/crm/lookups";
import { cn } from "@/lib/utils";

type SiteVisitAssigneeSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  currentUserId?: number | null;
  currentUserName?: string | null;
  placeholder?: string;
  className?: string;
};

export function defaultSiteVisitAssigneeId(
  currentUserId: number | null | undefined,
  prefillId: number | null | undefined,
): string {
  if (prefillId != null) return String(prefillId);
  if (currentUserId != null) return String(currentUserId);
  return "";
}

export function SiteVisitAssigneeSelect({
  value,
  onValueChange,
  currentUserId,
  currentUserName,
  placeholder = "Select assignee",
  className,
}: SiteVisitAssigneeSelectProps) {
  const [assignees, setAssignees] = useState<CrmAssignableUser[]>([]);

  useEffect(() => {
    fetchCrmAssignableUsers({ context: "site_visits" })
      .then((res) => setAssignees(res.data))
      .catch(() => setAssignees([]));
  }, []);

  const meLabel = useMemo(() => {
    if (!currentUserId) return null;
    const fromList = assignees.find((user) => user.id === currentUserId)?.name;
    const name = currentUserName?.trim() || fromList;
    return name ? `Me (${name})` : "Me (current user)";
  }, [assignees, currentUserId, currentUserName]);

  const otherAssignees = useMemo(
    () =>
      currentUserId
        ? assignees.filter((user) => user.id !== currentUserId)
        : assignees,
    [assignees, currentUserId],
  );

  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger className={cn("h-9", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {currentUserId && meLabel ? (
          <SelectItem value={String(currentUserId)}>{meLabel}</SelectItem>
        ) : null}
        {otherAssignees.map((user) => (
          <SelectItem key={user.id} value={String(user.id)}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
