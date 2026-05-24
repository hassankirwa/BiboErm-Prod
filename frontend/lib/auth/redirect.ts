import type { AuthDepartment, UserStatus } from "./types";

/** Roles that can access the /workspace app hub (not settings). */
export const WORKSPACE_HUB_ROLES = ["super_admin", "it_admin"] as const;

export function canAccessWorkspaceHub(roles: string[]): boolean {
  return roles.some((role) =>
    WORKSPACE_HUB_ROLES.includes(role as (typeof WORKSPACE_HUB_ROLES)[number])
  );
}

/** Maps backend `departments.default_module` to the first landing route for that module. */
export const MODULE_HOME_ROUTES: Record<string, string> = {
  workspace: "/workspace",
  crm: "/crm",
  production: "/production/schedule",
  warehouse: "/warehouse/inventory",
  procurement: "/procurement/orders",
  qc: "/qc/inspections",
  hr: "/hr",
  finance: "/finance/invoices",
  it: "/it/users",
  projects: "/projects",
};

/** Slug fallbacks when `default_module` is missing on the payload. */
const SLUG_MODULE_FALLBACK: Record<string, string> = {
  sales_marketing: "crm",
  production: "production",
  warehouse: "warehouse",
  procurement: "procurement",
  quality_control: "qc",
  hr: "hr",
  finance: "finance",
  it: "it",
  project_management: "projects",
  operations: "analytics",
  reception: "crm",
};

const DEFAULT_DEPARTMENT_HOME = "/crm";

export function getPrimaryDepartment(
  departments: AuthDepartment[]
): AuthDepartment | null {
  if (!departments.length) return null;
  return departments.find((d) => d.is_primary) ?? departments[0] ?? null;
}

export function moduleToHomeRoute(module: string | null | undefined): string {
  if (!module) return DEFAULT_DEPARTMENT_HOME;
  return MODULE_HOME_ROUTES[module] ?? DEFAULT_DEPARTMENT_HOME;
}

function resolveModuleForDepartment(
  department: AuthDepartment,
  roles: string[]
): string {
  let module =
    department.default_module ?? SLUG_MODULE_FALLBACK[department.slug] ?? null;

  if (module === "workspace" && !canAccessWorkspaceHub(roles)) {
    const slugFallback = SLUG_MODULE_FALLBACK[department.slug];
    module =
      slugFallback && slugFallback !== "workspace" ? slugFallback : "crm";
  }

  return module ?? "crm";
}

export function departmentHomeRoute(
  department: AuthDepartment | null,
  roles: string[] = []
): string {
  if (!department) {
    return canAccessWorkspaceHub(roles)
      ? "/workspace"
      : DEFAULT_DEPARTMENT_HOME;
  }

  const route = moduleToHomeRoute(resolveModuleForDepartment(department, roles));

  if (route === "/workspace" && !canAccessWorkspaceHub(roles)) {
    return DEFAULT_DEPARTMENT_HOME;
  }

  return route;
}

export function resolveActiveUserRedirect(
  departments: AuthDepartment[],
  roles: string[] = []
): string {
  return departmentHomeRoute(getPrimaryDepartment(departments), roles);
}

/** App launcher hub — settings/help are excluded and stay available to all users. */
export function isWorkspaceHubPath(pathname: string): boolean {
  if (
    pathname === "/workspace/settings" ||
    pathname.startsWith("/workspace/settings/") ||
    pathname === "/workspace/help" ||
    pathname.startsWith("/workspace/help/")
  ) {
    return false;
  }

  return pathname === "/workspace" || pathname.startsWith("/workspace/");
}

export function resolveHomeRoute(
  departments: AuthDepartment[],
  roles: string[]
): string {
  if (canAccessWorkspaceHub(roles)) {
    return "/workspace";
  }

  return resolveActiveUserRedirect(departments, roles);
}

export function resolveAuthRedirect(
  status: UserStatus,
  departments: AuthDepartment[],
  serverRedirect?: string | null,
  roles: string[] = []
): string {
  switch (status) {
    case "pending_profile_completion":
      return "/onboarding/profile";
    case "pending_hr_review":
      return "/onboarding/pending-hr";
    case "suspended":
    case "inactive":
      return "/access-denied";
    case "active": {
      if (serverRedirect && serverRedirect !== "/workspace") {
        return serverRedirect;
      }

      if (
        serverRedirect === "/workspace" &&
        !canAccessWorkspaceHub(roles)
      ) {
        return resolveActiveUserRedirect(departments, roles);
      }

      return resolveHomeRoute(departments, roles);
    }
    default:
      return "/";
  }
}
