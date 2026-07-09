"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { fetchUsers, type ApiUserDetail } from "@/lib/api/users";
import { SOURCE_TYPE_OPTIONS } from "@/lib/workspace-calendar-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type WorkspaceResourceFilters = {
  assigned_to?: number;
  role?: string;
  source?: string;
};

const ROLE_OPTIONS = [
  { value: "sales_representative", label: "Sales" },
  { value: "field_officer", label: "Field officer" },
  { value: "project_manager", label: "Project manager" },
  { value: "installation_lead", label: "Installation lead" },
  { value: "field_installation_engineer", label: "Field engineer" },
  { value: "operations_manager", label: "Operations" },
  { value: "production_manager", label: "Production" },
];

type Props = {
  value: WorkspaceResourceFilters;
  onChange: (filters: WorkspaceResourceFilters) => void;
  showSourceFilter?: boolean;
};

export function WorkspaceResourceFilters({
  value,
  onChange,
  showSourceFilter = true,
}: Props) {
  const { roles, hasPermission, hasAnyPermission } = useAuth();
  const [users, setUsers] = useState<ApiUserDetail[]>([]);

  const canFilterTeam =
    roles.includes("super_admin") ||
    hasAnyPermission(
      "activities.view_all",
      "site_visits.view_all",
      "projects.view_all",
    );

  useEffect(() => {
    if (!canFilterTeam) return;
    fetchUsers({ status: "active" })
      .then((res) => setUsers(res.data ?? []))
      .catch(() => setUsers([]));
  }, [canFilterTeam]);

  const patch = (partial: Partial<WorkspaceResourceFilters>) => {
    onChange({ ...value, ...partial });
  };

  if (!canFilterTeam) return null;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="min-w-[160px] space-y-1">
        <Label className="text-xs">Team member</Label>
        <Select
          value={value.assigned_to ? String(value.assigned_to) : "all"}
          onValueChange={(v) =>
            patch({ assigned_to: v === "all" ? undefined : Number(v) })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[140px] space-y-1">
        <Label className="text-xs">Role</Label>
        <Select
          value={value.role ?? "all"}
          onValueChange={(v) => patch({ role: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLE_OPTIONS.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showSourceFilter && hasPermission("activities.view") && (
        <div className="min-w-[140px] space-y-1">
          <Label className="text-xs">Source</Label>
          <Select
            value={value.source ?? "all"}
            onValueChange={(v) => patch({ source: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {SOURCE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export function WorkspaceWorkloadStrip({
  workload,
}: {
  workload: Array<{ user_id: number; name: string; count: number }>;
}) {
  const top = useMemo(() => workload.slice(0, 8), [workload]);

  if (top.length === 0) return null;

  const max = Math.max(...top.map((w) => w.count), 1);

  return (
    <div className="border-b border-border bg-muted/10 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Team workload
      </p>
      <div className="flex flex-wrap gap-3">
        {top.map((item) => (
          <div key={item.user_id} className="min-w-[100px] flex-1">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate font-medium">{item.name.split(" ")[0]}</span>
              <span className="text-muted-foreground">{item.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
