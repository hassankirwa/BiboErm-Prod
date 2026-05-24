"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import type { TwoFactorChallenge } from "@/lib/auth/types";
import { resolveAuthRedirect } from "@/lib/auth/redirect";

type TwoFactorLoginStepProps = {
  challenge: TwoFactorChallenge;
  onBack: () => void;
  onChallengeUpdate: (challenge: TwoFactorChallenge) => void;
};

export function TwoFactorLoginStep({
  challenge,
  onBack,
  onChallengeUpdate,
}: TwoFactorLoginStepProps) {
  const router = useRouter();
  const { setFromPayload } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    challenge.mail_sent
      ? null
      : challenge.mail_warning ?? "Email could not be sent. Check mail settings or try resend."
  );

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = await authApi.verifyTwoFactor({
        challenge_token: challenge.challenge_token,
        code: code.trim(),
      });

      setFromPayload(payload);

      if (payload.user.must_change_password) {
        router.push("/change-password");
        return;
      }

      router.push(
        resolveAuthRedirect(
          payload.user.status,
          payload.departments,
          payload.redirect,
          payload.roles
        )
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Invalid verification code."
          : "Invalid verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setInfo(null);

    try {
      const next = await authApi.resendTwoFactor(challenge.challenge_token);
      onChallengeUpdate({
        two_factor_required: true,
        challenge_token: next.challenge_token,
        email_hint: next.email_hint,
        expires_in: next.expires_in,
        mail_sent: next.mail_sent,
        mail_warning: next.mail_warning,
      });
      setCode("");
      setInfo(next.mail_sent ? "A new code has been sent." : next.mail_warning ?? "Unable to send email.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to resend code."
          : "Unable to resend code."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
          Check your email
        </h2>
        <p className="mt-1.5 text-sm text-neutral-500">
          We sent a 6-digit code to <strong>{challenge.email_hint}</strong>
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {info}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp-code">Verification code</Label>
          <Input
            id="otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            className="text-center text-lg tracking-[0.35em]"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              Verify & sign in
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back to sign in
        </Button>
        <Button type="button" variant="link" disabled={resending} onClick={() => void handleResend()}>
          {resending ? "Sending…" : "Resend code"}
        </Button>
      </div>
    </div>
  );
}
