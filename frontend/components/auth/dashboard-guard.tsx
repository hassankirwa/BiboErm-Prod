"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initialized } = useAuth();

  useEffect(() => {
    if (initialized && !user) {
      router.replace("/");
    }
  }, [user, initialized, router]);

  if (!initialized) {
    return (
      <div
        className="flex min-h-svh items-center justify-center bg-background"
        aria-busy="true"
      >
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
