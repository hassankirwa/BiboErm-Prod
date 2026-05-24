"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, RefreshCw } from "lucide-react";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { OnboardingStepper } from "@/components/auth/onboarding-stepper";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { resolveHomeRoute } from "@/lib/auth/redirect";

const pendingSteps = [
  { id: 1, label: "Accept Invite", status: "done" as const },
  { id: 2, label: "Your Profile", status: "done" as const },
  { id: 3, label: "HR Review", status: "active" as const },
];

const POLL_INTERVAL_MS = 5 * 60 * 1000;

function formatLastChecked(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function HrReviewIllustration() {
  return (
    <svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      className="mx-auto"
      aria-hidden
    >
      <rect
        x="40"
        y="35"
        width="100"
        height="120"
        rx="8"
        fill="#F9FAFB"
        stroke="#E5E7EB"
        strokeWidth="2"
      />
      <line
        x1="55"
        y1="60"
        x2="125"
        y2="60"
        stroke="#D1D5DB"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="55"
        y1="75"
        x2="115"
        y2="75"
        stroke="#D1D5DB"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="55"
        y1="90"
        x2="125"
        y2="90"
        stroke="#D1D5DB"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="55"
        y="105"
        width="50"
        height="20"
        rx="4"
        fill="#FDE8EA"
        stroke="#E63946"
        strokeWidth="1.5"
      />
      <circle cx="125" cy="105" r="22" fill="white" stroke="#E63946" strokeWidth="3" />
      <circle cx="125" cy="105" r="14" fill="#FDE8EA" />
      <line
        x1="142"
        y1="122"
        x2="158"
        y2="138"
        stroke="#E63946"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <polyline
        points="118,105 123,110 132,100"
        fill="none"
        stroke="#E63946"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PendingHrPage() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const payload = await refreshMe();
      setLastChecked(new Date());

      if (payload?.user.status === "active") {
        router.replace(resolveHomeRoute(payload.departments, payload.roles));
      }
    } finally {
      setChecking(false);
    }
  }, [refreshMe, router]);

  const checkStatusRef = useRef(checkStatus);
  checkStatusRef.current = checkStatus;

  useEffect(() => {
    const tick = () => {
      void checkStatusRef.current();
    };

    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <AuthCardLayout extraWide centered={false}>
      <OnboardingStepper steps={pendingSteps} />

      <HrReviewIllustration />

      <div className="text-center">
        <h1 className="auth-card-title">Almost there!</h1>
        <p className="auth-card-sub mx-auto max-w-md">
          Your profile is complete. HR is now setting up your employment
          record. We&apos;ll email you as soon as your account is ready — you
          don&apos;t need to keep this page open.
        </p>
      </div>

      <div className="auth-pending-banner">
        <Clock className="size-[18px] shrink-0" />
        <div className="flex-1">
          Average review time: <strong>under 24 hours</strong>
        </div>
        <div className="text-xs text-muted-foreground">
          {lastChecked
            ? `Last checked ${formatLastChecked(lastChecked)}`
            : "Auto-checks every 5 minutes"}
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="secondary"
          disabled={checking}
          onClick={() => void checkStatus()}
        >
          <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking…" : "Check status"}
        </Button>
      </div>

      <p className="text-center">
        <Link
          href="mailto:support@bibo.com"
          className="text-sm font-medium text-primary hover:text-primary/90"
        >
          Contact support@bibo.com
        </Link>
      </p>
    </AuthCardLayout>
  );
}
