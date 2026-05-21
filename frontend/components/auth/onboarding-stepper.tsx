import { cn } from "@/lib/utils";

type Step = {
  id: number;
  label: string;
  status: "done" | "active" | "pending";
};

export function OnboardingStepper({
  steps,
  compact = false,
}: {
  steps: Step[];
  compact?: boolean;
}) {
  return (
    <div className="auth-stepper">
      {steps.map((step, index) => (
        <div key={step.id} className="flex flex-1 items-center">
          <div
            className={cn(
              "auth-step",
              step.status === "done" && "auth-step-done",
              step.status === "active" && "auth-step-active"
            )}
          >
            <span className="auth-step-dot">
              {step.status === "done" ? "✓" : step.id}
            </span>
            {!compact && (
              <span className="hidden sm:inline">{step.label}</span>
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "auth-step-bar",
                step.status === "done" && "auth-step-bar-done"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
