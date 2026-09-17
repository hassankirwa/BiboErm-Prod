"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import {
  assignmentsToInvitePayload,
  DepartmentRoleAssignmentPicker,
  type DepartmentRoleAssignment,
} from "@/components/admin/department-role-assignment-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import { createEmployee } from "@/lib/api/hr";

type AddEmployeeDialogProps = {
  onSuccess?: (result: {
    userId: number;
    temporaryPassword: string;
    email: string;
  }) => void;
};

export function AddEmployeeDialog({ onSuccess }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentEmail, setDepartmentEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [assignments, setAssignments] = useState<DepartmentRoleAssignment[]>([]);

  const reset = () => {
    setName("");
    setEmail("");
    setDepartmentEmail("");
    setJobTitle("");
    setEmployeeNumber("");
    setActivateNow(true);
    setAssignments([]);
    setError(null);
    setTempPassword(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTempPassword(null);

    if (assignments.length === 0) {
      setError("Add at least one department and role assignment.");
      return;
    }

    setLoading(true);
    try {
      const assignmentPayload = assignmentsToInvitePayload(assignments);
      const result = await createEmployee({
        name,
        email: email || undefined,
        department_email: departmentEmail || undefined,
        job_title: jobTitle || undefined,
        employee_number: employeeNumber || undefined,
        activate_now: activateNow,
        ...assignmentPayload,
      });

      setTempPassword(result.data.temporary_password);
      onSuccess?.({
        userId: result.data.user.id,
        temporaryPassword: result.data.temporary_password,
        email: result.data.user.email,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to create employee."
          : "Failed to create employee."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="size-4" />
          Add employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[min(60vw,calc(100%-2rem))] max-w-[min(60vw,calc(100%-2rem))] overflow-y-auto sm:w-[60vw] sm:max-w-[60vw]">
        <DialogHeader>
          <DialogTitle>Add employee directly</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {tempPassword ? (
          <div className="space-y-3">
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Employee created. Temporary password (shown once):
              <div className="mt-1 font-mono text-base">{tempPassword}</div>
            </div>
            <Button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-emp-name">Full name *</Label>
                <Input
                  id="add-emp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-emp-email">Login email</Label>
                <Input
                  id="add-emp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-emp-dept-email">Department email (shared mailbox)</Label>
                <Input
                  id="add-emp-dept-email"
                  type="email"
                  value={departmentEmail}
                  onChange={(e) => setDepartmentEmail(e.target.value)}
                  placeholder="e.g. warehouse@bibo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-emp-number">Staff number</Label>
                <Input
                  id="add-emp-number"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="e.g. BWD1074"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="add-emp-title">Job title</Label>
                <Input
                  id="add-emp-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="activate-now"
                checked={activateNow}
                onCheckedChange={setActivateNow}
              />
              <Label htmlFor="activate-now">Activate now (skip invite / onboarding)</Label>
            </div>

            <DepartmentRoleAssignmentPicker
              assignments={assignments}
              onChange={setAssignments}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating…" : "Create employee"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
