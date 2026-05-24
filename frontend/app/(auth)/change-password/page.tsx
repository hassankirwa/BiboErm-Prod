"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { PasswordStrength } from "@/components/auth/password-strength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import { resolveAuthRedirect } from "@/lib/auth/redirect";
import * as authApi from "@/lib/api/auth";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, refreshMe, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <AuthCardLayout centered>
        <div className="text-center">
          <h1 className="auth-card-title">Sign in required</h1>
          <p className="auth-card-sub mx-auto max-w-sm">
            Use the temporary password from your invitation email to sign in first.
          </p>
          <Button className="mt-6 w-full" asChild>
            <Link href="/">Go to login</Link>
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

    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: confirm,
      });

      const payload = await refreshMe();
      if (payload) {
        router.push(
          resolveAuthRedirect(
            payload.user.status,
            payload.departments,
            payload.redirect,
            payload.roles
          )
        );
      } else {
        router.push("/onboarding/profile");
      }
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors().current_password) {
        const payload = await refreshMe();
        if (payload && !payload.user.must_change_password) {
          router.push(
            resolveAuthRedirect(
            payload.user.status,
            payload.departments,
            payload.redirect,
            payload.roles
          )
          );
          return;
        }
      }

      setError(
        err instanceof ApiError
          ? err.firstError() ?? "Unable to change password."
          : "Unable to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await logout();
    router.push("/");
  };

  return (
    <AuthCardLayout wide centered={false}>
      <div>
        <h1 className="auth-card-title text-left text-2xl">Set your password</h1>
        <p className="auth-card-sub text-left">
          Replace your temporary password before continuing into Bibo.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Temporary password</Label>
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

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
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {password && <PasswordStrength password={password} />}

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={10}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Save password & continue"}
          {!loading && <ArrowRight className="size-4" />}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={loading}
          onClick={handleBackToLogin}
        >
          Back to login
        </Button>
      </form>
    </AuthCardLayout>
  );
}
