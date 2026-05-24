"use client";

import Link from "next/link";
import { Mail, ShieldX } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function AccessDeniedPage() {
  const { user } = useAuth();

  const statusLabel =
    user?.status === "inactive" ? "Inactive" : "Suspended";

  return (
    <AuthCardLayout centered>
      <div className="flex flex-col items-center text-center">
        <div className="auth-icon-circle auth-icon-circle-red mb-4">
          <ShieldX className="size-10" strokeWidth={1.8} />
        </div>
        <h1 className="auth-card-title">Account suspended</h1>
        <p className="auth-card-sub mx-auto max-w-sm">
          Your account has been temporarily suspended. Contact your
          administrator to reinstate access.
        </p>

        {user && (
          <div className="auth-info-box mt-6 w-full text-left text-xs">
            <div className="flex justify-between gap-4 py-1">
              <span className="text-muted-foreground">Account</span>
              <span className="font-semibold">{user.email}</span>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <span className="text-muted-foreground">Status</span>
              <span className="auth-status-badge auth-status-suspended">
                <span className="auth-status-dot" />
                {statusLabel}
              </span>
            </div>
          </div>
        )}

        <Button className="mt-6 w-full" asChild>
          <a href="mailto:support@bibo.com">
            <Mail className="size-4" />
            Contact administrator
          </a>
        </Button>

        <Link
          href="/"
          className="mt-4 text-xs text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </Link>
      </div>
    </AuthCardLayout>
  );
}
