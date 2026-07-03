import type { MeasurementContext } from "@/lib/measurements/types";

export type SiteOpsMeasurementContext = MeasurementContext;

export const SITE_OPS_CONTEXT_META: Record<
  SiteOpsMeasurementContext,
  {
    label: string;
    shortLabel: string;
    description: string;
    visitsTitle: string;
    visitsSubtitle: string;
    myVisitsTitle: string;
    myVisitsSubtitle: string;
    todayTitle: string;
    todaySubtitle: string;
    reviewTitle: string;
    reviewSubtitle: string;
  }
> = {
  quotation: {
    label: "Quotation stage",
    shortLabel: "Quotation",
    description: "Pre-sale site measurements for leads and deals before quoting.",
    visitsTitle: "Quotation site visits",
    visitsSubtitle: "Schedule and track measurement visits for leads and deals.",
    myVisitsTitle: "My quotation visits",
    myVisitsSubtitle: "Open measurement visits assigned to you before a quote is issued.",
    todayTitle: "Today's quotation visits",
    todaySubtitle: "Measurement visits scheduled for today during the sales cycle.",
    reviewTitle: "Quotation review queue",
    reviewSubtitle: "Submitted quotation measurements awaiting approval.",
  },
  production: {
    label: "Production stage",
    shortLabel: "Production",
    description: "On-site measurements for active projects before fabrication.",
    visitsTitle: "Production site visits",
    visitsSubtitle: "Schedule and track measurement visits linked to live projects.",
    myVisitsTitle: "My production visits",
    myVisitsSubtitle: "Open project measurement visits assigned to you.",
    todayTitle: "Today's production visits",
    todaySubtitle: "Project measurement visits scheduled for today.",
    reviewTitle: "Production review queue",
    reviewSubtitle: "Submitted production measurements awaiting approval.",
  },
};

export function siteOpsVisitsPath(context: SiteOpsMeasurementContext): string {
  return `/site-ops/${context}/visits`;
}

export function siteOpsMyVisitsPath(context: SiteOpsMeasurementContext): string {
  return `/site-ops/${context}/my-visits`;
}

export function siteOpsTodayPath(context: SiteOpsMeasurementContext): string {
  return `/site-ops/${context}/today`;
}

export function siteOpsReviewPath(context: SiteOpsMeasurementContext): string {
  return `/site-ops/${context}/review`;
}

export const SITE_OPS_FIELD_DAY_PATH = "/site-ops/field-day";
export const SITE_OPS_INSTALLATION_JOBS_PATH = "/field-installation/jobs";
export const SITE_OPS_REPORTS_PATH = "/site-ops/reports";
