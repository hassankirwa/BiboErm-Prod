import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  invited: "bg-blue-100 text-blue-700",
  pending_profile_completion: "bg-amber-100 text-amber-700",
  pending_hr_review: "bg-orange-100 text-orange-700",
  suspended: "bg-red-100 text-red-700",
  inactive: "bg-neutral-100 text-neutral-600",
};

export function EmployeeStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status] ?? "bg-neutral-100 text-neutral-700",
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function getPrimaryDepartment(
  user: {
    department_roles?: Array<{
      is_primary: boolean;
      department?: { name: string } | null;
      role?: { name: string } | null;
    }>;
  } | null
): { department: string; role: string } {
  const primary = user?.department_roles?.find((r) => r.is_primary);
  return {
    department: primary?.department?.name ?? "—",
    role: primary?.role?.name?.replace(/_/g, " ") ?? "—",
  };
}
