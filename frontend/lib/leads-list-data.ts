export type LeadViewMode = "list" | "kanban" | "calendar" | "map";

export type LeadActivity =
  | { type: "today" }
  | { type: "date"; label: string; tone: "green" | "red" }
  | { type: "calendar" };

export type LeadListRow = {
  id: string;
  leadName: string;
  company: string;
  email: string;
  phone: string;
  stage: string;
  stageClassName: string;
  source: string;
  owner: string;
  ownerInitials: string;
  activity: LeadActivity;
  statusKey: string;
};

export const leadsListRows: LeadListRow[] = [
  {
    id: "lead_101",
    leadName: "Kilimani Apartment Renovation",
    company: "Kilimani Heights Developers",
    email: "info@kilimaniheights.co.ke",
    phone: "0712 345 678",
    stage: "New Lead",
    stageClassName: "bg-blue-100 text-blue-700",
    source: "Website",
    owner: "Brian Otieno",
    ownerInitials: "BO",
    activity: { type: "today" },
    statusKey: "new",
  },
  {
    id: "lead_102",
    leadName: "Westlands Office Tower",
    company: "Skyline Properties Ltd",
    email: "projects@skylineproperties.co.ke",
    phone: "0722 456 789",
    stage: "Qualified",
    stageClassName: "bg-green-100 text-green-700",
    source: "Referral",
    owner: "Brian Otieno",
    ownerInitials: "BO",
    activity: { type: "date", label: "May 19", tone: "green" },
    statusKey: "qualified",
  },
  {
    id: "lead_103",
    leadName: "Karen Villa Windows",
    company: "Private Client - Mwangi",
    email: "mwangi.karen@gmail.com",
    phone: "0733 567 890",
    stage: "Site Visit Scheduled",
    stageClassName: "bg-orange-100 text-orange-700",
    source: "LinkedIn",
    owner: "Sarah Wanjiku",
    ownerInitials: "SW",
    activity: { type: "date", label: "May 21", tone: "green" },
    statusKey: "site_visit_scheduled",
  },
  {
    id: "lead_104",
    leadName: "Mombasa Beach Resort",
    company: "Coastal Hospitality Group",
    email: "procurement@coastalhospitality.co.ke",
    phone: "0744 678 901",
    stage: "Quotation Sent",
    stageClassName: "bg-violet-100 text-violet-700",
    source: "Facebook",
    owner: "Brian Otieno",
    ownerInitials: "BO",
    activity: { type: "date", label: "May 17", tone: "red" },
    statusKey: "quotation_sent",
  },
  {
    id: "lead_105",
    leadName: "Industrial Park Phase 2",
    company: "East Africa Logistics",
    email: "tenders@ealogistics.co.ke",
    phone: "0755 789 012",
    stage: "Negotiation",
    stageClassName: "bg-orange-100 text-orange-700",
    source: "Cold Call",
    owner: "Sarah Wanjiku",
    ownerInitials: "SW",
    activity: { type: "calendar" },
    statusKey: "negotiation",
  },
  {
    id: "lead_106",
    leadName: "Runda Estate Upgrade",
    company: "Greenfield Homes",
    email: "sales@greenfieldhomes.co.ke",
    phone: "0766 890 123",
    stage: "Won",
    stageClassName: "bg-green-100 text-green-700",
    source: "Existing Client",
    owner: "Brian Otieno",
    ownerInitials: "BO",
    activity: { type: "date", label: "May 18", tone: "green" },
    statusKey: "won",
  },
  {
    id: "lead_107",
    leadName: "Ngong Road Showroom",
    company: "Urban Living Kenya",
    email: "hello@urbanliving.co.ke",
    phone: "0777 901 234",
    stage: "New Lead",
    stageClassName: "bg-blue-100 text-blue-700",
    source: "Walk-in",
    owner: "Sarah Wanjiku",
    ownerInitials: "SW",
    activity: { type: "today" },
    statusKey: "new",
  },
  {
    id: "lead_108",
    leadName: "Thika Road Apartments",
    company: "Metro Developers",
    email: "info@metrodevelopers.co.ke",
    phone: "0788 012 345",
    stage: "Qualified",
    stageClassName: "bg-green-100 text-green-700",
    source: "Website",
    owner: "Brian Otieno",
    ownerInitials: "BO",
    activity: { type: "date", label: "May 20", tone: "green" },
    statusKey: "qualified",
  },
  {
    id: "lead_109",
    leadName: "Lavington Penthouse",
    company: "Elite Interiors",
    email: "design@eliteinteriors.co.ke",
    phone: "0799 123 456",
    stage: "Site Visit Scheduled",
    stageClassName: "bg-orange-100 text-orange-700",
    source: "Referral",
    owner: "Sarah Wanjiku",
    ownerInitials: "SW",
    activity: { type: "calendar" },
    statusKey: "site_visit_scheduled",
  },
  {
    id: "lead_110",
    leadName: "Nakuru Commercial Block",
    company: "Rift Valley Builders",
    email: "admin@riftvalleybuilders.co.ke",
    phone: "0701 234 567",
    stage: "Quotation Sent",
    stageClassName: "bg-violet-100 text-violet-700",
    source: "LinkedIn",
    owner: "Brian Otieno",
    ownerInitials: "BO",
    activity: { type: "date", label: "May 16", tone: "red" },
    statusKey: "quotation_sent",
  },
];

export const LEADS_TOTAL_COUNT = 112;

export const leadKanbanColumns = [
  { id: "new", label: "New Lead", color: "bg-blue-50" },
  { id: "qualified", label: "Qualified", color: "bg-green-50" },
  { id: "site_visit_scheduled", label: "Site Visit", color: "bg-orange-50" },
  { id: "quotation_sent", label: "Quotation Sent", color: "bg-violet-50" },
  { id: "negotiation", label: "Negotiation", color: "bg-amber-50" },
  { id: "won", label: "Won", color: "bg-emerald-50" },
] as const;

export const leadScopeFilters = [
  "All Leads",
  "My Leads",
  "Unassigned",
  "Hot Leads",
] as const;
