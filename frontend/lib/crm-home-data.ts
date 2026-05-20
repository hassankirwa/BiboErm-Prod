import type { LucideIcon } from "lucide-react";
import {
  Users,
  HandshakeIcon,
  Phone,
  MapPin,
} from "lucide-react";

export type CrmStatCard = {
  label: string;
  value: number;
  change: string;
  icon: LucideIcon;
  iconClassName: string;
};

export const crmHomeStats: CrmStatCard[] = [
  {
    label: "New Leads",
    value: 26,
    change: "+18% vs yesterday",
    icon: Users,
    iconClassName: "bg-blue-100 text-blue-600",
  },
  {
    label: "Open Deals",
    value: 18,
    change: "+12% vs yesterday",
    icon: HandshakeIcon,
    iconClassName: "bg-violet-100 text-violet-600",
  },
  {
    label: "Calls Today",
    value: 8,
    change: "+14% vs yesterday",
    icon: Phone,
    iconClassName: "bg-green-100 text-green-600",
  },
  {
    label: "Site Visits Today",
    value: 5,
    change: "+25% vs yesterday",
    icon: MapPin,
    iconClassName: "bg-amber-100 text-amber-600",
  },
];

export const crmOpenTasks = [
  { subject: "Follow up with James Mwangi", dueDate: "Today", priority: "High" as const },
  { subject: "Send quotation to Mary Akinyi", dueDate: "Today", priority: "High" as const },
  { subject: "Schedule site visit - Eldoret", dueDate: "Tomorrow", priority: "Medium" as const },
  { subject: "Update deal stage - Westlands Tower", dueDate: "May 22", priority: "Medium" as const },
  { subject: "Review campaign performance", dueDate: "May 23", priority: "Low" as const },
  { subject: "Call back Joseph Kiprop", dueDate: "May 24", priority: "Low" as const },
];

export const crmUpcomingMeetings = [
  { title: "Site Survey - Westlands Apt", time: "10:00 AM", assignedTo: "Sarah Wanjiku" },
  { title: "Client Meeting - Kilimani Office", time: "2:00 PM", assignedTo: "Sarah Wanjiku" },
  { title: "Proposal Review - ABC Ltd", time: "4:30 PM", assignedTo: "John Kamau" },
  { title: "Follow-up Call - Mombasa Project", time: "Tomorrow 9 AM", assignedTo: "Sarah Wanjiku" },
  { title: "Deal Closing - Green Park", time: "Tomorrow 11 AM", assignedTo: "John Kamau" },
];

export const crmTodaysLeads = [
  { name: "James Mwangi", source: "Website", assignedTo: "Sarah Wanjiku", status: "Qualified" as const },
  { name: "Mary Akinyi", source: "Referral", assignedTo: "Sarah Wanjiku", status: "Contacted" as const },
  { name: "Joseph Kiprop", source: "Phone", assignedTo: "Sarah Wanjiku", status: "New" as const },
  { name: "Grace Njeri", source: "Walk-in", assignedTo: "John Kamau", status: "New" as const },
  { name: "David Ochieng", source: "Social", assignedTo: "Sarah Wanjiku", status: "Contacted" as const },
];

export const crmLeadsThisMonth = [
  { name: "Westlands Tower Ltd", source: "Referral", stage: "Qualified" as const, created: "May 18" },
  { name: "Kilimani Office Park", source: "Website", stage: "Proposal" as const, created: "May 17" },
  { name: "Green Park Residences", source: "Phone", stage: "Negotiation" as const, created: "May 16" },
  { name: "ABC Construction", source: "Campaign", stage: "New" as const, created: "May 15" },
  { name: "Sunrise Apartments", source: "Walk-in", stage: "Qualified" as const, created: "May 14" },
  { name: "Lakeview Villas", source: "Referral", stage: "Proposal" as const, created: "May 12" },
];
