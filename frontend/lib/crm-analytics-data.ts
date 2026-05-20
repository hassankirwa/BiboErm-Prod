export const crmAnalyticsKpis = [
  {
    label: "Leads This Month",
    value: "26",
    change: "+18% vs last month",
    previous: "22",
    icon: "users" as const,
  },
  {
    label: "Revenue This Month",
    value: "KES 120,000.00",
    change: "+22% vs last month",
    previous: "KES 98,500.00",
    icon: "coin" as const,
  },
  {
    label: "Deals in Pipeline",
    value: "18",
    change: "+12% vs last month",
    previous: "16",
    icon: "briefcase" as const,
  },
  {
    label: "Accounts This Month",
    value: "12",
    change: "+20% vs last month",
    previous: "10",
    icon: "building" as const,
  },
];

export type PerformanceRow = {
  metric: string;
  mar: string;
  apr: string;
  may: string;
  highlightMay?: boolean;
};

export const crmPerformanceRows: PerformanceRow[] = [
  { metric: "Leads Created", mar: "18", apr: "22", may: "26", highlightMay: true },
  { metric: "Deals Created", mar: "12", apr: "14", may: "16", highlightMay: true },
  { metric: "Deals Won", mar: "8", apr: "10", may: "11", highlightMay: true },
  { metric: "Revenue (KES)", mar: "85,000", apr: "98,500", may: "120,000", highlightMay: true },
  { metric: "Calls Logged", mar: "42", apr: "48", may: "55", highlightMay: true },
  { metric: "Meetings Held", mar: "14", apr: "16", may: "19", highlightMay: true },
];

export const crmLeadsBySource = [
  { name: "Website", value: 8, fill: "#3b82f6" },
  { name: "Referral", value: 7, fill: "#22c55e" },
  { name: "Social Media", value: 5, fill: "#a855f7" },
  { name: "Walk-in", value: 4, fill: "#f59e0b" },
  { name: "Phone", value: 2, fill: "#ec2024" },
];

export const crmTopSalesReps = [
  { rank: 1, name: "Sarah Wanjiku", revenue: "KES 420,000" },
  { rank: 2, name: "John Kamau", revenue: "KES 315,000" },
  { rank: 3, name: "David Ochieng", revenue: "KES 198,500" },
  { rank: 4, name: "Grace Muthoni", revenue: "KES 142,000" },
  { rank: 5, name: "Peter Njoroge", revenue: "KES 98,200" },
];
