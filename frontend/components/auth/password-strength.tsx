import { cn } from "@/lib/utils";

type Rule = { label: string; met: boolean };

function getStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

export function PasswordStrength({ password }: { password: string }) {
  const strength = getStrength(password);
  const rules: Rule[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    {
      label: "Uppercase & lowercase",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { label: "One number", met: /\d/.test(password) },
    { label: "One symbol", met: /[^a-zA-Z0-9]/.test(password) },
  ];

  const segClass = (index: number) => {
    if (strength === 0 || index >= strength) return "";
    if (strength <= 1) return "auth-pw-seg-weak";
    if (strength <= 2) return "auth-pw-seg-fair";
    return "auth-pw-seg-strong";
  };

  return (
    <div className="space-y-3">
      <div className="auth-pw-strength">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn("auth-pw-seg", segClass(i))} />
        ))}
      </div>
      <div className="auth-pw-rules">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className={cn("auth-pw-rule", rule.met && "auth-pw-rule-met")}
          >
            <span className="auth-pw-check">{rule.met ? "✓" : ""}</span>
            {rule.label}
          </div>
        ))}
      </div>
    </div>
  );
}
