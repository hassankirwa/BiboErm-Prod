import type { ApiSiteVisit } from "@/lib/api/crm/types";
import type { ProjectDetail } from "@/lib/api/projects";
import type {
  MeasurementContext,
  SiteMeasurementFormData,
} from "@/lib/measurements/types";
import {
  emptyMeasurementLine,
  emptySiteMeasurementForm,
  normalizeMeasurementProductType,
} from "@/lib/measurements/types";
import { emptyBalconyDetails } from "@/lib/measurements/balcony-types";
import { emptyShowerDetails } from "@/lib/measurements/shower-types";

export type MeasurementParentContext = {
  accountName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  projectName?: string | null;
  projectAddress?: string | null;
};

export function resolveMeasurementContext(
  visit: ApiSiteVisit,
): MeasurementContext {
  return visit.measurement_context === "production" ? "production" : "quotation";
}

export function buildFormFromVisit(
  visit: ApiSiteVisit,
  parent?: MeasurementParentContext,
  currentUserName?: string | null,
): SiteMeasurementFormData {
  const base = emptySiteMeasurementForm();
  const existing = visit.measurement_form_data;
  const measurerName =
    currentUserName?.trim() ||
    visit.assigned_field_officer?.name?.trim() ||
    "";

  if (existing) {
    return {
      ...base,
      ...existing,
      site_rep: existing.site_rep?.trim() || measurerName,
      measured_by: existing.measured_by?.trim() || measurerName,
      lines:
        existing.lines?.length > 0
          ? existing.lines.map((line) => {
              const productType = normalizeMeasurementProductType(
                line.product_type,
              );
              return {
                ...line,
                product_type: productType,
                balcony_details:
                  productType === "Balcony"
                    ? (line.balcony_details ?? emptyBalconyDetails())
                    : (line.balcony_details ?? null),
                shower_details:
                  productType === "Bathroom"
                    ? (line.shower_details ?? emptyShowerDetails())
                    : (line.shower_details ?? null),
              };
            })
          : [emptyMeasurementLine(0, "1")],
    };
  }

  return {
    ...base,
    client_name: parent?.accountName ?? visit.lead?.name ?? "",
    project_name: parent?.projectName ?? visit.title ?? "",
    project_address: parent?.projectAddress ?? visit.site_address ?? "",
    client_contact: parent?.contactName ?? "",
    phone: parent?.contactPhone ?? visit.lead?.phone ?? "",
    site_rep: measurerName,
    measured_by: measurerName,
  };
}

export function buildParentFromVisit(
  visit: ApiSiteVisit,
  project?: ProjectDetail | null,
): MeasurementParentContext {
  return {
    accountName:
      project?.account?.name ??
      visit.deal?.account?.name ??
      visit.lead?.account_name ??
      visit.lead?.name,
    contactName:
      project?.contact?.name ??
      visit.deal?.contact?.name ??
      visit.lead?.contact_person_name,
    contactPhone:
      project?.contact?.phone ?? visit.deal?.contact?.phone ?? visit.lead?.phone,
    projectName: project?.name ?? visit.project?.name ?? visit.title,
    projectAddress:
      project?.site_address ?? visit.project?.site_address ?? visit.site_address,
  };
}

export function contextLabel(context: MeasurementContext): string {
  return context === "production"
    ? "Production measurement — used for fabrication"
    : "Quotation measurement — used for quote preparation";
}
