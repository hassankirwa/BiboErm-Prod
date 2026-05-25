export type LeadKanbanStageId =
  | "new"
  | "qualified"
  | "site_visit_scheduled"
  | "quotation_sent"
  | "negotiation";

export type LeadActivityType =
  | "create_task"
  | "schedule_meeting"
  | "schedule_call";

export type LeadKanbanCard = {
  id: string;
  stageId: LeadKanbanStageId;
  title: string;
  location: string;
  owner: string;
  nextActionDate: string;
  estimatedValue: number;
  tag: string;
  lastActivityType?: LeadActivityType | null;
  company?: string;
  phone?: string;
  email?: string;
  source?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export const leadActivityTypes: {
  id: LeadActivityType;
  label: string;
}[] = [
  { id: "create_task", label: "Create task" },
  { id: "schedule_meeting", label: "Schedule a meeting" },
  { id: "schedule_call", label: "Schedule a call" },
];

export const leadKanbanAssignees = [
  "Brian Otieno",
  "Sarah Wanjiku",
  "John Kamau",
  "David Ochieng",
];

export const leadKanbanStages: {
  id: LeadKanbanStageId;
  label: string;
  headerBg: string;
  headerBorder: string;
  countBadge: string;
  tagClass: string;
  addBtnClass: string;
}[] = [
  {
    id: "new",
    label: "New Lead",
    headerBg: "bg-blue-50",
    headerBorder: "border-blue-200",
    countBadge: "bg-blue-600 text-white",
    tagClass: "bg-blue-100 text-blue-800",
    addBtnClass: "text-blue-700 hover:bg-blue-50",
  },
  {
    id: "qualified",
    label: "Qualified",
    headerBg: "bg-teal-50",
    headerBorder: "border-teal-200",
    countBadge: "bg-teal-600 text-white",
    tagClass: "bg-teal-100 text-teal-800",
    addBtnClass: "text-teal-700 hover:bg-teal-50",
  },
  {
    id: "site_visit_scheduled",
    label: "Site Visit Scheduled",
    headerBg: "bg-green-50",
    headerBorder: "border-green-200",
    countBadge: "bg-green-600 text-white",
    tagClass: "bg-green-100 text-green-800",
    addBtnClass: "text-green-700 hover:bg-green-50",
  },
  {
    id: "quotation_sent",
    label: "Quotation Sent",
    headerBg: "bg-orange-50",
    headerBorder: "border-orange-200",
    countBadge: "bg-orange-600 text-white",
    addBtnClass: "text-orange-700 hover:bg-orange-50",
    tagClass: "bg-orange-100 text-orange-800",
  },
  {
    id: "negotiation",
    label: "Negotiation",
    headerBg: "bg-red-50",
    headerBorder: "border-primary/30",
    countBadge: "bg-primary text-primary-foreground",
    tagClass: "bg-red-100 text-primary",
    addBtnClass: "text-primary hover:bg-red-50",
  },
];

export const leadKanbanCards: LeadKanbanCard[] = [
  {
    id: "kb_1",
    stageId: "new",
    title: "Kilimani Apartment",
    company: "Kilimani Heights Developers",
    location: "Kilimani, Nairobi",
    phone: "0712 345 678",
    email: "info@kilimaniheights.co.ke",
    source: "Website",
    owner: "Brian Otieno",
    nextActionDate: "2026-05-22",
    estimatedValue: 950000,
    tag: "High Priority",
    lastActivityType: "schedule_call",
  },
  {
    id: "kb_2",
    stageId: "new",
    title: "Ngong Road Showroom",
    company: "Urban Living Kenya",
    location: "Ngong Road, Nairobi",
    phone: "0777 901 234",
    email: "hello@urbanliving.co.ke",
    source: "Walk-in",
    owner: "Sarah Wanjiku",
    nextActionDate: "2026-05-20",
    estimatedValue: 420000,
    tag: "New Inquiry",
  },
  {
    id: "kb_3",
    stageId: "new",
    title: "Embakasi Warehouse",
    company: "East Africa Logistics",
    location: "Embakasi, Nairobi",
    phone: "0755 789 012",
    email: "tenders@ealogistics.co.ke",
    source: "Cold Call",
    owner: "Brian Otieno",
    nextActionDate: "2026-05-17",
    estimatedValue: 780000,
    tag: "Follow Up",
  },
  {
    id: "kb_4",
    stageId: "qualified",
    title: "Westlands Office Tower",
    company: "Skyline Properties Ltd",
    location: "Westlands, Nairobi",
    phone: "0722 456 789",
    email: "projects@skylineproperties.co.ke",
    source: "Referral",
    owner: "Brian Otieno",
    nextActionDate: "2026-05-21",
    estimatedValue: 2100000,
    tag: "Qualified",
    lastActivityType: "schedule_meeting",
  },
  {
    id: "kb_5",
    stageId: "qualified",
    title: "Thika Road Apartments",
    company: "Metro Developers",
    location: "Ruiru, Kiambu",
    phone: "0788 012 345",
    email: "info@metrodevelopers.co.ke",
    source: "Website",
    owner: "Sarah Wanjiku",
    nextActionDate: "2026-05-19",
    estimatedValue: 1650000,
    tag: "Budget Approved",
  },
  {
    id: "kb_6",
    stageId: "qualified",
    title: "Parklands Retail",
    company: "Retail Concepts Ltd",
    location: "Parklands, Nairobi",
    phone: "0701 234 567",
    email: "sales@retailconcepts.co.ke",
    source: "LinkedIn",
    owner: "Brian Otieno",
    nextActionDate: "2026-05-18",
    estimatedValue: 890000,
    tag: "Qualified",
  },
  {
    id: "kb_7",
    stageId: "site_visit_scheduled",
    title: "Karen Villa Windows",
    company: "Private Client - Mwangi",
    location: "Karen, Nairobi",
    phone: "0733 567 890",
    email: "mwangi.karen@gmail.com",
    source: "LinkedIn",
    owner: "Sarah Wanjiku",
    nextActionDate: "2026-05-20",
    estimatedValue: 540000,
    tag: "Site Visit Today",
    lastActivityType: "schedule_meeting",
  },
  {
    id: "kb_8",
    stageId: "site_visit_scheduled",
    title: "Muthaiga Luxury Home",
    company: "Elite Interiors",
    location: "Muthaiga, Nairobi",
    phone: "0799 123 456",
    email: "design@eliteinteriors.co.ke",
    source: "Referral",
    owner: "Brian Otieno",
    nextActionDate: "2026-05-20",
    estimatedValue: 3200000,
    tag: "VIP Client",
  },
  {
    id: "kb_9",
    stageId: "site_visit_scheduled",
    title: "Lavington Penthouse",
    company: "Elite Interiors",
    location: "Lavington, Nairobi",
    phone: "0744 678 901",
    email: "design@eliteinteriors.co.ke",
    source: "Referral",
    owner: "Sarah Wanjiku",
    nextActionDate: "2026-05-23",
    estimatedValue: 1100000,
    tag: "Site Visit",
  },
  {
    id: "kb_10",
    stageId: "quotation_sent",
    title: "Mombasa Beach Resort",
    company: "Coastal Hospitality Group",
    location: "Nyali, Mombasa",
    phone: "0744 678 901",
    email: "procurement@coastalhospitality.co.ke",
    source: "Facebook",
    owner: "Brian Otieno",
    nextActionDate: "2026-05-17",
    estimatedValue: 4500000,
    tag: "Awaiting Sign-off",
  },
  {
    id: "kb_11",
    stageId: "quotation_sent",
    title: "Nakuru Commercial Block",
    company: "Rift Valley Builders",
    location: "Nakuru CBD",
    phone: "0701 234 567",
    email: "admin@riftvalleybuilders.co.ke",
    source: "LinkedIn",
    owner: "Brian Otieno",
    nextActionDate: "2026-05-16",
    estimatedValue: 2800000,
    tag: "Quotation Sent",
  },
  {
    id: "kb_12",
    stageId: "quotation_sent",
    title: "Kisumu Lakeside Hotel",
    company: "Lakeside Hospitality",
    location: "Kisumu",
    phone: "0720 111 222",
    email: "bookings@lakesidehospitality.co.ke",
    source: "Website",
    owner: "Sarah Wanjiku",
    nextActionDate: "2026-05-24",
    estimatedValue: 1900000,
    tag: "Revision Requested",
  },
  {
    id: "kb_13",
    stageId: "negotiation",
    title: "Industrial Park Phase 2",
    company: "East Africa Logistics",
    location: "Athi River",
    phone: "0755 789 012",
    email: "tenders@ealogistics.co.ke",
    source: "Cold Call",
    owner: "Sarah Wanjiku",
    nextActionDate: "2026-05-19",
    estimatedValue: 6200000,
    tag: "Final Terms",
    lastActivityType: "create_task",
  },
  {
    id: "kb_14",
    stageId: "negotiation",
    title: "Runda Estate Upgrade",
    company: "Greenfield Homes",
    location: "Runda, Nairobi",
    phone: "0766 890 123",
    email: "sales@greenfieldhomes.co.ke",
    source: "Existing Client",
    owner: "Brian Otieno",
    nextActionDate: "2026-05-15",
    estimatedValue: 1750000,
    tag: "Negotiation",
  },
  {
    id: "kb_15",
    stageId: "negotiation",
    title: "Upper Hill Corporate",
    company: "Skyline Properties Ltd",
    location: "Upper Hill, Nairobi",
    phone: "0722 456 789",
    email: "projects@skylineproperties.co.ke",
    source: "Referral",
    owner: "Brian Otieno",
    nextActionDate: "2026-05-22",
    estimatedValue: 3900000,
    tag: "Discount Pending",
  },
];

export function formatKes(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `KES ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function formatKesFull(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function getStageTotalValue(stageId: LeadKanbanStageId): number {
  return leadKanbanCards
    .filter((c) => c.stageId === stageId)
    .reduce((sum, c) => sum + c.estimatedValue, 0);
}
