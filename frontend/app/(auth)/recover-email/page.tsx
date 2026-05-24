"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { AuthBanner } from "@/components/auth/auth-banner";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";

export default function RecoverEmailPage() {
  const [submitted, setSubmitted] = useState(false);
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authApi.recoverEmail(employeeNumber);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.firstError() ?? "Unable to process request.");
      } else {
        setError("Unable to process request. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardLayout>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </Link>

      <h1 className="auth-card-title">Recover your email</h1>
      <p className="auth-card-sub">
        Enter your employee number and we&apos;ll email your login address to
        your registered inbox.
      </p>

      {submitted && (
        <AuthBanner
          variant="success"
          title="If your employee number is on file, we sent your login email."
        />
      )}

      {error && <AuthBanner variant="error" title={error} />}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="employee">Employee number</Label>
          <div className="relative">
            <Input
              id="employee"
              placeholder="BIBO-0247"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              required
              disabled={submitted}
              className="pr-10"
            />
            <User className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitted || isLoading}>
          {submitted ? "Email sent" : isLoading ? "Sending..." : "Send my login email"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Don&apos;t know your number?{" "}
        <a href="mailto:support@bibo.com" className="font-medium text-primary">
          Contact HR
        </a>
      </p>
    </AuthCardLayout>
  );
}
