"use client";

import { cn } from "@/lib/utils";
import type { ClientPortalJourneyStep } from "@/lib/api/client-portal";

export function ClientPortalJourneyStepper({
  steps,
  className,
}: {
  steps: ClientPortalJourneyStep[];
  className?: string;
}) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.state === "current"),
  );
  const completedCount = steps.filter((step) => step.state === "complete").length;
  const progressRatio =
    steps.length <= 1
      ? 1
      : Math.min(1, Math.max(completedCount, currentIndex) / (steps.length - 1));

  return (
    <ol
      className={cn(
        "relative mx-auto flex w-full max-w-3xl items-start justify-between gap-2 px-2",
        className,
      )}
      aria-label="Project journey"
    >
      <div
        className="pointer-events-none absolute left-[12%] right-[12%] top-7 h-0.5 overflow-hidden rounded-full bg-[#e5e5e5]"
        aria-hidden
      >
        <div
          className="h-full bg-[#ec2024] transition-all"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      {steps.map((step) => {
        const isComplete = step.state === "complete";
        const isCurrent = step.state === "current";

        return (
          <li key={step.key} className="relative z-10 flex w-24 flex-col items-center text-center sm:w-28">
            <span
              className={cn(
                "relative flex size-14 items-center justify-center rounded-full text-lg font-semibold tracking-normal transition-colors",
                isComplete && "bg-[#ec2024] text-white shadow-[0_0_0_8px_rgba(236,32,36,0.12)]",
                isCurrent &&
                  "border-2 border-[#ec2024] bg-white text-[#ec2024] shadow-[0_0_0_8px_rgba(236,32,36,0.1)]",
                !isComplete &&
                  !isCurrent &&
                  "border border-[#e5e5e5] bg-white text-[#a3a3a3] shadow-[0_0_0_6px_rgba(0,0,0,0.03)]",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isComplete ? (
                <svg viewBox="0 0 20 20" className="size-5 fill-none stroke-white" aria-hidden>
                  <path
                    d="M4.5 10.5 8 14l7.5-8"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                step.number
              )}
            </span>
            <span
              className={cn(
                "mt-3 text-sm font-medium tracking-normal",
                isComplete || isCurrent ? "text-black" : "text-[#a3a3a3]",
              )}
            >
              {step.label}
            </span>
            <span className="mt-1 hidden text-[11px] leading-snug text-[#737373] sm:block">
              {step.description}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
