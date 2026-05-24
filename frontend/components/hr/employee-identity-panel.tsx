"use client";

import { useState } from "react";
import { KeyRound, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import * as hrApi from "@/lib/api/hr";

type EmployeeIdentityPanelProps = {
  userId: number;
  name: string;
  email: string;
  disabled?: boolean;
  onUpdated: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function EmployeeIdentityPanel({
  userId,
  name: initialName,
  email: initialEmail,
  disabled,
  onUpdated,
  onError,
  onSuccess,
}: EmployeeIdentityPanelProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleSaveIdentity = async () => {
    setSaving(true);
    setTempPassword(null);
    try {
      await hrApi.updateEmployeeIdentity(userId, { email, name });
      onSuccess("Account email and name updated.");
      onUpdated();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to update account."
          : "Failed to update account."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm("Generate a temporary password for this employee? They must change it on next login.")) {
      return;
    }

    setResetting(true);
    setTempPassword(null);
    try {
      const result = await hrApi.resetEmployeePassword(userId);
      setTempPassword(result.temporary_password);
      onSuccess("Temporary password generated.");
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to reset password."
          : "Failed to reset password."
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-1 text-sm font-semibold">Account access</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Update login email or reset password. Share temporary passwords securely.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hr-employee-name">Full name</Label>
          <Input
            id="hr-employee-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled || saving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hr-employee-email">Email</Label>
          <Input
            id="hr-employee-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled || saving}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || saving || resetting}
            onClick={() => void handleSaveIdentity()}
          >
            <Save className="size-4" />
            {saving ? "Saving…" : "Save account"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || saving || resetting}
            onClick={() => void handleResetPassword()}
          >
            <KeyRound className="size-4" />
            {resetting ? "Resetting…" : "Reset password"}
          </Button>
        </div>

        {tempPassword && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Temporary password (shown once)</p>
            <p className="mt-1 font-mono text-base">{tempPassword}</p>
            <p className="mt-1 text-xs">Employee must change this on next login.</p>
          </div>
        )}
      </div>
    </div>
  );
}
