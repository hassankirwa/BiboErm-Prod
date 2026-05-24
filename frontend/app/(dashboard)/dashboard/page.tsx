"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { homeRoute, initialized } = useAuth();

  useEffect(() => {
    if (initialized) {
      router.replace(homeRoute);
    }
  }, [initialized, homeRoute, router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
