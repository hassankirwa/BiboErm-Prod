"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { AuthBanner } from "@/components/auth/auth-banner";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { OnboardingStepper } from "@/components/auth/onboarding-stepper";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import { resolveAuthRedirect } from "@/lib/auth/redirect";
import * as authApi from "@/lib/api/auth";

const inviteSteps = [
  { id: 1, label: "Accept Invite", status: "active" as const },
  { id: 2, label: "Your Profile", status: "pending" as const },
  { id: 3, label: "HR Review", status: "pending" as const },
];

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setFromPayload } = useAuth();
  const token = searchParams.get("token") ?? "";
  const demoState = searchParams.get("state");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<"expired" | "revoked" | null>(
    demoState === "expired" || demoState === "revoked" ? demoState : null
  );

  if (!token && !inviteState) {
    return (
      <AuthCardLayout centered>
        <div className="flex flex-col items-center text-center">
          <h1 className="auth-card-title">Invalid invitation link</h1>
          <p className="auth-card-sub mx-auto max-w-sm">
            This link is missing a token. Check your email for the full invitation
            link or ask your admin to resend it.
          </p>
          <Button className="mt-6 w-full" variant="secondary" asChild>
            <Link href="/">Back to login</Link>
          </Button>
        </div>
      </AuthCardLayout>
    );
  }

  if (inviteState === "expired") {
    return (
      <AuthCardLayout centered>
        <div className="flex flex-col items-center text-center">
          <div className="auth-icon-circle auth-icon-circle-amber mb-4">
            <span className="text-2xl">⏱</span>
          </div>
          <h1 className="auth-card-title">This link has expired</h1>
          <p className="auth-card-sub mx-auto max-w-sm">
            Invitations are valid for 72 hours. Ask your admin to send you a
            new one.
          </p>
          <div className="mt-6 flex w-full flex-col gap-2">
            <Button className="w-full" asChild>
              <a href="mailto:support@bibo.com">Request new invite</a>
            </Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/">Back to login</Link>
            </Button>
          </div>
        </div>
      </AuthCardLayout>
    );
  }

  if (inviteState === "revoked") {
    return (
      <AuthCardLayout centered>
        <div className="flex flex-col items-center text-center">
          <div className="auth-icon-circle auth-icon-circle-red mb-4">
            <span className="text-2xl">🛡</span>
          </div>
          <h1 className="auth-card-title">Invitation no longer valid</h1>
          <p className="auth-card-sub mx-auto max-w-sm">
            This invitation has been revoked. Contact your administrator if this
            is unexpected.
          </p>
          <Button className="mt-6 w-full" variant="secondary" asChild>
            <a href="mailto:support@bibo.com">Contact admin</a>
          </Button>
        </div>
      </AuthCardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = await authApi.acceptInvite(token, password, confirm);
      setFromPayload(payload);
      router.push(
        resolveAuthRedirect(
          payload.user.status,
          payload.departments,
          payload.redirect,
          payload.roles
        )
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.firstError() ?? err.message;
        if (msg.toLowerCase().includes("expired")) {
          setInviteState("expired");
        } else if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("revoked")) {
          setInviteState("revoked");
        } else {
          setError(msg);
        }
      } else {
        setError("Unable to accept invitation. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardLayout wide centered={false}>
      <OnboardingStepper steps={inviteSteps} />

      <div>
        <h1 className="auth-card-title text-left text-2xl">
          Welcome! 👋
        </h1>
        <p className="auth-card-sub text-left">
          Set your password to activate your Bibo account.
        </p>
      </div>

      {error && (
        <AuthBanner variant="error" title={error} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {password && <PasswordStrength password={password} />}

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={10}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Setting up..." : "Set password & continue"}
          {!isLoading && <ArrowRight className="size-4" />}
        </Button>
      </form>
    </AuthCardLayout>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <AuthCardLayout centered={false}>
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        </AuthCardLayout>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
