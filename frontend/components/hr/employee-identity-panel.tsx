"use client";

import { useState } from "react";
import { KeyRound, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import * as hrApi from "@/lib/api/hr";

function isPlaceholderEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  return (
    value.endsWith("@pending.bibo.internal") ||
    value.endsWith("@bibo.internal")
  );
}

type EmployeeIdentityPanelProps = {
  userId: number;
  name: string;
  email: string;
  status: string;
  canInvite?: boolean;
  disabled?: boolean;
  onUpdated: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function EmployeeIdentityPanel({
  userId,
  name: initialName,
  email: initialEmail,
  status,
  canInvite = false,
  disabled,
  onUpdated,
  onError,
  onSuccess,
}: EmployeeIdentityPanelProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(
    isPlaceholderEmail(initialEmail) ? "" : initialEmail
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [inviting, setInviting] = useState(false);
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

  const handleSendInvite = async () => {
    if (!email.trim()) {
      onError("Enter a real login email before sending an invitation.");
      return;
    }
    if (isPlaceholderEmail(email)) {
      onError("Replace the placeholder email with a real login email first.");
      return;
    }

    setInviting(true);
    setTempPassword(null);
    try {
      const result = await hrApi.sendEmployeeInvite(userId, { email });
      // Email is applied by the invite service; no separate identity save required.
      if (result.mail_sent) {
        onSuccess(
          status === "invited"
            ? "Invitation resent. On accept they continue onboarding → pending HR review."
            : "Invitation sent. On accept they complete profile, then pending HR review."
        );
      } else {
        const devHint = result.dev_mail?.temporary_password
          ? ` Temp password (dev): ${result.dev_mail.temporary_password}`
          : "";
        onError(`${result.mail_warning ?? "Email was not sent."}${devHint}`);
      }
      onUpdated();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.firstError() ?? "Failed to send invitation."
          : "Failed to send invitation."
      );
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-1 text-sm font-semibold">Account access</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Update login email, send/resend invite, or reset password. Imported staff without a real
        email need an invite address before they can accept and enter pending HR review.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hr-employee-name">Full name</Label>
          <Input
            id="hr-employee-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled || saving || inviting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hr-employee-email">Login email</Label>
          <Input
            id="hr-employee-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled || saving || inviting}
            placeholder="name@company.com"
          />
          {isPlaceholderEmail(initialEmail) && (
            <p className="text-xs text-amber-700">
              No real login email yet (imported). Enter one, then send invitation.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || saving || resetting || inviting}
            onClick={() => void handleSaveIdentity()}
          >
            <Save className="size-4" />
            {saving ? "Saving…" : "Save account"}
          </Button>
          {canInvite && (
            <Button
              type="button"
              size="sm"
              disabled={disabled || saving || resetting || inviting}
              onClick={() => void handleSendInvite()}
            >
              <Mail className="size-4" />
              {inviting
                ? "Sending…"
                : status === "invited"
                  ? "Resend invitation"
                  : "Send invitation"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || saving || resetting || inviting}
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
