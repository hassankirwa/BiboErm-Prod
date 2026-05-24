"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api/client";
import { disableTwoFactor, enableTwoFactor } from "@/lib/api/profile";

type TwoFactorPanelProps = {
  enabled: boolean;
  onChanged: (enabled: boolean) => void;
};

export function TwoFactorPanel({ enabled, onChanged }: TwoFactorPanelProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleToggle = async (next: boolean) => {
    if (!password) {
      setError("Enter your current password to change two-factor authentication.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = next
        ? await enableTwoFactor(password)
        : await disableTwoFactor(password);

      onChanged(result.two_factor_enabled);
      setSuccess(result.message);
      setPassword("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to update two-factor authentication."
          : "Unable to update two-factor authentication."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Two-factor authentication
            </CardTitle>
            <CardDescription className="mt-1.5">
              When enabled, we email you a one-time code each time you sign in.
            </CardDescription>
          </div>
          <Badge variant={enabled ? "default" : "secondary"}>
            {enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="two-factor-toggle" className="text-sm font-medium">
              Email verification codes
            </Label>
            <p className="text-xs text-muted-foreground">
              Codes expire after 10 minutes and can only be used once.
            </p>
          </div>
          <Switch
            id="two-factor-toggle"
            checked={enabled}
            disabled={loading}
            onCheckedChange={(checked) => void handleToggle(checked === true)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="two-factor-password">Current password</Label>
          <Input
            id="two-factor-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Required to enable or disable 2FA"
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={loading || !password}
          onClick={() => void handleToggle(!enabled)}
        >
          {loading ? "Saving…" : enabled ? "Disable with password" : "Enable with password"}
        </Button>
      </CardContent>
    </Card>
  );
}
