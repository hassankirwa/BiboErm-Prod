"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff } from "lucide-react";
import { AuthBanner } from "@/components/auth/auth-banner";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = password === confirm && confirm.length > 0;

  if (!token || !email) {
    return (
      <AuthCardLayout>
        <h1 className="auth-card-title">Invalid reset link</h1>
        <p className="auth-card-sub">
          This password reset link is incomplete. Request a new one from the sign-in page.
        </p>
        <Button className="mt-6 w-full" asChild>
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </AuthCardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authApi.resetPassword({
        email,
        token,
        password,
        password_confirmation: confirm,
      });
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.firstError() ?? "Unable to reset password.");
      } else {
        setError("Unable to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardLayout>
      <h1 className="auth-card-title">Reset your password</h1>
      <p className="auth-card-sub">Pick a strong password you&apos;ll remember.</p>

      {error && <AuthBanner variant="error" title={error} />}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              aria-label={showPassword ? "Hide password" : "Show password"}
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
          <Label htmlFor="confirm">Confirm new password</Label>
          <div className="relative">
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="pr-10"
            />
            {passwordsMatch ? (
              <Check className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-green-600" />
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !passwordsMatch}
        >
          {isLoading ? "Saving..." : "Save password & sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="font-medium text-primary">
          Back to sign in
        </Link>
      </p>
    </AuthCardLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthCardLayout>
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        </AuthCardLayout>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
