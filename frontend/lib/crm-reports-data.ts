export type CrmReport = {
  id: string;
  name: string;
  description: string;
  folder: string;
  lastAccessed: string | null;
  createdBy: string | null;
  starred?: boolean;
};

export const crmReports: CrmReport[] = [
  {
    id: "rpt_001",
    name: "Top 10 Templates by Click Rate",
    description: "Shows the top-performing email templates ranked by click-through rate.",
    folder: "Email Reports",
    lastAccessed: "May 18, 2026",
    createdBy: null,
    starred: false,
  },
  {
    id: "rpt_002",
    name: "Email Analytics",
    description: "Overview of email sends, opens, clicks, and bounces across campaigns.",
    folder: "Email Reports",
    lastAccessed: null,
    createdBy: null,
  },
  {
    id: "rpt_003",
    name: "Leads by Source",
    description: "Breakdown of leads created grouped by lead source for the selected period.",
    folder: "Lead Reports",
    lastAccessed: null,
    createdBy: null,
  },
  {
    id: "rpt_004",
    name: "Sales Pipeline Summary",
    description: "Snapshot of deals in each stage with total value and conversion rates.",
    folder: "Sales Reports",
    lastAccessed: null,
    createdBy: null,
  },
  {
    id: "rpt_005",
    name: "Meeting Activity Report",
    description: "Lists scheduled and completed meetings with outcomes and attendees.",
    folder: "Meeting Reports",
    lastAccessed: null,
    createdBy: null,
  },
  {
    id: "rpt_006",
    name: "Calls Log Summary",
    description: "Summary of inbound and outbound calls logged by sales representatives.",
    folder: "Activity Reports",
    lastAccessed: null,
    createdBy: null,
  },
  {
    id: "rpt_007",
    name: "Deals Closing This Month",
    description: "Deals expected to close within the current month based on close date.",
    folder: "Sales Reports",
    lastAccessed: null,
    createdBy: null,
  },
  {
    id: "rpt_008",
    name: "Account Growth",
    description: "Tracks new accounts created and revenue attributed per account.",
    folder: "Account Reports",
    lastAccessed: null,
    createdBy: null,
  },
  {
    id: "rpt_009",
    name: "Campaign Performance",
    description: "Measures ROI and engagement metrics across marketing campaigns.",
    folder: "Campaign Reports",
    lastAccessed: null,
    createdBy: null,
  },
  {
    id: "rpt_010",
    name: "Tasks Overdue",
    description: "Lists open tasks that are past their due date, grouped by owner.",
    folder: "Activity Reports",
    lastAccessed: null,
    createdBy: null,
  },
  {
    id: "rpt_011",
    name: "Forecast vs Actual",
    description: "Compares forecasted revenue against actual closed-won revenue.",
    folder: "Sales Reports",
    lastAccessed: null,
    createdBy: null,
  },
];

export const reportFolderFilters = [
  "All Reports",
  "Email Reports",
  "Lead Reports",
  "Sales Reports",
  "Meeting Reports",
  "Activity Reports",
  "Account Reports",
  "Campaign Reports",
] as const;
