"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as adminApi from "@/lib/api/admin";
import type { Department, Role } from "@/lib/api/admin";

export type DepartmentRoleAssignment = {
  department_id: number;
  role_id: number;
  departmentName: string;
  roleName: string;
};

type DepartmentRoleAssignmentPickerProps = {
  assignments: DepartmentRoleAssignment[];
  onChange: (assignments: DepartmentRoleAssignment[]) => void;
  disabled?: boolean;
};

function formatRoleName(name: string) {
  return name.replace(/_/g, " ");
}

export function DepartmentRoleAssignmentPicker({
  assignments,
  onChange,
  disabled = false,
}: DepartmentRoleAssignmentPickerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const [departmentId, setDepartmentId] = useState("");
  const [roleId, setRoleId] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const depts = await adminApi.fetchDepartments();
        if (!cancelled) setDepartments(depts);
      } catch {
        if (!cancelled) setLookupError("Failed to load departments.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!departmentId) {
      setRoles([]);
      setRoleId("");
      return;
    }

    let cancelled = false;
    setLoadingRoles(true);
    setLookupError(null);

    (async () => {
      try {
        const roleList = await adminApi.fetchRoles(Number(departmentId));
        if (!cancelled) {
          setRoles(roleList);
          setRoleId((current) =>
            roleList.some((r) => String(r.id) === current) ? current : ""
          );
        }
      } catch {
        if (!cancelled) {
          setLookupError("Failed to load roles for department.");
          setRoles([]);
          setRoleId("");
        }
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  const assignmentKeys = useMemo(
    () => new Set(assignments.map((a) => `${a.department_id}-${a.role_id}`)),
    [assignments]
  );

  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value);
    setRoleId("");
    setPickerError(null);
  };

  const handleRoleChange = (value: string) => {
    setRoleId(value);
    setPickerError(null);

    if (!departmentId) return;

    const key = `${departmentId}-${value}`;
    if (assignmentKeys.has(key)) {
      setPickerError("This department and role combination is already added.");
      setRoleId("");
      return;
    }

    const department = departments.find((d) => String(d.id) === departmentId);
    const role = roles.find((r) => String(r.id) === value);

    if (!department || !role) return;

    onChange([
      ...assignments,
      {
        department_id: department.id,
        role_id: role.id,
        departmentName: department.name,
        roleName: role.name,
      },
    ]);

    setDepartmentId("");
    setRoleId("");
    setRoles([]);
  };

  const handleRemove = (index: number) => {
    onChange(assignments.filter((_, i) => i !== index));
    setPickerError(null);
  };

  return (
    <div className="space-y-3">
      <Label>Department & role assignments</Label>
      <p className="text-xs text-muted-foreground">
        Select a department and role to add the assignment automatically. The
        first assignment is the user&apos;s primary department.
      </p>

      {(lookupError || pickerError) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {lookupError ?? pickerError}
        </div>
      )}

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:items-end">
        <div className="min-w-0 space-y-2">
          <Label className="text-xs text-muted-foreground">Department</Label>
          <Select
            value={departmentId}
            onValueChange={handleDepartmentChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-2">
          <Label className="text-xs text-muted-foreground">Role</Label>
          <Select
            value={roleId}
            onValueChange={handleRoleChange}
            disabled={disabled || !departmentId || loadingRoles}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue
                placeholder={
                  !departmentId
                    ? "Select department first"
                    : loadingRoles
                      ? "Loading roles..."
                      : "Select role"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {formatRoleName(r.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>

      {assignments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {assignments.map((assignment, index) => (
            <li
              key={`${assignment.department_id}-${assignment.role_id}`}
              className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {assignment.departmentName}
                </span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm">{formatRoleName(assignment.roleName)}</span>
                {index === 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Primary
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                aria-label="Remove assignment"
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function assignmentsToInvitePayload(assignments: DepartmentRoleAssignment[]) {
  const [primary, ...rest] = assignments;

  return {
    department_id: primary.department_id,
    role_id: primary.role_id,
    additional_assignments:
      rest.length > 0
        ? rest.map(({ department_id, role_id }) => ({ department_id, role_id }))
        : undefined,
  };
}
