import { isFieldModuleRole } from "@/lib/auth/redirect";

export type SiteVisitWorkspace = "user" | "crm" | "field";

/** Permissions that allow capturing site visit measurements. */
export const SITE_VISIT_MEASUREMENT_PERMISSIONS = [
  "site_visits.execute",
  "field_installation.log",
] as const;

/** Roles eligible to be assigned and perform field measurements. */
export const SITE_VISIT_MEASUREMENT_ROLES = [
  "field_officer",
  "sales_representative",
  "installation_lead",
  "field_installation_engineer",
  "production_manager",
  "operations_manager",
] as const;

export function canPerformSiteVisitMeasurements(
  permissions: string[],
  roles: string[] = [],
): boolean {
  if (roles.includes("super_admin") || permissions.includes("*")) {
    return true;
  }

  if (
    roles.some((role) =>
      SITE_VISIT_MEASUREMENT_ROLES.includes(
        role as (typeof SITE_VISIT_MEASUREMENT_ROLES)[number],
      ),
    )
  ) {
    return true;
  }

  return SITE_VISIT_MEASUREMENT_PERMISSIONS.some((permission) =>
    permissions.includes(permission),
  );
}

export function prefersFieldMeasurementWorkspace(roles: string[]): boolean {
  return isFieldModuleRole(roles);
}

export function siteVisitWorkspaceForRoles(_roles: string[]): SiteVisitWorkspace {
  return "user";
}

export function siteVisitDetailPath(
  visitId: number,
  workspace: SiteVisitWorkspace,
): string {
  if (workspace === "field") return `/field/site-visits/${visitId}`;
  if (workspace === "crm") return `/crm/site-visits/${visitId}`;
  return `/site-visits/${visitId}`;
}

export function projectSiteVisitDetailPath(visitId: number): string {
  return `/projects/site-visits/${visitId}`;
}

export function siteVisitOpenVisitsPath(workspace: SiteVisitWorkspace): string {
  if (workspace === "field") return "/field/open-visits";
  if (workspace === "crm") return "/crm/site-visits/my-visits";
  return "/site-visits/my-visits";
}

export function siteVisitTodayPath(workspace: SiteVisitWorkspace): string {
  if (workspace === "field") return "/field/site-visits/today";
  if (workspace === "crm") return "/crm/site-visits/today";
  return "/site-visits/today";
}

export function siteVisitListPath(workspace: SiteVisitWorkspace): string {
  if (workspace === "field") return "/field/site-visits";
  if (workspace === "crm") return "/crm/site-visits";
  return "/site-visits";
}
