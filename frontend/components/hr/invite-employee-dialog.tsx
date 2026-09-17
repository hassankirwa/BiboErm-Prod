"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
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
import {
  assignmentsToInvitePayload,
  DepartmentRoleAssignmentPicker,
  type DepartmentRoleAssignment,
} from "@/components/admin/department-role-assignment-picker";
import { ApiError } from "@/lib/api/client";
import * as adminApi from "@/lib/api/admin";
import type { InviteUserResponse } from "@/lib/api/admin";

type InviteEmployeeDialogProps = {
  onSuccess?: (result: InviteUserResponse) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  submitLabel?: string;
};

function formatInviteWarning(result: InviteUserResponse): string | null {
  if (result.mail_sent) return null;

  const devHint = result.dev_mail?.temporary_password
    ? ` Temporary password (dev only): ${result.dev_mail.temporary_password}`
    : "";

  return `${result.mail_warning ?? "Email was not sent."}${devHint}`;
}

export function InviteEmployeeDialog({
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange,
  title = "Invite new employee",
  submitLabel = "Send invitation",
}: InviteEmployeeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [departmentEmail, setDepartmentEmail] = useState("");
  const [assignments, setAssignments] = useState<DepartmentRoleAssignment[]>([]);

  const resetForm = () => {
    setEmail("");
    setName("");
    setDepartmentEmail("");
    setAssignments([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (assignments.length === 0) {
      setError("Add at least one department and role assignment.");
      return;
    }

    setLoading(true);

    try {
      const assignmentPayload = assignmentsToInvitePayload(assignments);

      const result = await adminApi.inviteUser({
        email,
        name: name || undefined,
        department_email: departmentEmail || undefined,
        ...assignmentPayload,
      });

      const warning = formatInviteWarning(result);
      if (warning) {
        setError(warning);
        onSuccess?.(result);
        return;
      }

      resetForm();
      setOpen(false);
      onSuccess?.(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to send invitation."
          : "Failed to send invitation."
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
        if (!next) resetForm();
      }}
    >
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="size-4" />
            Invite employee
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] w-[min(60vw,calc(100%-2rem))] max-w-[min(60vw,calc(100%-2rem))] sm:w-[60vw] sm:max-w-[60vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hr-invite-email">Work email</Label>
            <Input
              id="hr-invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hr-invite-name">Full name (optional)</Label>
            <Input
              id="hr-invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hr-invite-dept-email">Department email (shared mailbox)</Label>
            <Input
              id="hr-invite-dept-email"
              type="email"
              value={departmentEmail}
              onChange={(e) => setDepartmentEmail(e.target.value)}
              placeholder="e.g. warehouse@bibo.com"
            />
          </div>

          <DepartmentRoleAssignmentPicker
            assignments={assignments}
            onChange={setAssignments}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : submitLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
