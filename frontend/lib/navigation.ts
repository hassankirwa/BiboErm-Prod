import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Star,
  Clock,
  Pin,
  Settings,
  Headphones,
  Users,
  Calendar,
  FolderKanban,
  Calculator,
  Warehouse,
  Contact,
  Briefcase,
  Box,
  FileText,
  Scissors,
  Receipt,
  Factory,
  ShieldCheck,
  Truck,
  Wrench,
  CircleDollarSign,
  UserCog,
  BarChart3,
  Globe,
  Monitor,
  ShoppingCart,
  ClipboardCheck,
  DollarSign,
  Home,
  PieChart,
  HandshakeIcon,
  ListTodo,
  PhoneCall,
  Video,
  Package,
  MapPin,
  ClipboardList,
  Megaphone,
  Banknote,
  FileBarChart,
  CheckSquare,
  AlertCircle,
  Layers,
  CreditCard,
  TrendingUp,
  Building,
  UserCheck,
  CalendarDays,
  FileStack,
  Shield,
  HardDrive,
  ScrollText,
} from "lucide-react";

export type SubModule = {
  name: string;
  path: string;
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: SubModule[];
};

export type DepartmentNav = {
  topItems: SubModule[];
  groups: NavGroup[];
};

export type Department = {
  id: string;
  name: string;
  icon: LucideIcon;
  path: string;
  subModules: SubModule[];
  nav?: DepartmentNav;
};

export const departments: Department[] = [
  {
    id: "crm",
    name: "CRM",
    icon: Users,
    path: "/crm",
    subModules: [
      { name: "Leads", path: "/crm/leads" },
      { name: "Contacts", path: "/crm/contacts" },
      { name: "Accounts", path: "/crm/accounts" },
      { name: "Deals", path: "/crm/deals" },
      { name: "Site Visits", path: "/crm/site-visits" },
      { name: "Activities", path: "/crm/activities" },
      { name: "Field Day", path: "/crm/field-day" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/crm" },
        { name: "Reports", path: "/crm/reports" },
        { name: "Analytics", path: "/crm/analytics" },
      ],
      groups: [
        {
          label: "Sales",
          icon: HandshakeIcon,
          items: [
            { name: "Leads", path: "/crm/leads" },
            { name: "Contacts", path: "/crm/contacts" },
            { name: "Accounts", path: "/crm/accounts" },
            { name: "Deals", path: "/crm/deals" },
            { name: "Site Visits", path: "/crm/site-visits" },
            { name: "Today", path: "/crm/site-visits/today" },
            { name: "Campaigns", path: "/crm/field-day" },
          ],
        },
        {
          label: "Activities",
          icon: ListTodo,
          items: [
            { name: "Tasks", path: "/crm/activities" },
            { name: "Meetings", path: "/crm/field-day" },
            { name: "Calls", path: "/crm/activities" },
          ],
        },
      ],
    },
  },
  {
    id: "projects",
    name: "Projects",
    icon: FolderKanban,
    path: "/projects",
    subModules: [
      { name: "All Projects", path: "/projects" },
      { name: "Pipeline", path: "/projects/pipeline" },
      { name: "Timeline", path: "/projects/timeline" },
      { name: "Client Portal", path: "/projects/client-portal" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/projects" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "Projects",
          icon: FolderKanban,
          items: [
            { name: "All Projects", path: "/projects" },
            { name: "Pipeline", path: "/projects/pipeline" },
            { name: "Timeline", path: "/projects/timeline" },
            { name: "Client Portal", path: "/projects/client-portal" },
          ],
        },
      ],
    },
  },
  {
    id: "warehouse",
    name: "Warehouse",
    icon: Warehouse,
    path: "/warehouse",
    subModules: [
      { name: "Inventory", path: "/warehouse/inventory" },
      { name: "Stock Movements", path: "/warehouse/movements" },
      { name: "Offcuts", path: "/warehouse/offcuts" },
      { name: "Tools", path: "/warehouse/tools" },
      { name: "Master Data", path: "/warehouse/master-data" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/warehouse/inventory" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "Inventory",
          icon: Package,
          items: [
            { name: "Inventory", path: "/warehouse/inventory" },
            { name: "Stock Movements", path: "/warehouse/movements" },
            { name: "Offcuts", path: "/warehouse/offcuts" },
            { name: "Tools", path: "/warehouse/tools" },
            { name: "Master Data", path: "/warehouse/master-data" },
          ],
        },
      ],
    },
  },
  {
    id: "procurement",
    name: "Procurement",
    icon: ShoppingCart,
    path: "/procurement",
    subModules: [
      { name: "Purchase Orders", path: "/procurement/orders" },
      { name: "Suppliers", path: "/procurement/suppliers" },
      { name: "Requisitions", path: "/procurement/requisitions" },
      { name: "Transport", path: "/procurement/transport" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/procurement/orders" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "Procurement",
          icon: ShoppingCart,
          items: [
            { name: "Purchase Orders", path: "/procurement/orders" },
            { name: "Suppliers", path: "/procurement/suppliers" },
            { name: "Requisitions", path: "/procurement/requisitions" },
            { name: "Transport", path: "/procurement/transport" },
          ],
        },
      ],
    },
  },
  {
    id: "production",
    name: "Production",
    icon: Factory,
    path: "/production",
    subModules: [
      { name: "Schedule", path: "/production/schedule" },
      { name: "Orders", path: "/production/orders" },
      { name: "Cutting", path: "/production/cutting" },
      { name: "Assembly", path: "/production/assembly" },
      { name: "Installation", path: "/production/installation" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/production/schedule" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "Production",
          icon: Factory,
          items: [
            { name: "Schedule", path: "/production/schedule" },
            { name: "Orders", path: "/production/orders" },
            { name: "Cutting", path: "/production/cutting" },
            { name: "Assembly", path: "/production/assembly" },
            { name: "Installation", path: "/production/installation" },
          ],
        },
      ],
    },
  },
  {
    id: "qc",
    name: "Quality Control",
    icon: ClipboardCheck,
    path: "/qc",
    subModules: [
      { name: "Inspections", path: "/qc/inspections" },
      { name: "Checklists", path: "/qc/checklists" },
      { name: "Defects", path: "/qc/defects" },
      { name: "Reports", path: "/qc/reports" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/qc/inspections" },
        { name: "Reports", path: "/qc/reports" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "Quality",
          icon: ClipboardCheck,
          items: [
            { name: "Inspections", path: "/qc/inspections" },
            { name: "Checklists", path: "/qc/checklists" },
            { name: "Defects", path: "/qc/defects" },
            { name: "Reports", path: "/qc/reports" },
          ],
        },
      ],
    },
  },
  {
    id: "hr",
    name: "HR",
    icon: UserCog,
    path: "/hr",
    subModules: [
      { name: "Employees", path: "/hr/employees" },
      { name: "Payroll", path: "/hr/payroll" },
      { name: "Leave", path: "/hr/leave" },
      { name: "Documents", path: "/hr/documents" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/hr/employees" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "HR",
          icon: UserCog,
          items: [
            { name: "Employees", path: "/hr/employees" },
            { name: "Payroll", path: "/hr/payroll" },
            { name: "Leave", path: "/hr/leave" },
            { name: "Documents", path: "/hr/documents" },
          ],
        },
      ],
    },
  },
  {
    id: "finance",
    name: "Finance",
    icon: DollarSign,
    path: "/finance",
    subModules: [
      { name: "Invoices", path: "/finance/invoices" },
      { name: "Payments", path: "/finance/payments" },
      { name: "Expenses", path: "/finance/expenses" },
      { name: "Reports", path: "/finance/reports" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/finance/invoices" },
        { name: "Reports", path: "/finance/reports" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "Finance",
          icon: DollarSign,
          items: [
            { name: "Invoices", path: "/finance/invoices" },
            { name: "Payments", path: "/finance/payments" },
            { name: "Expenses", path: "/finance/expenses" },
            { name: "Reports", path: "/finance/reports" },
          ],
        },
      ],
    },
  },
  {
    id: "it",
    name: "IT Admin",
    icon: Monitor,
    path: "/it",
    subModules: [
      { name: "Users", path: "/it/users" },
      { name: "Roles", path: "/it/roles" },
      { name: "Devices", path: "/it/devices" },
      { name: "Audit Log", path: "/it/audit-log" },
    ],
    nav: {
      topItems: [
        { name: "Home", path: "/it/users" },
        { name: "Reports", path: "/analytics" },
        { name: "Analytics", path: "/analytics" },
      ],
      groups: [
        {
          label: "IT Admin",
          icon: Monitor,
          items: [
            { name: "Users", path: "/it/users" },
            { name: "Roles", path: "/it/roles" },
            { name: "Devices", path: "/it/devices" },
            { name: "Audit Log", path: "/it/audit-log" },
          ],
        },
      ],
    },
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: BarChart3,
    path: "/analytics",
    subModules: [{ name: "Overview", path: "/analytics" }],
  },
];

export type WorkspaceApp = {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  iconClassName: string;
  badge?: { label: string; className: string };
};

export const workspaceApps: WorkspaceApp[] = [
  {
    id: "crm",
    name: "CRM",
    href: "/crm",
    icon: Users,
    iconClassName: "bg-blue-100 text-blue-600",
    badge: { label: "12 New Leads", className: "text-blue-600" },
  },
  {
    id: "field-day",
    name: "Field Day",
    href: "/crm/field-day",
    icon: Calendar,
    iconClassName: "bg-green-100 text-green-600",
  },
  {
    id: "project-management",
    name: "Project Management",
    href: "/projects",
    icon: FolderKanban,
    iconClassName: "bg-purple-100 text-purple-600",
  },
  {
    id: "estimations",
    name: "Estimations",
    href: "/projects",
    icon: Calculator,
    iconClassName: "bg-yellow-100 text-yellow-600",
  },
  {
    id: "warehouse",
    name: "Warehouse",
    href: "/warehouse/inventory",
    icon: Warehouse,
    iconClassName: "bg-orange-100 text-orange-600",
    badge: { label: "3 Low Stock", className: "text-orange-600" },
  },
  {
    id: "contacts",
    name: "Contacts",
    href: "/crm/contacts",
    icon: Contact,
    iconClassName: "bg-violet-100 text-violet-600",
  },
  {
    id: "projects",
    name: "Projects",
    href: "/projects",
    icon: Briefcase,
    iconClassName: "bg-amber-100 text-amber-600",
    badge: { label: "8 Active Jobs", className: "text-primary" },
  },
  {
    id: "bom",
    name: "BOM",
    href: "/projects",
    icon: Box,
    iconClassName: "bg-teal-100 text-teal-600",
  },
  {
    id: "quotes",
    name: "Quotes",
    href: "/crm/deals",
    icon: FileText,
    iconClassName: "bg-pink-100 text-pink-600",
    badge: { label: "5 Pending", className: "text-primary" },
  },
  {
    id: "offcuts",
    name: "Offcuts",
    href: "/warehouse/offcuts",
    icon: Scissors,
    iconClassName: "bg-red-100 text-red-600",
  },
  {
    id: "procurement",
    name: "Procurement",
    href: "/procurement/orders",
    icon: Receipt,
    iconClassName: "bg-emerald-100 text-emerald-600",
    badge: { label: "4 Pending", className: "text-teal-600" },
  },
  {
    id: "production",
    name: "Production",
    href: "/production/schedule",
    icon: Factory,
    iconClassName: "bg-sky-100 text-sky-600",
    badge: { label: "4 Delayed", className: "text-sky-600" },
  },
  {
    id: "qc",
    name: "Quality Control",
    href: "/qc/inspections",
    icon: ShieldCheck,
    iconClassName: "bg-cyan-100 text-cyan-600",
  },
  {
    id: "dispatch",
    name: "Dispatch",
    href: "/production/schedule",
    icon: Truck,
    iconClassName: "bg-indigo-100 text-indigo-600",
    badge: { label: "2 Today", className: "text-indigo-600" },
  },
  {
    id: "installation",
    name: "Installation",
    href: "/production/installation",
    icon: Wrench,
    iconClassName: "bg-blue-100 text-blue-700",
    badge: { label: "5 Scheduled", className: "text-blue-600" },
  },
  {
    id: "finance",
    name: "Finance",
    href: "/finance/invoices",
    icon: CircleDollarSign,
    iconClassName: "bg-green-100 text-green-700",
    badge: { label: "2 Overdue", className: "text-green-600" },
  },
  {
    id: "hr",
    name: "HR",
    href: "/hr/employees",
    icon: UserCog,
    iconClassName: "bg-rose-100 text-rose-600",
    badge: { label: "1 On Leave", className: "text-rose-600" },
  },
  {
    id: "analytics",
    name: "Reports",
    href: "/analytics",
    icon: BarChart3,
    iconClassName: "bg-orange-100 text-orange-700",
  },
  {
    id: "client-portal",
    name: "Client Portal",
    href: "/projects/client-portal",
    icon: Globe,
    iconClassName: "bg-teal-100 text-teal-700",
  },
  {
    id: "it",
    name: "IT Admin",
    href: "/it/users",
    icon: Monitor,
    iconClassName: "bg-slate-100 text-slate-600",
  },
];

export const workspaceNavItems = [
  { name: "Workspace", href: "/workspace", icon: LayoutGrid },
  { name: "Favorites", href: "/workspace/favorites", icon: Star },
  { name: "Recent", href: "/workspace/recent", icon: Clock },
  { name: "Pinned", href: "/workspace/pinned", icon: Pin },
] as const;

export const workspaceFooterNavItems = [
  { name: "Settings", href: "/workspace/settings", icon: Settings },
  { name: "Help Center", href: "/workspace/help", icon: Headphones },
] as const;

export function isWorkspaceNavActive(pathname: string, href: string): boolean {
  if (href === "/workspace") {
    return pathname === "/workspace";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const workspaceShellPrefixes = [
  "/workspace",
  "/analytics",
  "/projects",
  "/notifications",
];

export function getActiveDepartment(pathname: string): Department | null {
  if (
    workspaceShellPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }

  const sorted = [...departments]
    .filter((d) => d.id !== "analytics")
    .sort((a, b) => b.path.length - a.path.length);

  for (const dept of sorted) {
    if (pathname === dept.path || pathname.startsWith(`${dept.path}/`)) {
      return dept;
    }
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return null;
  }

  return null;
}

export function isWorkspaceRoute(pathname: string): boolean {
  return getActiveDepartment(pathname) === null;
}
