"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthBanner } from "@/components/auth/auth-banner";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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

      <h1 className="auth-card-title">Forgot your password?</h1>
      <p className="auth-card-sub">
        Enter the email tied to your account and we&apos;ll send a secure reset
        link.
      </p>

      {submitted && (
        <AuthBanner
          variant="success"
          title="If that email is registered, we sent a reset link."
          description="Check your inbox — the link expires in 60 minutes."
        />
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="you@bibo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitted}
              className="pr-10"
            />
            <Mail className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitted}>
          {submitted ? "Link sent" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Forgot the email instead?{" "}
        <Link href="/recover-email" className="font-medium text-primary">
          Recover email →
        </Link>
      </p>
    </AuthCardLayout>
  );
}
