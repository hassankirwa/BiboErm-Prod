import { AlertCircle, Check, Clock, Lock, ShieldX, X } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  error: {
    icon: X,
    className: "auth-banner-error",
  },
  warning: {
    icon: Lock,
    className: "auth-banner-warning",
  },
  success: {
    icon: Check,
    className: "auth-banner-success",
  },
  info: {
    icon: AlertCircle,
    className: "auth-banner-info",
  },
  expired: {
    icon: Clock,
    className: "auth-banner-warning",
  },
  revoked: {
    icon: ShieldX,
    className: "auth-banner-error",
  },
} as const;

export function AuthBanner({
  variant,
  title,
  description,
}: {
  variant: keyof typeof variants;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  const { icon: Icon, className } = variants[variant];

  return (
    <div className={cn("auth-banner", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <div className="font-medium">{title}</div>
        {description && (
          <div className="mt-0.5 text-xs font-normal opacity-85">{description}</div>
        )}
      </div>
    </div>
  );
}
