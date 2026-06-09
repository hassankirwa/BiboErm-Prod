import { isFieldModuleRole } from "@/lib/auth/redirect";

export type SiteVisitWorkspace = "crm" | "field";

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

export function siteVisitWorkspaceForRoles(roles: string[]): SiteVisitWorkspace {
  return prefersFieldMeasurementWorkspace(roles) ? "field" : "crm";
}

export function siteVisitDetailPath(
  visitId: number,
  workspace: SiteVisitWorkspace,
): string {
  return workspace === "field"
    ? `/field/site-visits/${visitId}`
    : `/crm/site-visits/${visitId}`;
}

export function siteVisitOpenVisitsPath(workspace: SiteVisitWorkspace): string {
  return workspace === "field"
    ? "/field/open-visits"
    : "/crm/site-visits/my-visits";
}

export function siteVisitTodayPath(workspace: SiteVisitWorkspace): string {
  return workspace === "field"
    ? "/field/site-visits/today"
    : "/crm/site-visits/today";
}
