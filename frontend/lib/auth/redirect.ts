import type { AuthDepartment, UserStatus } from "./types";

/** Roles that can access the /workspace app hub (not settings). */
export const WORKSPACE_HUB_ROLES = ["super_admin", "it_admin"] as const;

/** Field measurements and installation — primary landing is /field, not CRM. */
export const FIELD_MODULE_ROLES = [
  "field_officer",
  "installation_lead",
  "field_installation_engineer",
] as const;

export function canAccessWorkspaceHub(roles: string[]): boolean {
  return roles.some((role) =>
    WORKSPACE_HUB_ROLES.includes(role as (typeof WORKSPACE_HUB_ROLES)[number])
  );
}

export function isFieldModuleRole(roles: string[]): boolean {
  return roles.some((role) =>
    FIELD_MODULE_ROLES.includes(role as (typeof FIELD_MODULE_ROLES)[number])
  );
}

/** Maps backend `departments.default_module` to the first landing route for that module. */
export const MODULE_HOME_ROUTES: Record<string, string> = {
  workspace: "/workspace",
  crm: "/crm",
  field: "/field",
  production: "/production/schedule",
  warehouse: "/warehouse/inventory",
  procurement: "/procurement/orders",
  qc: "/qc/dashboard",
  hr: "/hr",
  finance: "/finance/invoices",
  it: "/it/users",
  projects: "/projects",
};

/** Slug fallbacks when `default_module` is missing on the payload. */
const SLUG_MODULE_FALLBACK: Record<string, string> = {
  sales_marketing: "crm",
  field: "field",
  field_installation: "field",
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

/** Self-service pages under /workspace available to all active users. */
export function isWorkspaceSelfServicePath(pathname: string): boolean {
  return (
    pathname === "/workspace/leave" ||
    pathname.startsWith("/workspace/leave/") ||
    pathname === "/workspace/documents" ||
    pathname.startsWith("/workspace/documents/") ||
    pathname === "/workspace/payslips" ||
    pathname.startsWith("/workspace/payslips/")
  );
}

/** App launcher hub — settings, help, and self-service HR pages stay available to all users. */
export function isWorkspaceHubPath(pathname: string): boolean {
  if (
    pathname === "/workspace/settings" ||
    pathname.startsWith("/workspace/settings/") ||
    pathname === "/workspace/help" ||
    pathname.startsWith("/workspace/help/") ||
    isWorkspaceSelfServicePath(pathname)
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

  if (isFieldModuleRole(roles)) {
    return "/field";
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
      const home = resolveHomeRoute(departments, roles);

      if (
        serverRedirect === "/workspace" &&
        !canAccessWorkspaceHub(roles)
      ) {
        return resolveActiveUserRedirect(departments, roles);
      }

      if (serverRedirect && serverRedirect !== "/workspace") {
        if (serverRedirect === "/crm" && isFieldModuleRole(roles)) {
          return home;
        }
        return serverRedirect;
      }

      return home;
    }
    default:
      return "/";
  }
}
